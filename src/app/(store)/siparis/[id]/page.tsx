import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { db } from "@/db";
import { orderEvents, orders } from "@/db/schema";
import { getCustomer } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { orderKey } from "@/lib/store";
import { ClearCart } from "@/components/store/clear-cart";
import { ORDER_STATUS_LABEL, formatDate, formatTL, orderNo } from "@/lib/utils";

export const metadata = { title: "Sipariş", robots: { index: false } };
const STEPS = ["PAID", "PREPARING", "SHIPPED", "DELIVERED"];

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ k?: string; yeni?: string; odeme?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const [o, me, s] = await Promise.all([
    db.query.orders.findFirst({ where: eq(orders.id, id), with: { items: { with: { serials: true } }, events: { where: eq(orderEvents.isPublic, true), orderBy: asc(orderEvents.createdAt) } } }),
    getCustomer(),
    getSettings(),
  ]);
  if (!o) notFound();
  if (sp.k !== orderKey(o.id) && (!me || me.id !== o.customerId)) notFound();
  const cur = STEPS.indexOf(o.status);
  const track = o.carrier && o.trackingNumber ? s.shipping.trackingUrlTemplate[o.carrier]?.replace("{code}", o.trackingNumber) : null;
  const canReturn = o.status === "DELIVERED" && o.deliveredAt && Date.now() - o.deliveredAt.getTime() < 14 * 86400000;
  return (
    <div className="container-x max-w-3xl py-8">
      {sp.odeme === "hata" ? (
        <div className="mb-5 flex gap-3 rounded-2xl bg-danger-bg p-5 text-danger">
          <CircleAlert className="shrink-0" />
          <div><b>Ödeme tamamlanamadı.</b><p className="text-sm">Kartından para çekilmedi. Tekrar deneyebilir, havale seçebilir veya bize yazabilirsin.</p><Link href="/sepet" className="mt-2 inline-block font-bold underline">Sepete dön</Link></div>
        </div>
      ) : sp.yeni ? (
        <div className="mb-5 flex gap-3 rounded-2xl bg-tint p-5">
          <ClearCart />
          <CheckCircle2 className="shrink-0 text-brand" size={28} />
          <div>
            <b className="text-lg">Teşekkürler, siparişin alındı!</b>
            <p className="text-sm text-mute">Sipariş numaran <b className="text-deep">{orderNo(o.number)}</b>. Bilgileri {o.email} adresine ve telefonuna da gönderiyoruz.</p>
          </div>
        </div>
      ) : null}
      {o.paymentMethod === "TRANSFER" && o.paymentStatus === "PENDING" ? (
        <div className="mb-5 rounded-2xl border border-gold/40 bg-[#f6efe3] p-5 text-sm">
          <b className="text-base">Havale / EFT bilgileri</b>
          <p className="mt-1">Açıklamaya <b>{orderNo(o.number)}</b> yazarak <b>{formatTL(o.total)}</b> gönder. Ödeme hesabımıza geçince siparişin hazırlanır.</p>
          <ul className="mt-2 flex flex-col gap-1">{s.payment.bankAccounts.map((b) => <li key={b.iban}><b>{b.bank}</b> · {b.holder} · <span className="font-mono select-all">{b.iban}</span></li>)}</ul>
        </div>
      ) : null}
      <h1 className="font-display text-2xl font-extrabold">Sipariş {orderNo(o.number)}</h1>
      <p className="text-sm text-mute">{formatDate(o.createdAt, true)} · {ORDER_STATUS_LABEL[o.status]}</p>
      {cur >= 0 ? (
        <ol className="mt-5 grid grid-cols-4 gap-1 text-center text-xs font-bold">
          {STEPS.map((st, i) => (
            <li key={st} className="flex flex-col items-center gap-1.5">
              <span className={`h-2 w-full rounded-full ${i <= cur ? "bg-brand" : "bg-line"}`} />
              <span className={i <= cur ? "text-deep" : "text-mute"}>{st === "PAID" ? "Alındı" : ORDER_STATUS_LABEL[st]}</span>
            </li>
          ))}
        </ol>
      ) : null}
      {track ? <a href={track} target="_blank" className="mt-4 inline-block rounded-lg bg-deep px-4 py-2.5 text-sm font-bold text-white">Kargonu takip et · {o.carrier} {o.trackingNumber}</a> : null}
      <div className="mt-6 rounded-2xl border border-line">
        <ul className="divide-y divide-line">
          {o.items.map((i) => (
            <li key={i.id} className="flex items-center gap-3 p-4 text-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {i.imageUrl ? <img src={i.imageUrl} alt="" className="h-14 w-14 object-contain" /> : null}
              <span className="flex-1"><b>{i.name}</b><span className="block text-xs text-mute">{i.quantity} adet{i.serials.length ? ` · seri no ${i.serials.map((x) => x.serial).join(", ")}` : ""}</span></span>
              <b>{formatTL(i.total)}</b>
            </li>
          ))}
        </ul>
        <dl className="flex flex-col gap-1 border-t border-line p-4 text-sm">
          <div className="flex justify-between"><dt>Ara toplam</dt><dd>{formatTL(o.subtotal)}</dd></div>
          {o.discountTotal ? <div className="flex justify-between text-ok"><dt>İndirim</dt><dd>−{formatTL(o.discountTotal)}</dd></div> : null}
          <div className="flex justify-between"><dt>Kargo</dt><dd>{o.shippingTotal ? formatTL(o.shippingTotal) : "Ücretsiz"}</dd></div>
          <div className="flex justify-between text-base font-extrabold"><dt>Toplam</dt><dd>{formatTL(o.total)}</dd></div>
        </dl>
      </div>
      <h2 className="mt-8 mb-3 font-extrabold">Sipariş geçmişi</h2>
      <ol className="flex flex-col gap-3">
        {o.events.map((e) => <li key={e.id} className="border-l-2 border-brand pl-3 text-sm"><b>{e.message}</b><span className="block text-xs text-mute">{formatDate(e.createdAt, true)}</span></li>)}
      </ol>
      <div className="mt-8 flex flex-wrap gap-2">
        {canReturn ? <Link href={`/hesabim?iade=${o.id}`} className="rounded-lg border border-deep px-4 py-2.5 text-sm font-bold">İade talebi oluştur</Link> : null}
        <Link href="/hesabim" className="rounded-lg bg-soft px-4 py-2.5 text-sm font-bold">Hesabıma git</Link>
        {s.store.whatsapp ? <a href={`https://wa.me/${s.store.whatsapp}?text=${encodeURIComponent(`Merhaba, ${orderNo(o.number)} numaralı siparişim hakkında`)}`} target="_blank" className="rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white">WhatsApp&apos;tan sor</a> : null}
      </div>
    </div>
  );
}
