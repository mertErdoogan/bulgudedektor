import Link from "next/link";
import { Eye, Flame, Star, Truck } from "lucide-react";
import type { ProductCard as P } from "@/lib/store";
import { SOCIAL_MIN_CARTS, SOCIAL_MIN_VIEWS, type CardCtx } from "@/lib/card-ctx";
import { deliveryInfo } from "@/lib/delivery";
import { cn, formatTL } from "@/lib/utils";
import { AddToCart, CompareToggle, FavoriteButton } from "./bits";

const NEW_DAYS = 30;

export function isNew(p: Pick<P, "createdAt">) {
  return Date.now() - new Date(p.createdAt).getTime() < NEW_DAYS * 86400000;
}

/** Ürünün altında görünen sade "kargo / teslim" rozeti. */
export function DeliveryBadge({ p, ctx, className }: { p: Pick<P, "stock" | "allowBackorder" | "sameDayShipping">; ctx: CardCtx; className?: string }) {
  const d = deliveryInfo(p, ctx.ship);
  if (d.tone === "none") return null;
  return (
    <span
      className={cn(
        "flex min-w-0 items-start gap-1.5 rounded-md px-2 py-1.5 text-[11.5px] leading-tight",
        d.tone === "fast" ? "bg-ok-bg text-ok" : d.tone === "slow" ? "bg-warn-bg text-warn" : "bg-soft text-mute",
        className,
      )}
    >
      <Truck size={13} className="mt-px shrink-0" />
      <span className="min-w-0">
        <b className="block">{d.ship}</b>
        {d.eta ? <span className="block opacity-85">{d.eta}</span> : null}
      </span>
    </span>
  );
}

/** Gerçek etkileşim verisi; eşiğin altındaysa hiçbir şey gösterilmez. */
export function SocialProof({ p, ctx, className }: { p: Pick<P, "views24" | "carts24">; ctx: CardCtx; className?: string }) {
  if (!ctx.social) return null;
  if (p.carts24 >= SOCIAL_MIN_CARTS)
    return (
      <span className={cn("flex items-center gap-1 text-[11.5px] font-semibold text-accent", className)}>
        <Flame size={13} /> Son 24 saatte {p.carts24} kişi sepete ekledi
      </span>
    );
  if (p.views24 >= SOCIAL_MIN_VIEWS)
    return (
      <span className={cn("flex items-center gap-1 text-[11.5px] font-semibold text-mute", className)}>
        <Eye size={13} /> 24 saatte {p.views24} kişi inceledi
      </span>
    );
  return null;
}

export function ProductCard({ p, ctx, compare = false, className, rank }: { p: P; ctx: CardCtx; compare?: boolean; className?: string; rank?: number }) {
  const out = p.stock <= 0 && !p.allowBackorder;
  const discount = p.compareAtPrice && p.compareAtPrice > p.price ? Math.round(((p.compareAtPrice - p.price) / p.compareAtPrice) * 100) : 0;
  const fresh = isNew(p);
  const badge = p.badges.find((b) => !/^yeni/i.test(b) || !fresh);
  return (
    <article className={cn("group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-white text-deep transition duration-200 hover:-translate-y-0.5 hover:border-transparent hover:shadow-[0_14px_30px_rgba(20,20,20,.10)]", className)}>
      <Link href={`/urun/${p.slug}`} className="relative block bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {p.image ? <img src={p.image} alt={p.name} loading="lazy" decoding="async" className="block h-[180px] w-full object-contain px-4 pt-6 pb-2 transition duration-300 group-hover:scale-[1.03] md:h-[210px]" /> : <div className="h-[180px] bg-soft md:h-[210px]" />}
        <span className="absolute top-3 left-3 flex flex-col items-start gap-1">
          {rank ? <span className={cn("grid h-8 w-8 place-items-center rounded-full text-sm font-black text-white shadow", rank <= 3 ? "bg-accent" : "bg-deep")}>{rank}</span> : null}
          {out ? <span className="rounded-md bg-deep px-2 py-0.5 text-[11px] font-extrabold text-white">Tükendi</span> : null}
          {discount ? <span className="rounded-md bg-accent px-2 py-0.5 text-[11px] font-extrabold text-white">%{discount} indirim</span> : null}
          {fresh ? <span className="rounded-md bg-deep px-2 py-0.5 text-[11px] font-extrabold text-white">Yeni</span> : null}
          {badge && !discount ? <span className="rounded-md bg-pop px-2 py-0.5 text-[11px] font-extrabold text-on-pop">{badge}</span> : null}
        </span>
      </Link>
      <FavoriteButton productId={p.id} name={p.name} className="absolute top-2.5 right-2.5" />
      <div className="flex flex-1 flex-col gap-1 px-3.5 pt-1 pb-3.5 md:px-4 md:pb-4">
        <span className="text-[11px] font-extrabold tracking-wider text-mute">{p.brand?.toLocaleUpperCase("en-US")}</span>
        <Link href={`/urun/${p.slug}`} className="line-clamp-2 min-h-[39px] text-[14.5px] leading-[1.3] font-bold hover:text-link">
          {p.name}
        </Link>
        {p.reviewCount ? (
          <span className="flex items-center gap-1 text-xs text-mute">
            <Star size={12} className="fill-gold text-gold" /> <b className="text-deep">{p.rating?.toFixed(1)}</b> ({p.reviewCount})
          </span>
        ) : (
          <span className="h-4" />
        )}
        <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
          <strong className="font-display text-[18px] font-extrabold md:text-[20px]">{formatTL(p.price)}</strong>
          {discount ? <s className="text-[13px] text-mute">{formatTL(p.compareAtPrice)}</s> : null}
        </div>
        <span className="text-[12px] font-semibold text-mute">
          {out ? "Gelince haber verelim" : ctx.installments > 1 && p.price >= 3000 ? `${ctx.installments} × ${formatTL(Math.round(p.price / ctx.installments))} vade farksız` : "Taksit seçenekleri"}
        </span>
        <div className="mt-2 flex flex-col gap-1.5">
          <DeliveryBadge p={p} ctx={ctx} />
          <SocialProof p={p} ctx={ctx} />
        </div>
        <div className="mt-auto flex flex-col gap-2 pt-3">
          {out ? (
            <Link href={`/urun/${p.slug}`} className="grid h-10 place-items-center rounded-lg border border-deep text-sm font-bold">
              İncele
            </Link>
          ) : (
            <AddToCart productId={p.id} name={p.name} price={p.price} brand={p.brand} />
          )}
          {compare ? <CompareToggle productId={p.id} /> : null}
        </div>
      </div>
    </article>
  );
}
