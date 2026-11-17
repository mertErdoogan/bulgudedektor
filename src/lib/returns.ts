/**
 * İade birimleri: siparişteki her ürün adedi tek tek seçilebilir.
 * Seri numaralı cihazlarda birim = cihazın kendisi (seri no), diğerlerinde "1. adet, 2. adet…".
 * Reddedilmemiş her talep, içindeki birimleri "alınmış" sayar; aynı birim iki kez iade edilemez.
 * Eski kayıtlar (items boş) tüm siparişi kapsar.
 */
import type { ReturnItem } from "@/db/schema";

export const OPEN_RETURN = ["REQUESTED", "APPROVED", "RECEIVED"] as const;
export const isOpenReturn = (status: string) => (OPEN_RETURN as readonly string[]).includes(status);

type ItemLike = { id: string; name: string; quantity: number; unitPrice: number; imageUrl?: string | null; serials?: { serial: string }[] };
type ReturnLike = { status: string; items: ReturnItem[] };

export type Unit = { key: string; label: string; serial: string | null; taken: boolean };
export type UnitGroup = { item: ItemLike; units: Unit[]; takenCount: number };

export function unitGroups(items: ItemLike[], returns: ReturnLike[]): UnitGroup[] {
  const live = returns.filter((r) => r.status !== "REJECTED");
  const wholeOrder = live.some((r) => !r.items?.length);
  return items.map((it) => {
    const claimed = live.flatMap((r) => r.items ?? []).filter((x) => x.orderItemId === it.id);
    const claimedSerials = new Set(claimed.flatMap((x) => x.serials));
    let claimedPlain = claimed.reduce((n, x) => n + x.quantity - x.serials.length, 0);
    // İadesi tamamlanan cihazın seri numarası siparişten ayrılır; yine de o adet "kullanılmış" sayılmalı
    const serials = [...new Set([...(it.serials ?? []).map((s) => s.serial), ...claimedSerials])].slice(0, it.quantity);
    const units: Unit[] = serials.map((sn) => ({ key: `${it.id}|${sn}`, label: `Seri no ${sn}`, serial: sn, taken: wholeOrder || claimedSerials.has(sn) }));
    for (let n = serials.length + 1; n <= it.quantity; n++) {
      const taken = wholeOrder || claimedPlain > 0;
      if (!wholeOrder && claimedPlain > 0) claimedPlain--;
      units.push({ key: `${it.id}|#${n}`, label: it.quantity > 1 ? `${n}. adet` : "1 adet", serial: null, taken });
    }
    return { item: it, units, takenCount: units.filter((u) => u.taken).length };
  });
}

export const hasReturnableUnit = (groups: UnitGroup[]) => groups.some((g) => g.units.some((u) => !u.taken));

/** Formdan gelen birim anahtarlarını doğrular ve iade kalemlerine çevirir */
export function pickUnits(keys: string[], groups: UnitGroup[]): ReturnItem[] | string {
  const want = new Set(keys);
  if (!want.size) return "İade etmek istediğin ürünü seç.";
  const out: ReturnItem[] = [];
  for (const g of groups) {
    const chosen = g.units.filter((u) => want.has(u.key));
    if (!chosen.length) continue;
    if (chosen.some((u) => u.taken)) return `${g.item.name} için bu adet zaten iade sürecinde.`;
    chosen.forEach((u) => want.delete(u.key));
    out.push({ orderItemId: g.item.id, name: g.item.name, quantity: chosen.length, unitPrice: g.item.unitPrice, serials: chosen.flatMap((u) => (u.serial ? [u.serial] : [])) });
  }
  if (want.size) return "Seçilen ürün bu siparişte bulunamadı. Sayfayı yenileyip tekrar dene.";
  return out;
}

export const returnValue = (items: ReturnItem[]) => items.reduce((n, x) => n + x.unitPrice * x.quantity, 0);

export const describeReturn = (items: ReturnItem[]) =>
  items.length ? items.map((x) => `${x.quantity}× ${x.name}${x.serials.length ? ` (seri ${x.serials.join(", ")})` : ""}`).join(", ") : "Siparişin tamamı";

/** İade adımları (müşteri ekranı) */
export const RETURN_STEPS = [
  { key: "REQUESTED", label: "Talep alındı", hint: "1 iş günü içinde inceleyip ücretsiz kargo kodunu ileteceğiz." },
  { key: "APPROVED", label: "Kargo kodu hazır", hint: "Ürünü kutusu ve aksesuarlarıyla paketle, kodu kargo şubesinde söyle. Ücret ödemezsin." },
  { key: "RECEIVED", label: "Ürün bize ulaştı", hint: "Ürünü kontrol ediyoruz; genelde 2 iş günü sürer." },
  { key: "REFUNDED", label: "Para iadesi yapıldı", hint: "Karta yapılan iadenin hesabına geçmesi bankana göre 2–10 iş günü sürebilir." },
] as const;

/**
 * İade edilen kalemler için müşterinin gerçekten ödediği tutar. Siparişteki indirim satırlara dağıtılır:
 * kampanya indirimi yalnızca kampanya kapsamındaki ürünlere (ör. sadece Minelab), kalan indirim (havale, personel
 * indirimi) bütün ürünlere tutarları oranında. Böylece "listede 7.990 TL ama müşteri 7.830,20 TL ödedi" durumunda
 * 7.830,20 TL önerilir; fazla para iadesi olmaz. Kargo ücreti dahil değildir.
 */
export async function paidShare(orderId: string, items: ReturnItem[]): Promise<number> {
  const { db } = await import("@/db");
  const { orders } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  const { lineEligible } = await import("./pricing");
  const o = await db.query.orders.findFirst({ where: eq(orders.id, orderId), with: { items: { with: { product: true } }, campaign: true } });
  if (!o) return returnValue(items);
  const lines = o.items.map((i) => ({ id: i.id, total: i.total, productId: i.productId, brandId: i.product?.brandId ?? null, categoryId: i.product?.categoryId ?? null }));
  const subtotal = lines.reduce((n, l) => n + l.total, 0);
  if (subtotal <= 0 || o.discountTotal <= 0) return returnValue(items);
  const c = o.campaign && o.campaign.type !== "FREE_SHIPPING" ? o.campaign : null;
  const eligible = c ? lines.filter((l) => lineEligible(c, l)) : [];
  const eligibleTotal = eligible.reduce((n, l) => n + l.total, 0);
  let campaignAmt = 0;
  if (c && eligibleTotal > 0) {
    campaignAmt = c.type === "PERCENT" ? (eligibleTotal * c.value) / 100 : Math.min(c.value, eligibleTotal);
    if (c.maxDiscount !== null) campaignAmt = Math.min(campaignAmt, c.maxDiscount);
  }
  campaignAmt = Math.min(campaignAmt, o.discountTotal);
  const rest = o.discountTotal - campaignAmt;
  const share = (lineId: string) => {
    const l = lines.find((x) => x.id === lineId);
    if (!l) return 0;
    const camp = c && eligibleTotal > 0 && eligible.some((x) => x.id === lineId) ? (campaignAmt * l.total) / eligibleTotal : 0;
    const afterCamp = subtotal - campaignAmt;
    const other = afterCamp > 0 ? (rest * (l.total - camp)) / afterCamp : 0;
    return l.total - camp - other; // satırın ödenen tutarı
  };
  let sum = 0;
  for (const x of items) {
    const it = o.items.find((i) => i.id === x.orderItemId);
    if (!it || it.quantity <= 0) continue;
    sum += (share(it.id) / it.quantity) * x.quantity;
  }
  return Math.round(sum * 100) / 100;
}
