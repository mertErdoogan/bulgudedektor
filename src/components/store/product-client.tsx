"use client";

import { imgProps, imgUrl } from "@/lib/img";
import { countActivity, emit, pushRecent } from "@/lib/track";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronLeft, ChevronRight, Maximize2, Minus, Plus, ShoppingCart, X, Zap, ZoomIn } from "lucide-react";
import { useLocaleRouter, useT } from "@/components/i18n";
import { cn } from "@/lib/utils";
import { useCart } from "./cart";
import { NoImage } from "./product-card";

/**
 * Ürün galerisi: spot ışıklı zemin, büyük görsel; masaüstünde üzerine gelince büyüteç, telefonda kaydırarak geçiş.
 * Görsele dokununca tam ekran görüntüleyici açılır (ok tuşları, kaydırma, dokunarak yakınlaştırma, küçük resimler).
 */
export function Gallery({ images, name, badge, brand, discountPct = 0 }: { images: { url: string; alt: string | null }[]; name: string; badge?: string; brand?: string | null; discountPct?: number }) {
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const [open, setOpen] = useState(false);
  const t = useT();
  const touchX = useRef<number | null>(null);
  const cur = images[i];
  const n = images.length;
  const step = (d: number) => n > 1 && setI((k) => (k + d + n) % n);
  return (
    <div>
      <div
        className={cn("group relative grid aspect-[5/4] place-items-center overflow-hidden rounded-[28px] bg-[radial-gradient(70%_60%_at_50%_42%,#ffffff_0%,#f4f4f5_58%,#e7e7ea_100%)] ring-1 ring-line md:aspect-square", cur && "cursor-zoom-in")}
        onClick={() => cur && setOpen(true)}
        onMouseMove={(e) => {
          if (!cur || window.matchMedia("(hover: none)").matches) return;
          const r = e.currentTarget.getBoundingClientRect();
          setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
        }}
        onMouseLeave={() => setZoom(null)}
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          touchX.current = null;
          if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") step(1);
          if (e.key === "ArrowLeft") step(-1);
          if (e.key === "Enter" && cur) setOpen(true);
        }}
        tabIndex={0}
        role="button"
        aria-label={`${t("pdp.zoom", { name })}${n > 1 ? `, ${i + 1} / ${n}` : ""}`}
        data-testid="gallery-main"
      >
        {/* Ürünün altında yumuşak bir zemin gölgesi: düz gri kutu yerine "sahnede duran" ürün hissi */}
        <span aria-hidden className="pointer-events-none absolute bottom-[11%] left-1/2 h-8 w-[55%] -translate-x-1/2 rounded-[50%] bg-black/[.09] blur-2xl" />
        {cur ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={cur.url}
            {...imgProps(cur.url, [640, 828, 1080, 1600], "(min-width: 1024px) 50vw, 100vw", 80)}
            alt={cur.alt ?? name}
            className="gallery-in h-full w-full object-contain p-8 mix-blend-multiply transition-transform duration-200 ease-out md:p-10"
            style={zoom ? { transform: "scale(1.8)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
          />
        ) : (
          <NoImage brand={brand} />
        )}
        <span className="pointer-events-none absolute top-4 left-4 flex flex-wrap gap-1.5">
          {badge ? <span className="rounded-full bg-white px-3 py-1 text-[11.5px] font-black tracking-[.06em] text-deep uppercase shadow-sm ring-1 ring-line">{badge}</span> : null}
          {discountPct ? <span className="rounded-full bg-brand px-3 py-1 text-[12px] font-black text-white shadow-sm">−%{discountPct}</span> : null}
        </span>
        {cur ? (
          <span aria-hidden className="pointer-events-none absolute top-4 right-4 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-deep shadow-sm ring-1 ring-line transition group-hover:scale-105">
            <Maximize2 size={17} />
          </span>
        ) : null}
        {n > 1 ? (
          <>
            <button type="button" onClick={(e) => { e.stopPropagation(); step(-1); }} aria-label={t("gallery.prev")} className="absolute top-1/2 left-3 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 opacity-0 shadow-md transition group-hover:opacity-100 focus:opacity-100 md:grid"><ChevronLeft size={20} /></button>
            <button type="button" onClick={(e) => { e.stopPropagation(); step(1); }} aria-label={t("gallery.next")} className="absolute top-1/2 right-3 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 opacity-0 shadow-md transition group-hover:opacity-100 focus:opacity-100 md:grid"><ChevronRight size={20} /></button>
            <span className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-deep/70 px-2.5 py-1.5 md:hidden" aria-hidden>
              {images.map((_, k) => <span key={k} className={cn("h-1.5 rounded-full bg-white transition-all", k === i ? "w-4" : "w-1.5 opacity-50")} />)}
            </span>
            <span className="absolute right-4 bottom-4 hidden rounded-full bg-deep/80 px-2.5 py-1 text-xs font-bold text-white md:block">{i + 1} / {n}</span>
          </>
        ) : null}
        {cur ? <span className="pointer-events-none absolute bottom-4 left-4 hidden items-center gap-1.5 rounded-full bg-white/85 px-2.5 py-1 text-[11.5px] font-semibold text-mute opacity-0 transition group-hover:opacity-100 md:flex"><ZoomIn size={13} /> {t("gallery.enlarge")}</span> : null}
      </div>
      {n > 1 ? (
        <div className="scrollbar-none mt-3 hidden gap-2 overflow-x-auto md:flex">
          {images.map((im, k) => (
            <button key={im.url + k} onClick={() => setI(k)} className={cn("h-[76px] w-[76px] shrink-0 overflow-hidden rounded-2xl border-2 bg-[#f6f6f7] transition", k === i ? "border-deep" : "border-transparent opacity-70 hover:opacity-100")} aria-label={t("pdp.img_n", { n: k + 1 })} aria-current={k === i ? "true" : undefined}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imgUrl(im.url, 128)} alt="" className="h-full w-full object-contain p-1.5 mix-blend-multiply" />
            </button>
          ))}
        </div>
      ) : null}
      {open ? createPortal(<Lightbox images={images} name={name} index={i} onIndex={setI} onClose={() => setOpen(false)} />, document.body) : null}
    </div>
  );
}

/** Tam ekran görsel görüntüleyici: Esc kapatır, oklar/kaydırma geçer, görsele dokununca 2× yakınlaşır. */
function Lightbox({ images, name, index, onIndex, onClose }: { images: { url: string; alt: string | null }[]; name: string; index: number; onIndex: (k: number) => void; onClose: () => void }) {
  const n = images.length;
  const [z, setZ] = useState<{ x: number; y: number } | null>(null);
  const t = useT();
  const touchX = useRef<number | null>(null);
  const go = (d: number) => {
    setZ(null);
    onIndex((index + d + n) % n);
  };
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (n > 1 && e.key === "ArrowRight") go(1);
      if (n > 1 && e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", key);
    };
  });
  const cur = images[index];
  return (
    <div role="dialog" aria-modal="true" aria-label={t("pdp.imgs", { name })} className="fixed inset-0 z-[120] flex flex-col bg-[#0c0c0e]/95 text-white backdrop-blur-sm" data-testid="gallery-lightbox">
      <div className="flex items-center gap-3 px-4 py-3 md:px-6">
        <b className="min-w-0 flex-1 truncate text-[14px]">{name}</b>
        {n > 1 ? <span className="text-[13px] text-white/60 tabular-nums">{index + 1} / {n}</span> : null}
        <button type="button" onClick={onClose} aria-label={t("gallery.close")} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 transition hover:bg-white/20"><X size={20} /></button>
      </div>
      <div
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-2 md:px-16"
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          touchX.current = null;
          if (n > 1 && Math.abs(dx) > 50 && !z) go(dx < 0 ? 1 : -1);
        }}
      >
        <div className="relative h-full max-h-[80vh] w-full max-w-[1100px] overflow-hidden rounded-[22px] bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={cur.url}
            {...imgProps(cur.url, [828, 1080, 1600, 2048], "100vw", 85)}
            alt={cur.alt ?? name}
            onClick={(e) => {
              if (z) return setZ(null);
              const r = e.currentTarget.getBoundingClientRect();
              setZ({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
            }}
            onMouseMove={(e) => {
              if (!z) return;
              const r = e.currentTarget.getBoundingClientRect();
              setZ({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
            }}
            className={cn("gallery-in h-full w-full object-contain p-4 transition-transform duration-200 md:p-8", z ? "cursor-zoom-out" : "cursor-zoom-in")}
            style={z ? { transform: "scale(2.2)", transformOrigin: `${z.x}% ${z.y}%` } : undefined}
          />
        </div>
        {n > 1 ? (
          <>
            <button type="button" onClick={() => go(-1)} aria-label={t("gallery.prev")} className="absolute top-1/2 left-3 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 transition hover:bg-white/25 md:grid"><ChevronLeft size={24} /></button>
            <button type="button" onClick={() => go(1)} aria-label={t("gallery.next")} className="absolute top-1/2 right-3 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 transition hover:bg-white/25 md:grid"><ChevronRight size={24} /></button>
          </>
        ) : null}
      </div>
      <p className="py-2 text-center text-[12px] text-white/50">{z ? t("gallery.unzoomHint") : t("gallery.zoomHint")}</p>
      {n > 1 ? (
        <div className="scrollbar-none flex justify-center gap-2 overflow-x-auto px-4 pb-[max(16px,env(safe-area-inset-bottom))]">
          {images.map((im, k) => (
            <button key={im.url + k} type="button" onClick={() => { setZ(null); onIndex(k); }} aria-label={t("pdp.img_n", { n: k + 1 })} aria-current={k === index ? "true" : undefined} className={cn("h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white transition", k === index ? "ring-2 ring-white" : "opacity-50 hover:opacity-90")}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imgUrl(im.url, 128)} alt="" className="h-full w-full object-contain p-1" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function BuyBox({ productId, name, max, disabled, amount, brand }: { productId: string; name: string; max: number; disabled: boolean; amount?: number; brand?: string | null }) {
  const { add } = useCart();
  const [q, setQ] = useState(1);
  const [done, setDone] = useState(false);
  const router = useLocaleRouter();
  const t = useT();
  return (
    <div className="flex flex-wrap gap-2.5">
      <div className="flex min-w-0 flex-1 basis-[300px] gap-2.5">
        <div className="flex h-14 items-center rounded-full border border-[#d6d6d9] bg-white">
          <button className="grid h-full w-12 place-items-center rounded-l-full hover:bg-soft" onClick={() => setQ(Math.max(1, q - 1))} aria-label={t("pdp.decrease")}><Minus size={16} /></button>
          <span className="w-7 text-center font-bold tabular-nums">{q}</span>
          <button className="grid h-full w-12 place-items-center rounded-r-full hover:bg-soft" onClick={() => setQ(Math.min(Math.max(1, max), q + 1))} aria-label={t("pdp.increase")}><Plus size={16} /></button>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            add(productId, q, name, { price: amount, brand });
            setDone(true);
            setTimeout(() => setDone(false), 1400);
          }}
          className={cn("flex h-14 flex-1 items-center justify-center gap-2 rounded-full text-[16px] font-extrabold text-white shadow-[0_12px_24px_-12px_rgba(212,46,30,.7)] transition hover:-translate-y-0.5 disabled:opacity-50 disabled:shadow-none", done ? "bg-ok shadow-none" : "bg-brand hover:bg-brand-dark")}
        >
          {disabled ? t("card.outOfStock") : done ? <span key="ok" className="pop-in flex items-center gap-1.5"><Check size={19} strokeWidth={3} /> {t("card.addedLong")}</span> : <><ShoppingCart size={19} /> {t("card.addToCart")}</>}
        </button>
      </div>
      {!disabled ? (
        <button
          type="button"
          onClick={() => {
            add(productId, q, name, { price: amount, brand });
            window.dispatchEvent(new Event("site-nav-start"));
            router.push("/odeme");
          }}
          className="flex h-14 flex-1 basis-[140px] items-center justify-center gap-2 rounded-full bg-deep px-6 text-[15px] font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-black lg:flex-none"
        >
          <Zap size={17} /> {t("pdp.buyNow")}
        </button>
      ) : null}
    </div>
  );
}

export function StickyBuy({ productId, name, price, inst, disabled, amount, brand }: { productId: string; name: string; price: string; inst?: string; disabled: boolean; amount?: number; brand?: string | null }) {
  const { add } = useCart();
  const t = useT();
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-line bg-white px-4 pt-2.5 pb-[max(10px,env(safe-area-inset-bottom))] md:hidden">
      <span className="flex flex-col leading-tight">
        <b className="font-display text-lg">{price}</b>
        {inst ? <span className="text-[11.5px] text-mute">{inst}</span> : null}
      </span>
      <button type="button" disabled={disabled} onClick={() => add(productId, 1, name, { price: amount, brand })} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-brand text-[15px] font-extrabold text-white shadow-[0_10px_22px_-12px_rgba(212,46,30,.7)] transition active:scale-[.98] disabled:opacity-50">
        {disabled ? t("card.outOfStock") : <><ShoppingCart size={18} /> {t("card.addToCart")}</>}
      </button>
    </div>
  );
}

export function Stars({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const t = useT();
  return (
    <div className="flex gap-1" role="radiogroup" aria-label={t("pdp.rating")}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button type="button" key={n} onClick={() => onChange(n)} className={cn("text-2xl", n <= value ? "text-gold" : "text-line")} aria-label={t("pdp.stars", { n })}>★</button>
      ))}
    </div>
  );
}

/** Ürün sayfası açıldığında: görüntüleme sayacı, son gezilenler ve GA4/Pixel view_item. */
export function ProductViewTracker({ id, name, price, brand }: { id: string; name: string; price: number; brand?: string | null }) {
  useEffect(() => {
    countActivity(id, "v");
    pushRecent(id);
    emit("view_item", { value: price, items: [{ item_id: id, item_name: name, price, item_brand: brand }] });
  }, [id, name, price, brand]);
  return null;
}
