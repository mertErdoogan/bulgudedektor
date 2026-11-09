import "server-only";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { campaigns, orders, products } from "@/db/schema";
import { getSettings } from "./settings";

export type CartInput = { productId: string; quantity: number }[];

export type PricedLine = {
  productId: string;
  name: string;
  sku: string;
  slug: string;
  imageUrl: string | null;
  unitPrice: number;
  unitCost: number | null;
  quantity: number;
  total: number;
  brandId: string | null;
  categoryId: string | null;
  available: number;
  error?: string;
};

export type Quote = {
  lines: PricedLine[];
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  transferDiscount: number;
  total: number;
  campaign: { id: string; name: string; code: string | null } | null;
  couponError?: string;
  errors: string[];
};

const r2 = (n: number) => Math.round(n * 100) / 100;

type CampaignRow = typeof campaigns.$inferSelect;

function campaignLive(c: CampaignRow, now = new Date()) {
  if (!c.isActive) return false;
  if (c.startsAt && c.startsAt > now) return false;
  if (c.endsAt && c.endsAt < now) return false;
  if (c.usageLimit !== null && c.usageCount >= c.usageLimit) return false;
  return true;
}

function eligibleSubtotal(c: CampaignRow, lines: PricedLine[]) {
  return lines
    .filter((l) => {
      if (c.scope === "ALL") return true;
      if (c.scope === "BRAND") return !!l.brandId && c.targetIds.includes(l.brandId);
      if (c.scope === "CATEGORY") return !!l.categoryId && c.targetIds.includes(l.categoryId);
      return c.targetIds.includes(l.productId);
    })
    .reduce((s, l) => s + l.total, 0);
}

function discountFor(c: CampaignRow, lines: PricedLine[], subtotal: number, shipping: number) {
  if (subtotal < c.minSubtotal) return { amount: 0, freeShipping: false };
  if (c.type === "FREE_SHIPPING") return { amount: 0, freeShipping: true };
  const base = eligibleSubtotal(c, lines);
  if (base <= 0) return { amount: 0, freeShipping: false };
  let amount = c.type === "PERCENT" ? (base * c.value) / 100 : Math.min(c.value, base);
  if (c.maxDiscount !== null) amount = Math.min(amount, c.maxDiscount);
  return { amount: r2(amount), freeShipping: false, shipping };
}

export async function quoteCart(
  input: CartInput,
  opts: { couponCode?: string | null; paymentMethod?: "CARD" | "TRANSFER"; deliveryMethod?: "CARGO" | "PICKUP"; customerId?: string | null } = {},
): Promise<Quote> {
  const s = await getSettings();
  const merged = new Map<string, number>();
  for (const i of input) {
    const q = Math.max(0, Math.min(99, Math.floor(Number(i.quantity) || 0)));
    if (q > 0) merged.set(i.productId, (merged.get(i.productId) ?? 0) + q);
  }
  const ids = [...merged.keys()];
  const rows = ids.length
    ? await db.query.products.findMany({
        where: and(inArray(products.id, ids), eq(products.status, "ACTIVE")),
        with: { images: { orderBy: (im, { asc }) => [asc(im.sortOrder)], limit: 1 } },
      })
    : [];

  const errors: string[] = [];
  const lines: PricedLine[] = [];
  for (const [pid, qty] of merged) {
    const p = rows.find((r) => r.id === pid);
    if (!p) {
      errors.push("Sepetteki bir ürün artık satışta değil, sepetten çıkarıldı.");
      continue;
    }
    let quantity = qty;
    let error: string | undefined;
    if (!p.allowBackorder && p.stock < qty) {
      quantity = Math.max(0, p.stock);
      error = p.stock <= 0 ? "Stokta yok" : `Stokta ${p.stock} adet var`;
      errors.push(`${p.name}: ${error}`);
    }
    if (quantity <= 0) continue;
    lines.push({
      productId: p.id,
      name: p.name,
      sku: p.sku,
      slug: p.slug,
      imageUrl: p.images[0]?.url ?? null,
      unitPrice: p.price,
      unitCost: p.costPrice,
      quantity,
      total: r2(p.price * quantity),
      brandId: p.brandId,
      categoryId: p.categoryId,
      available: p.stock,
      error,
    });
  }

  const subtotal = r2(lines.reduce((a, l) => a + l.total, 0));
  let shippingTotal =
    opts.deliveryMethod === "PICKUP" || subtotal === 0 || (s.shipping.freeThreshold > 0 && subtotal >= s.shipping.freeThreshold) || s.shipping.flatRate <= 0
      ? 0
      : s.shipping.flatRate;

  // Kampanya: önce kod, yoksa otomatik kampanyaların en avantajlısı
  let campaign: CampaignRow | null = null;
  let couponError: string | undefined;
  let discountTotal = 0;
  const code = opts.couponCode?.trim().toUpperCase();
  if (code) {
    const c = await db.query.campaigns.findFirst({ where: eq(sql`upper(${campaigns.code})`, code) });
    if (!c || !campaignLive(c)) couponError = "Kupon kodu geçersiz veya süresi dolmuş.";
    else if (subtotal < c.minSubtotal) couponError = `Bu kupon ${c.minSubtotal.toLocaleString("tr-TR")} TL ve üzeri sepette geçerli.`;
    else if (c.perCustomerLimit && opts.customerId) {
      const [{ n }] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(orders)
        .where(and(eq(orders.customerId, opts.customerId), eq(orders.campaignId, c.id), eq(orders.paymentStatus, "PAID")));
      if (n >= c.perCustomerLimit) couponError = "Bu kuponu kullanım hakkın doldu.";
      else campaign = c;
    } else campaign = c;
    if (campaign) {
      const d = discountFor(campaign, lines, subtotal, shippingTotal);
      if (!d.freeShipping && d.amount <= 0) {
        couponError = "Bu kupon sepetindeki ürünlerde geçerli değil.";
        campaign = null;
      } else {
        discountTotal = d.amount;
        if (d.freeShipping) shippingTotal = 0;
      }
    }
  }
  if (!campaign) {
    const autos = await db.query.campaigns.findMany({ where: and(isNull(campaigns.code), eq(campaigns.isActive, true)) });
    let best: { c: CampaignRow; amount: number; free: boolean } | null = null;
    for (const c of autos.filter((x) => campaignLive(x))) {
      const d = discountFor(c, lines, subtotal, shippingTotal);
      const value = d.amount + (d.freeShipping ? shippingTotal : 0);
      if (value > 0 && (!best || value > best.amount + (best.free ? shippingTotal : 0))) best = { c, amount: d.amount, free: d.freeShipping };
    }
    if (best) {
      campaign = best.c;
      discountTotal = best.amount;
      if (best.free) shippingTotal = 0;
    }
  }

  let transferDiscount = 0;
  if (opts.paymentMethod === "TRANSFER" && s.payment.transferEnabled && s.payment.transferDiscountPct > 0) {
    transferDiscount = r2(((subtotal - discountTotal) * s.payment.transferDiscountPct) / 100);
  }

  const total = r2(Math.max(0, subtotal - discountTotal - transferDiscount + shippingTotal));
  return {
    lines,
    subtotal,
    discountTotal: r2(discountTotal + transferDiscount),
    shippingTotal: r2(shippingTotal),
    transferDiscount,
    total,
    campaign: campaign ? { id: campaign.id, name: campaign.name, code: campaign.code } : null,
    couponError,
    errors,
  };
}
