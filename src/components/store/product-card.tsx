import Link from "next/link";
import { Star } from "lucide-react";
import type { ProductCard as P } from "@/lib/store";
import { formatTL } from "@/lib/utils";
import { AddToCart, CompareToggle } from "./bits";

export function ProductCard({ p, installments = 1, compare = false }: { p: P; installments?: number; compare?: boolean }) {
  const out = p.stock <= 0 && !p.allowBackorder;
  const discount = p.compareAtPrice && p.compareAtPrice > p.price ? Math.round(((p.compareAtPrice - p.price) / p.compareAtPrice) * 100) : 0;
  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-line bg-white transition-shadow hover:shadow-[0_10px_24px_rgba(20,20,40,.10)]">
      <Link href={`/urun/${p.slug}`} className="relative block bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {p.image ? <img src={p.image} alt={p.name} loading="lazy" className="block h-[190px] w-full object-contain px-4 pt-5 pb-2 md:h-[220px]" /> : <div className="h-[190px] bg-soft md:h-[220px]" />}
        <span className="absolute top-3 left-3 flex flex-col items-start gap-1">
          {out ? <span className="rounded-md bg-deep px-2 py-0.5 text-xs font-extrabold text-white">Tükendi</span> : null}
          {discount ? <span className="rounded-md bg-accent px-2 py-0.5 text-xs font-extrabold text-white">%{discount}</span> : null}
          {p.badges.slice(0, 1).map((b) => (
            <span key={b} className="rounded-md bg-pop px-2 py-0.5 text-xs font-extrabold text-on-pop">{b}</span>
          ))}
        </span>
      </Link>
      <div className="flex flex-1 flex-col gap-1 px-4 pt-2 pb-4">
        <span className="text-[11.5px] font-extrabold tracking-wider text-link">{p.brand?.toLocaleUpperCase("en-US")}</span>
        <Link href={`/urun/${p.slug}`} className="line-clamp-2 h-[39px] text-[15px] leading-[1.3] font-bold hover:text-link">
          {p.name}
        </Link>
        {p.reviewCount ? (
          <span className="flex items-center gap-1 text-xs text-mute">
            <Star size={12} className="fill-gold text-gold" /> {p.rating?.toFixed(1)} ({p.reviewCount})
          </span>
        ) : (
          <span className="h-4" />
        )}
        <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
          <strong className="font-display text-[18px] font-extrabold md:text-[21px]">{formatTL(p.price)}</strong>
          {discount ? <s className="text-sm text-mute">{formatTL(p.compareAtPrice)}</s> : null}
        </div>
        <span className="mb-2 text-[12.5px] font-semibold text-mute">
          {out ? "Gelince haber ver" : installments > 1 && p.price >= 3000 ? `${installments} ay vade farksız` : p.sameDayShipping && p.stock > 0 ? "Aynı gün kargo" : "Taksit seçenekleri"}
        </span>
        <div className="mt-auto flex flex-col gap-2">
          {out ? (
            <Link href={`/urun/${p.slug}`} className="grid h-10 place-items-center rounded-lg border border-deep text-sm font-bold">
              İncele
            </Link>
          ) : (
            <AddToCart productId={p.id} name={p.name} />
          )}
          {compare ? <CompareToggle productId={p.id} /> : null}
        </div>
      </div>
    </article>
  );
}
