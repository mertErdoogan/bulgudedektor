import "server-only";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, products } from "@/db/schema";
import { getSettings } from "../settings";
import { orderNo } from "../utils";

export const EINVOICE_PROVIDERS = {
  parasut: { name: "Paraşüt", how: "Site faturayı Paraşüt'te oluşturur; e-Arşiv ya da e-Fatura (alıcı e-fatura mükellefiyse) otomatik seçilir." },
  birfatura: { name: "BirFatura", how: "BirFatura siparişleri siteden çeker; faturayı BirFatura panelinden (ya da onun otomatik kuralıyla) kesersin, numara ve PDF siteye geri yazılır." },
} as const;

export type InvoiceLine = { name: string; sku: string; quantity: number; unitGross: number; vatRate: number; discountGross: number };
export type InvoiceDraft = {
  orderId: string;
  orderNo: string;
  number: number;
  date: Date;
  paidAt: Date | null;
  paymentMethod: "CARD" | "TRANSFER" | "CASH";
  paymentProvider: string | null;
  buyer: {
    corporate: boolean;
    name: string;
    taxNumber: string;
    taxOffice: string;
    email: string;
    phone: string;
    city: string;
    district: string;
    address: string;
  };
  lines: InvoiceLine[];
  shipping: { gross: number; vatRate: number } | null;
  total: number;
};

const cents = (n: number) => Math.round(n * 100);

/**
 * Siparişi faturaya çevirir. Fiyatlar KDV dahildir; sipariş indirimi (kampanya, paket, havale, personel indirimi)
 * ürün satırlarına tutarlarıyla orantılı dağıtılır. Kuruş farkı son satıra yazılır; fatura toplamı sipariş toplamına eşit olur.
 */
export async function invoiceDraft(orderId: string): Promise<InvoiceDraft> {
  const o = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (!o) throw new Error("Sipariş bulunamadı.");
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  const s = await getSettings();
  const pids = items.map((i) => i.productId).filter((x): x is string => !!x);
  const rates = new Map((pids.length ? await db.select({ id: products.id, taxRate: products.taxRate }).from(products).where(inArray(products.id, pids)) : []).map((p) => [p.id, p.taxRate]));
  const fallback = s.einvoice.vatRate || 20;

  const gross = items.map((i) => cents(i.total));
  const sum = gross.reduce((a, b) => a + b, 0);
  const disc = Math.min(cents(o.discountTotal), sum);
  const shares = gross.map((g) => (sum > 0 ? Math.floor((disc * g) / sum) : 0));
  if (shares.length) shares[shares.length - 1] += disc - shares.reduce((a, b) => a + b, 0);

  const lines: InvoiceLine[] = items.map((i, k) => ({
    name: i.name,
    sku: i.sku,
    quantity: i.quantity,
    unitGross: i.unitPrice,
    vatRate: (i.productId ? rates.get(i.productId) : undefined) ?? fallback,
    discountGross: shares[k] / 100,
  }));
  const a = o.shippingAddress;
  const corporate = o.invoiceType === "CORPORATE" && !!o.taxNumber;
  return {
    orderId: o.id,
    orderNo: orderNo(o.number),
    number: o.number,
    date: o.createdAt,
    paidAt: o.paidAt,
    paymentMethod: o.paymentMethod,
    paymentProvider: o.paymentMeta?.provider ?? null,
    buyer: {
      corporate,
      name: corporate ? (o.companyName ?? a.fullName) : a.fullName,
      // Bireysel alıcıda TC kimlik no saklanmaz: GİB kuralı gereği 11111111111 kullanılır
      taxNumber: corporate ? o.taxNumber!.replace(/\D/g, "") : "11111111111",
      taxOffice: corporate ? (o.taxOffice ?? "") : "",
      email: o.email,
      phone: o.phone,
      city: a.city,
      district: a.district,
      address: a.line,
    },
    lines,
    shipping: o.shippingTotal > 0 ? { gross: o.shippingTotal, vatRate: fallback } : null,
    total: o.total,
  };
}

export const net = (gross: number, vat: number) => Math.round((gross / (1 + vat / 100)) * 10000) / 10000;
