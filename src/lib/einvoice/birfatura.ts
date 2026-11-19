import "server-only";
import { and, between, eq, inArray, sql } from "drizzle-orm";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/db";
import { orderItems, orders, products, brands } from "@/db/schema";
import { addOrderEvent } from "../orders";
import { getSettings, saveSettings } from "../settings";
import { orderNo } from "../utils";
import { invoiceDraft, net } from "./common";

/**
 * BirFatura "Özel Entegrasyon": BirFatura bu uçları çağırır (site adresi + /api/<uç>).
 * Kimlik doğrulama: her istekte "token" başlığı; değer panelde üretilip BirFatura'daki "API şifresi" alanına yazılır.
 */

export const BF_STATUSES = [
  { Id: 1, Value: "Ödeme bekleniyor", status: "PENDING_PAYMENT" },
  { Id: 2, Value: "Ödendi / onaylandı", status: "PAID" },
  { Id: 3, Value: "Hazırlanıyor", status: "PREPARING" },
  { Id: 4, Value: "Kargoya verildi", status: "SHIPPED" },
  { Id: 5, Value: "Teslim edildi", status: "DELIVERED" },
  { Id: 6, Value: "İptal edildi", status: "CANCELLED" },
  { Id: 7, Value: "İade edildi", status: "REFUNDED" },
] as const;

export const BF_PAYMENTS = [
  { Id: 1, Value: "Kredi / banka kartı", method: "CARD" },
  { Id: 2, Value: "Havale / EFT", method: "TRANSFER" },
  { Id: 3, Value: "Nakit (mağaza)", method: "CASH" },
] as const;

export async function birfaturaAuth(req: Request) {
  const s = (await getSettings()).einvoice;
  if (s.provider !== "birfatura" || !s.birfaturaToken) return false;
  const got = Buffer.from(req.headers.get("token") ?? "");
  const want = Buffer.from(s.birfaturaToken);
  return got.length === want.length && timingSafeEqual(got, want);
}

/** "dd.MM.yyyy HH:mm:ss" (İstanbul saati) → Date */
export function parseBfDate(s: unknown): Date | null {
  const m = String(s ?? "").match(/^(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!m) return null;
  const [, d, mo, y, h = "00", mi = "00", se = "00"] = m;
  return new Date(Date.UTC(+y, +mo - 1, +d, +h - 3, +mi, +se));
}

export function bfDate(d: Date) {
  const x = new Date(d.getTime() + 3 * 3600_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(x.getUTCDate())}.${p(x.getUTCMonth() + 1)}.${x.getUTCFullYear()} ${p(x.getUTCHours())}:${p(x.getUTCMinutes())}:${p(x.getUTCSeconds())}`;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** BirFatura sipariş modeli (OrderDetails ile). Tutarlar yuvarlanmadan, KDV hariç ve dahil ayrı gönderilir. */
async function toBfOrder(orderId: string) {
  const d = await invoiceDraft(orderId);
  const o = (await db.query.orders.findFirst({ where: eq(orders.id, orderId) }))!;
  const items = await db
    .select({ id: orderItems.id, productId: orderItems.productId, barcode: products.barcode, brand: brands.name, imageUrl: orderItems.imageUrl })
    .from(orderItems)
    .leftJoin(products, eq(products.id, orderItems.productId))
    .leftJoin(brands, eq(brands.id, products.brandId))
    .where(eq(orderItems.orderId, orderId));
  const base = process.env.APP_URL || "";
  const status = BF_STATUSES.find((x) => x.status === o.status)!;
  const pay = BF_PAYMENTS.find((x) => x.method === o.paymentMethod)!;
  const details = d.lines.map((l, k) => {
    const unitDiscount = l.discountGross / l.quantity;
    return {
      ProductId: items[k]?.productId ?? l.sku,
      ProductCode: l.sku,
      Barcode: items[k]?.barcode ?? "",
      ProductBrand: items[k]?.brand ?? "",
      ProductName: l.name,
      ProductNote: "",
      ProductImage: items[k]?.imageUrl ? (items[k].imageUrl!.startsWith("http") ? items[k].imageUrl : base + items[k].imageUrl) : "",
      Variants: [],
      ProductQuantityType: "Adet",
      ProductQuantity: l.quantity,
      VatRate: l.vatRate,
      ProductUnitPriceTaxExcluding: net(l.unitGross, l.vatRate),
      ProductUnitPriceTaxIncluding: l.unitGross,
      CommissionUnitTaxExcluding: 0,
      CommissionUnitTaxIncluding: 0,
      DiscountUnitTaxExcluding: net(unitDiscount, l.vatRate),
      DiscountUnitTaxIncluding: unitDiscount,
      ExtraFeeUnitTaxExcluding: 0,
      ExtraFeeUnitTaxIncluding: 0,
    };
  });
  const productsGross = d.lines.reduce((s, l) => s + l.unitGross * l.quantity, 0);
  const productsNet = d.lines.reduce((s, l) => s + net(l.unitGross, l.vatRate) * l.quantity, 0);
  const discGross = d.lines.reduce((s, l) => s + l.discountGross, 0);
  const discNet = d.lines.reduce((s, l) => s + net(l.discountGross, l.vatRate), 0);
  const ship = d.shipping ? { g: d.shipping.gross, n: net(d.shipping.gross, d.shipping.vatRate) } : { g: 0, n: 0 };
  const a = o.shippingAddress;
  return {
    OrderId: o.number,
    OrderCode: orderNo(o.number),
    OrderDate: bfDate(o.createdAt),
    CustomerId: o.customerId ?? "",
    BillingName: d.buyer.name,
    BillingAddress: d.buyer.address,
    BillingTown: d.buyer.district,
    BillingCity: d.buyer.city,
    BillingMobilePhone: d.buyer.phone,
    BillingPhone: d.buyer.phone,
    SSNTCNo: d.buyer.corporate ? "" : d.buyer.taxNumber,
    TaxOffice: d.buyer.taxOffice,
    TaxNo: d.buyer.corporate ? d.buyer.taxNumber : "",
    Email: o.email,
    ShippingId: 0,
    ShippingName: a.fullName,
    ShippingAddress: a.line,
    ShippingTown: a.district,
    ShippingCity: a.city,
    ShippingCountry: "Türkiye",
    ShippingZipCode: a.zip ?? "",
    ShippingPhone: a.phone,
    ShippingCompany: o.carrier ?? "",
    PaymentTypeId: pay.Id,
    PaymentType: pay.Value,
    OrderStatusId: status.Id,
    OrderStatus: status.Value,
    Currency: "TRY",
    CurrencyRate: 1,
    TotalPaidTaxExcluding: r2(productsNet - discNet + ship.n),
    TotalPaidTaxIncluding: o.total,
    ProductsTotalTaxExcluding: productsNet,
    ProductsTotalTaxIncluding: productsGross,
    CommissionTotalTaxExcluding: 0,
    CommissionTotalTaxIncluding: 0,
    ShippingChargeTotalTaxExcluding: ship.n,
    ShippingChargeTotalTaxIncluding: ship.g,
    PayingInsteadOfShippingChargeTotalTaxExcluding: 0,
    PayingInsteadOfShippingChargeTotalTaxIncluding: 0,
    DiscountTotalTaxExcluding: discNet,
    DiscountTotalTaxIncluding: discGross,
    InstallmentChargeTotalTaxExcluding: 0,
    InstallmentChargeTotalTaxIncluding: 0,
    BankTransferDiscountTotalTaxExcluding: 0,
    BankTransferDiscountTotalTaxIncluding: 0,
    OrderDetails: details,
    ExtraFees: [],
  };
}

/** Tarih aralığındaki (en fazla 31 gün) site siparişleri; isteğe bağlı durum filtresi */
export async function bfOrders(start: Date, end: Date, statusId: number | null) {
  const to = end.getTime() - start.getTime() > 31 * 86400_000 ? new Date(start.getTime() + 31 * 86400_000) : end;
  const st = statusId ? BF_STATUSES.find((x) => x.Id === statusId)?.status : null;
  const rows = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(between(orders.createdAt, start, to), inArray(orders.channel, ["WEB", "MANUAL"]), st ? eq(orders.status, st) : sql`${orders.status} <> 'PENDING_PAYMENT'`))
    .orderBy(orders.createdAt)
    .limit(500);
  const out = [];
  for (const r of rows) out.push(await toBfOrder(r.id));
  await saveSettings("einvoice", { birfaturaLastPullAt: new Date().toISOString(), birfaturaLastPullCount: out.length });
  return out;
}

async function findOrder(b: Record<string, unknown>) {
  const raw = String(b.orderId ?? b.OrderId ?? b.OrderCode ?? "").trim();
  const n = Number(raw.replace(/\D/g, ""));
  if (!n) return null;
  return db.query.orders.findFirst({ where: eq(orders.number, n) });
}

/** BirFatura faturayı kesince numara, tarih ve PDF adresini siparişe yazar (tekrar gelirse günceller) */
export async function bfInvoiceLink(b: Record<string, unknown>) {
  const o = await findOrder(b);
  if (!o) return { status: 404, message: "Sipariş bulunamadı." };
  const url = String(b.faturaUrl ?? b.InvoicePdfUrl ?? "").trim();
  if (!/^https?:\/\//.test(url)) return { status: 400, message: "Fatura bağlantısı geçersiz." };
  const no = String(b.faturaNo ?? b.InvoiceNumber ?? "").trim() || null;
  const at = parseBfDate(b.faturaTarihi ?? b.InvoiceDate) ?? new Date();
  const first = !o.invoiceUrl;
  await db
    .update(orders)
    .set({ invoiceUrl: url, invoiceNo: no, invoicedAt: o.invoicedAt ?? at, invoiceProvider: "birfatura", invoiceStatus: "ISSUED", invoiceError: null })
    .where(eq(orders.id, o.id));
  if (first) {
    await addOrderEvent(db, o.id, "invoice", `Fatura düzenlendi${no ? ` (${no})` : ""}.`, null, true);
    const { mailInvoice, mailReady } = await import("../mail");
    if ((await mailReady()) && !o.email.endsWith("@telefon.siparis")) void mailInvoice({ id: o.id, number: o.number, email: o.email, invoiceNo: no, invoiceUrl: url });
  }
  return { status: 200, message: "Fatura bağlantısı güncellendi." };
}

/** BirFatura'dan kargo bilgisi: takip no yazılır, hazırlanan sipariş "kargoya verildi" olur ve müşteri bilgilendirilir */
export async function bfCargo(b: Record<string, unknown>) {
  const o = await findOrder(b);
  if (!o) return { status: 404, message: "Sipariş bulunamadı." };
  const tracking = String(b.cargoTrackingCode ?? b.CargoTrackingNumber ?? "").trim();
  const carrier = String(b.cargoCompany ?? b.CargoCompany ?? "").trim() || o.carrier || "Kargo";
  if (!tracking) return { status: 400, message: "Takip numarası boş." };
  if (o.trackingNumber === tracking && o.status === "SHIPPED") return { status: 200, message: "Kargo bilgisi zaten güncel." };
  const ship = ["PAID", "PREPARING"].includes(o.status);
  await db
    .update(orders)
    .set({ trackingNumber: tracking, carrier, ...(ship ? { status: "SHIPPED" as const, shippedAt: new Date() } : {}) })
    .where(eq(orders.id, o.id));
  await addOrderEvent(db, o.id, "status", `Kargoya verildi: ${carrier} · takip no ${tracking}`, null, true);
  if (ship) {
    const { mailStatus } = await import("../mail");
    const { orderKey } = await import("../store");
    const link = `${process.env.APP_URL || ""}/siparis/${o.id}?k=${orderKey(o.id)}`;
    void mailStatus(o.email, o.number, `Siparişin kargoya verildi: ${carrier} · takip no ${tracking}`, link);
    const { smsOrderEvent } = await import("../sms");
    void smsOrderEvent("shipped", { phone: o.phone, number: o.number, link, carrier, tracking });
  }
  return { status: 200, message: "Kargo bilgisi güncellendi." };
}
