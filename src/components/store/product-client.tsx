"use client";

import { countActivity, emit, pushRecent } from "@/lib/track";
import { useEffect, useState } from "react";
import { Minus, Plus, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";
import { useCart } from "./cart";

export function Gallery({ images, name, badge }: { images: { url: string; alt: string | null }[]; name: string; badge?: string }) {
  const [i, setI] = useState(0);
  const cur = images[i];
  return (
    <div>
      <div className="relative grid aspect-square place-items-center overflow-hidden rounded-2xl border border-line bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {cur ? <img src={cur.url} alt={cur.alt ?? name} className="h-full w-full object-contain p-6" /> : <span className="text-mute">Görsel yok</span>}
        {badge ? <span className="absolute top-4 left-4 rounded-md bg-pop px-2.5 py-1 text-xs font-extrabold text-on-pop">{badge}</span> : null}
        {images.length > 1 ? <span className="absolute right-4 bottom-4 rounded-full bg-deep/80 px-2.5 py-1 text-xs font-bold text-white">{i + 1} / {images.length}</span> : null}
      </div>
      {images.length > 1 ? (
        <div className="scrollbar-none mt-3 flex gap-2 overflow-x-auto">
          {images.map((im, k) => (
            <button key={im.url + k} onClick={() => setI(k)} className={cn("h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-white", k === i ? "border-brand" : "border-line")} aria-label={`Görsel ${k + 1}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={im.url} alt="" className="h-full w-full object-contain p-1" />
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
  const router = useRouter();
  return (
    <div className="flex flex-col gap-2">
    <div className="flex gap-2">
      <div className="flex h-12 items-center rounded-lg border border-[#d6d6d9]">
        <button className="grid h-full w-11 place-items-center" onClick={() => setQ(Math.max(1, q - 1))} aria-label="Azalt"><Minus size={16} /></button>
        <span className="w-8 text-center font-bold">{q}</span>
        <button className="grid h-full w-11 place-items-center" onClick={() => setQ(Math.min(Math.max(1, max), q + 1))} aria-label="Artır"><Plus size={16} /></button>
      </div>
      <Button size="lg" className="flex-1" disabled={disabled} onClick={() => add(productId, q, name, { price: amount, brand })}>{disabled ? "Stokta yok" : "Sepete ekle"}</Button>
    </div>
      {!disabled ? (
        <button
          type="button"
          onClick={() => {
            add(productId, q, name, { price: amount, brand });
            window.dispatchEvent(new Event("arena-nav-start"));
            router.push("/odeme");
          }}
          className="flex h-12 items-center justify-center gap-2 rounded-lg bg-deep text-sm font-extrabold text-white hover:bg-black"
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
