import "server-only";
import { isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { importMarketOrders, marketPrice } from "./marketplace";
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
  const items = rows
    .filter((r) => r.barcode)
    .map((r) => {
      const sale = marketPrice(r.price, i.trendyolPriceMarkupPct);
      const list = Math.max(sale, marketPrice(r.compareAtPrice ?? 0, i.trendyolPriceMarkupPct));
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

  const { created, unmatched } = await importMarketOrders(
    pkgs.map((p) => {
      const a = p.shipmentAddress ?? {};
      return {
        channel: "TRENDYOL" as const,
        ref: `TY-${p.shipmentPackageId ?? p.id}`,
        orderNumber: p.orderNumber ?? String(p.id ?? ""),
        date: p.orderDate ? new Date(p.orderDate) : new Date(),
        email: p.customerEmail ?? null,
        phone: String(a.phone ?? ""),
        total: p.totalPrice ?? null,
        carrier: p.cargoProviderName ?? null,
        tracking: p.cargoTrackingNumber ? String(p.cargoTrackingNumber) : null,
        address: {
          fullName: a.fullName || [a.firstName, a.lastName].filter(Boolean).join(" ") || [p.customerFirstName, p.customerLastName].filter(Boolean).join(" ") || "Trendyol müşterisi",
          phone: String(a.phone ?? ""),
          city: a.city ?? "",
          district: a.district ?? "",
          line: a.fullAddress || a.address1 || "",
          zip: a.postalCode ?? undefined,
        },
        lines: (p.lines ?? []).map((l) => ({ barcode: l.barcode ?? null, sku: l.merchantSku ?? l.stockCode ?? null, name: l.productName ?? "Trendyol ürünü", quantity: l.quantity ?? 1, unitPrice: l.price ?? l.amount ?? 0 })),
      };
    }),
  );
  const extra = unmatched.length ? ` Eşleşmeyen ürünler (stok düşülmedi): ${unmatched.slice(0, 10).join(", ")}.` : "";
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

