import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { failOrderPayment, markOrderPaid } from "@/lib/orders";
import { getPaytrConfig, verifyCallback } from "@/lib/paytr";

export const dynamic = "force-dynamic";

const text = (body: string, status = 200) => new Response(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });

/**
 * PayTR "Bildirim URL" (mağaza panelinde https://ALAN-ADI/api/odeme/paytr olarak tanımlanmalı).
 * İmza doğrulanır; sipariş yalnızca burada ödendi sayılır. Aynı bildirim birden fazla gelebilir: işlenmişse yine "OK" döner.
 * PayTR yalnızca düz "OK" yanıtını başarılı sayar.
 */
export async function POST(req: Request) {
  const cfg = await getPaytrConfig();
  if (!cfg) return text("PAYTR_NOT_CONFIGURED", 503);
  const fd = await req.formData().catch(() => null);
  if (!fd) return text("BAD_REQUEST", 400);
  const cb = verifyCallback(cfg, fd);
  if (!cb) return text("PAYTR notification failed: bad hash", 400);

  const order = await db.query.orders.findFirst({ where: eq(orders.paymentToken, cb.merchantOid) });
  // Bilinmeyen sipariş: PayTR tekrar denemesin diye OK (kayıt için loglanır)
  if (!order) {
    console.error("PayTR bildirimi: sipariş bulunamadı", cb.merchantOid);
    return text("OK");
  }
  if (order.paymentStatus === "PAID") return text("OK");
  if (order.status !== "PENDING_PAYMENT") {
    // Süre aşımıyla iptal edilmiş siparişe geç gelen başarılı ödeme: para çekildi ama sipariş kapalı → ekibe acil uyarı
    if (cb.status === "success" && order.status === "CANCELLED") {
      const { addOrderEvent } = await import("@/lib/orders");
      const { notifyStaff } = await import("@/lib/notify");
      await addOrderEvent(db, order.id, "payment", `DİKKAT: Sipariş iptal edildikten sonra PayTR'dan ${cb.totalAmount} TL ödeme onayı geldi. Siparişi yeniden oluşturun ya da PayTR'dan iade edin.`, null, false);
      await notifyStaff({ perm: "orders.manage", kind: "payment_alert", title: "İptal edilmiş siparişe ödeme geldi", body: `${cb.totalAmount} TL · kontrol edip iade edin veya siparişi yeniden açın`, href: `/admin/siparisler/${order.id}` });
    }
    return text("OK");
  }

  if (cb.status === "success") {
    // Taksitli vade farkında total_amount sipariş tutarından yüksek olabilir; düşükse şüpheli
    if (cb.totalAmount + 0.01 < order.total) {
      await failOrderPayment(order.id, `Tutar uyuşmazlığı (PayTR ${cb.totalAmount} TL, sipariş ${order.total} TL)`);
      return text("OK");
    }
    await markOrderPaid(order.id, {
      paymentId: cb.merchantOid,
      raw: { provider: "paytr", totalAmount: cb.totalAmount, paymentType: cb.paymentType, testMode: cb.testMode },
    });
  } else {
    await failOrderPayment(order.id, cb.failedReason ? `PayTR: ${cb.failedReason}` : "Ödeme onaylanmadı");
  }
  return text("OK");
}
