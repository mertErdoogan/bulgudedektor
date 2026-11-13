import { imgUrl } from "@/lib/img";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { BrandGroup } from "@/lib/store";
import { cn, formatTL } from "@/lib/utils";

/** Marka kartı: marka adı (veya logosu), temsilî ürün görseli ve o markanın kategorileri. */
export function BrandCard({ b, className, thumbs, note }: { b: BrandGroup; className?: string; thumbs?: string[]; note?: string }) {
  return (
    <div className={cn("group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white transition duration-300 hover:-translate-y-0.5 hover:border-[#f0c9c2] hover:shadow-[0_18px_34px_-20px_rgba(196,42,27,.4)]", className)}>
      <Link href={`/marka/${b.slug}`} className="relative isolate flex items-center gap-3 overflow-hidden bg-[radial-gradient(90%_120%_at_85%_50%,#ffffff_0%,#f6f6f6_60%)] p-4">
        <span aria-hidden className="absolute -right-12 -bottom-16 -z-10 h-36 w-36 rounded-full bg-[#fdf0ee] transition duration-500 group-hover:scale-125" />
        <span className="min-w-0 flex-1">
          {b.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={b.logoUrl} alt={b.name} className="h-9 max-w-[150px] object-contain object-left mix-blend-multiply" />
          ) : (
            <span className="font-display block truncate text-[19px] leading-none font-black tracking-tight md:text-[26px]">{b.name.toLocaleUpperCase("en-US")}</span>
          )}
          <span className="mt-1.5 block text-[13px] text-mute">{note ? <b className="font-bold text-deep">{note} · </b> : null}{b.total} ürün</span>
        </span>
        {thumbs?.length ? (
          <span className="hidden gap-2 sm:flex">
            {thumbs.slice(0, 6).map((t, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={t} src={imgUrl(t, 256)} alt="" loading="lazy" style={{ transitionDelay: `${i * 60}ms` }} className={cn("h-[84px] w-[104px] object-contain mix-blend-multiply transition duration-500 group-hover:-translate-y-1.5", i >= 3 && "hidden lg:block")} />
            ))}
          </span>
        ) : null}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {b.image && !thumbs?.length ? <img src={imgUrl(b.image, 256)} alt="" loading="lazy" className="hidden h-[84px] w-[110px] shrink-0 object-contain mix-blend-multiply transition duration-500 group-hover:-translate-y-1 group-hover:-rotate-2 sm:block" /> : null}
      </Link>
      <ul className={cn("flex flex-1 flex-col p-2", thumbs?.length && "sm:grid sm:grid-cols-2 sm:content-start lg:grid-cols-4")}>
        {b.categories.map((c) => (
          <li key={c.slug}>
            <Link href={`/marka/${b.slug}?kategori=${c.slug}`} className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-[13.5px] font-semibold md:px-2.5 md:text-[14px] hover:bg-soft hover:text-link">
              <span className="truncate">{c.name}</span>
              <span className="shrink-0 text-xs font-normal text-mute">{c.count}</span>
            </Link>
          </li>
        ))}
      </ul>
      <Link href={`/marka/${b.slug}`} className="flex items-center justify-between border-t border-line px-3 py-3 text-[13px] font-extrabold text-link md:px-4 md:text-sm">
        <span>Tüm {b.name}<span className="hidden sm:inline"> ürünleri</span></span> <ArrowRight size={15} />
      </Link>
    </div>
  );
}

/**
 * Marka ızgarası. Vitrin önceliğindeki marka (focus) en üstte tam genişlikte, ürün görselleriyle;
 * diğer markalar altında eşit sütunlarla (tek başına kalan kart olmasın diye sütun sayısı marka sayısına göre).
 */
export function BrandGrid({ brands, focus }: { brands: BrandGroup[]; focus?: { slug: string; thumbs: string[]; note?: string } }) {
  const f = focus ? brands.find((b) => b.slug === focus.slug) : undefined;
  const rest = f ? brands.filter((b) => b !== f) : brands;
  const cols = rest.length >= 4 ? "xl:grid-cols-4" : rest.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2";
  return (
    <div className="flex flex-col gap-3 md:gap-4">
      {f ? <BrandCard b={f} thumbs={focus!.thumbs} note={focus!.note} /> : null}
      {rest.length ? (
        <div className={cn("grid grid-cols-2 gap-3 md:gap-4", f ? cols : "xl:grid-cols-4")}>
          {rest.map((b) => (
            <BrandCard key={b.id} b={b} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

type Model = { id: string; name: string; slug: string; image: string | null; price: number };

/**
 * Ana sayfa "Markaya göre": öncelikli marka (Minelab) koyu, büyük bir vitrinde — kategorileri ve öne çıkan
 * 4 modeliyle; diğer markalar yanında sade karolar halinde (görünür ama ikinci planda).
 */
export function BrandShowcase({ focus, models, note, rest }: { focus: BrandGroup; models: Model[]; note?: string; rest: BrandGroup[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.75fr_1fr]" data-testid="brand-showcase">
      <div className="relative isolate overflow-hidden rounded-[28px] bg-[#141416] p-5 text-white md:p-8">
        <span aria-hidden className="absolute -top-28 -right-16 -z-10 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(212,46,30,.5),transparent_65%)] blur-2xl" />
        <span aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(rgba(255,255,255,.07)_1px,transparent_1px)] [mask-image:linear-gradient(180deg,#000,transparent_70%)] bg-[size:22px_22px]" />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-extrabold tracking-[.14em] text-white/85 ring-1 ring-white/15">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" /> TÜRKİYE YETKİLİ DİSTRİBÜTÖRÜ
            </span>
            <Link href={`/marka/${focus.slug}`} className="font-display mt-3 block text-[38px] leading-none font-black tracking-tight md:text-[54px]">
              {focus.name.toLocaleUpperCase("en-US")}
            </Link>
            <p className="mt-2 text-[14px] text-white/65">{note ? <b className="text-white">{note} · </b> : null}{focus.total} ürün, orijinal ve faturalı</p>
          </div>
          <Link href={`/marka/${focus.slug}`} className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[14px] font-extrabold text-deep transition hover:-translate-y-0.5">
            Tüm {focus.name} <ArrowRight size={16} />
          </Link>
        </div>
        <div className="scrollbar-none -mx-5 mt-5 flex gap-2 overflow-x-auto px-5 md:mx-0 md:flex-wrap md:px-0">
          {focus.categories.map((c) => (
            <Link key={c.slug} href={`/marka/${focus.slug}?kategori=${c.slug}`} className="shrink-0 rounded-full bg-white/[.08] px-3.5 py-1.5 text-[13px] font-semibold ring-1 ring-white/10 transition hover:bg-white hover:text-deep">
              {c.name} <span className="opacity-55">{c.count}</span>
            </Link>
          ))}
        </div>
        {models.length ? (
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {models.slice(0, 4).map((p, i) => (
              <Link key={p.id} href={`/urun/${p.slug}`} className="group flex flex-col overflow-hidden rounded-2xl bg-white text-deep transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-20px_rgba(0,0,0,.8)]">
                <span className="relative grid h-[120px] place-items-center bg-[radial-gradient(circle_at_50%_60%,#fff_0%,#f1f1f2_75%)] md:h-[140px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.image ? <img src={imgUrl(p.image, 256)} alt="" loading="lazy" style={{ transitionDelay: `${i * 40}ms` }} className="h-[84%] w-[84%] object-contain mix-blend-multiply transition duration-500 group-hover:-translate-y-1 group-hover:scale-105" /> : null}
                </span>
                <span className="flex flex-col px-3 py-2.5">
                  <b className="truncate text-[13.5px]">{p.name}</b>
                  <span className="text-[12.5px] text-mute">{formatTL(p.price)}</span>
                </span>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
      <div className="flex flex-col gap-3">
        <span className="px-1 text-[11.5px] font-extrabold tracking-[.14em] text-mute">DİĞER MARKALAR</span>
        <div className="grid grid-cols-2 content-start gap-3">
          {rest.slice(0, 6).map((b) => (
            <Link key={b.id} href={`/marka/${b.slug}`} className="group relative isolate flex min-h-[96px] flex-col justify-between overflow-hidden rounded-2xl border border-line bg-white p-4 transition duration-300 hover:-translate-y-0.5 hover:border-[#d6d6db] hover:shadow-[0_16px_30px_-20px_rgba(20,20,22,.4)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {b.image ? <img src={imgUrl(b.image, 128)} alt="" loading="lazy" className="absolute -right-2 -bottom-2 -z-10 h-[70px] w-[90px] object-contain opacity-80 mix-blend-multiply transition duration-500 group-hover:-translate-y-1 group-hover:opacity-100" /> : null}
              {b.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.logoUrl} alt={b.name} className="h-6 max-w-[110px] object-contain object-left mix-blend-multiply" />
              ) : (
                <b className="font-display text-[17px] font-black tracking-tight">{b.name.toLocaleUpperCase("en-US")}</b>
              )}
              <span className="text-[12.5px] text-mute">{b.total} ürün</span>
            </Link>
          ))}
          <Link href="/markalar" className="flex min-h-[96px] flex-col justify-between rounded-2xl bg-soft p-4 text-[14px] font-bold transition hover:bg-[#ececee]">
            Tüm markalar <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </div>
  );
}
