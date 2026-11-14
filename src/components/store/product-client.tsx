"use client";

import { imgProps, imgUrl } from "@/lib/img";
import { countActivity, emit, pushRecent } from "@/lib/track";
import { useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Minus, Plus, ShoppingCart, Zap, ZoomIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";
import { useCart } from "./cart";
import { NoImage } from "./product-card";

/**
 * Ürün galerisi: spot ışıklı zemin, büyük görsel, üzerine gelince büyüteç etkisi (masaüstü),
 * altta küçük resimler, ok tuşlarıyla gezinme. Rozet ve indirim görselin üstünde sade haplar.
 */
export function Gallery({ images, name, badge, brand, discountPct = 0 }: { images: { url: string; alt: string | null }[]; name: string; badge?: string; brand?: string | null; discountPct?: number }) {
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const cur = images[i];
  const n = images.length;
  const step = (d: number) => n > 1 && setI((k) => (k + d + n) % n);
  return (
    <div>
      <div
        className="group relative grid aspect-square place-items-center overflow-hidden rounded-[28px] border border-line bg-[radial-gradient(110%_85%_at_50%_40%,#ffffff_0%,#f6f6f7_55%,#ececee_100%)]"
        onMouseMove={(e) => {
          if (!cur || window.matchMedia("(hover: none)").matches) return;
          const r = e.currentTarget.getBoundingClientRect();
          setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
        }}
        onMouseLeave={() => setZoom(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") step(1);
          if (e.key === "ArrowLeft") step(-1);
        }}
        tabIndex={n > 1 ? 0 : -1}
        aria-label={n > 1 ? `${name} görselleri, ${i + 1} / ${n}` : undefined}
      >
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
        {n > 1 ? (
          <>
            <button type="button" onClick={() => step(-1)} aria-label="Önceki görsel" className="absolute top-1/2 left-3 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 opacity-0 shadow-md transition group-hover:opacity-100 focus:opacity-100"><ChevronLeft size={20} /></button>
            <button type="button" onClick={() => step(1)} aria-label="Sonraki görsel" className="absolute top-1/2 right-3 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 opacity-0 shadow-md transition group-hover:opacity-100 focus:opacity-100"><ChevronRight size={20} /></button>
            <span className="absolute right-4 bottom-4 rounded-full bg-deep/80 px-2.5 py-1 text-xs font-bold text-white">{i + 1} / {n}</span>
          </>
        ) : null}
        {cur ? <span className="pointer-events-none absolute bottom-4 left-4 hidden items-center gap-1.5 rounded-full bg-white/85 px-2.5 py-1 text-[11.5px] font-semibold text-mute opacity-0 transition group-hover:opacity-100 md:flex"><ZoomIn size={13} /> Yakınlaştırmak için gezdir</span> : null}
      </div>
      {n > 1 ? (
        <div className="scrollbar-none mt-3 flex gap-2 overflow-x-auto">
          {images.map((im, k) => (
            <button key={im.url + k} onClick={() => setI(k)} className={cn("h-[76px] w-[76px] shrink-0 overflow-hidden rounded-2xl border-2 bg-[#f6f6f7] transition", k === i ? "border-deep" : "border-transparent opacity-70 hover:opacity-100")} aria-label={`Görsel ${k + 1}`} aria-current={k === i ? "true" : undefined}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imgUrl(im.url, 128)} alt="" className="h-full w-full object-contain p-1.5 mix-blend-multiply" />
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
  const router = useRouter();
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex gap-2.5">
        <div className="flex h-14 items-center rounded-full border border-[#d6d6d9] bg-white">
          <button className="grid h-full w-12 place-items-center rounded-l-full hover:bg-soft" onClick={() => setQ(Math.max(1, q - 1))} aria-label="Azalt"><Minus size={16} /></button>
          <span className="w-7 text-center font-bold tabular-nums">{q}</span>
          <button className="grid h-full w-12 place-items-center rounded-r-full hover:bg-soft" onClick={() => setQ(Math.min(Math.max(1, max), q + 1))} aria-label="Artır"><Plus size={16} /></button>
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
          {disabled ? "Stokta yok" : done ? <span key="ok" className="pop-in flex items-center gap-1.5"><Check size={19} strokeWidth={3} /> Sepete eklendi</span> : <><ShoppingCart size={19} /> Sepete ekle</>}
        </button>
      </div>
      {!disabled ? (
        <button
          type="button"
          onClick={() => {
            add(productId, q, name, { price: amount, brand });
            window.dispatchEvent(new Event("arena-nav-start"));
            router.push("/odeme");
          }}
          className="flex h-12 items-center justify-center gap-2 rounded-full border border-deep bg-white text-[14.5px] font-extrabold text-deep transition hover:bg-deep hover:text-white"
        >
          <Zap size={17} /> Hemen al
        </button>
      ) : null}
    </div>
  );
}

export function StickyBuy({ productId, name, price, inst, disabled, amount, brand }: { productId: string; name: string; price: string; inst?: string; disabled: boolean; amount?: number; brand?: string | null }) {
  const { add } = useCart();
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-line bg-white px-4 pt-2.5 pb-[max(10px,env(safe-area-inset-bottom))] md:hidden">
      <span className="flex flex-col leading-tight">
        <b className="font-display text-lg">{price}</b>
        {inst ? <span className="text-[11.5px] text-mute">{inst}</span> : null}
      </span>
      <Button size="lg" className="flex-1" disabled={disabled} onClick={() => add(productId, 1, name, { price: amount, brand })}>{disabled ? "Stokta yok" : "Sepete ekle"}</Button>
    </div>
  );
}

export function Stars({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Puan">
      {[1, 2, 3, 4, 5].map((n) => (
        <button type="button" key={n} onClick={() => onChange(n)} className={cn("text-2xl", n <= value ? "text-gold" : "text-line")} aria-label={`${n} yıldız`}>★</button>
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
