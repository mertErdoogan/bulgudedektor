"use client";

import { useEffect } from "react";

/**
 * Ana sayfa kaydırma animasyonu (e-ticarete uygun dozda):
 * - Bölümler ekrana girince bir kez, 0,6 sn içinde hafifçe yukarı kayarak belirir; tekrar etmez.
 * - Bölümdeki ürün kartları ve [data-stagger] içindeki öğeler 50 ms arayla sırayla gelir (en fazla 8 adım).
 * - Sayfa açıldığında zaten ekranda olan bölümler hiç animasyon almaz (titreme ve gecikme olmasın).
 * - Header ve banner bu alanın dışında: ilk ekran (LCP) hiç beklemez.
 * - "Hareketi azalt" tercihi varsa ya da tarayıcı IntersectionObserver desteklemiyorsa hiçbir şey yapmaz.
 * Yalnızca opacity ve transform oynar: sayfa düzeni kaymaz (CLS yok).
 */
export function RevealSections({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = document.querySelector("[data-reveal-root]");
    if (!root) return;
    const sections = [...root.querySelectorAll<HTMLElement>("section")].filter((s) => !s.parentElement?.closest("[data-reveal-root] section"));
    const stagger = (s: HTMLElement) => {
      const items = [...s.querySelectorAll<HTMLElement>("article, [data-stagger] > *")];
      items.forEach((el, i) => el.style.setProperty("--d", `${Math.min(i, 8) * 50}ms`));
    };
    const vh = window.innerHeight;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 },
    );
    for (const s of sections) {
      s.classList.add("rv");
      if (s.getBoundingClientRect().top < vh) {
        s.classList.add("in", "rv-skip");
        continue;
      }
      stagger(s);
      io.observe(s);
    }
    document.documentElement.classList.add("rv-ready");
    return () => io.disconnect();
  }, []);
  return <div data-reveal-root="">{children}</div>;
}

/** Sayı sayarak beliren puan (ör. 4.7): ekrana girince 0'dan hedefe 0,9 sn'de çıkar. */
export function CountUp({ value, decimals = 1, className }: { value: number; decimals?: number; className?: string }) {
  useEffect(() => {
    const el = document.querySelector<HTMLElement>(`[data-countup="${value}"]`);
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches || typeof IntersectionObserver === "undefined") return;
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (t: number) => {
        const k = Math.min(1, (t - t0) / 900);
        const eased = 1 - Math.pow(1 - k, 3);
        el.textContent = (value * eased).toFixed(decimals);
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, decimals]);
  // Sunucuda ve JS yokken gerçek değer yazılı: sayaç yalnızca bir süsleme
  return (
    <span data-countup={value} className={className}>
      {value.toFixed(decimals)}
    </span>
  );
}
