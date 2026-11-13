"use client";

import { imgProps, imgUrl } from "@/lib/img";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn, formatTL } from "@/lib/utils";

type B = { id: string; showText: boolean; title: string; subtitle: string | null; eyebrow: string | null; ctaLabel: string | null; imageUrl: string; mobileImageUrl: string | null; linkUrl: string | null };

/** Banner altı kart: öncelikli markanın yeni cihazı ya da paneldeki kampanya kartı */
export type HeroCard = { id: string; href: string; eyebrow: string; title: string; line?: string | null; price?: number | null; oldPrice?: number | null; image: string | null; isNew?: boolean };

// Kart renkleri (beyaz yazı için hepsi ≥ 4.5:1 kontrastlı)
const CARD_TONES = [
  "from-[#e2402e] via-[#c42a1b] to-[#7d150b]",
  "from-[#2f56c8] via-[#1f3b8f] to-[#0c1838]",
  "from-[#3a3a40] via-[#232327] to-[#0d0d0f]",
];

/**
 * Ana sayfa sahnesi: banner tam görünür (kırpılmaz, üstüne bir şey binmez) ve ince bir cam çerçeveyle arka
 * plandan ayrılır. Arkasında aktif banner'ın çok bulanık küçük bir kopyası "ambiyans ışığı" olarak yayılır ve
 * aşağıya doğru beyaza erir (sert bir çizgi olmadan sonraki bölüme geçer). Altında 3 renkli kart.
 */
export function HeroStage({ slides, cards }: { slides: B[]; cards: HeroCard[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = slides.length;
  const hasMobile = slides.some((s) => s.mobileImageUrl);
  if (!n && !cards.length) return null;
  return (
    <section className="relative isolate pt-4 pb-2 md:pt-7 md:pb-16" data-testid="hero-stage">
      {/* Ambiyans: 64 px'lik kopya, CSS ile bulanıklaştırılır (ek yük ~2 KB). Bölümün altına kadar
          yumuşakça şeffaflaşır; kenarları yatayda taşar ama sayfayı kaydırmaz. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" style={{ maskImage: "linear-gradient(to bottom, #000 0%, #000 38%, rgba(0,0,0,.45) 66%, transparent 100%)", WebkitMaskImage: "linear-gradient(to bottom, #000 0%, #000 38%, rgba(0,0,0,.45) 66%, transparent 100%)" }}>
        {slides.map((s, k) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={s.id} src={imgUrl(s.imageUrl, 64, 50)} alt="" className={cn("absolute inset-x-[-10%] top-[-15%] h-[85%] w-[120%] object-cover blur-[70px] saturate-150 transition-opacity duration-1000", k === i ? "opacity-60" : "opacity-0")} />
        ))}
      </div>
      {n ? (
        <div className="relative mx-auto w-full max-w-[1400px] px-3 md:px-6">
          <div
            className={cn("group relative", paused && "hero-paused")}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
            data-testid="hero-banner"
          >
            {/* Renkli parıltı + dönen renkli kenar: banner'ı arka plandan ayırır, sahneye hareket katar */}
            <div aria-hidden className="hero-ring hero-glow absolute inset-x-6 top-6 -bottom-3 rounded-[30px]" />
            <div className="hero-ring relative rounded-[20px] p-[3px] shadow-[0_30px_60px_-28px_rgba(0,0,0,.6)] md:rounded-[28px] md:p-1">
              <div className={cn("relative overflow-hidden rounded-[17px] bg-[#262626] md:aspect-[1520/580] md:rounded-[24px]", hasMobile ? "aspect-[16/9]" : "aspect-[1520/580]")}>
                {slides.map((s, k) => {
                  const wide = !s.showText || s.imageUrl.includes("banner");
                  return (
                    <Link key={s.id} href={s.linkUrl || "#"} className={cn("absolute inset-0 overflow-hidden transition-opacity duration-700", k === i ? "opacity-100" : "pointer-events-none opacity-0")} aria-hidden={k !== i} tabIndex={k === i ? 0 : -1}>
                      <picture>
                        {s.mobileImageUrl ? <source media="(max-width: 767px)" srcSet={imgProps(s.mobileImageUrl, [640, 828, 1080], "100vw").srcSet ?? s.mobileImageUrl} sizes="100vw" /> : null}
                        {/* İlk slayt LCP görselidir: öncelikli; diğerleri tembel yüklenir. Aktif slayt çok hafif yakınlaşır. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img {...imgProps(s.imageUrl, [640, 1080, 1600, 1920], "(min-width: 1400px) 1340px, 100vw", 80)} loading={k === 0 ? "eager" : "lazy"} fetchPriority={k === 0 ? "high" : "low"} alt={s.title} className={cn("h-full w-full", k === i && n > 1 && "hero-zoom", wide ? (hasMobile && !s.mobileImageUrl ? "object-contain md:object-cover" : "object-cover") : "bg-white object-contain p-6 md:pl-[45%]")} />
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
                    {/* Oklar: fare banner'ın üstüne gelince (ya da klavyeyle odaklanınca) belirir */}
                    <button onClick={() => setI((i - 1 + n) % n)} aria-label="Önceki" data-testid="hero-prev" className="absolute top-1/2 left-4 hidden h-12 w-12 -translate-x-2 -translate-y-1/2 place-items-center rounded-full border border-white/40 bg-black/40 text-white opacity-0 backdrop-blur-sm transition duration-300 group-hover:translate-x-0 group-hover:opacity-100 hover:bg-black/60 focus-visible:translate-x-0 focus-visible:opacity-100 md:grid">
                      <ChevronLeft size={22} />
                    </button>
                    <button onClick={() => setI((i + 1) % n)} aria-label="Sonraki" data-testid="hero-next" className="absolute top-1/2 right-4 hidden h-12 w-12 translate-x-2 -translate-y-1/2 place-items-center rounded-full border border-white/40 bg-black/40 text-white opacity-0 backdrop-blur-sm transition duration-300 group-hover:translate-x-0 group-hover:opacity-100 hover:bg-black/60 focus-visible:translate-x-0 focus-visible:opacity-100 md:grid">
                      <ChevronRight size={22} />
                    </button>
                    {/* Hikâye tarzı ilerleme: dolan çubuk bitince sonraki slayt (otomatik geçişi CSS animasyonu sürer,
                        fare üstündeyken durur; "hareketi azalt" tercihinde otomatik geçiş yok) */}
                    <div className="absolute bottom-2.5 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/30 px-3 py-1.5 backdrop-blur-sm md:bottom-4">
                      {slides.map((s, k) => (
                        <button key={s.id} onClick={() => setI(k)} aria-label={`${k + 1}. slayt`} aria-current={k === i} className="grid h-5 place-items-center">
                          <span className="block h-1 w-7 overflow-hidden rounded-full bg-white/35 md:w-10">
                            {k < i ? <span className="block h-full w-full bg-white" /> : null}
                            {k === i ? <span key={`bar-${i}`} className="hero-bar block h-full w-full bg-white" onAnimationEnd={() => setI((x) => (x + 1) % n)} /> : null}
                          </span>
                        </button>
                      ))}
                      <span className="ml-1 text-[11px] font-bold text-white tabular-nums">{String(i + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}</span>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {cards.length ? (
        <div className="container-x relative pt-0 md:pt-12">
          <div className="scrollbar-none -mx-4 flex snap-x scroll-px-4 gap-4 overflow-x-auto px-4 pt-14 pb-12 md:mx-0 md:grid md:grid-cols-3 md:gap-5 md:overflow-visible md:px-0 md:pt-4 md:pb-4" data-testid="hero-cards">
            {cards.slice(0, 3).map((c, k) => (
              <Link
                key={c.id}
                href={c.href}
                className={cn(
                  "group/card relative flex min-h-[150px] w-[86%] shrink-0 snap-start items-center gap-3 rounded-[22px] bg-gradient-to-br p-5 pr-4 text-white shadow-[0_20px_40px_-18px_rgba(0,0,0,.5)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_50px_-18px_rgba(0,0,0,.55)] md:w-auto md:min-h-[168px]",
                  CARD_TONES[k % 3],
                )}
              >
                {/* Parlama: üzerine gelince kartın üstünden ışık geçer */}
                <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[22px]">
                  <span className="absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-all duration-700 group-hover/card:left-[120%]" />
                  <span className="absolute -right-10 -bottom-16 h-44 w-44 rounded-full bg-white/10" />
                </span>
                <span className="relative z-[1] flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="w-fit rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-extrabold tracking-wider text-deep">{c.eyebrow}</span>
                  <b className="text-[17px] leading-tight md:text-xl">{c.title}</b>
                  {c.line ? <span className="line-clamp-2 text-[13px] leading-snug text-white/85">{c.line}</span> : null}
                  {c.price ? (
                    <span className="mt-1 flex items-baseline gap-2">
                      <span className="text-base font-extrabold whitespace-nowrap md:text-lg">{formatTL(c.price)}</span>
                      {c.oldPrice && c.oldPrice > c.price ? <s className="text-xs whitespace-nowrap text-white/70">{formatTL(c.oldPrice)}</s> : null}
                    </span>
                  ) : null}
                  <span className="mt-1 inline-flex w-fit items-center gap-1 text-sm font-extrabold underline-offset-4 group-hover/card:underline">Keşfet <span aria-hidden className="transition group-hover/card:translate-x-1">→</span></span>
                </span>
                {/* Ürün: beyaz "sahne" dairesi kartın üst kenarından taşar */}
                <span className="relative z-[1] -mt-12 grid h-[104px] w-[104px] shrink-0 place-items-center self-start rounded-full bg-white shadow-[0_14px_30px_-10px_rgba(0,0,0,.45)] ring-4 ring-white/30 transition duration-500 group-hover/card:-translate-y-1 group-hover/card:scale-105 md:-mt-16 md:h-[150px] md:w-[150px]">
                  {/* Fotoğrafın kare köşeleri dairenin dışına taşmasın */}
                  <span className="grid h-full w-full place-items-center overflow-hidden rounded-full">
                    {c.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imgUrl(c.image, 256)} alt="" className="h-[80%] w-[80%] object-contain mix-blend-multiply transition duration-500 group-hover/card:-rotate-6" />
                    ) : null}
                  </span>
                  {c.isNew ? <span className="absolute -top-1 -right-1 grid h-11 w-11 rotate-12 place-items-center rounded-full bg-[#ffcf3d] text-[11px] font-black text-deep shadow-md transition group-hover/card:rotate-0">YENİ</span> : null}
                </span>
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
          <button key={t.key} onClick={() => setCur(i)} className={cn("h-10 shrink-0 rounded-full px-4 text-sm font-extrabold transition duration-200", i === cur ? "bg-brand text-white shadow-[0_8px_18px_-8px_rgba(196,42,27,.7)]" : "border border-line bg-white hover:-translate-y-0.5 hover:border-deep")}>
            {t.label}
          </button>
        ))}
      </div>
      {children[cur]}
    </>
  );
}
