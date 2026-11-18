"use client";

import { imgProps, imgUrl } from "@/lib/img";

import Link from "@/components/locale-link";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn, formatTL } from "@/lib/utils";

/** Büyük slider slaytı: yalnız görsel (hazır tasarım); sekmede başlık/alt yazı ve varsa ürün fotoğrafı */
type B = { id: string; title: string; subtitle: string | null; imageUrl: string; mobileImageUrl: string | null; linkUrl: string | null; stage: string; thumb: string | null };

/** Şerit rengine göre okunur yazı rengi (açık zeminde koyu, koyu zeminde beyaz) */
const isDark = (hex: string) => {
  const n = parseInt(hex.replace("#", "").slice(0, 6), 16);
  if (Number.isNaN(n)) return false;
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.55;
};

/** Banner altı kart: öncelikli markanın yeni cihazı ya da paneldeki kampanya kartı */
export type HeroCard = { id: string; href: string; eyebrow: string; title: string; line?: string | null; price?: number | null; oldPrice?: number | null; image: string | null; isNew?: boolean };

// Kart renkleri (beyaz yazı için hepsi ≥ 4.5:1 kontrastlı)
const CARD_TONES = [
  "from-[#e2402e] via-[#c42a1b] to-[#7d150b]",
  "from-[#2f56c8] via-[#1f3b8f] to-[#0c1838]",
  "from-[#3a3a40] via-[#232327] to-[#0d0d0f]",
];

/**
 * Ana sayfa sahnesi: hazır tasarlanmış banner görseli olduğu gibi (üstüne yazı/ok binmez) ve altında aynı kartın
 * parçası olan sekme şeridi. Şerit görselin alt kenar rengini alır (panelden elle de seçilebilir), böylece görsel
 * şeride akar. Sekmelerde gerçek metin var: müşteri diğer slaytları görür, Google da görseldeki mesajı okur.
 * Altında 3 renkli kart.
 */
export function HeroStage({ slides, cards }: { slides: B[]; cards: HeroCard[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);
  const n = slides.length;
  const hasMobile = slides.some((s) => s.mobileImageUrl);
  const allMobile = n > 0 && slides.every((s) => s.mobileImageUrl);
  const mobileAspect = allMobile ? "aspect-[4/5]" : hasMobile ? "aspect-[16/9]" : "aspect-[1520/580]";
  const cur = slides[i];
  const stage = cur?.stage ?? "#f1efec";
  const dark = isDark(stage);

  // Telefonda sekmeler yatay kayar: etkin sekme görünür kalsın (sayfayı kaydırmadan, yalnız şeridi)
  useEffect(() => {
    const box = tabsRef.current;
    const el = box?.children[i] as HTMLElement | undefined;
    if (box && el && box.scrollWidth > box.clientWidth) box.scrollTo({ left: el.offsetLeft - 12, behavior: "smooth" });
  }, [i]);

  if (!n && !cards.length) return null;
  return (
    <section className="relative pt-4 pb-2 md:pt-7 md:pb-6" data-testid="hero-stage">
      {n ? (
        <div className="relative mx-auto w-full max-w-[1400px] px-3 md:px-6">
          <div
            className={cn("overflow-hidden rounded-[22px] transition-colors duration-700 md:rounded-[28px]", paused && "hero-paused")}
            style={{ background: stage }}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
            data-testid="hero-banner"
            data-stage={stage}
          >
            <div className={cn("relative overflow-hidden md:aspect-[1520/580]", mobileAspect)}>
              {slides.map((s, k) => (
                <Link
                  key={s.id}
                  href={s.linkUrl || "#"}
                  aria-label={s.title}
                  className={cn("absolute inset-0 overflow-hidden transition-opacity duration-700", k === i ? "opacity-100" : "pointer-events-none opacity-0")}
                  aria-hidden={k !== i}
                  tabIndex={k === i ? 0 : -1}
                >
                  <picture>
                    {s.mobileImageUrl ? <source media="(max-width: 767px)" srcSet={imgProps(s.mobileImageUrl, [640, 828, 1080], "100vw").srcSet ?? s.mobileImageUrl} sizes="100vw" /> : null}
                    {/* İlk slayt LCP görselidir: öncelikli; diğerleri tembel yüklenir. Aktif slayt çok hafif yakınlaşır. */}
                    <img
                      {...imgProps(s.imageUrl, [640, 1080, 1600, 1920], "(min-width: 1400px) 1340px, 100vw", 80)}
                      loading={k === 0 ? "eager" : "lazy"}
                      fetchPriority={k === 0 ? "high" : "low"}
                      alt={s.title}
                      className={cn("h-full w-full", k === i && n > 1 && "hero-zoom", hasMobile && !s.mobileImageUrl ? "object-contain md:object-cover" : "object-cover")}
                    />
                  </picture>
                </Link>
              ))}
            </div>
            {n > 1 ? (
              <div className={cn("flex items-stretch border-t", dark ? "border-white/15 text-white" : "border-black/10 text-deep")} data-testid="hero-tabs">
                <div ref={tabsRef} className="scrollbar-none flex min-w-0 flex-1 snap-x overflow-x-auto md:overflow-visible">
                  {slides.map((s, k) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setI(k)}
                      aria-current={k === i}
                      aria-label={`${k + 1}. slayt: ${s.title}`}
                      data-testid="hero-tab"
                      className={cn(
                        "relative flex min-w-[72%] shrink-0 snap-start items-center gap-3 px-4 py-3 text-left transition-colors sm:min-w-[45%] md:min-w-0 md:flex-1 md:shrink md:px-5 md:py-4",
                        k > 0 && (dark ? "border-l border-white/15" : "border-l border-black/10"),
                        k === i ? (dark ? "bg-white/12" : "bg-white/70") : dark ? "hover:bg-white/6" : "hover:bg-white/40",
                      )}
                    >
                      {/* Etkin sekmede dolan çubuk: bitince sonraki slayt (fare üstündeyken durur; "hareketi azalt"ta otomatik geçiş yok) */}
                      <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] overflow-hidden">
                        {k === i ? <span key={`bar-${i}`} className={cn("hero-bar block h-full w-full", dark ? "bg-white" : "bg-brand")} onAnimationEnd={() => setI((x) => (x + 1) % n)} /> : null}
                      </span>
                      {s.thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={imgUrl(s.thumb, 128)} alt="" className="h-10 w-10 shrink-0 rounded-full bg-white object-contain p-0.5 md:h-12 md:w-12" />
                      ) : null}
                      <span className="flex min-w-0 flex-col">
                        <span className={cn("line-clamp-1 text-[13.5px] leading-snug md:text-[15px]", k === i ? "font-extrabold" : "font-semibold")}>{s.title}</span>
                        {s.subtitle ? <span className={cn("line-clamp-1 text-xs md:text-[13px]", dark ? "text-white/75" : "text-[#55555a]")}>{s.subtitle}</span> : null}
                      </span>
                    </button>
                  ))}
                </div>
                <div className={cn("hidden shrink-0 items-center gap-2 px-4 md:flex", dark ? "border-l border-white/15" : "border-l border-black/10")}>
                  <button type="button" onClick={() => setI((i - 1 + n) % n)} aria-label="Önceki slayt" data-testid="hero-prev" className={cn("grid h-11 w-11 place-items-center rounded-full border transition", dark ? "border-white/40 hover:bg-white/10" : "border-black/20 bg-white hover:border-deep")}>
                    <ChevronLeft size={20} />
                  </button>
                  <button type="button" onClick={() => setI((i + 1) % n)} aria-label="Sonraki slayt" data-testid="hero-next" className={cn("grid h-11 w-11 place-items-center rounded-full transition", dark ? "bg-white text-deep hover:bg-white/85" : "bg-deep text-white hover:bg-black")}>
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      {cards.length ? (
        <div className="container-x relative pt-0 md:pt-20">
          <div className="scrollbar-none -mx-4 flex snap-x scroll-px-4 gap-4 overflow-x-auto px-4 pt-4 pb-7 md:mx-0 md:grid md:grid-cols-3 md:gap-5 md:overflow-visible md:px-0 md:pt-4 md:pb-4" data-testid="hero-cards">
            {cards.slice(0, 3).map((c, k) => (
              <Link
                key={c.id}
                href={c.href}
                className={cn(
                  "group/card relative flex w-[80%] shrink-0 snap-start items-center gap-3 rounded-[20px] bg-gradient-to-br p-3.5 pl-4 md:rounded-[22px] md:p-5 md:pr-4 text-white shadow-[0_14px_28px_-16px_rgba(0,0,0,.5)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_50px_-18px_rgba(0,0,0,.55)] md:w-auto md:min-h-[168px] md:shadow-[0_20px_40px_-18px_rgba(0,0,0,.5)]",
                  CARD_TONES[k % 3],
                )}
              >
                {/* Parlama: üzerine gelince kartın üstünden ışık geçer */}
                <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[22px]">
                  <span className="absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-all duration-700 group-hover/card:left-[120%]" />
                  <span className="absolute -right-10 -bottom-16 h-44 w-44 rounded-full bg-white/10" />
                </span>
                <span className="relative z-[1] flex min-w-0 flex-1 flex-col gap-1 md:gap-1.5">
                  <span className="w-fit rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-deep md:px-2.5 md:py-1 md:text-[11px]">{c.eyebrow}</span>
                  <b className="line-clamp-1 text-[15.5px] leading-tight md:line-clamp-none md:text-xl">{c.title}</b>
                  {c.line ? <span className="hidden line-clamp-2 text-[13px] md:block leading-snug text-white/85">{c.line}</span> : null}
                  {c.price ? (
                    <span className="flex items-baseline gap-2 md:mt-1">
                      <span className="text-[15px] font-extrabold whitespace-nowrap md:text-lg">{formatTL(c.price)}</span>
                      {c.oldPrice && c.oldPrice > c.price ? <s className="text-xs whitespace-nowrap text-white/70">{formatTL(c.oldPrice)}</s> : null}
                    </span>
                  ) : null}
                  <span className="inline-flex w-fit items-center gap-1 text-[12.5px] font-extrabold underline-offset-4 md:mt-1 md:text-sm group-hover/card:underline">Keşfet <span aria-hidden className="transition group-hover/card:translate-x-1">→</span></span>
                </span>
                {/* Ürün: beyaz "sahne" dairesi kartın üst kenarından taşar */}
                <span className="relative z-[1] grid h-[78px] w-[78px] shrink-0 place-items-center rounded-full bg-white shadow-[0_10px_22px_-10px_rgba(0,0,0,.45)] ring-[3px] ring-white/30 md:-mt-16 md:self-start md:ring-4 transition duration-500 group-hover/card:-translate-y-1 group-hover/card:scale-105 md:-mt-16 md:h-[150px] md:w-[150px]">
                  {/* Fotoğrafın kare köşeleri dairenin dışına taşmasın */}
                  <span className="grid h-full w-full place-items-center overflow-hidden rounded-full">
                    {c.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imgUrl(c.image, 256)} alt="" className="h-[80%] w-[80%] object-contain mix-blend-multiply transition duration-500 group-hover/card:-rotate-6" />
                    ) : null}
                  </span>
                  {c.isNew ? <span className="absolute -top-1.5 -right-1.5 grid h-8 w-8 rotate-12 text-[9px] md:h-11 md:w-11 md:text-[11px] place-items-center rounded-full bg-[#ffcf3d] font-black text-deep shadow-md transition group-hover/card:rotate-0">YENİ</span> : null}
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
