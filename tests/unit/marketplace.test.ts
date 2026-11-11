/**
 * Pazaryeri adaptörleri: sahte API yanıtlarıyla sipariş aktarımı, stok düşümü, tekrar alınmama ve fiyat/stok gönderimi.
 * Demo veritabanı gerekir (npm run db:seed). Çalıştırma: npx tsx tests/unit/marketplace.test.ts
 */
import "dotenv/config";
import Module from "node:module";
import { join } from "node:path";
import assert from "node:assert/strict";
import { asc, eq, inArray } from "drizzle-orm";
import { db } from "../../src/db";
import { orderItems, orders, products, settings } from "../../src/db/schema";

// "server-only" Next.js içinde gelir; düz Node'da boş modüle yönlendir
const M = Module as unknown as { _resolveFilename: (r: string, ...a: unknown[]) => string };
const orig = M._resolveFilename;
M._resolveFilename = (r, ...a) => (r === "server-only" ? join(__dirname, "../shims/server-only.js") : orig(r, ...a));

const calls: { url: string; method: string; body: unknown; headers: Record<string, string> }[] = [];
let fake: (url: string) => unknown = () => ({});
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = String(input);
  calls.push({ url, method: init?.method ?? "GET", body: init?.body ? JSON.parse(String(init.body)) : null, headers: (init?.headers ?? {}) as Record<string, string> });
  return new Response(JSON.stringify(fake(url)), { status: 200, headers: { "content-type": "application/json" } });
}) as typeof fetch;

(async () => {
  await db.update(products).set({ barcode: null }).where(eq(products.barcode, "TEST-BARKOD-ARENA-1"));
  const [p1, p2] = await db.select().from(products).where(eq(products.status, "ACTIVE")).orderBy(asc(products.sku)).limit(2);
  await db.update(products).set({ barcode: "TEST-BARKOD-ARENA-1", stock: 10 }).where(eq(products.id, p1.id));
  await db.update(products).set({ stock: 10 }).where(eq(products.id, p2.id));
  await db.delete(orders).where(inArray(orders.channel, ["TRENDYOL", "HEPSIBURADA"]));
  const cur = (await db.query.settings.findFirst({ where: eq(settings.key, "integrations") }))?.value ?? {};
  const value = { ...cur, trendyolEnabled: true, trendyolSupplierId: "12345", trendyolApiKey: "k", trendyolApiSecret: "s", trendyolPriceMarkupPct: 10, hbEnabled: true, hbMerchantId: "m-1", hbUser: "u", hbPass: "p", hbPriceMarkupPct: 0 };
  await db.insert(settings).values({ key: "integrations", value }).onConflictDoUpdate({ target: settings.key, set: { value } });

  // ── Trendyol
  const ty = await import("../../src/lib/trendyol");
  fake = (url) =>
    url.includes("/orders")
      ? { totalPages: 1, content: [{ shipmentPackageId: 777, orderNumber: "TY100", orderDate: Date.now(), totalPrice: 1000, customerEmail: "pf+x@trendyolmail.com", shipmentAddress: { fullName: "Ayşe Y", city: "Bursa", district: "Nilüfer", fullAddress: "Adres 1", phone: null }, lines: [{ barcode: "TEST-BARKOD-ARENA-1", quantity: 2, price: 500, productName: "X" }, { barcode: "YOK", quantity: 1, price: 0, productName: "Bilinmeyen" }] }] }
      : { batchRequestId: "b-1" };
  let r = await ty.trendyolSync();
  assert.ok(r.ok, r.message);
  assert.match(r.message, /1 yeni Trendyol siparişi/);
  assert.match(r.message, /Eşleşmeyen.*YOK/);
  const tyOrder = await db.query.orders.findFirst({ where: eq(orders.externalRef, "TY-777") });
  assert.ok(tyOrder && tyOrder.channel === "TRENDYOL" && tyOrder.status === "PAID");
  const its = await db.select().from(orderItems).where(eq(orderItems.orderId, tyOrder.id));
  assert.equal(its.length, 2);
  assert.equal((await db.query.products.findFirst({ where: eq(products.id, p1.id) }))!.stock, 8, "Trendyol satışı stoktan düşmeli");
  const push = calls.find((c) => c.url.includes("price-and-inventory"))!;
  assert.equal(push.headers["User-Agent"], "12345 - SelfIntegration");
  const item = (push.body as { items: { barcode: string; salePrice: number; quantity: number }[] }).items.find((x) => x.barcode === "TEST-BARKOD-ARENA-1")!;
  assert.equal(item.quantity, 8);
  assert.equal(item.salePrice, Math.round(p1.price * 1.1 * 100) / 100, "%10 fiyat farkı uygulanmalı");
  r = await ty.trendyolSync();
  assert.match(r.message, /0 yeni Trendyol/, "aynı paket iki kez alınmamalı");

  // ── Hepsiburada (satır bazlı yanıt, SKU ile eşleşme)
  calls.length = 0;
  const hb = await import("../../src/lib/hepsiburada");
  fake = (url) =>
    url.includes("/orders/")
      ? { totalCount: 2, items: [
          { id: "l1", orderNumber: "HB55", orderDate: new Date().toISOString(), merchantSku: p2.sku, quantity: 3, unitPrice: { amount: 100 }, totalPrice: { amount: 300 }, shippingAddress: { name: "Can K", city: "İzmir", town: "Bornova", address: "Sok. 2", phoneNumber: "05321112233", email: "c@hb.com" } },
          { id: "l2", orderNumber: "HB55", merchantSku: p1.sku, quantity: 1, unitPrice: { amount: 50 }, totalPrice: { amount: 50 } },
        ] }
      : { id: "u-1" };
  r = await hb.hepsiburadaSync();
  assert.ok(r.ok, r.message);
  assert.match(r.message, /1 yeni Hepsiburada siparişi/);
  const hbOrder = await db.query.orders.findFirst({ where: eq(orders.externalRef, "HB-HB55") });
  assert.ok(hbOrder && hbOrder.total === 350 && hbOrder.shippingAddress.district === "Bornova");
  assert.equal((await db.query.products.findFirst({ where: eq(products.id, p2.id) }))!.stock, 7);
  assert.equal((await db.query.products.findFirst({ where: eq(products.id, p1.id) }))!.stock, 7);
  const inv = calls.find((c) => c.url.endsWith("/inventory-uploads"))!;
  assert.ok(inv.url.includes("/listings/merchantid/m-1/"));
  assert.ok((inv.body as { merchantSku: string; availableStock: number }[]).some((x) => x.merchantSku === p2.sku && x.availableStock === 7));
  assert.ok(calls.some((c) => c.url.endsWith("/price-uploads")));
  r = await hb.hepsiburadaSync();
  assert.match(r.message, /0 yeni Hepsiburada/);

  // temizlik: demo ürünleri ve ayarları eski haline getir
  await db.update(products).set({ barcode: p1.barcode, stock: p1.stock }).where(eq(products.id, p1.id));
  await db.update(products).set({ stock: p2.stock }).where(eq(products.id, p2.id));
  await db.delete(orders).where(inArray(orders.channel, ["TRENDYOL", "HEPSIBURADA"]));
  await db.insert(settings).values({ key: "integrations", value: cur }).onConflictDoUpdate({ target: settings.key, set: { value: cur } });
  console.log("marketplace: tüm testler geçti");
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
