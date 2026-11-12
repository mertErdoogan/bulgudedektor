import { imgProps } from "@/lib/img";
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
        {d.eta ? <span className="block">{d.eta}</span> : null}
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
  const d = deliveryInfo(p, ctx.ship);
  return (
    <article className={cn("group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-white text-deep transition duration-200 hover:border-[#d6d6d9] hover:shadow-[0_14px_30px_rgba(20,20,20,.10)]", className)}>
      {/* Görsel: kartın en baskın öğesi */}
      <Link href={`/urun/${p.slug}`} className="relative m-2 mb-0 block overflow-hidden rounded-xl bg-[#f6f6f6]">
        <span className="block aspect-[5/4]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {p.image ? <img {...imgProps(p.image, [256, 384, 640], "(min-width: 1280px) 280px, (min-width: 768px) 30vw, 50vw")} alt={`${p.brand ?? ""} ${p.name}`.trim()} loading="lazy" decoding="async" className="h-full w-full object-contain p-3 mix-blend-multiply transition duration-300 group-hover:scale-[1.05]" /> : null}
        </span>
        <span className="absolute top-2.5 left-2.5 flex flex-wrap items-center gap-1 pr-10">
          {rank ? <span className={cn("grid h-7 min-w-7 place-items-center rounded-full px-1.5 text-[13px] font-black text-white", rank <= 3 ? "bg-accent" : "bg-deep")}>{rank}</span> : null}
          {out ? <span className="rounded-md bg-deep px-2 py-0.5 text-[11px] font-extrabold text-white">Tükendi</span> : null}
          {discount ? <span className="rounded-md bg-accent px-2 py-0.5 text-[11px] font-extrabold text-white">%{discount}</span> : null}
          {fresh ? <span className="rounded-md bg-deep px-2 py-0.5 text-[11px] font-extrabold text-white">Yeni</span> : null}
          {badge && !discount && !fresh ? <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-extrabold text-deep ring-1 ring-line">{badge}</span> : null}
        </span>
      </Link>
      <FavoriteButton productId={p.id} name={p.name} className="absolute top-4 right-4" />
      <div className="flex flex-1 flex-col px-3.5 pt-3 pb-3.5 md:px-4 md:pb-4">
        {/* Üretici + model: ikinci baskın öğe */}
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[12.5px] font-black tracking-[0.08em] text-brand">{p.brand?.toLocaleUpperCase("en-US")}</span>
          {p.reviewCount ? (
            <span className="flex shrink-0 items-center gap-1 text-xs text-mute">
              <Star size={12} className="fill-gold text-gold" /> <b className="text-deep">{p.rating?.toFixed(1)}</b> ({p.reviewCount})
            </span>
          ) : null}
        </div>
        <Link href={`/urun/${p.slug}`} className="font-display mt-0.5 line-clamp-2 text-[16px] leading-[1.25] font-extrabold hover:text-link md:text-[17.5px]">
          {p.name}
        </Link>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
          <strong className="font-display text-[19px] font-extrabold md:text-[21px]">{formatTL(p.price)}</strong>
          {discount ? <s className="text-[13px] text-mute">{formatTL(p.compareAtPrice)}</s> : null}
        </div>
        <span className="text-[12px] text-mute">
          {out ? "Gelince haber verelim" : ctx.installments > 1 && p.price >= 3000 ? `${ctx.installments} × ${formatTL(Math.round(p.price / ctx.installments))} vade farksız` : "Taksit seçenekleri"}
        </span>
        {d.tone !== "none" || (ctx.social && (p.carts24 >= SOCIAL_MIN_CARTS || p.views24 >= SOCIAL_MIN_VIEWS)) ? (
          <div className="mt-2 flex flex-col gap-1 border-t border-line pt-2">
            {d.tone !== "none" ? (
              <span className={cn("flex items-start gap-1.5 text-[12px] leading-snug", d.tone === "fast" ? "text-ok" : d.tone === "slow" ? "text-warn" : "text-mute")}>
                <Truck size={14} className="mt-px shrink-0" />
                <span>
                  <b>{d.ship}</b>
                  {d.eta ? <span className="text-mute"> · {d.eta}</span> : null}
                </span>
              </span>
            ) : null}
            <SocialProof p={p} ctx={ctx} />
          </div>
        ) : null}
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
