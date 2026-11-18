import { getT } from "@/lib/i18n/server";
import { imgUrl } from "@/lib/img";
import Link from "@/components/locale-link";
import { AutoRefresh } from "@/components/store/auto-refresh";
import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { CheckCircle2, ChevronDown, CircleAlert, CircleX, ClipboardCheck, FileText, House, Landmark, MessageCircle, Package, PackageOpen, ShieldCheck, Store, Truck, Undo2, Wrench } from "lucide-react";
import type { ReactNode } from "react";
import { db } from "@/db";
import { orderEvents, orders, returnRequests } from "@/db/schema";
import { getCustomer } from "@/lib/auth";
import { RETURN_STEPS, describeReturn, hasReturnableUnit, isOpenReturn, unitGroups } from "@/lib/returns";
import { getSettings } from "@/lib/settings";
import { orderKey } from "@/lib/store";
import { ClearCart } from "@/components/store/clear-cart";
import { CopyText } from "@/components/store/copy-text";
import { ReturnForm } from "@/components/store/return-form";
import { TransferForm } from "./transfer-form";
import { ORDER_STATUS_LABEL, RETURN_STATUS_LABEL, formatDate, formatTL, orderNo } from "@/lib/utils";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("meta.siparis__id_"), robots: { index: false } };
}
const STEPS = [
  { key: "PAID", label: "Alındı", icon: ClipboardCheck },
  { key: "PREPARING", label: "Hazırlanıyor", icon: Package },
  { key: "SHIPPED", label: "Kargoda", icon: Truck },
  { key: "DELIVERED", label: "Teslim edildi", icon: House },
];
const RETURN_DAYS = 14;
const DAY = 86400000;

/** Hızlı işlem kutusu: müşterinin bu sayfaya gelme sebeplerinden biri */
function Tile({ href, icon, title, sub, tone = "plain", external, testid }: { href: string; icon: ReactNode; title: string; sub: string; tone?: "plain" | "hot"; external?: boolean; testid?: string }) {
  const cls = `group flex items-center gap-3 rounded-2xl border p-3.5 text-sm transition hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-18px_rgba(0,0,0,.45)] ${tone === "hot" ? "border-brand bg-tint" : "border-line bg-white"}`;
  const body = (
    <>
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tone === "hot" ? "bg-brand text-white" : "bg-soft text-deep group-hover:bg-tint group-hover:text-brand"}`}>{icon}</span>
      <span className="min-w-0">
        <b className="block">{title}</b>
        <span className="block truncate text-xs text-mute">{sub}</span>
      </span>
    </>
  );
  return external ? (
    <a href={href} target="_blank" rel="noopener" className={cls} data-testid={testid}>{body}</a>
  ) : (
    <Link href={href} className={cls} data-testid={testid}>{body}</Link>
  );
}

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ k?: string; yeni?: string; odeme?: string; bekle?: string; iade?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const [o, me, s] = await Promise.all([
    db.query.orders.findFirst({
      where: eq(orders.id, id),
      with: {
        items: { with: { serials: true } },
        events: { where: eq(orderEvents.isPublic, true), orderBy: asc(orderEvents.createdAt) },
        returns: { orderBy: desc(returnRequests.createdAt) },
      },
    }),
    getCustomer(),
    getSettings(),
  ]);
  if (!o) notFound();
  if (sp.k !== orderKey(o.id) && (!me || me.id !== o.customerId)) notFound();

  const key = orderKey(o.id);
  const self = `/siparis/${o.id}?k=${key}`;
  const owner = !!me && me.id === o.customerId;
  const cur = STEPS.findIndex((x) => x.key === o.status);
  const pickup = o.deliveryMethod === "PICKUP";
  // Takip bağlantısı yalnızca ürün yoldayken anlamlı; teslimden sonra ana eylem olmaktan çıkar
  const trackUrl = o.carrier && o.trackingNumber ? s.shipping.trackingUrlTemplate[o.carrier]?.replace("{code}", o.trackingNumber) : null;
  const onTheWay = o.status === "SHIPPED" && !pickup;

  const groups = unitGroups(o.items, o.returns);
  const daysLeft = o.deliveredAt ? Math.ceil(RETURN_DAYS - (Date.now() - o.deliveredAt.getTime()) / DAY) : 0;
  const inWindow = o.status === "DELIVERED" && daysLeft > 0;
  const canReturn = inWindow && hasReturnableUnit(groups);
  const showForm = sp.iade === "1" && canReturn && owner;
  const openReturns = o.returns.filter((r) => isOpenReturn(r.status));
  const returnHref = owner ? `${self}&iade=1#iade` : o.customerId ? `/giris?next=${encodeURIComponent(`${self}&iade=1`)}` : null;
  const wa = s.store.whatsapp ? `https://wa.me/${s.store.whatsapp}?text=${encodeURIComponent(`Merhaba, ${orderNo(o.number)} numaralı siparişim hakkında`)}` : null;
  const firstSerial = o.items.flatMap((i) => i.serials)[0]?.serial;
  const warrantyEnd = o.items.flatMap((i) => i.serials).map((x) => x.warrantyUntil).filter((d): d is Date => !!d).sort((a, b) => a.getTime() - b.getTime())[0];
  const itemCount = o.items.reduce((n, i) => n + i.quantity, 0);

  /* Sayfanın tepesindeki "şu an ne oluyor" özeti: müşterinin aradığı cevap */
  const hero = (() => {
    if (o.status === "PENDING_PAYMENT") return { title: o.paymentMethod === "TRANSFER" ? "Havalen bekleniyor" : "Ödeme onayı bekleniyor", sub: o.paymentMethod === "TRANSFER" ? "Ödeme hesabımıza geçince siparişini hemen hazırlamaya başlıyoruz." : "Banka onayı gelince sipariş otomatik olarak hazırlığa geçer." };
    if (o.status === "PAID") return { title: "Siparişin alındı", sub: `Sırada, birazdan paketlenecek. Saat ${s.shipping.sameDayCutoff}'e kadar onaylanan siparişler aynı gün kargoya verilir.` };
    if (o.status === "PREPARING") return { title: "Paketleniyor", sub: pickup ? "Hazır olunca showroom'dan teslim alabileceğini haber vereceğiz." : "Kargoya verildiğinde takip numarası SMS ve e-postayla gelir." };
    if (o.status === "SHIPPED") return pickup ? { title: "Showroom'da seni bekliyor", sub: "Kimliğinle gelip teslim alabilirsin." } : { title: "Yolda!", sub: `${o.carrier ?? "Kargo"} ile geliyor${o.shippedAt ? ` · ${formatDate(o.shippedAt)} tarihinde kargoya verildi` : ""}. Genelde 1–3 iş günü sürer.` };
    if (o.status === "DELIVERED") {
      const ret = openReturns[0];
      if (ret) return { title: "Teslim edildi · iade sürüyor", sub: `${describeReturn(ret.items)} için iade talebin: ${RETURN_STATUS_LABEL[ret.status].toLowerCase()}.` };
      return { title: "Teslim edildi", sub: `${o.deliveredAt ? formatDate(o.deliveredAt) + " · " : ""}${inWindow ? `Beğenmezsen ${daysLeft} gün içinde ücretsiz iade edebilirsin.` : warrantyEnd ? `Garantin ${formatDate(warrantyEnd)} tarihine kadar sürüyor.` : "İyi kullanımlar!"}` };
    }
    if (o.status === "CANCELLED") return { title: "Sipariş iptal edildi", sub: o.paymentStatus === "REFUNDED" ? "Ödemen iade edildi; hesabına geçmesi bankana göre birkaç iş günü sürebilir." : "Sorun varsa bize yazabilirsin." };
    if (o.status === "REFUNDED") return { title: "İade tamamlandı", sub: "Ödemen geri gönderildi; hesabına geçmesi bankana göre 2–10 iş günü sürebilir." };
    return { title: ORDER_STATUS_LABEL[o.status], sub: "" };
  })();
  const closed = o.status === "CANCELLED" || o.status === "REFUNDED";

  return (
    <div className="container-x max-w-3xl py-8">
      {sp.odeme === "hata" ? (
        <div className="mb-5 flex gap-3 rounded-2xl bg-danger-bg p-5 text-danger">
          <CircleAlert className="shrink-0" />
          <div><b>Ödeme tamamlanamadı.</b><p className="text-sm">Kartından para çekilmedi. Tekrar deneyebilir, havale seçebilir veya bize yazabilirsin.</p><Link href="/sepet" className="mt-2 inline-block font-bold underline">Sepete dön</Link></div>
        </div>
      ) : sp.yeni && o.paymentMethod === "CARD" && o.status === "PENDING_PAYMENT" ? (
        <div className="mb-5 flex gap-3 rounded-2xl bg-soft p-5" data-testid="payment-waiting">
          <span className="mt-1 h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          <div>
            <b className="text-lg">Ödemen bankadan onaylanıyor…</b>
            <p className="text-sm text-mute">Bu genelde birkaç saniye sürer, sayfa kendiliğinden güncellenecek. Lütfen tekrar ödeme yapma.</p>
            <AutoRefresh />
          </div>
        </div>
      ) : sp.yeni && o.paymentMethod === "CARD" && o.paymentStatus === "FAILED" ? (
        <div className="mb-5 flex gap-3 rounded-2xl bg-danger-bg p-5 text-danger">
          <CircleAlert className="shrink-0" />
          <div><b>Ödeme tamamlanamadı.</b><p className="text-sm">Kartından para çekilmedi. Tekrar deneyebilir, havale seçebilir veya bize yazabilirsin.</p><Link href="/sepet" className="mt-2 inline-block font-bold underline">Sepete dön</Link></div>
        </div>
      ) : sp.yeni ? (
        <div className="mb-5 flex gap-3 rounded-2xl border border-ok/25 bg-ok-bg p-5" data-testid="order-thanks">
          <ClearCart purchase={o.paymentStatus === "PAID" || o.paymentMethod === "TRANSFER" ? { id: orderNo(o.number), value: o.total, items: o.items.map((i) => ({ item_id: i.productId ?? i.name, item_name: i.name, price: i.unitPrice, quantity: i.quantity })) } : undefined} />
          <CheckCircle2 className="shrink-0 text-ok" size={28} />
          <div>
            <b className="text-lg">Teşekkürler, siparişin alındı!</b>
            <p className="text-sm text-mute">Sipariş numaran <b className="text-deep">{orderNo(o.number)}</b>. Bilgileri {o.email} adresine ve telefonuna da gönderiyoruz.</p>
          </div>
        </div>
      ) : null}
      {sp.yeni && !me ? (
        /* Üye olmadan alan müşteriye: bundan sonra ne olacak, kısaca */
        <div className="mb-5 rounded-2xl border border-line p-5" data-testid="guest-next">
          <b className="text-[15px]">Bundan sonra ne olacak?</b>
          <ol className="mt-3 grid gap-3 text-[13.5px] sm:grid-cols-3">
            <li className="rounded-xl bg-soft p-3"><b className="block">1. Hazırlık</b><span className="text-mute">{o.paymentMethod === "TRANSFER" ? "Havalen hesabımıza geçince" : "Ödemen onaylanınca"} siparişin hazırlanır.</span></li>
            <li className="rounded-xl bg-soft p-3"><b className="block">2. Kargo</b><span className="text-mute">Kargo takip numaran SMS ve e-postayla gelir.</span></li>
            <li className="rounded-xl bg-soft p-3"><b className="block">3. Takip</b><span className="text-mute"><Link href="/siparis-takip" className="font-bold text-link">Sipariş takibi</Link>&apos;nde {orderNo(o.number)} ve e-postanla durumu görürsün.</span></li>
          </ol>
          <p className="mt-3 text-[12.5px] text-mute">Siparişin ve garantin hesabında dursun istersen <Link href={`/kayit?email=${encodeURIComponent(o.email)}`} className="font-bold text-link">aynı e-postayla hesap oluştur</Link>.</p>
        </div>
      ) : null}

      {/* ── 1. Durum özeti ── */}
      <section className="relative overflow-hidden rounded-[28px] bg-deep p-6 text-white sm:p-8" data-testid="order-hero" data-status={o.status}>
        <span aria-hidden className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full bg-brand/45 blur-3xl" />
        <span aria-hidden className="pointer-events-none absolute -bottom-28 -left-10 h-56 w-56 rounded-full bg-[#f0704f]/25 blur-3xl" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-white/70">
            <span className="rounded-full bg-white/10 px-2.5 py-1 tracking-wide">SİPARİŞ {orderNo(o.number)}</span>
            <span>{formatDate(o.createdAt, true)}</span>
            <span>· {itemCount} ürün · {formatTL(o.total)}</span>
          </div>
          <h1 className="mt-3 flex items-center gap-2.5 font-display text-[28px] leading-tight font-extrabold sm:text-[34px]">
            {closed ? <CircleX className="shrink-0 text-white/70" /> : o.status === "DELIVERED" ? <CheckCircle2 className="shrink-0 text-[#7ee2a0]" /> : null}
            {hero.title}
          </h1>
          {hero.sub ? <p className="mt-1.5 max-w-xl text-[15px] text-white/75">{hero.sub}</p> : null}

          {cur >= 0 ? (
            <ol className="mt-6 grid grid-cols-4 gap-2">
              {STEPS.map((st, i) => {
                const Icon = st.icon;
                const done = i < cur;
                const now = i === cur;
                return (
                  <li key={st.key} className="flex flex-col gap-2">
                    <span className={`h-1.5 rounded-full ${i <= cur ? "bg-brand" : "bg-white/15"}`} />
                    <span className={`flex items-center gap-1.5 text-[11.5px] font-bold sm:text-xs ${i <= cur ? "text-white" : "text-white/45"}`}>
                      <span className={`relative grid h-6 w-6 shrink-0 place-items-center rounded-full ${now ? "bg-brand" : done ? "bg-white/15" : "bg-white/5"}`}>
                        {now && o.status !== "DELIVERED" ? <span className="absolute inset-0 animate-ping rounded-full bg-brand/60" /> : null}
                        <Icon size={13} className="relative" />
                      </span>
                      <span className="hidden sm:inline">{st.label}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
          ) : null}

          {onTheWay && o.trackingNumber ? (
            <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl bg-white/10 p-3 pl-4 backdrop-blur" data-testid="tracking">
              <Truck className="shrink-0" size={20} />
              <span className="min-w-0 flex-1 text-sm">
                <span className="block text-xs text-white/65">{o.carrier} takip numarası</span>
                <b className="font-mono text-base tracking-wider select-all">{o.trackingNumber}</b>
              </span>
              <CopyText value={o.trackingNumber} label="Takip numarası" className="bg-white/10 text-white hover:bg-white/20" />
              {trackUrl ? (
                <a href={trackUrl} target="_blank" rel="noopener" className="rounded-xl bg-white px-4 py-2.5 text-sm font-extrabold text-deep hover:bg-tint" data-testid="track-link">
                  Kargonu takip et
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      {/* ── 2. Açık / geçmiş iade talepleri: kod ve sonraki adım en üstte ── */}
      {o.returns.length ? (
        <section id="iade-durumu" className="mt-5 flex flex-col gap-3" data-testid="return-status">
          {sp.iade === "alindi" ? (
            <p className="flex items-center gap-2 rounded-2xl bg-ok-bg p-3.5 text-sm font-bold text-ok"><CheckCircle2 size={18} /> İade talebin bize ulaştı. Aşağıdan her adımı takip edebilirsin.</p>
          ) : null}
          {o.returns.map((r) => {
            const idx = RETURN_STEPS.findIndex((x) => x.key === r.status);
            const step = RETURN_STEPS[idx];
            return (
              <article key={r.id} className={`rounded-3xl border-2 p-5 ${r.status === "REJECTED" ? "border-line bg-soft" : r.status === "REFUNDED" ? "border-ok/30 bg-ok-bg/50" : "border-brand/40 bg-tint"}`} data-testid="return-card">
                <div className="flex flex-wrap items-start gap-3">
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${r.status === "REJECTED" ? "bg-line text-mute" : "bg-brand text-white"}`}><Undo2 size={19} /></span>
                  <div className="min-w-0 flex-1">
                    <b className="block text-[15px]">İade talebi · {RETURN_STATUS_LABEL[r.status]}</b>
                    <span className="block text-sm text-mute">{describeReturn(r.items)} · {formatDate(r.createdAt)}</span>
                  </div>
                  {r.refundAmount ? <b className="text-ok">{formatTL(r.refundAmount)} iade</b> : null}
                </div>
                {r.returnCode && r.status === "APPROVED" ? (
                  <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-brand bg-white p-4" data-testid="return-code">
                    <span className="flex-1">
                      <span className="block text-xs font-bold text-mute">Ücretsiz iade kargo kodun</span>
                      <b className="font-mono text-2xl tracking-[.18em] select-all">{r.returnCode}</b>
                    </span>
                    <CopyText value={r.returnCode} label="İade kodu" className="bg-deep text-white hover:bg-black" />
                  </div>
                ) : r.returnCode ? (
                  <p className="mt-3 text-xs text-mute">İade kargo kodu: <span className="font-mono">{r.returnCode}</span></p>
                ) : null}
                {r.status === "REJECTED" ? (
                  <p className="mt-3 rounded-xl bg-white p-3 text-sm"><b>Neden:</b> {r.resolution ?? "Bilgi için bize yazabilirsin."}</p>
                ) : (
                  <>
                    <ol className="mt-4 grid grid-cols-4 gap-1.5">
                      {RETURN_STEPS.map((x, i) => (
                        <li key={x.key} className="flex flex-col gap-1.5">
                          <span className={`h-1.5 rounded-full ${i <= idx ? "bg-brand" : "bg-line"}`} />
                          <span className={`text-[11px] font-bold leading-tight ${i <= idx ? "text-deep" : "text-mute"}`}>{x.label}</span>
                        </li>
                      ))}
                    </ol>
                    {step ? <p className="mt-3 text-sm text-mute"><b className="text-deep">Şimdi ne olacak?</b> {step.hint}</p> : null}
                  </>
                )}
              </article>
            );
          })}
        </section>
      ) : null}

      {/* ── 3. Bu sayfaya gelme sebepleri: tek dokunuşla ── */}
      <section className="mt-5 grid gap-2.5 sm:grid-cols-2" data-testid="quick-actions" aria-label="Hızlı işlemler">
        {o.paymentMethod === "TRANSFER" && o.paymentStatus === "PENDING" ? <Tile href={`${self}#havale`} icon={<Landmark size={19} />} title="Havale bilgileri" sub={`${formatTL(o.total)} · açıklamaya ${orderNo(o.number)}`} tone="hot" /> : null}
        {onTheWay && trackUrl ? <Tile href={trackUrl} external icon={<Truck size={19} />} title="Kargom nerede?" sub={`${o.carrier} · ${o.trackingNumber}`} tone="hot" /> : null}
        {pickup && o.status === "SHIPPED" ? <Tile href="/sayfa/hakkimizda#showroom" icon={<Store size={19} />} title="Showroom yol tarifi" sub="Teslim almaya gelirken" tone="hot" /> : null}
        {openReturns.length ? <Tile href={`${self}#iade-durumu`} icon={<Undo2 size={19} />} title="İade durumum" sub={RETURN_STATUS_LABEL[openReturns[0].status]} tone="hot" testid="tile-return-status" /> : null}
        {canReturn && returnHref ? (
          <Tile href={returnHref} icon={<PackageOpen size={19} />} title={o.returns.some((r) => r.status !== "REJECTED") ? "Başka bir ürünü iade et" : "İade et"} sub={`Ücretsiz · ${daysLeft} gün kaldı`} testid="tile-return" />
        ) : canReturn && wa ? (
          <Tile href={wa} external icon={<PackageOpen size={19} />} title="İade et" sub="Üyeliksiz siparişte WhatsApp'tan yaz" />
        ) : null}
        {o.invoiceUrl ? <Tile href={o.invoiceUrl} external icon={<FileText size={19} />} title="Faturam" sub={o.invoiceNo ?? "PDF indir"} /> : null}
        {o.status === "DELIVERED" && firstSerial ? (
          <Tile href={`/hesabim?ariza=${firstSerial}`} icon={<Wrench size={19} />} title="Arıza / servis" sub={warrantyEnd ? `Garanti ${formatDate(warrantyEnd)}'e kadar` : "Ücretsiz kargo ile servise gönder"} />
        ) : null}
        {wa ? <Tile href={wa} external icon={<MessageCircle size={19} />} title="Bir sorum var" sub="WhatsApp'tan sipariş numaranla yaz" /> : null}
      </section>

      {showForm ? (
        <section id="iade" className="mt-5 scroll-mt-24">
          <ReturnForm orderId={o.id} groups={groups} daysLeft={daysLeft} />
        </section>
      ) : null}

      {o.paymentMethod === "TRANSFER" && o.paymentStatus === "PENDING" ? (
        <div id="havale" className="mt-5 scroll-mt-24 rounded-3xl border border-accent/30 bg-[#fff4f2] p-5 text-sm">
          <b className="text-base">Havale / EFT bilgileri</b>
          <p className="mt-1">Açıklamaya <b>{orderNo(o.number)}</b> yazarak <b>{formatTL(o.total)}</b> gönder. Ödeme hesabımıza geçince siparişin hazırlanır.</p>
          <ul className="mt-2 flex flex-col gap-1">{s.payment.bankAccounts.map((b) => <li key={b.iban} className="flex flex-wrap items-center gap-2"><b>{b.bank}</b> · {b.holder} · <span className="font-mono select-all">{b.iban}</span><CopyText value={b.iban.replace(/\s/g, "")} label="IBAN" className="bg-white text-deep hover:bg-soft" /></li>)}</ul>
          {o.paymentMeta?.transferNotice ? (
            <p className="mt-4 rounded-lg bg-white p-3 font-semibold text-ok">Ödeme bildirimin alındı ({formatDate(new Date(o.paymentMeta.transferNotice.at), true)}). Hesabımızı kontrol edip siparişini onaylayacağız.</p>
          ) : (
            <TransferForm orderId={o.id} k={sp.k ?? ""} defaultName={o.shippingAddress?.fullName ?? ""} />
          )}
        </div>
      ) : null}

      {/* ── 4. Ürünler: seri no, garanti, iade durumu ürün bazında ── */}
      <section className="mt-6 overflow-hidden rounded-3xl border border-line">
        <h2 className="border-b border-line bg-soft/60 px-5 py-3 text-sm font-extrabold">Siparişteki ürünler</h2>
        <ul className="divide-y divide-line">
          {groups.map(({ item: i, units, takenCount }) => {
            const full = o.items.find((x) => x.id === i.id)!;
            const refunded = o.returns.filter((r) => r.status === "REFUNDED").flatMap((r) => r.items).filter((x) => x.orderItemId === i.id).reduce((n, x) => n + x.quantity, 0);
            return (
              <li key={i.id} className="flex gap-4 p-4 sm:p-5" data-testid="order-item">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {i.imageUrl ? <img src={imgUrl(i.imageUrl, 160)} alt="" className="h-16 w-16 shrink-0 rounded-xl bg-soft object-contain p-1.5" /> : <span className="h-16 w-16 shrink-0 rounded-xl bg-soft" />}
                <div className="min-w-0 flex-1 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <b className="leading-snug">{i.name}</b>
                    <b className="shrink-0">{formatTL(full.total)}</b>
                  </div>
                  <span className="text-xs text-mute">{i.quantity} adet{i.quantity > 1 ? ` · adedi ${formatTL(i.unitPrice)}` : ""}</span>
                  {full.serials.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {full.serials.map((x) => (
                        <span key={x.serial} className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11.5px] ${units.find((u) => u.serial === x.serial)?.taken ? "bg-warn-bg text-warn" : "bg-soft"}`}>
                          <ShieldCheck size={12} className="text-ok" />
                          <span className="font-mono">{x.serial}</span>
                          {x.warrantyUntil ? <span className="text-mute">· garanti {formatDate(x.warrantyUntil)}</span> : null}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {takenCount ? (
                    <span className="mt-2 inline-block rounded-md bg-warn-bg px-2 py-0.5 text-[11.5px] font-bold text-warn" data-testid="item-return-badge">
                      {refunded >= takenCount ? `${refunded} adet iade edildi` : `${takenCount} adet iade sürecinde`}
                    </span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
        <dl className="flex flex-col gap-1 border-t border-line bg-soft/40 p-5 text-sm">
          <div className="flex justify-between"><dt>Ara toplam</dt><dd>{formatTL(o.subtotal)}</dd></div>
          {o.discountTotal ? <div className="flex justify-between text-ok"><dt>İndirim</dt><dd>−{formatTL(o.discountTotal)}</dd></div> : null}
          <div className="flex justify-between"><dt>Kargo</dt><dd>{o.shippingTotal ? formatTL(o.shippingTotal) : "Ücretsiz"}</dd></div>
          <div className="flex justify-between text-base font-extrabold"><dt>Toplam</dt><dd>{formatTL(o.total)}</dd></div>
        </dl>
      </section>

      {/* ── 5. Teslimat ve geçmiş: ihtiyaç olursa açılır ── */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {o.shippingAddress ? (
          <div className="rounded-3xl border border-line p-5 text-sm">
            <b className="text-xs tracking-wide text-mute uppercase">{pickup ? "Teslim alacak kişi" : "Teslimat adresi"}</b>
            <p className="mt-1.5 font-bold">{o.shippingAddress.fullName}</p>
            {pickup ? <p className="text-mute">Showroom&apos;dan teslim</p> : <p className="text-mute">{o.shippingAddress.line}, {o.shippingAddress.district}/{o.shippingAddress.city}</p>}
          </div>
        ) : null}
        <details className="group rounded-3xl border border-line p-5 text-sm" open={!o.events.length ? undefined : o.status === "PENDING_PAYMENT"}>
          <summary className="flex cursor-pointer list-none items-center justify-between font-bold">
            Sipariş geçmişi ({o.events.length})
            <ChevronDown size={18} className="transition group-open:rotate-180" />
          </summary>
          <ol className="mt-3 flex flex-col gap-3">
            {o.events.map((e) => <li key={e.id} className="border-l-2 border-brand pl-3"><b>{e.message}</b><span className="block text-xs text-mute">{formatDate(e.createdAt, true)}</span></li>)}
          </ol>
        </details>
      </div>

      <div className="mt-6 flex flex-wrap gap-2 text-sm">
        <Link href={owner ? "/hesabim?t=siparisler" : "/siparis-takip"} className="rounded-xl bg-soft px-4 py-2.5 font-bold">{owner ? "Tüm siparişlerim" : "Başka sipariş sorgula"}</Link>
        <Link href="/" className="rounded-xl px-4 py-2.5 font-bold text-link">Alışverişe devam et</Link>
      </div>
    </div>
  );
}
