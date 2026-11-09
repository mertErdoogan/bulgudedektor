"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type B = { id: string; showText: boolean; title: string; subtitle: string | null; eyebrow: string | null; ctaLabel: string | null; imageUrl: string; mobileImageUrl: string | null; linkUrl: string | null };

export function HeroSlider({ slides }: { slides: B[] }) {
  const [i, setI] = useState(0);
  const n = slides.length;
  useEffect(() => {
    if (n < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % n), 6500);
    return () => clearInterval(t);
  }, [n]);
  if (!n) return null;
  return (
    <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-[#262626] md:aspect-[1520/580]">
      {slides.map((s, k) => {
        const wide = !s.showText || s.imageUrl.includes("banner");
        return (
          <Link
            key={s.id}
            href={s.linkUrl || "#"}
            className={cn("absolute inset-0 transition-opacity duration-700", k === i ? "opacity-100" : "pointer-events-none opacity-0")}
            aria-hidden={k !== i}
            tabIndex={k === i ? 0 : -1}
          >
            <picture>
              {s.mobileImageUrl ? <source media="(max-width: 767px)" srcSet={s.mobileImageUrl} /> : null}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.imageUrl} alt={s.title} className={cn("h-full w-full", wide ? (!s.showText && !s.mobileImageUrl ? "object-contain md:object-cover" : "object-cover") : "object-contain bg-white p-6 md:pl-[45%]")} />
            </picture>
            {s.showText ? (
              <span className={cn("absolute inset-y-0 left-0 flex max-w-[60%] flex-col justify-end gap-1 p-5 md:justify-center md:p-10", wide ? "bg-gradient-to-r from-black/55 to-transparent text-white" : "text-deep")}>
                {s.eyebrow ? <span className="text-xs font-extrabold tracking-wider opacity-80 md:text-sm">{s.eyebrow}</span> : null}
                <span className="font-display text-xl leading-tight font-extrabold md:text-4xl">{s.title}</span>
                {s.subtitle ? <span className="hidden text-sm opacity-90 md:block md:text-base">{s.subtitle}</span> : null}
                {s.ctaLabel ? <span className={cn("mt-2 inline-flex w-fit rounded-lg px-4 py-2 text-sm font-extrabold", wide ? "bg-white text-deep" : "bg-brand text-white")}>{s.ctaLabel} →</span> : null}
              </span>
            ) : null}
          </Link>
        );
      })}
      {n > 1 ? (
        <>
          <button onClick={() => setI((i - 1 + n) % n)} aria-label="Önceki" className="absolute top-1/2 left-3 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white shadow md:grid">
            <ChevronLeft size={20} />
          </button>
          <button onClick={() => setI((i + 1) % n)} aria-label="Sonraki" className="absolute top-1/2 right-3 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white shadow md:grid">
            <ChevronRight size={20} />
          </button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {slides.map((s, k) => (
              <button key={s.id} onClick={() => setI(k)} aria-label={`${k + 1}. slayt`} className={cn("h-2 rounded-full transition-all", k === i ? "w-6 bg-brand" : "w-2 bg-white/70")} />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

export function ProductTabs({ tabs, children }: { tabs: { key: string; label: string }[]; children: React.ReactNode[] }) {
  const [cur, setCur] = useState(0);
  return (
    <>
      <div className="scrollbar-none mb-4 flex gap-2 overflow-x-auto">
        {tabs.map((t, i) => (
          <button key={t.key} onClick={() => setCur(i)} className={cn("h-10 shrink-0 rounded-lg px-4 text-sm font-extrabold", i === cur ? "bg-brand text-white" : "border border-line bg-white hover:bg-soft")}>
            {t.label}
          </button>
        ))}
      </div>
      {children[cur]}
    </>
  );
}
