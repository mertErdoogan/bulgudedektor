import { imgProps } from "@/lib/img";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import type { CardCtx } from "@/lib/card-ctx";
import type { ProductCard as P } from "@/lib/store";
import { formatTL } from "@/lib/utils";
import { CutoffCountdown } from "./countdown";
import { ProductCard } from "./product-card";
import { Rail } from "./rails";

export function Head({ title, sub, href, cta = "Tümünü gör", extra }: { icon?: React.ReactNode; title: string; sub?: React.ReactNode; href?: string; cta?: string; extra?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-[23px] leading-tight font-extrabold md:text-[30px]">{title}</h2>
        {sub ? <p className="mt-0.5 text-sm text-mute">{sub}</p> : null}
      </div>
      <div className="flex items-center gap-3">
        {extra}
        {href ? (
          <Link href={href} className="group/cta flex h-10 items-center gap-1.5 rounded-full border border-line bg-white px-4 text-sm font-extrabold transition hover:border-deep hover:bg-deep hover:text-white">
            {cta} <ArrowRight size={15} className="transition duration-300 group-hover/cta:translate-x-1" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}

/** Çok satanlar: sıra numaralı ızgara (2 satır). */
export function BestSellers({ items, ctx }: { items: P[]; ctx: CardCtx }) {
  if (!items.length) return null;
  return (
    <section className="container-x mt-12">
      <Head title="Çok satanlar" sub="Son 60 günde en çok tercih edilen cihazlar" href="/urunler" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
        {items.slice(0, 8).map((p, i) => (
          <ProductCard key={p.id} p={p} ctx={ctx} rank={i + 1} className="h-full" />
        ))}
      </div>
    </section>
  );
}

/**
 * Yeni gelenler: açık, sıcak→soğuk degrade zemin (kırmızıdan Minelab mavisine) ve bulanık renk lekeleri;
 * öne çıkan yeni ürün banner altı kartlarıyla aynı dilde (mavi degrade, beyaz ürün dairesi, YENİ etiketi).
 */
export function NewArrivals({ items, ctx }: { items: P[]; ctx: CardCtx }) {
  if (!items.length) return null;
  const lead = items[0];
  return (
    <section className="relative isolate mt-12 overflow-hidden bg-gradient-to-br from-[#fff3ef] via-white to-[#eef2ff] py-10 md:py-12">
      <span aria-hidden className="absolute -top-24 -left-20 -z-10 h-72 w-72 rounded-full bg-[#e2402e]/15 blur-3xl" />
      <span aria-hidden className="absolute -right-24 -bottom-28 -z-10 h-80 w-80 rounded-full bg-[#2f56c8]/15 blur-3xl" />
      <div className="container-x">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-extrabold tracking-wider text-deep shadow-sm ring-1 ring-line"><Sparkles size={14} className="text-accent" /> YENİ GELENLER</span>
            <h2 className="font-display mt-2 text-[24px] leading-tight font-extrabold md:text-[32px]">Rafa yeni giren cihazlar</h2>
            <p className="text-sm text-mute">Son eklenen modeller, ilk inceleyenlerden ol.</p>
          </div>
          <Link href="/urunler?sirala=yeni" className="flex h-10 items-center gap-1.5 rounded-full bg-deep px-4 text-sm font-extrabold text-white transition hover:bg-black">Tüm yeniler <ArrowRight size={15} /></Link>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,3fr)]">
          <Link href={`/urun/${lead.slug}`} className="group relative hidden flex-col overflow-hidden rounded-[22px] bg-gradient-to-br from-[#2f56c8] via-[#1f3b8f] to-[#0c1838] p-6 text-white shadow-[0_22px_44px_-20px_rgba(15,30,80,.6)] transition duration-300 hover:-translate-y-1 lg:flex" data-testid="new-lead">
            <span aria-hidden className="absolute -right-14 -bottom-16 h-52 w-52 rounded-full bg-white/10 transition duration-500 group-hover:scale-110" />
            <span aria-hidden className="card-shine pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <span className="relative w-fit rounded-full bg-white px-2.5 py-1 text-[11px] font-extrabold tracking-wider text-deep">SON EKLENEN</span>
            {/* Beyaz ürün sahnesi + YENİ etiketi */}
            <span className="relative mx-auto my-5 grid h-[210px] w-[210px] place-items-center rounded-full bg-white shadow-[0_16px_34px_-12px_rgba(0,0,0,.5)] ring-8 ring-white/15 transition duration-500 group-hover:scale-105">
              <span className="grid h-full w-full place-items-center overflow-hidden rounded-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {lead.image ? <img {...imgProps(lead.image, [256, 384], "210px")} alt={lead.name} className="h-[78%] w-[78%] object-contain mix-blend-multiply transition duration-500 group-hover:-rotate-6" /> : null}
              </span>
              {lead.badges.some((b) => /^yeni/i.test(b)) ? <span className="absolute top-1 right-1 grid h-12 w-12 rotate-12 place-items-center rounded-full bg-[#ffcf3d] text-[11px] font-black text-deep shadow-md transition group-hover:rotate-0">YENİ</span> : null}
            </span>
            <span className="relative mt-auto text-xs font-extrabold tracking-wider text-white/75">{lead.brand?.toLocaleUpperCase("en-US")}</span>
            <b className="font-display relative text-xl leading-tight">{lead.name}</b>
            <span className="relative mt-1 text-lg font-extrabold">{formatTL(lead.price)}</span>
            <span className="relative mt-3 inline-flex w-fit items-center gap-1.5 text-sm font-extrabold underline-offset-4 group-hover:underline">İncele <ArrowRight size={15} className="transition group-hover:translate-x-1" /></span>
          </Link>
          <Rail itemClass="w-[62%] sm:w-[40%] md:w-[31.5%] lg:w-[46%] xl:w-[31.6%]">
            {items.slice(1).map((p) => (
              <ProductCard key={p.id} p={p} ctx={ctx} className="h-full" />
            ))}
          </Rail>
        </div>
      </div>
    </section>
  );
}

/** Fırsatlar: en yüksek indirimden başlayarak. */
export function Deals({ items, ctx }: { items: P[]; ctx: CardCtx }) {
  if (items.length < 2) return null;
  const maxPct = Math.max(...items.map((p) => (p.compareAtPrice ? Math.round(((p.compareAtPrice - p.price) / p.compareAtPrice) * 100) : 0)));
  return (
    <section className="container-x mt-12">
      <div className="rounded-3xl bg-[#fafafa] p-4 ring-1 ring-line md:p-6">
        <Head title="Fırsatlar" sub={maxPct > 0 ? <>Seçili modellerde <b className="text-deep">%{maxPct}&apos;e varan</b> indirim</> : "İndirimli modeller"} href="/kampanyalar" cta="Tüm fırsatlar" />
        <Rail>
          {items.map((p) => (
            <ProductCard key={p.id} p={p} ctx={ctx} className="h-full" />
          ))}
        </Rail>
      </div>
    </section>
  );
}

/** Aynı gün kargo: kesim saatine gerçek geri sayım. */
export function SameDay({ items, ctx, ms, cutoff }: { items: P[]; ctx: CardCtx; ms: number | null; cutoff: string }) {
  if (!items.length) return null;
  return (
    <section className="container-x mt-12">
      <Head
        title="Aynı gün kargo"
        sub={`Stokta, saat ${cutoff}'e kadar siparişte bugün kargoda`}
        href="/urunler?stok=1"
        extra={ms ? <CutoffCountdown ms={ms} /> : null}
      />
      <Rail>
        {items.map((p) => (
          <ProductCard key={p.id} p={p} ctx={ctx} className="h-full" />
        ))}
      </Rail>
    </section>
  );
}

/** Kategori bazlı şeritler: ana sayfada daha çok ürün. */
export function CategoryRail({ title, href, items, ctx }: { title: string; href: string; items: P[]; ctx: CardCtx }) {
  if (items.length < 3) return null;
  return (
    <section className="container-x mt-12">
      <Head title={title} href={href} />
      <Rail>
        {items.map((p) => (
          <ProductCard key={p.id} p={p} ctx={ctx} className="h-full" />
        ))}
      </Rail>
    </section>
  );
}
