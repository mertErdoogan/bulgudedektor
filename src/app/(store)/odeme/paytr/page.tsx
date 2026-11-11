import Link from "next/link";
import Script from "next/script";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { Lock, ShieldCheck } from "lucide-react";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { orderKey } from "@/lib/store";
import { formatTL, orderNo } from "@/lib/utils";

export const metadata = { title: "Güvenli ödeme", robots: { index: false } };
export const dynamic = "force-dynamic";

/** PayTR iFrame: kart bilgisi PayTR'ın kendi sayfasına girilir (3D Secure), sitemize hiç gelmez. */
export default async function PaytrPage({ searchParams }: { searchParams: Promise<{ o?: string; k?: string; t?: string }> }) {
  const { o, k, t } = await searchParams;
  if (!o || !k || k !== orderKey(o) || !t || !/^[A-Za-z0-9_-]{10,200}$/.test(t)) notFound();
  const order = await db.query.orders.findFirst({ where: eq(orders.id, o), with: { items: { columns: { name: true, quantity: true } } } });
  if (!order) notFound();
  if (order.paymentStatus === "PAID") redirect(`/siparis/${o}?k=${k}&yeni=1`);
  if (order.status !== "PENDING_PAYMENT") redirect(`/siparis/${o}?k=${k}`);
  return (
    <div className="container-x max-w-3xl py-6 md:py-10">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-extrabold">Kart ile ödeme</h1>
          <p className="text-sm text-mute">
            {orderNo(order.number)} · {order.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
          </p>
        </div>
        <p className="text-xl font-extrabold">{formatTL(order.total)}</p>
      </div>
      <div className="rounded-2xl border border-line bg-white p-2 md:p-4">
        <iframe src={`https://www.paytr.com/odeme/guvenli/${t}`} id="paytriframe" title="PayTR güvenli ödeme formu" style={{ width: "100%", minHeight: 620, border: 0 }} allow="payment" />
      </div>
      <Script src="https://www.paytr.com/js/iframeResizer.min.js" strategy="afterInteractive" />
      <Script id="paytr-resize" strategy="afterInteractive">{`(function r(){if(window.iFrameResize){window.iFrameResize({},'#paytriframe')}else{setTimeout(r,200)}})();`}</Script>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-mute">
        <span className="flex items-center gap-1.5">
          <Lock size={14} /> Kart bilgilerin PayTR&apos;ın güvenli sayfasında, bankanın 3D Secure doğrulamasıyla işlenir; sitemizde saklanmaz.
        </span>
        <span className="flex items-center gap-1.5">
          <ShieldCheck size={14} /> Taksit seçeneklerini kart numaranı girince görürsün.
        </span>
      </div>
      <p className="mt-6 text-center text-sm">
        <Link href={`/siparis/${o}?k=${k}`} className="font-semibold text-link">
          Vazgeç, sipariş sayfasına dön
        </Link>
      </p>
    </div>
  );
}
