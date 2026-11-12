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
      <div className="border-l-4 border-brand pl-3.5">
        <h2 className="font-display text-[23px] leading-tight font-extrabold md:text-[30px]">{title}</h2>
        {sub ? <p className="mt-0.5 text-sm text-mute">{sub}</p> : null}
      </div>
      <div className="flex items-center gap-3">
        {extra}
        {href ? (
          <Link href={href} className="flex h-10 items-center gap-1.5 rounded-full border border-line px-4 text-sm font-extrabold hover:border-deep">
            {cta} <ArrowRight size={15} />
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

/** Yeni gelenler: koyu vitrin paneli + yatay şerit. */
export function NewArrivals({ items, ctx }: { items: P[]; ctx: CardCtx }) {
  if (!items.length) return null;
  const lead = items[0];
  return (
    <section className="mt-12 bg-deep py-10 text-white">
      <div className="container-x">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-extrabold tracking-wider text-white/90"><Sparkles size={14} className="text-accent" /> YENİ GELENLER</span>
            <h2 className="font-display mt-2 text-[24px] leading-tight font-extrabold md:text-[32px]">Rafa yeni giren cihazlar</h2>
            <p className="text-sm text-white/70">Son eklenen modeller, ilk inceleyenlerden ol.</p>
          </div>
          <Link href="/urunler?sirala=yeni" className="flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-extrabold text-deep">Tüm yeniler <ArrowRight size={15} /></Link>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,3fr)]">
          <Link href={`/urun/${lead.slug}`} className="group relative hidden flex-col overflow-hidden rounded-2xl bg-gradient-to-b from-white to-[#f1f1f1] p-6 text-deep lg:flex">
            <span className="w-fit rounded-md bg-accent px-2 py-0.5 text-xs font-extrabold text-white">Öne çıkan yeni</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {lead.image ? <img {...imgProps(lead.image, [384, 640], "(min-width: 768px) 400px, 90vw")} alt={lead.name} className="my-4 h-[230px] w-full object-contain transition duration-300 group-hover:scale-105" /> : null}
            <span className="mt-auto text-xs font-extrabold tracking-wider text-mute">{lead.brand?.toLocaleUpperCase("en-US")}</span>
            <b className="font-display text-xl leading-tight">{lead.name}</b>
            <span className="mt-1 text-lg font-extrabold">{formatTL(lead.price)}</span>
            <span className="mt-3 inline-flex w-fit items-center gap-1.5 text-sm font-extrabold text-link">İncele <ArrowRight size={15} /></span>
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
      <div className="rounded-3xl bg-gradient-to-br from-[#fff1ee] to-white p-4 ring-1 ring-[#f6d9d3] md:p-6">
        <Head title="Fırsatlar" sub={maxPct > 0 ? <>Seçili modellerde <b className="text-accent">%{maxPct}&apos;e varan</b> indirim</> : "İndirimli modeller"} href="/kampanyalar" cta="Tüm fırsatlar" />
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
