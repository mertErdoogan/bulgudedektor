import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { simulationAllowed } from "@/lib/iyzico";
import { failOrderPayment, markOrderPaid } from "@/lib/orders";
import { orderKey } from "@/lib/store";
import { formatTL, orderNo } from "@/lib/utils";

// Sadece geliştirme ortamında (PAYMENT_SIMULATION=1) iyzico anahtarı yokken uçtan uca test için.
export default async function SimPage({ searchParams }: { searchParams: Promise<{ o?: string; k?: string }> }) {
  if (!simulationAllowed()) notFound();
  const { o, k } = await searchParams;
  if (!o || k !== orderKey(o)) notFound();
  const order = await db.query.orders.findFirst({ where: eq(orders.id, o) });
  if (!order) notFound();
  async function pay(fd: FormData) {
    "use server";
    if (!simulationAllowed() || !o) return;
    if (fd.get("r") === "ok") await markOrderPaid(o, { paymentId: `SIM-${Date.now()}`, raw: "simulated", installments: Number(fd.get("n")) || 1 });
    else await failOrderPayment(o, "Simülasyon: kart reddedildi");
    redirect(`/siparis/${o}?k=${orderKey(o)}${fd.get("r") === "ok" ? "&yeni=1" : "&odeme=hata"}`);
  }
  return (
    <div className="container-x max-w-md py-12">
      <div className="rounded-2xl border-2 border-dashed border-warn p-6">
        <p className="text-xs font-bold text-warn">TEST — iyzico anahtarı girilmediği için ödeme simülasyonu</p>
        <h1 className="mt-2 text-xl font-extrabold">{orderNo(order.number)} · {formatTL(order.total)}</h1>
        <form action={pay} className="mt-5 flex flex-col gap-3">
          <select name="n" className="h-11 rounded-lg border border-line px-3"><option value="1">Tek çekim</option><option value="3">3 taksit</option><option value="6">6 taksit</option></select>
          <button name="r" value="ok" className="h-12 rounded-lg bg-brand font-extrabold text-white">Ödeme başarılı</button>
          <button name="r" value="fail" className="h-12 rounded-lg border border-danger font-extrabold text-danger">Kart reddedildi</button>
        </form>
      </div>
    </div>
  );
}
