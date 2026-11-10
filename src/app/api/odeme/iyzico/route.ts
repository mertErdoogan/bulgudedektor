import { and, eq, isNotNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { customers, orders } from "@/db/schema";
import { retrieveCheckoutForm } from "@/lib/iyzico";
import { failOrderPayment, markOrderPaid } from "@/lib/orders";
import { orderKey } from "@/lib/store";

// iyzico ödeme sonrası kullanıcıyı buraya POST ile döndürür (form: token).
export async function POST(req: Request) {
  const url = new URL(req.url);
  const base = process.env.APP_URL || url.origin;
  const fd = await req.formData().catch(() => null);
  const token = String(fd?.get("token") ?? "");
  const orderId = url.searchParams.get("o") ?? "";
  const back = (id: string, q = "") => NextResponse.redirect(`${base}/siparis/${id}?k=${orderKey(id)}${q}`, 303);
  if (!token || !orderId) return NextResponse.redirect(`${base}/sepet?odeme=hata`, 303);

  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (!order) return NextResponse.redirect(`${base}/sepet?odeme=hata`, 303);
  if (order.paymentStatus === "PAID") return back(order.id, "&yeni=1");
  if (order.paymentToken && order.paymentToken !== token) {
    await failOrderPayment(order.id, "Token uyuşmazlığı");
    return back(order.id, "&odeme=hata");
  }
  try {
    const r = await retrieveCheckoutForm(token);
    const paid = Number(r.paidPrice ?? 0);
    const ok = r.status === "success" && r.paymentStatus === "SUCCESS" && r.basketId === order.id && paid + 0.01 >= order.total;
    if (!ok) {
      await failOrderPayment(order.id, r.errorMessage || r.paymentStatus || "Ödeme onaylanmadı");
      return back(order.id, "&odeme=hata");
    }
    await markOrderPaid(order.id, {
      paymentId: r.paymentId,
      installments: r.installment ?? 1,
      transactions: (r.itemTransactions ?? []).map((t) => ({ itemId: t.itemId, transactionId: t.paymentTransactionId, price: Number(t.paidPrice) })),
      raw: { paidPrice: r.paidPrice, installment: r.installment },
    });
    // Kart kaydedildiyse anahtarı yalnızca şifreli (kayıtlı) hesaba yaz; misafir siparişlerde saklanmaz
    if (r.cardUserKey && order.customerId) {
      await db
        .update(customers)
        .set({ cardUserKey: r.cardUserKey })
        .where(and(eq(customers.id, order.customerId), isNotNull(customers.passwordHash)));
    }
    return back(order.id, "&yeni=1");
  } catch (e) {
    console.error("iyzico callback", e);
    await failOrderPayment(order.id, "Ödeme doğrulanamadı");
    return back(order.id, "&odeme=hata");
  }
}
