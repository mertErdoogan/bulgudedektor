"use client";

import { imgUrl } from "@/lib/img";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Clock3, Heart, X } from "lucide-react";
import type { CardCtx } from "@/lib/card-ctx";
import type { ProductCard as P } from "@/lib/store";
import { clearRecent, getRecent } from "@/lib/track";
import { cn, formatTL } from "@/lib/utils";
import { useCart } from "./cart";
import { ProductCard } from "./product-card";

/** Yatay kaydırmalı ürün şeridi: mobilde parmakla, masaüstünde oklarla. */
export function Rail({ children, className, itemClass = "w-[62%] sm:w-[40%] md:w-[31.5%] xl:w-[23.8%]" }: { children: React.ReactNode[]; className?: string; itemClass?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ l: true, r: false });
  const update = () => {
    const el = ref.current;
    if (!el) return;
    setEdge({ l: el.scrollLeft < 8, r: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
  };
  useEffect(() => {
    update();
    const el = ref.current;
    el?.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [children.length]);
  const go = (d: number) => ref.current?.scrollBy({ left: d * ref.current.clientWidth * 0.9, behavior: "smooth" });
  return (
    <div className={cn("relative min-w-0", className)}>
      <div ref={ref} className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pt-2 pb-8 -mb-5 md:mx-0 md:gap-4 md:px-1 md:-mx-1 md:scroll-px-1">
        {children.map((c, i) => (
          <div key={i} className={cn("shrink-0 snap-start", itemClass)}>
            {c}
          </div>
        ))}
      </div>
      {!edge.l ? (
        <button type="button" onClick={() => go(-1)} aria-label="Geri" className="absolute top-[38%] -left-4 hidden h-11 w-11 place-items-center rounded-full border border-line bg-white shadow-md hover:bg-soft md:grid">
          <ChevronLeft size={20} />
        </button>
      ) : null}
      {!edge.r ? (
        <button type="button" onClick={() => go(1)} aria-label="İleri" className="absolute top-[38%] -right-4 hidden h-11 w-11 place-items-center rounded-full border border-line bg-white shadow-md hover:bg-soft md:grid">
          <ChevronRight size={20} />
        </button>
      ) : null}
    </div>
  );
}

function useCards(ids: string[]) {
  const [state, setState] = useState<{ items: P[]; ctx: CardCtx | null }>({ items: [], ctx: null });
  const key = ids.join(",");
  useEffect(() => {
    if (!key) {
      setState({ items: [], ctx: null });
      return;
    }
    let live = true;
    fetch(`/api/urun-kartlari?ids=${key}`)
      .then((r) => r.json())
      .then((d) => live && setState(d))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [key]);
  return state;
}

function useRecentIds(exclude?: string) {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    const load = () => setIds(getRecent().filter((x) => x !== exclude));
    load();
    window.addEventListener("arena-recent", load);
    return () => window.removeEventListener("arena-recent", load);
  }, [exclude]);
  return ids;
}

/** "Son gezdiklerin" şeridi — yalnızca bu tarayıcıda tutulur, giriş gerekmez. */
export function RecentlyViewed({ exclude, title = "Son gezdiklerin", className }: { exclude?: string; title?: string; className?: string }) {
  const ids = useRecentIds(exclude);
  const { items, ctx } = useCards(ids.slice(0, 12));
  if (!items.length || !ctx) return null;
  return (
    <section className={className}>
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 className="font-display flex items-center gap-2 text-xl font-extrabold md:text-2xl">
          <Clock3 size={22} className="text-brand" /> {title}
        </h2>
        <button type="button" onClick={clearRecent} className="text-sm font-bold text-mute hover:text-deep">Temizle</button>
      </div>
      <Rail itemClass="w-[62%] sm:w-[40%] md:w-[31.5%] xl:w-[19%]">
        {items.map((p) => (
          <ProductCard key={p.id} p={p} ctx={ctx} />
        ))}
      </Rail>
    </section>
  );
}

function useRecs(ids: string[], tip: "kisisel" | "birlikte") {
  const [state, setState] = useState<{ items: P[]; ctx: CardCtx | null }>({ items: [], ctx: null });
  const key = ids.join(",");
  useEffect(() => {
    if (!key) {
      setState({ items: [], ctx: null });
      return;
    }
    let live = true;
    fetch(`/api/oneriler?tip=${tip}&ids=${key}`)
      .then((r) => r.json())
      .then((d) => live && setState(d))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [key, tip]);
  return state;
}

/** "Sana özel": ziyaretçinin son gezdiği ürünlere göre öneriler (yalnızca gezinme geçmişi varsa görünür). */
export function PersonalPicks({ className }: { className?: string }) {
  const ids = useRecentIds();
  const { items, ctx } = useRecs(ids.slice(0, 12), "kisisel");
  if (items.length < 3 || !ctx) return null;
  return (
    <section className={className}>
      <div className="mb-5 border-l-4 border-brand pl-3.5">
        <h2 className="font-display text-[23px] leading-tight font-extrabold md:text-[30px]">Sana özel öneriler</h2>
        <p className="mt-0.5 text-sm text-mute">İncelediğin cihazlara benzer modeller</p>
      </div>
      <Rail>
        {items.map((p) => (
          <ProductCard key={p.id} p={p} ctx={ctx} className="h-full" />
        ))}
      </Rail>
    </section>
  );
}

/** Sepette: "bunu alanlar şunu da aldı". */
export function CartUpsell({ className }: { className?: string }) {
  const { items: cart, ready } = useCart();
  const ids = cart.map((c) => c.productId);
  const { items, ctx } = useRecs(ready ? ids.slice(0, 10) : [], "birlikte");
  if (!items.length || !ctx) return null;
  return (
    <section className={className}>
      <h2 className="font-display mb-4 text-xl font-extrabold md:text-2xl">Bunlarla birlikte alınanlar</h2>
      <Rail>
        {items.map((p) => (
          <ProductCard key={p.id} p={p} ctx={ctx} className="h-full" />
        ))}
      </Rail>
    </section>
  );
}

/** Header'daki kısayol: son gezilenler ve favoriler küçük bir açılır pencerede. */
export function QuickLists() {
  const [open, setOpen] = useState<null | "recent" | "fav">(null);
  const recentIds = useRecentIds();
  const { favorites, ready } = useCart();
  const ids = open === "fav" ? favorites : recentIds;
  const { items } = useCards(open ? ids.slice(0, 8) : []);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const btn = "relative grid h-11 w-11 place-items-center rounded-full hover:bg-soft";
  return (
    <div ref={box} className="relative hidden items-center md:flex">
      <button type="button" className={btn} aria-label="Son gezdiklerin" onClick={() => setOpen(open === "recent" ? null : "recent")}>
        <Clock3 size={20} />
        {recentIds.length ? <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-accent" /> : null}
      </button>
      <button type="button" className={btn} aria-label="Favorilerim" onClick={() => setOpen(open === "fav" ? null : "fav")}>
        <Heart size={20} />
        {ready && favorites.length ? <span className="absolute -top-0.5 -right-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[11px] font-extrabold text-white">{favorites.length}</span> : null}
      </button>
      {open ? (
        <div className="absolute top-full right-0 z-50 mt-2 w-[360px] rounded-2xl border border-line bg-white p-3 text-deep shadow-2xl">
          <div className="mb-2 flex items-center justify-between px-1">
            <b>{open === "fav" ? "Favorilerim" : "Son gezdiklerin"}</b>
            <button type="button" onClick={() => setOpen(null)} aria-label="Kapat" className="grid h-8 w-8 place-items-center rounded-full hover:bg-soft"><X size={16} /></button>
          </div>
          {ids.length === 0 ? (
            <p className="px-1 py-6 text-center text-sm text-mute">{open === "fav" ? "Henüz favori ürünün yok. Kalbe dokunarak ekleyebilirsin." : "Henüz bir ürün incelemedin."}</p>
          ) : (
            <ul className="flex max-h-[380px] flex-col overflow-y-auto">
              {items.map((p) => (
                <li key={p.id}>
                  <Link href={`/urun/${p.slug}`} onClick={() => setOpen(null)} className="flex items-center gap-3 rounded-xl p-2 hover:bg-soft">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {p.image ? <img src={imgUrl(p.image, 96)} alt="" className="h-12 w-12 shrink-0 object-contain" /> : <span className="h-12 w-12 shrink-0 rounded bg-soft" />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{p.name}</span>
                      <span className="text-sm text-mute">{formatTL(p.price)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {open === "fav" && ids.length ? (
            <Link href="/favoriler" onClick={() => setOpen(null)} className="mt-2 grid h-10 place-items-center rounded-lg bg-deep text-sm font-extrabold text-white">Tüm favorileri gör</Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** /favoriler sayfası içeriği */
export function FavoritesGrid() {
  const { favorites, ready } = useCart();
  const { items, ctx } = useCards(favorites.slice(0, 40));
  if (!ready) return null;
  if (!favorites.length)
    return (
      <div className="rounded-2xl bg-soft p-10 text-center">
        <Heart size={36} className="mx-auto text-accent" />
        <p className="mt-3 font-bold">Favori listen boş</p>
        <p className="mt-1 text-sm text-mute">Beğendiğin ürünlerdeki kalbe dokun; fiyatını ve stoğunu buradan takip et.</p>
        <Link href="/urunler" className="mt-4 inline-flex h-11 items-center rounded-lg bg-brand px-5 text-sm font-extrabold text-white">Ürünlere göz at</Link>
      </div>
    );
  if (!ctx) return <p className="text-mute">Yükleniyor…</p>;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
      {items.map((p) => (
        <ProductCard key={p.id} p={p} ctx={ctx} />
      ))}
    </div>
  );
}
