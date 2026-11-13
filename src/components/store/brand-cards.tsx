import { imgUrl } from "@/lib/img";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { BrandGroup } from "@/lib/store";
import { cn } from "@/lib/utils";

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
