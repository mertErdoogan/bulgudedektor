"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Coins, Gem, Radar, Sprout, Waves } from "lucide-react";
import type { CardCtx } from "@/lib/card-ctx";
import type { ProductCard as P } from "@/lib/store";
import { cn } from "@/lib/utils";
import { ProductCard } from "./product-card";

export type ExploreTab = { k: string; l: string; d: string; href: string; items: P[] };
const ICON: Record<string, typeof Coins> = { define: Coins, altin: Gem, sahil: Waves, baslangic: Sprout, pro: Radar };

/**
 * "Amacına göre keşfet": aynı ürünleri bir de müşterinin amacına göre gösterir (sekmeli, 8 ürün).
 * Sekmeler arası geçiş sayfa yenilemeden; her sekmenin altında o amacın tüm ürünlerine bağlantı.
 */
export function ExploreTabs({ tabs, ctx }: { tabs: ExploreTab[]; ctx: CardCtx }) {
  const list = tabs.filter((t) => t.items.length >= 3);
  const [k, setK] = useState(list[0]?.k);
  const cur = list.find((t) => t.k === k) ?? list[0];
  if (!cur) return null;
  return (
    <section className="container-x mt-14" data-testid="explore">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="text-[11.5px] font-extrabold tracking-[.14em] text-mute">AMACINA GÖRE KEŞFET</span>
          <h2 className="font-display mt-1 text-[24px] leading-tight font-extrabold md:text-[32px]">Ne arıyorsan, ona göre seç</h2>
        </div>
        <Link href={cur.href} className="flex items-center gap-1.5 text-sm font-bold hover:text-brand">
          Tümünü gör <ArrowRight size={15} />
        </Link>
      </div>
      <div role="tablist" aria-label="Amaç" className="scrollbar-none -mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
        {list.map((t) => {
          const I = ICON[t.k] ?? Coins;
          const on = t.k === cur.k;
          return (
            <button
              key={t.k}
              role="tab"
              aria-selected={on}
              onClick={() => setK(t.k)}
              className={cn(
                "flex h-12 shrink-0 items-center gap-2.5 rounded-full border pr-5 pl-2 text-[14px] font-bold transition",
                on ? "border-deep bg-deep text-white shadow-[0_10px_24px_-14px_rgba(20,20,22,.8)]" : "border-line bg-white hover:border-deep",
              )}
            >
              <span className={cn("grid h-8 w-8 place-items-center rounded-full transition", on ? "bg-brand text-white" : "bg-soft text-deep")}>
                <I size={16} />
              </span>
              {t.l}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-[14px] text-mute" aria-live="polite">{cur.d}</p>
      <div key={cur.k} role="tabpanel" className="explore-in scrollbar-none -mx-4 mt-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 xl:grid-cols-4">
        {cur.items.slice(0, 8).map((p) => (
          <ProductCard key={p.id} p={p} ctx={ctx} className="w-[66%] shrink-0 snap-start sm:w-[42%] md:w-auto" />
        ))}
      </div>
    </section>
  );
}
