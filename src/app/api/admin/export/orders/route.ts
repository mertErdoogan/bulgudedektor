import { and, desc, eq, gte, lte, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { audit } from "@/lib/audit";
import { getStaff } from "@/lib/auth";
import { csvResponse } from "@/lib/csv";
import { can } from "@/lib/permissions";
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL, orderNo } from "@/lib/utils";

export async function GET(req: Request) {
  const staff = await getStaff();
  if (!staff || !can(staff.permissions, "reports.finance")) return new Response("Yetkisiz", { status: 403 });
  const sp = new URL(req.url).searchParams;
  const c: SQL[] = [];
  if (sp.get("durum")) c.push(eq(orders.status, sp.get("durum") as "PAID"));
  if (sp.get("bas")) c.push(gte(orders.createdAt, new Date(`${sp.get("bas")}T00:00:00`)));
  if (sp.get("bit")) c.push(lte(orders.createdAt, new Date(`${sp.get("bit")}T23:59:59`)));
  const rows = await db.query.orders.findMany({ where: c.length ? and(...c) : undefined, orderBy: desc(orders.createdAt), with: { items: true }, limit: 10000 });
  await audit(staff.id, "export", "order", null, `Sipariş CSV (${rows.length})`);
  return csvResponse(`siparisler-${new Date().toISOString().slice(0, 10)}.csv`, [
    ["Sipariş", "Tarih", "Durum", "Ödeme", "Yöntem", "Taksit", "Müşteri", "Telefon", "E-posta", "İl", "Ürünler", "Ara toplam", "İndirim", "Kargo", "Toplam", "Kupon", "Kargo firması", "Takip no", "Fatura tipi", "Vergi no"],
    ...rows.map((o) => [
      orderNo(o.number),
      o.createdAt.toISOString().replace("T", " ").slice(0, 16),
      ORDER_STATUS_LABEL[o.status],
      PAYMENT_STATUS_LABEL[o.paymentStatus],
      o.paymentMethod === "CARD" ? "Kart" : "Havale",
      o.installments,
      o.shippingAddress.fullName,
      o.phone,
      o.email,
      o.shippingAddress.city,
      o.items.map((i) => `${i.quantity}x ${i.name}`).join(" | "),
      o.subtotal,
      o.discountTotal,
      o.shippingTotal,
      o.total,
      o.couponCode,
      o.carrier,
      o.trackingNumber,
      o.invoiceType === "CORPORATE" ? "Kurumsal" : "Bireysel",
      o.taxNumber,
    ]),
  ]);
}
