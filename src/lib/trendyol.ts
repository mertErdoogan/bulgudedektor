import "server-only";
import { inArray, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, products } from "@/db/schema";
import { addOrderEvent, adjustStock } from "./orders";
import { getSettings, type IntegrationSettings } from "./settings";

/**
 * Trendyol satıcı entegrasyonu (https://apigw.trendyol.com/integration, Basic auth + "{satıcıId} - SelfIntegration").
 * - pushPriceAndStock: aktif ürünlerin fiyat/stok bilgisini barkod eşleşmesiyle gönderir (ürün kartı Trendyol panelinde açılmış olmalı).
 * - importOrders: son 7 günün yeni paketlerini (Order V2) siteye sipariş olarak alır ve stoktan düşer; aynı paket iki kez alınmaz.
 * Gerçek hesapla test edilmemiştir; ilk kullanımda "Şimdi senkronla" ile sonucu kontrol edin.
 */
const BASE = "https://apigw.trendyol.com/integration";

function headers(i: IntegrationSettings) {
  return {
    Authorization: "Basic " + Buffer.from(`${i.trendyolApiKey}:${i.trendyolApiSecret}`).toString("base64"),
    "User-Agent": `${i.trendyolSupplierId} - SelfIntegration`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

const ready = (i: IntegrationSettings) => i.trendyolEnabled && !!i.trendyolSupplierId && !!i.trendyolApiKey && !!i.trendyolApiSecret;

export async function pushPriceAndStock() {
  const s = await getSettings();
  const i = s.integrations;
  if (!ready(i)) return { ok: false, message: "Trendyol ayarları eksik veya kapalı." };
  const rows = await db
    .select({ barcode: products.barcode, price: products.price, compareAtPrice: products.compareAtPrice, stock: products.stock, status: products.status })
    .from(products)
    .where(isNotNull(products.barcode));
  const k = 1 + (i.trendyolPriceMarkupPct || 0) / 100;
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const items = rows
    .filter((r) => r.barcode)
    .map((r) => {
      const sale = r2(r.price * k);
      const list = r2(Math.max(sale, (r.compareAtPrice ?? 0) * k));
      return { barcode: r.barcode!, quantity: r.status === "ACTIVE" ? Math.max(0, Math.min(20000, r.stock)) : 0, salePrice: sale, listPrice: list };
    });
  if (!items.length) return { ok: true, message: "Barkodu olan ürün yok; gönderilecek bir şey bulunamadı." };
  const ids: string[] = [];
  for (let n = 0; n < items.length; n += 1000) {
    const res = await fetch(`${BASE}/inventory/sellers/${i.trendyolSupplierId}/products/price-and-inventory`, {
      method: "POST",
      headers: headers(i),
      body: JSON.stringify({ items: items.slice(n, n + 1000) }),
      signal: AbortSignal.timeout(20000),
    });
    const j = (await res.json().catch(() => null)) as { batchRequestId?: string; errors?: { message?: string }[] } | null;
    if (!res.ok) return { ok: false, message: `Trendyol ${res.status}: ${j?.errors?.[0]?.message ?? "istek reddedildi"}` };
    if (j?.batchRequestId) ids.push(j.batchRequestId);
  }
  return { ok: true, message: `${items.length} ürünün fiyat/stok bilgisi gönderildi${ids.length ? ` (işlem no ${ids.join(", ")})` : ""}.` };
}

type TyLine = { barcode?: string; quantity?: number; price?: number; amount?: number; productName?: string; merchantSku?: string; stockCode?: string };
type TyPackage = {
  id?: number;
  shipmentPackageId?: number;
  orderNumber?: string;
  orderDate?: number;
  status?: string;
  customerFirstName?: string;
  customerLastName?: string;
  customerEmail?: string;
  totalPrice?: number;
  cargoProviderName?: string;
  cargoTrackingNumber?: number | string;
  shipmentAddress?: { fullName?: string; firstName?: string; lastName?: string; address1?: string; fullAddress?: string; city?: string; district?: string; postalCode?: string; phone?: string | number | null };
  lines?: TyLine[];
};

export async function importOrders() {
  const s = await getSettings();
  const i = s.integrations;
  if (!ready(i)) return { ok: false, message: "Trendyol ayarları eksik veya kapalı." };
  const end = Date.now();
  const start = end - 7 * 86400000;
  const pkgs: TyPackage[] = [];
  for (let page = 0; page < 20; page++) {
    const url = `${BASE}/order/sellers/${i.trendyolSupplierId}/v2/orders?status=Created&startDate=${start}&endDate=${end}&orderByField=PackageLastModifiedDate&orderByDirection=DESC&size=200&page=${page}`;
    const res = await fetch(url, { headers: headers(i), signal: AbortSignal.timeout(20000) });
    if (!res.ok) return { ok: false, message: `Trendyol siparişleri alınamadı (${res.status}).` };
    const j = (await res.json()) as { content?: TyPackage[]; totalPages?: number };
    pkgs.push(...(j.content ?? []));
    if (!j.totalPages || page + 1 >= j.totalPages) break;
  }
  if (!pkgs.length) return { ok: true, message: "Yeni Trendyol siparişi yok." };

  const refs = pkgs.map((p) => `TY-${p.shipmentPackageId ?? p.id}`);
  const known = new Set((await db.select({ r: orders.externalRef }).from(orders).where(inArray(orders.externalRef, refs))).map((x) => x.r));
  const barcodes = [...new Set(pkgs.flatMap((p) => (p.lines ?? []).map((l) => l.barcode).filter(Boolean) as string[]))];
  const prods = barcodes.length ? await db.select().from(products).where(inArray(products.barcode, barcodes)) : [];
  const byBarcode = new Map(prods.map((p) => [p.barcode!, p]));
  let created = 0;
  const unmatched: string[] = [];
  for (const p of pkgs) {
    const ref = `TY-${p.shipmentPackageId ?? p.id}`;
    if (known.has(ref)) continue;
    const a = p.shipmentAddress ?? {};
    const lines = (p.lines ?? []).map((l) => {
      const prod = l.barcode ? byBarcode.get(l.barcode) : undefined;
      if (!prod) unmatched.push(l.barcode ?? l.productName ?? "?");
      const qty = l.quantity ?? 1;
      const unit = l.price ?? l.amount ?? 0;
      return { prod, name: prod?.name ?? l.productName ?? "Trendyol ürünü", sku: prod?.sku ?? l.merchantSku ?? l.stockCode ?? l.barcode ?? "-", qty, unit, total: unit * qty };
    });
    const subtotal = lines.reduce((x, l) => x + l.total, 0);
    await db.transaction(async (tx) => {
      const [o] = await tx
        .insert(orders)
        .values({
          email: p.customerEmail || "trendyol@pazaryeri.local",
          phone: String(a.phone ?? "").replace(/\D/g, "") || "-",
          status: "PAID",
          paymentStatus: "PAID",
          paymentMethod: "CARD",
          paymentRef: p.orderNumber ?? null,
          channel: "TRENDYOL",
          externalRef: ref,
          subtotal,
          total: p.totalPrice ?? subtotal,
          shippingAddress: {
            fullName: a.fullName || [a.firstName, a.lastName].filter(Boolean).join(" ") || [p.customerFirstName, p.customerLastName].filter(Boolean).join(" ") || "Trendyol müşterisi",
            phone: String(a.phone ?? ""),
            city: a.city ?? "",
            district: a.district ?? "",
            line: a.fullAddress || a.address1 || "",
            zip: a.postalCode ?? undefined,
          },
          carrier: p.cargoProviderName ?? null,
          trackingNumber: p.cargoTrackingNumber ? String(p.cargoTrackingNumber) : null,
          internalNote: `Trendyol sipariş no ${p.orderNumber ?? "-"} · paket ${p.shipmentPackageId ?? p.id}. Kargo etiketi ve durum güncellemesi Trendyol panelinden yapılır.`,
          createdAt: p.orderDate ? new Date(p.orderDate) : new Date(),
        })
        .returning({ id: orders.id });
      await tx.insert(orderItems).values(lines.map((l) => ({ orderId: o.id, productId: l.prod?.id ?? null, name: l.name, sku: l.sku, imageUrl: null, unitPrice: l.unit, unitCost: l.prod?.costPrice ?? null, quantity: l.qty, total: l.total })));
      for (const l of lines) if (l.prod) await adjustStock(tx, l.prod.id, -l.qty, "SALE", null, `Trendyol ${p.orderNumber ?? ""}`);
      await addOrderEvent(tx, o.id, "created", "Trendyol'dan aktarıldı.", null, false);
    });
    created++;
  }
  const extra = unmatched.length ? ` Eşleşmeyen barkodlar (stok düşülmedi): ${[...new Set(unmatched)].slice(0, 10).join(", ")}.` : "";
  return { ok: true, message: `${created} yeni Trendyol siparişi aktarıldı.${extra}` };
}

/** Cron ve "Şimdi senkronla" düğmesi: önce siparişleri al (stok düşsün), sonra güncel stok/fiyatı gönder. */
export async function trendyolSync() {
  const a = await importOrders().catch((e) => ({ ok: false, message: String(e) }));
  const b = await pushPriceAndStock().catch((e) => ({ ok: false, message: String(e) }));
  return { ok: a.ok && b.ok, message: `${a.message} ${b.message}` };
}

export async function isTrendyolOn() {
  const s = await getSettings();
  return ready(s.integrations);
}

