"use client";

import { useEffect, useState } from "react";
import Link from "@/components/locale-link";
import { cn } from "@/lib/utils";
import type { TickerSettings } from "@/lib/settings";

const THEME = {
  soft: { bar: "border-b border-line bg-[#fbf8f7] text-deep", hl: "bg-brand text-white", dot: "bg-deep" },
  brand: { bar: "bg-brand text-white", hl: "bg-white text-brand", dot: "bg-white" },
  dark: { bar: "bg-deep text-white", hl: "bg-brand text-white", dot: "bg-white" },
  gold: { bar: "bg-[#ffcf3d] text-deep", hl: "bg-deep text-white", dot: "bg-deep" },
} as const;
// Her maddenin ekranda kaldığı süre
const HOLD_MS = { slow: 6000, normal: 4200, fast: 3000 } as const;

/**
 * Duyuru şeridi (menü ile banner arası). Kaymaz: tek satır, maddeler sırayla yumuşakça yer değiştirir.
 * Sadece telefonda görünür; masaüstünde aynı güven mesajları üstteki siyah şeritte zaten var, banner yukarıda kalır.
 * "Öne çıkar" işaretli maddeler (kampanya) önce gelir ve vurgulu gösterilir.
 * Panelden: maddeler, geçiş yönü, hız, renk. "Hareketi azalt" tercihinde geçiş animasyonsuzdur.
 */
export function Ticker({ t, preview = false }: { t: TickerSettings; preview?: boolean }) {
  const items = t.items.filter((i) => i.text.trim()).sort((a, b) => Number(b.highlight) - Number(a.highlight));
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = items.length;
  useEffect(() => {
    if (n < 2 || paused) return;
    const id = setInterval(() => setI((k) => (k + 1) % n), HOLD_MS[t.speed] ?? HOLD_MS.normal);
    return () => clearInterval(id);
  }, [n, paused, t.speed]);
  if (!t.enabled || !n) return null;
  const th = THEME[t.theme] ?? THEME.brand;
  // Yön: soldan sağa → yeni madde soldan gelir; sağdan sola → sağdan
  const enter = t.direction === "ltr" ? "-translate-x-6" : "translate-x-6";
  const leave = t.direction === "ltr" ? "translate-x-6" : "-translate-x-6";

  return (
    <div
      className={cn("ticker relative overflow-hidden text-[12.5px] font-bold", th.bar, !preview && "md:hidden")}
      data-dir={t.direction}
      data-testid="ticker"
      role="region"
      aria-label="Duyurular"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="relative h-8">
        {items.map((it, k) => {
          const on = k === i;
          const was = k === (i - 1 + n) % n;
          const body = (
            <span className={cn("inline-flex max-w-full items-center gap-1.5 truncate", it.highlight && cn("rounded-full px-2.5 py-0.5 font-extrabold", th.hl))}>
              <span className="truncate">{it.text}</span>
              {it.href ? <span aria-hidden>→</span> : null}
            </span>
          );
          return (
            <div
              key={k}
              aria-hidden={!on}
              className={cn(
                "ticker-item absolute inset-0 flex items-center justify-center px-4 transition-[opacity,transform] duration-500 ease-out",
                on ? "translate-x-0 opacity-100" : cn("pointer-events-none opacity-0", was ? leave : enter),
              )}
            >
              {it.href ? (
                <Link href={it.href} tabIndex={on ? undefined : -1} className="max-w-full rounded-full outline-offset-2 hover:underline hover:underline-offset-4">
                  {body}
                </Link>
              ) : (
                body
              )}
            </div>
          );
        })}
      </div>
      {n > 1 ? (
        <span aria-hidden className="absolute right-2.5 bottom-1 flex gap-1">
          {items.map((_, k) => <span key={k} className={cn("h-1 rounded-full transition-all", th.dot, k === i ? "w-3 opacity-80" : "w-1 opacity-30")} />)}
        </span>
      ) : null}
    </div>
  );
}
