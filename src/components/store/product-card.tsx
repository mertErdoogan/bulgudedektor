import { imgProps } from "@/lib/img";
import Link from "next/link";
import { Eye, Flame, Star, Truck } from "lucide-react";
import type { ProductCard as P } from "@/lib/store";
import { SOCIAL_MIN_CARTS, SOCIAL_MIN_VIEWS, type CardCtx } from "@/lib/card-ctx";
import { deliveryInfo } from "@/lib/delivery";
import { cn, formatTL } from "@/lib/utils";
import { AddToCart, CompareToggle, FavoriteButton } from "./bits";

const NEW_DAYS = 30;

/**
 * Son NEW_DAYS gün içinde eklendi mi? Gün bazında (UTC gün sayısı) hesaplanır: milisaniye bazında
 * hesaplanınca sınırdaki bir ürün sunucuda "yeni", birkaç saniye sonra tarayıcıda "eski" çıkıp
 * hidrasyon uyuşmazlığına (React #418) yol açıyordu.
 */
export function isNew(p: Pick<P, "createdAt">) {
  const day = (t: number) => Math.floor(t / 86400000);
  return day(Date.now()) - day(new Date(p.createdAt).getTime()) < NEW_DAYS;
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
      <span className={cn("flex items-center gap-1 text-[11.5px] font-semibold text-deep", className)}>
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

/** Görseli olmayan ürün için sade yer tutucu: boş kutu "site bozuk" gibi görünmesin. */
export function NoImage({ brand, className }: { brand?: string | null; className?: string }) {
  return (
    <span className={cn("flex h-full w-full flex-col items-center justify-center gap-2 text-[#b9b9bf]", className)} role="img" aria-label="Görsel hazırlanıyor">
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M14 50 44 14" />
        <path d="M40 18h8l2 6-6 3" />
        <ellipse cx="14" cy="52" rx="10" ry="4.5" />
        <path d="M30 31l5 4" />
      </svg>
      {brand ? <span className="text-[11px] font-extrabold tracking-[.18em]">{brand.toLocaleUpperCase("en-US")}</span> : null}
    </span>
  );
}

export function ProductCard({ p, ctx, compare = false, className, rank }: { p: P; ctx: CardCtx; compare?: boolean; className?: string; rank?: number }) {
  const out = p.stock <= 0 && !p.allowBackorder;
  const discount = p.compareAtPrice && p.compareAtPrice > p.price ? Math.round(((p.compareAtPrice - p.price) / p.compareAtPrice) * 100) : 0;
  // "Yeni" yalnızca panelde "Yeni" rozeti verilen ürünlerde: eklenme tarihine bakılmaz (toplu içe aktarımda her ürün "yeni" görünürdü).
  const fresh = p.badges.some((b) => /^yeni/i.test(b));
  const badge = p.badges.find((b) => !/^yeni/i.test(b));
  const d = deliveryInfo(p, ctx.ship);
  const deal = !out && p.cartDeal && p.cartDeal > 0 ? Math.round((p.price - p.cartDeal) * 100) / 100 : 0;
  return (
    <article className={cn("group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-white text-deep transition duration-300 hover:-translate-y-1 hover:border-[#dcdce0] hover:shadow-[0_22px_40px_-22px_rgba(20,20,22,.35)]", className)}>
      {/* Görsel: kartın en baskın öğesi. Spot ışığı zemini; üzerine gelince ürün hafifçe kalkar. */}
      <Link href={`/urun/${p.slug}`} className="relative m-2 mb-0 block overflow-hidden rounded-xl bg-[radial-gradient(120%_90%_at_50%_35%,#ffffff_0%,#f6f6f6_55%,#ededed_100%)]">
        <span className="relative block aspect-[5/4]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {p.image ? <img {...imgProps(p.image, [256, 384, 640], "(min-width: 1280px) 280px, (min-width: 768px) 30vw, 50vw")} alt={`${p.brand ?? ""} ${p.name}`.trim()} loading="lazy" decoding="async" className="h-full w-full object-contain p-3 mix-blend-multiply transition duration-500 group-hover:-translate-y-1 group-hover:scale-[1.05]" /> : <NoImage brand={p.brand} />}
        </span>
        <span aria-hidden className="card-shine pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        <span className="absolute top-2.5 left-2.5 flex flex-wrap items-center gap-1 pr-10">
          {rank ? <span className="grid h-7 min-w-7 place-items-center rounded-full bg-deep px-1.5 text-[12.5px] font-black text-white shadow-sm">{rank}</span> : null}
          {out ? <span className="rounded-full bg-deep px-2.5 py-0.5 text-[11px] font-extrabold text-white">Tükendi</span> : null}
          {fresh && !out ? <span className="rounded-full bg-white px-2.5 py-0.5 text-[10.5px] font-black tracking-[.08em] text-deep shadow-sm ring-1 ring-line">YENİ</span> : null}
          {badge && !discount && !fresh ? <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-extrabold text-deep ring-1 ring-line">{badge}</span> : null}
        </span>
        {discount ? <span className="absolute right-2.5 bottom-2.5 rounded-full bg-brand px-2.5 py-1 text-[11.5px] font-black text-white shadow-sm">−%{discount}</span> : null}
      </Link>
      <FavoriteButton productId={p.id} name={p.name} className="absolute top-4 right-4" />
      <div className="flex flex-1 flex-col px-3.5 pt-3 pb-3.5 md:px-4 md:pb-4">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[11.5px] font-extrabold tracking-[0.12em] text-mute">{p.brand?.toLocaleUpperCase("en-US")}</span>
          {p.reviewCount ? (
            <span className="flex shrink-0 items-center gap-1 text-xs text-mute">
              <Star size={12} className="fill-gold text-gold" /> <b className="text-deep">{p.rating?.toFixed(1)}</b> ({p.reviewCount})
            </span>
          ) : null}
        </div>
        <Link href={`/urun/${p.slug}`} className="font-display mt-0.5 line-clamp-2 text-[16px] leading-[1.25] font-extrabold hover:text-brand md:text-[17px]">
          {p.name}
        </Link>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
          <strong className="font-display text-[19px] font-extrabold md:text-[20px]">{formatTL(p.price)}</strong>
          {discount ? <s className="text-[13px] text-mute">{formatTL(p.compareAtPrice)}</s> : null}
        </div>
        {deal ? (
          <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-ok-bg px-2 py-0.5 text-[12px] font-semibold text-ok" data-testid="card-deal">
            Sepette <b>{formatTL(deal)}</b>
          </span>
        ) : (
          <span className="text-[12px] text-mute">
            {out ? "Gelince haber verelim" : ctx.installments > 1 && p.price >= 3000 ? `${ctx.installments} × ${formatTL(Math.round(p.price / ctx.installments))} vade farksız` : "Taksit seçenekleri"}
          </span>
        )}
        {d.tone !== "none" ? (
          <span className={cn("mt-2 flex items-center gap-1.5 text-[12px] font-semibold", d.tone === "fast" ? "text-ok" : d.tone === "slow" ? "text-warn" : "text-mute")}>
            <Truck size={14} className="shrink-0" /> {d.ship}
          </span>
        ) : null}
        <div className="mt-auto flex flex-col gap-2 pt-3">
          {out ? (
            <Link href={`/urun/${p.slug}`} className="grid h-10 place-items-center rounded-full border border-[#dcdce0] text-[13.5px] font-bold hover:border-deep">
              İncele
            </Link>
          ) : (
            <AddToCart productId={p.id} name={p.name} price={p.price} brand={p.brand} variant="card" />
          )}
          {compare ? <CompareToggle productId={p.id} /> : null}
        </div>
      </div>
    </article>
  );
}
