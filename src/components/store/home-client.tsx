"use client";

import { imgProps, imgUrl } from "@/lib/img";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type B = { id: string; showText: boolean; title: string; subtitle: string | null; eyebrow: string | null; ctaLabel: string | null; imageUrl: string; mobileImageUrl: string | null; linkUrl: string | null };

/**
 * Ana sayfa sahnesi: banner tam görünür (kırpılmaz, üstüne bir şey binmez). Arkasında aktif banner'ın çok
 * bulanık küçük bir kopyası "ambiyans ışığı" olarak yayılır ve aşağıya doğru beyaza erir; kampanya kartları
 * bu ışığın üzerinde durur. Renkler her banner'dan kendiliğinden gelir.
 */
export function HeroStage({ slides, side }: { slides: B[]; side: B[] }) {
  const [i, setI] = useState(0);
  const n = slides.length;
  const hasMobile = slides.some((s) => s.mobileImageUrl);
  useEffect(() => {
    if (n < 2 || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((x) => (x + 1) % n), 6500);
    return () => clearInterval(t);
  }, [n]);
  if (!n && !side.length) return null;
  return (
    <section className="relative overflow-hidden pt-4 md:pt-7">
      {/* Ambiyans: 64 px'lik kopya, CSS ile bulanıklaştırılır (ek yük ~2 KB) */}
      <div aria-hidden className="pointer-events-none absolute inset-x-[-10%] top-[-12%] bottom-0" style={{ maskImage: "linear-gradient(to bottom, #000 0%, #000 42%, transparent 100%)", WebkitMaskImage: "linear-gradient(to bottom, #000 0%, #000 42%, transparent 100%)" }}>
        {slides.map((s, k) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={s.id} src={imgUrl(s.imageUrl, 64, 50)} alt="" className={cn("absolute inset-0 h-full w-full scale-110 object-cover blur-[64px] saturate-150 transition-opacity duration-1000", k === i ? "opacity-80" : "opacity-0")} />
        ))}
      </div>
      {n ? (
        <div className="relative mx-auto w-full max-w-[1400px] px-4 md:px-6">
          {/* Telefonda: mobil görsel varsa 16:9, yoksa banner kendi oranında (kırpılmaz) */}
          <div className={cn("relative overflow-hidden rounded-2xl bg-[#262626] shadow-[0_30px_60px_-24px_rgba(0,0,0,.45)] md:aspect-[1520/580] md:rounded-3xl", hasMobile ? "aspect-[16/9]" : "aspect-[1520/580]")}>
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
                    {s.mobileImageUrl ? <source media="(max-width: 767px)" srcSet={imgProps(s.mobileImageUrl, [640, 828, 1080], "100vw").srcSet ?? s.mobileImageUrl} sizes="100vw" /> : null}
                    {/* İlk slayt LCP görselidir: öncelikli; diğerleri tembel yüklenir */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img {...imgProps(s.imageUrl, [640, 1080, 1600, 1920], "(min-width: 1400px) 1352px, 100vw", 80)} loading={k === 0 ? "eager" : "lazy"} fetchPriority={k === 0 ? "high" : "low"} alt={s.title} className={cn("h-full w-full", wide ? (hasMobile && !s.mobileImageUrl ? "object-contain md:object-cover" : "object-cover") : "bg-white object-contain p-6 md:pl-[45%]")} />
                  </picture>
                  {s.showText ? (
                    <span className={cn("absolute inset-y-0 left-0 flex max-w-[60%] flex-col justify-end gap-1 p-5 md:justify-center md:p-12", wide ? "bg-gradient-to-r from-black/55 to-transparent text-white" : "text-deep")}>
                      {s.eyebrow ? <span className="text-xs font-extrabold tracking-wider opacity-80 md:text-sm">{s.eyebrow}</span> : null}
                      <span className="font-display text-xl leading-tight font-extrabold md:text-[44px]">{s.title}</span>
                      {s.subtitle ? <span className="hidden text-sm opacity-90 md:block md:text-base">{s.subtitle}</span> : null}
                      {s.ctaLabel ? <span className={cn("mt-2 inline-flex w-fit rounded-lg px-4 py-2 text-sm font-extrabold", wide ? "bg-white text-deep" : "bg-brand text-white")}>{s.ctaLabel} →</span> : null}
                    </span>
                  ) : null}
                </Link>
              );
            })}
            {n > 1 ? (
              <>
                <button onClick={() => setI((i - 1 + n) % n)} aria-label="Önceki" className="absolute top-1/2 left-4 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-white/35 bg-black/35 text-white backdrop-blur-sm transition hover:bg-black/55 md:grid">
                  <ChevronLeft size={22} />
                </button>
                <button onClick={() => setI((i + 1) % n)} aria-label="Sonraki" className="absolute top-1/2 right-4 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-white/35 bg-black/35 text-white backdrop-blur-sm transition hover:bg-black/55 md:grid">
                  <ChevronRight size={22} />
                </button>
                <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 md:bottom-3">
                  {slides.map((s, k) => (
                    <button key={s.id} onClick={() => setI(k)} aria-label={`${k + 1}. slayt`} aria-current={k === i} className="grid h-6 min-w-6 place-items-center px-0.5">
                      {/* Görünen çizgi küçük, dokunma alanı 24×24 (erişilebilirlik) */}
                      <span className={cn("block h-1.5 rounded-full transition-all", k === i ? "w-8 bg-white" : "w-4 bg-white/45")} />
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
      {side.length ? (
        <div className="container-x relative pt-4 md:pt-6">
          <div className="scrollbar-none -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-3 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0">
            {side.map((b) => (
              <Link key={b.id} href={b.linkUrl || "#"} className="flex w-[82%] shrink-0 snap-start items-center gap-2 overflow-hidden rounded-2xl bg-white py-3 pl-4 shadow-[0_18px_40px_-14px_rgba(0,0,0,.28),0_2px_6px_rgba(0,0,0,.05)] transition hover:-translate-y-0.5 md:w-auto md:py-4 md:pl-5">
                <span className="min-w-0 flex-1">
                  {b.eyebrow ? <span className="block text-[11px] font-extrabold tracking-wider text-link">{b.eyebrow}</span> : null}
                  <b className="block text-[15px] leading-tight md:text-lg">{b.title}</b>
                  {b.subtitle ? <span className="mt-1 block text-sm font-bold text-link">{b.subtitle} →</span> : null}
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imgUrl(b.imageUrl, 256)} alt="" className="h-20 w-24 shrink-0 object-contain mix-blend-multiply md:h-28 md:w-36" />
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </section>
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
