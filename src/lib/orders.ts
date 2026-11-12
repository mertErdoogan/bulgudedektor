import "server-only";
import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { campaigns, orderEvents, orderItems, orders, products, serialNumbers, stockMovements } from "@/db/schema";
import { ORDER_STATUS_LABEL } from "./utils";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const ORDER_FLOW: Record<string, string[]> = {
  PENDING_PAYMENT: ["PAID", "CANCELLED"],
  PAID: ["PREPARING", "SHIPPED", "CANCELLED", "REFUNDED"],
  PREPARING: ["SHIPPED", "CANCELLED", "REFUNDED"],
  SHIPPED: ["DELIVERED", "REFUNDED"],
  DELIVERED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

export async function adjustStock(tx: Tx, productId: string, delta: number, reason: string, userId: string | null, note?: string) {
  await tx
    .update(products)
    .set({ stock: sql`${products.stock} + ${delta}` })
    .where(eq(products.id, productId));
  await tx.insert(stockMovements).values({ productId, delta, reason, userId, note });
}

/** Siparişteki ürünleri stoğa geri koyar ve atanmış seri numaralarını serbest bırakır */
export async function restockOrder(tx: Tx, orderId: string, reason: string, userId: string | null) {
  const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  for (const it of items) {
    if (it.productId) await adjustStock(tx, it.productId, it.quantity, reason, userId, `Sipariş ${orderId}`);
  }
  const ids = items.map((i) => i.id);
  if (ids.length) {
    await tx
      .update(serialNumbers)
      .set({ status: reason === "RETURN" ? "RETURNED" : "IN_STOCK", orderItemId: null, soldAt: null, warrantyUntil: null })
      .where(inArray(serialNumbers.orderItemId, ids));
  }
}

export async function addOrderEvent(tx: Tx | typeof db, orderId: string, type: string, message: string, userId: string | null = null, isPublic = true) {
  await tx.insert(orderEvents).values({ orderId, type, message, userId, isPublic });
}

async function notifyPlaced(orderId: string) {
  const { mailOrderPlaced } = await import("./mail");
  const { orderKey } = await import("./store");
  const o = await db.query.orders.findFirst({ where: eq(orders.id, orderId), with: { items: true } });
  if (!o) return;
  const link = `${process.env.APP_URL || ""}/siparis/${o.id}?k=${orderKey(o.id)}`;
  const { sendMetaPurchase } = await import("./meta-capi");
  await sendMetaPurchase(o.id).catch((e) => console.error("[meta-capi]", e));
  await mailOrderPlaced(o, link);
  const { smsOrderEvent } = await import("./sms");
  await smsOrderEvent("placed", { phone: o.phone, number: o.number, link });
  const { notifyStaff } = await import("./notify");
  const { formatTL, orderNo } = await import("./utils");
  await notifyStaff({
    perm: "orders.view",
    kind: "order",
    title: `Yeni sipariş ${orderNo(o.number)} · ${formatTL(o.total)}`,
    body: `${o.shippingAddress?.fullName ?? o.email} · ${o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ").slice(0, 120)}${o.paymentMethod === "TRANSFER" && o.paymentStatus !== "PAID" ? " · havale bekleniyor" : ""}`,
    href: `/admin/siparisler/${o.id}`,
  });
}
export { notifyPlaced };

export async function markOrderPaid(orderId: string, meta: { paymentId?: string; transactions?: { itemId: string; transactionId: string; price: number }[]; raw?: unknown; installments?: number }) {
  const before = await db.query.orders.findFirst({ where: eq(orders.id, orderId), columns: { paymentStatus: true, paymentMethod: true } });
  const res = await markOrderPaidTx(orderId, meta);
  if (before && before.paymentStatus !== "PAID" && before.paymentMethod === "CARD") void notifyPlaced(orderId);
  return res;
}

async function markOrderPaidTx(orderId: string, meta: { paymentId?: string; transactions?: { itemId: string; transactionId: string; price: number }[]; raw?: unknown; installments?: number }) {
  return db.transaction(async (tx) => {
    const [o] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
    if (!o) throw new Error("Sipariş bulunamadı");
    if (o.paymentStatus === "PAID") return o; // idempotent: callback iki kez gelebilir
    const [updated] = await tx
      .update(orders)
      .set({
        paymentStatus: "PAID",
        status: o.status === "PENDING_PAYMENT" ? "PAID" : o.status,
        paymentRef: meta.paymentId ?? o.paymentRef,
        // Havale bildirimi gibi önceki ödeme bilgileri korunur
        paymentMeta: { ...(o.paymentMeta ?? {}), paymentId: meta.paymentId, transactions: meta.transactions, raw: meta.raw },
        paidAt: new Date(),
        installments: meta.installments ?? o.installments,
      })
      .where(eq(orders.id, orderId))
      .returning();
    if (o.campaignId) await tx.update(campaigns).set({ usageCount: sql`${campaigns.usageCount} + 1` }).where(eq(campaigns.id, o.campaignId));
    await addOrderEvent(tx, orderId, "payment", "Ödeme alındı.");
    return updated;
  });
}

export async function failOrderPayment(orderId: string, reason: string) {
  await db.transaction(async (tx) => {
    const [o] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
    if (!o || o.paymentStatus === "PAID" || o.status === "CANCELLED") return;
    await tx.update(orders).set({ paymentStatus: "FAILED", status: "CANCELLED" }).where(eq(orders.id, orderId));
    await restockOrder(tx, orderId, "PAYMENT_FAILED", null);
    await addOrderEvent(tx, orderId, "payment", `Ödeme başarısız: ${reason}`, null, false);
  });
}

/** Kartla ödeme başlatılıp 45 dakikadır tamamlanmamış siparişleri iptal edip stoğu geri koyar. */
export async function expireStalePendingOrders() {
  const cutoff = new Date(Date.now() - 45 * 60 * 1000);
  const stale = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.status, "PENDING_PAYMENT"), eq(orders.paymentMethod, "CARD"), lt(orders.createdAt, cutoff)));
  for (const s of stale) await failOrderPayment(s.id, "Ödeme süresi doldu");
  return stale.length;
}

export function statusMessage(status: string) {
  return `Durum: ${ORDER_STATUS_LABEL[status] ?? status}`;
}
