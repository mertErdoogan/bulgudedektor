import "server-only";
import { db } from "@/db";
import { products } from "@/db/schema";
import { importMarketOrders, marketPrice, type MarketOrder } from "./marketplace";
import { getSettings, type IntegrationSettings } from "./settings";

/**
 * Hepsiburada satıcı entegrasyonu (Basic auth: API kullanıcı adı + şifre, "{merchantId} - SelfIntegration").
 * - listing-external.hepsiburada.com: stok ve fiyat yükleme (satıcı stok kodu = sitedeki SKU)
 * - oms-external.hepsiburada.com: ödemesi tamamlanmış siparişler (son 7 gün)
 * Gerçek hesapla test edilmemiştir; ilk kullanımda "Şimdi senkronla" ile sonucu kontrol edin.
 * Test ortamı için HB_SANDBOX=1 ortam değişkeniyle *-sit adresleri kullanılır.
 */
const sit = process.env.HB_SANDBOX === "1" ? "-sit" : "";
const LISTING = `https://listing-external${sit}.hepsiburada.com`;
const OMS = `https://oms-external${sit}.hepsiburada.com`;

const ready = (i: IntegrationSettings) => i.hbEnabled && !!i.hbMerchantId && !!i.hbUser && !!i.hbPass;
const headers = (i: IntegrationSettings) => ({
  Authorization: "Basic " + Buffer.from(`${i.hbUser}:${i.hbPass}`).toString("base64"),
  "User-Agent": `${i.hbMerchantId} - SelfIntegration`,
  "Content-Type": "application/json",
  Accept: "application/json",
});

async function upload(i: IntegrationSettings, kind: "inventory-uploads" | "price-uploads", items: object[]) {
  const ids: string[] = [];
  for (let n = 0; n < items.length; n += 100) {
    const res = await fetch(`${LISTING}/listings/merchantid/${i.hbMerchantId}/${kind}`, {
      method: "POST",
      headers: headers(i),
      body: JSON.stringify(items.slice(n, n + 100)),
      signal: AbortSignal.timeout(20000),
    });
    const j = (await res.json().catch(() => null)) as { id?: string; message?: string } | null;
    if (!res.ok) throw new Error(`Hepsiburada ${kind} ${res.status}: ${j?.message ?? "istek reddedildi"}`);
    if (j?.id) ids.push(j.id);
  }
  return ids;
}

export async function pushPriceAndStock() {
  const s = await getSettings();
  const i = s.integrations;
  if (!ready(i)) return { ok: false, message: "Hepsiburada ayarları eksik veya kapalı." };
  const rows = await db.select({ sku: products.sku, price: products.price, stock: products.stock, status: products.status }).from(products);
  if (!rows.length) return { ok: true, message: "Gönderilecek ürün yok." };
  // Hepsiburada'da listelenmemiş SKU'lar yükleme raporunda hata olarak döner; sipariş akışını etkilemez
  await upload(i, "inventory-uploads", rows.map((r) => ({ merchantSku: r.sku, availableStock: r.status === "ACTIVE" ? Math.max(0, r.stock) : 0 })));
  await upload(i, "price-uploads", rows.map((r) => ({ merchantSku: r.sku, price: marketPrice(r.price, i.hbPriceMarkupPct) })));
  return { ok: true, message: `${rows.length} ürünün stok ve fiyatı Hepsiburada'ya gönderildi.` };
}

type Money = { amount?: number } | number | null | undefined;
type HbItem = {
  id?: string;
  orderNumber?: string;
  orderDate?: string;
  merchantSku?: string;
  hepsiburadaSku?: string;
  productBarcode?: string;
  productName?: string;
  quantity?: number;
  unitPrice?: Money;
  totalPrice?: Money;
  customerName?: string;
  cargoCompany?: string;
  shippingAddress?: { name?: string; address?: string; city?: string; town?: string; district?: string; phoneNumber?: string; email?: string; postalCode?: string };
};
const amount = (m: Money) => (typeof m === "number" ? m : (m?.amount ?? 0));
const hbDate = (d: Date) => d.toISOString().slice(0, 16).replace("T", " ");

export async function importOrders() {
  const s = await getSettings();
  const i = s.integrations;
  if (!ready(i)) return { ok: false, message: "Hepsiburada ayarları eksik veya kapalı." };
  const end = new Date();
  const begin = new Date(end.getTime() - 7 * 86400000);
  const items: HbItem[] = [];
  for (let offset = 0; offset < 2000; offset += 100) {
    const url = `${OMS}/orders/merchantid/${i.hbMerchantId}?offset=${offset}&limit=100&begindate=${encodeURIComponent(hbDate(begin))}&enddate=${encodeURIComponent(hbDate(end))}`;
    const res = await fetch(url, { headers: headers(i), signal: AbortSignal.timeout(20000) });
    if (!res.ok) return { ok: false, message: `Hepsiburada siparişleri alınamadı (${res.status}).` };
    const j = (await res.json()) as HbItem[] | { items?: HbItem[]; totalCount?: number };
    const page = Array.isArray(j) ? j : (j.items ?? []);
    items.push(...page);
    if (page.length < 100) break;
  }
  // API satır bazında döner: aynı sipariş numarasındaki satırlar tek siparişte toplanır
  const byOrder = new Map<string, HbItem[]>();
  for (const it of items) if (it.orderNumber) byOrder.set(it.orderNumber, [...(byOrder.get(it.orderNumber) ?? []), it]);
  const list: MarketOrder[] = [...byOrder.entries()].map(([no, lines]) => {
    const a = lines[0].shippingAddress ?? {};
    return {
      channel: "HEPSIBURADA",
      ref: `HB-${no}`,
      orderNumber: no,
      date: lines[0].orderDate ? new Date(lines[0].orderDate) : new Date(),
      email: a.email ?? null,
      phone: a.phoneNumber ?? "",
      total: lines.reduce((x, l) => x + (amount(l.totalPrice) || amount(l.unitPrice) * (l.quantity ?? 1)), 0),
      carrier: lines[0].cargoCompany ?? null,
      address: {
        fullName: a.name || lines[0].customerName || "Hepsiburada müşterisi",
        phone: a.phoneNumber ?? "",
        city: a.city ?? "",
        district: a.town || a.district || "",
        line: a.address ?? "",
        zip: a.postalCode,
      },
      lines: lines.map((l) => ({ barcode: l.productBarcode ?? null, sku: l.merchantSku ?? null, name: l.productName ?? l.hepsiburadaSku ?? "Hepsiburada ürünü", quantity: l.quantity ?? 1, unitPrice: amount(l.unitPrice) })),
    };
  });
  const { created, unmatched } = await importMarketOrders(list);
  const extra = unmatched.length ? ` Eşleşmeyen ürünler (stok düşülmedi): ${unmatched.slice(0, 10).join(", ")}.` : "";
  return { ok: true, message: `${created} yeni Hepsiburada siparişi aktarıldı.${extra}` };
}

export async function hepsiburadaSync() {
  const a = await importOrders().catch((e) => ({ ok: false, message: String(e instanceof Error ? e.message : e) }));
  const b = await pushPriceAndStock().catch((e) => ({ ok: false, message: String(e instanceof Error ? e.message : e) }));
  return { ok: a.ok && b.ok, message: `${a.message} ${b.message}` };
}

export async function isHepsiburadaOn() {
  return ready((await getSettings()).integrations);
}
