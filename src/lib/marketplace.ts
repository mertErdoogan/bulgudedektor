import "server-only";
import { inArray, or } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, products } from "@/db/schema";
import { addOrderEvent, adjustStock } from "./orders";

/** Pazaryerlerinden (Trendyol, Hepsiburada) gelen siparişlerin ortak modeli. */
export type MarketOrder = {
  channel: "TRENDYOL" | "HEPSIBURADA";
  /** Kanal içinde benzersiz paket/sipariş anahtarı; aynı sipariş iki kez alınmaz */
  ref: string;
  orderNumber: string;
  date: Date;
  email: string | null;
  phone: string;
  total: number | null;
  carrier?: string | null;
  tracking?: string | null;
  address: { fullName: string; phone: string; city: string; district: string; line: string; zip?: string };
  lines: { barcode?: string | null; sku?: string | null; name: string; quantity: number; unitPrice: number }[];
};

const LABEL = { TRENDYOL: "Trendyol", HEPSIBURADA: "Hepsiburada" } as const;

/** Siparişleri siteye yazar, stoktan düşer. Ürünler önce barkod, sonra stok kodu (SKU) ile eşleştirilir. */
export async function importMarketOrders(list: MarketOrder[]) {
  if (!list.length) return { created: 0, unmatched: [] as string[] };
  const known = new Set((await db.select({ r: orders.externalRef }).from(orders).where(inArray(orders.externalRef, list.map((o) => o.ref)))).map((x) => x.r));
  const fresh = list.filter((o) => !known.has(o.ref));
  const barcodes = [...new Set(fresh.flatMap((o) => o.lines.map((l) => l.barcode).filter(Boolean) as string[]))];
  const skus = [...new Set(fresh.flatMap((o) => o.lines.map((l) => l.sku).filter(Boolean) as string[]))];
  const prods =
    barcodes.length || skus.length
      ? await db
          .select()
          .from(products)
          .where(or(barcodes.length ? inArray(products.barcode, barcodes) : undefined, skus.length ? inArray(products.sku, skus) : undefined))
      : [];
  const byBarcode = new Map(prods.filter((p) => p.barcode).map((p) => [p.barcode!, p]));
  const bySku = new Map(prods.map((p) => [p.sku, p]));
  const unmatched: string[] = [];
  let created = 0;
  for (const m of fresh) {
    const lines = m.lines.map((l) => {
      const prod = (l.barcode && byBarcode.get(l.barcode)) || (l.sku && bySku.get(l.sku)) || undefined;
      if (!prod) unmatched.push(l.sku || l.barcode || l.name);
      return { prod, name: prod?.name ?? l.name, sku: prod?.sku ?? l.sku ?? l.barcode ?? "-", qty: l.quantity, unit: l.unitPrice, total: l.unitPrice * l.quantity };
    });
    const subtotal = lines.reduce((x, l) => x + l.total, 0);
    await db.transaction(async (tx) => {
      const [o] = await tx
        .insert(orders)
        .values({
          email: m.email || `${m.channel.toLowerCase()}@pazaryeri.local`,
          phone: m.phone.replace(/\D/g, "") || "-",
          status: "PAID",
          paymentStatus: "PAID",
          paidAt: m.date,
          paymentMethod: "CARD",
          paymentRef: m.orderNumber,
          channel: m.channel,
          externalRef: m.ref,
          subtotal,
          total: m.total ?? subtotal,
          shippingAddress: m.address,
          carrier: m.carrier ?? null,
          trackingNumber: m.tracking ?? null,
          internalNote: `${LABEL[m.channel]} sipariş no ${m.orderNumber}. Kargo etiketi ve durum güncellemesi ${LABEL[m.channel]} panelinden yapılır.`,
          createdAt: m.date,
        })
        .returning({ id: orders.id });
      await tx.insert(orderItems).values(lines.map((l) => ({ orderId: o.id, productId: l.prod?.id ?? null, name: l.name, sku: l.sku, imageUrl: null, unitPrice: l.unit, unitCost: l.prod?.costPrice ?? null, quantity: l.qty, total: l.total })));
      for (const l of lines) if (l.prod) await adjustStock(tx, l.prod.id, -l.qty, "SALE", null, `${LABEL[m.channel]} ${m.orderNumber}`);
      await addOrderEvent(tx, o.id, "created", `${LABEL[m.channel]}'dan aktarıldı.`, null, false);
    });
    created++;
  }
  if (created) {
    const { notifyStaff } = await import("./notify");
    await notifyStaff({ perm: "orders.view", kind: "order", title: `${created} yeni ${LABEL[fresh[0].channel]} siparişi`, href: "/admin/siparisler?durum=PAID" });
  }
  return { created, unmatched: [...new Set(unmatched)] };
}

/** Pazaryerine gönderilecek fiyat (komisyon farkı eklenmiş, kuruşa yuvarlanmış). */
export const marketPrice = (price: number, markupPct: number) => Math.round(price * (1 + (markupPct || 0) / 100) * 100) / 100;
