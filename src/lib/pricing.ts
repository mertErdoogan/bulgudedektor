import "server-only";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { bundleItems, bundles, campaigns, orders, products } from "@/db/schema";
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
  /** Paket (kombin) indirimi; discountTotal'ın içindedir */
  bundleDiscount: number;
  bundles: AppliedBundle[];
  /** Paket tamam ama kampanya daha avantajlı olduğu için paket indirimi uygulanmadı (bilgi) */
  bundleNote?: string;
  couponError?: string;
  /** Kupon geçerli ama sepetteki otomatik kampanya daha avantajlı olduğu için uygulanmadı (bilgi; siparişi engellemez) */
  couponNote?: string;
  errors: string[];
  /**
   * Sepette durup satılamayan ürünler için düzeltme: istemci bunları sepetten çıkarır / adedi düşürür ve
   * kullanıcıya bir kez bildirir. Böylece uyarı her yeniden hesaplamada tekrar çıkmaz ve ödeme kilitlenmez.
   */
  fixes: { productId: string; quantity: number; message: string }[];
};

const r2 = (n: number) => Math.round(n * 100) / 100;

export type AppliedBundle = { id: string; name: string; sets: number; amount: number };

type BundleRow = typeof bundles.$inferSelect & { items: (typeof bundleItems.$inferSelect)[] };

export function bundleLive(b: Pick<BundleRow, "isActive" | "startsAt" | "endsAt">, now = new Date()) {
  return b.isActive && (!b.startsAt || b.startsAt <= now) && (!b.endsAt || b.endsAt >= now);
}

/** Bir paket setinin indirimi (paket ürünlerinin güncel fiyatıyla) */
export function bundleSetDiscount(b: Pick<BundleRow, "discountType" | "discountValue">, setPrice: number) {
  if (setPrice <= 0 || b.discountValue <= 0) return 0;
  // Yüzde indirim tam TL'ye yuvarlanır ("12.354 TL kazanç" kuruşlu görünmesin)
  return b.discountType === "PERCENT" ? Math.round((setPrice * Math.min(b.discountValue, 90)) / 100) : r2(Math.min(b.discountValue, setPrice));
}

/**
 * Sepetteki tamamlanmış paketler. Bir ürün birden çok pakette olabilir: en çok kazandıran paket önce uygulanır,
 * her adet yalnızca bir pakette sayılır (çift indirim olmaz).
 */
async function bundleDiscounts(lines: PricedLine[]): Promise<{ total: number; applied: AppliedBundle[] }> {
  if (lines.length < 2) return { total: 0, applied: [] };
  const ids = lines.map((l) => l.productId);
  const cand = (await db.query.bundles.findMany({
    where: and(eq(bundles.isActive, true), inArray(bundles.id, db.select({ id: bundleItems.bundleId }).from(bundleItems).where(inArray(bundleItems.productId, ids)))),
    with: { items: true },
  })) as BundleRow[];
  const left = new Map(lines.map((l) => [l.productId, l.quantity]));
  const price = new Map(lines.map((l) => [l.productId, l.unitPrice]));
  const scored = cand
    .filter((b) => bundleLive(b) && b.items.length >= 2 && b.items.every((i) => price.has(i.productId)))
    .map((b) => ({ b, per: bundleSetDiscount(b, b.items.reduce((s, i) => s + price.get(i.productId)! * i.quantity, 0)) }))
    .filter((x) => x.per > 0)
    .sort((a, b) => b.per - a.per);
  const applied: AppliedBundle[] = [];
  for (const { b, per } of scored) {
    const sets = Math.min(...b.items.map((i) => Math.floor((left.get(i.productId) ?? 0) / Math.max(1, i.quantity))));
    if (sets <= 0) continue;
    for (const i of b.items) left.set(i.productId, (left.get(i.productId) ?? 0) - sets * Math.max(1, i.quantity));
    applied.push({ id: b.id, name: b.name, sets, amount: r2(per * sets) });
  }
  return { total: r2(applied.reduce((s, a) => s + a.amount, 0)), applied };
}

type CampaignRow = typeof campaigns.$inferSelect;

function campaignLive(c: CampaignRow, now = new Date()) {
  if (!c.isActive) return false;
  if (c.startsAt && c.startsAt > now) return false;
  if (c.endsAt && c.endsAt < now) return false;
  if (c.usageLimit !== null && c.usageCount >= c.usageLimit) return false;
  return true;
}

/** Satır bu kampanyanın kapsamında mı (marka / kategori / ürün) */
export function lineEligible(c: Pick<CampaignRow, "scope" | "targetIds">, l: { productId: string | null; brandId: string | null; categoryId: string | null }) {
  if (c.scope === "ALL") return true;
  if (c.scope === "BRAND") return !!l.brandId && c.targetIds.includes(l.brandId);
  if (c.scope === "CATEGORY") return !!l.categoryId && c.targetIds.includes(l.categoryId);
  return !!l.productId && c.targetIds.includes(l.productId);
}

function eligibleSubtotal(c: CampaignRow, lines: PricedLine[]) {
  return lines.filter((l) => lineEligible(c, l)).reduce((s, l) => s + l.total, 0);
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
  const fixes: Quote["fixes"] = [];
  const lines: PricedLine[] = [];
  for (const [pid, qty] of merged) {
    const p = rows.find((r) => r.id === pid);
    if (!p) {
      errors.push("Sepetteki bir ürün artık satışta değil, sepetten çıkarıldı.");
      fixes.push({ productId: pid, quantity: 0, message: "Sepetindeki bir ürün artık satışta olmadığı için sepetten çıkarıldı." });
      continue;
    }
    let quantity = qty;
    let error: string | undefined;
    if (!p.allowBackorder && p.stock < qty) {
      quantity = Math.max(0, p.stock);
      error = p.stock <= 0 ? "Stokta yok" : `Stokta ${p.stock} adet var`;
      errors.push(`${p.name}: ${error}`);
      fixes.push({ productId: pid, quantity, message: p.stock <= 0 ? `${p.name} stokta kalmadığı için sepetten çıkarıldı.` : `${p.name}: stokta ${p.stock} adet kaldığı için adet ${p.stock} yapıldı.` });
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
  let couponNote: string | undefined;
  let discountTotal = 0;
  // Otomatik (kodsuz) kampanyaların müşteri için en avantajlısı
  const autos = await db.query.campaigns.findMany({ where: and(isNull(campaigns.code), eq(campaigns.isActive, true)) });
  let bestAuto: { c: CampaignRow; amount: number; free: boolean; value: number } | null = null;
  for (const c of autos.filter((x) => campaignLive(x))) {
    const d = discountFor(c, lines, subtotal, shippingTotal);
    const value = d.amount + (d.freeShipping ? shippingTotal : 0);
    if (value > 0 && (!bestAuto || value > bestAuto.value)) bestAuto = { c, amount: d.amount, free: d.freeShipping, value };
  }
  const code = opts.couponCode?.trim().toUpperCase();
  if (code) {
    let coupon: CampaignRow | null = null;
    const c = await db.query.campaigns.findFirst({ where: eq(sql`upper(${campaigns.code})`, code) });
    if (!c || !campaignLive(c)) couponError = "Kupon kodu geçersiz veya süresi dolmuş.";
    else if (subtotal < c.minSubtotal) couponError = `Bu kupon ${c.minSubtotal.toLocaleString("tr-TR")} TL ve üzeri sepette geçerli.`;
    else if (c.perCustomerLimit && opts.customerId) {
      const [{ n }] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(orders)
        .where(and(eq(orders.customerId, opts.customerId), eq(orders.campaignId, c.id), eq(orders.paymentStatus, "PAID")));
      if (n >= c.perCustomerLimit) couponError = "Bu kuponu kullanım hakkın doldu.";
      else coupon = c;
    } else coupon = c;
    if (coupon) {
      const d = discountFor(coupon, lines, subtotal, shippingTotal);
      const value = d.amount + (d.freeShipping ? shippingTotal : 0);
      if (!d.freeShipping && d.amount <= 0) {
        couponError = "Bu kupon sepetindeki ürünlerde geçerli değil.";
      } else if (bestAuto && bestAuto.value >= value) {
        // Kampanyalar birleşmez: kupon, sepetteki kampanyadan az kazandırıyorsa müşteri aleyhine uygulanmaz
        couponNote = `Sepetindeki "${bestAuto.c.name}" kampanyası daha avantajlı; kupon yerine o uygulandı. Kampanyalar birleştirilmez.`;
      } else {
        campaign = coupon;
        discountTotal = d.amount;
        if (d.freeShipping) shippingTotal = 0;
      }
    }
  }
  if (!campaign && bestAuto) {
    campaign = bestAuto.c;
    discountTotal = bestAuto.amount;
    if (bestAuto.free) shippingTotal = 0;
  }

  // Paket indirimi: kampanya/kuponla birleşmez, müşteri için hangisi fazlaysa o uygulanır (ücretsiz kargo hariç)
  const bundle = await bundleDiscounts(lines);
  let bundleDiscount = bundle.total;
  let appliedBundles = bundle.applied;
  let bundleNote: string | undefined;
  if (bundleDiscount > 0 && discountTotal > 0) {
    if (bundleDiscount >= discountTotal) {
      if (code && campaign?.code) couponNote = "Paket indirimi daha avantajlı; kupon yerine paket indirimi uygulandı. İndirimler birleştirilmez.";
      campaign = null;
      discountTotal = 0;
    } else {
      bundleNote = `Sepetindeki "${campaign!.name}" kampanyası paket indiriminden daha avantajlı; o uygulandı. İndirimler birleştirilmez.`;
      bundleDiscount = 0;
      appliedBundles = [];
    }
  }
  discountTotal = r2(discountTotal + bundleDiscount);

  let transferDiscount = 0;
  if (opts.paymentMethod === "TRANSFER" && s.payment.transferEnabled && s.payment.transferDiscountPct > 0) {
    transferDiscount = Math.round(((subtotal - discountTotal) * s.payment.transferDiscountPct) / 100); // tam TL: havale tutarı kuruşlu olmasın
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
    bundleDiscount,
    bundles: appliedBundles,
    bundleNote,
    couponError,
    couponNote,
    fixes,
    errors,
  };
}

/**
 * Ürün sayfası için: bu ürün tek başına sepete eklenince otomatik (kodsuz) kampanyalardan düşecek en yüksek indirim.
 * Sepet hesabıyla (quoteCart) aynı kuralları kullanır; böylece ürün sayfasında yazan fiyat sepette birebir çıkar.
 */
export async function autoDealFor(p: { id: string; price: number; brandId: string | null; categoryId: string | null }) {
  const autos = await db.query.campaigns.findMany({ where: and(isNull(campaigns.code), eq(campaigns.isActive, true)) });
  const line: PricedLine = { productId: p.id, name: "", sku: "", slug: "", imageUrl: null, unitPrice: p.price, unitCost: null, quantity: 1, total: p.price, brandId: p.brandId, categoryId: p.categoryId, available: 1 };
  let best: { amount: number; name: string } | null = null;
  for (const c of autos.filter((x) => campaignLive(x) && x.type !== "FREE_SHIPPING")) {
    const d = discountFor(c, [line], p.price, 0);
    if (d.amount > 0 && (!best || d.amount > best.amount)) best = { amount: d.amount, name: c.name };
  }
  return best;
}
