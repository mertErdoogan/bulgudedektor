"use client";

import { imgUrl } from "@/lib/img";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useCart } from "./cart";

type Tab = { id: string; label: string; count?: number };

/**
 * Ürün sayfası bölüm menüsü: kaydırınca üstte yapışır, okunan bölüm vurgulanır (scrollspy).
 * Satın alma kutusu ekrandan çıkınca sağında küçük ürün görseli, fiyat ve "Sepete ekle" belirir (masaüstü):
 * müşteri özellikleri veya yorumları okurken satın almak için yukarı dönmek zorunda kalmaz.
 */
export function PdpTabs({ tabs, product }: { tabs: Tab[]; product: { id: string; name: string; price: string; amount: number; image: string | null; brand?: string | null; disabled: boolean } }) {
  const [active, setActive] = useState(tabs[0]?.id);
  const [buyHidden, setBuyHidden] = useState(false);
  const [top, setTop] = useState(64);
  const bar = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const { add } = useCart();
  const [done, setDone] = useState(false);

  // Mobilde başlık yapışkan: menü onun hemen altına yapışır. Masaüstünde kaydırınca inen ince başlığın (64 px) altına.
  useEffect(() => {
    const f = () => {
      const h = document.querySelector<HTMLElement>("[data-site-header]");
      setTop(window.innerWidth >= 768 ? 64 : (h?.getBoundingClientRect().height ?? 110));
    };
    f();
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, []);

  // Okunan bölüm: menünün hemen altındaki bölüm
  useEffect(() => {
    const els = tabs.map((t) => document.getElementById(t.id)).filter((x): x is HTMLElement => !!x);
    let raf = 0;
    const f = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const line = top + (bar.current?.offsetHeight ?? 56) + 24;
        let cur = els[0]?.id;
        for (const el of els) if (el.getBoundingClientRect().top <= line) cur = el.id;
        setActive(cur);
      });
    };
    f();
    window.addEventListener("scroll", f, { passive: true });
    return () => {
      window.removeEventListener("scroll", f);
      cancelAnimationFrame(raf);
    };
  }, [tabs, top]);

  // Aktif sekme yatay menüde görünür kalsın (mobil)
  useEffect(() => {
    const el = strip.current?.querySelector<HTMLElement>(`[data-tab="${active}"]`);
    if (el && strip.current) strip.current.scrollTo({ left: el.offsetLeft - 16, behavior: "smooth" });
  }, [active]);

  // Satın alma kutusu ekrandan çıktı mı?
  useEffect(() => {
    const box = document.getElementById("satin-al");
    if (!box || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setBuyHidden(!e.isIntersecting && e.boundingClientRect.top < 0));
    io.observe(box);
    return () => io.disconnect();
  }, []);

  const go = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - top - (bar.current?.offsetHeight ?? 56) - 12;
    window.scrollTo({ top: y, behavior: "smooth" });
    history.replaceState(null, "", `#${id}`);
  };

  return (
    <div ref={bar} className="sticky z-20 -mx-4 mt-10 border-y border-line bg-white/90 backdrop-blur-xl md:mx-0 md:rounded-2xl md:border" style={{ top }} data-testid="pdp-tabs">
      <div className="flex items-center gap-3 px-2 md:px-2.5">
        <nav ref={strip} aria-label="Ürün bölümleri" className="scrollbar-none flex min-w-0 flex-1 gap-1 overflow-x-auto py-2">
          {tabs.map((t) => (
            <a
              key={t.id}
              href={`#${t.id}`}
              data-tab={t.id}
              aria-current={active === t.id ? "true" : undefined}
              onClick={(e) => {
                e.preventDefault();
                go(t.id);
              }}
              className={cn(
                "flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-[14px] font-bold whitespace-nowrap transition",
                active === t.id ? "bg-deep text-white" : "text-[#3f3f46] hover:bg-soft",
              )}
            >
              {t.label}
              {t.count ? <span className={cn("rounded-full px-1.5 text-[11.5px] font-extrabold", active === t.id ? "bg-white/20" : "bg-soft text-mute")}>{t.count}</span> : null}
            </a>
          ))}
        </nav>
        <div className={cn("hidden shrink-0 items-center gap-3 transition duration-300 md:flex", buyHidden ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-3 opacity-0")} aria-hidden={!buyHidden} inert={!buyHidden}>
          {product.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imgUrl(product.image, 96)} alt="" className="h-10 w-10 rounded-lg bg-soft object-contain mix-blend-multiply" />
          ) : null}
          <span className="hidden flex-col leading-tight lg:flex">
            <span className="max-w-[180px] truncate text-[13px] font-bold">{product.name}</span>
            <b className="text-[14px]">{product.price}</b>
          </span>
          <button
            type="button"
            disabled={product.disabled}
            onClick={() => {
              add(product.id, 1, product.name, { price: product.amount, brand: product.brand });
              setDone(true);
              setTimeout(() => setDone(false), 1400);
            }}
            className={cn("h-10 rounded-full px-5 text-[14px] font-extrabold text-white transition disabled:opacity-50", done ? "bg-ok" : "bg-brand hover:bg-brand-dark")}
          >
            {product.disabled ? "Stokta yok" : done ? "Eklendi ✓" : "Sepete ekle"}
          </button>
        </div>
      </div>
    </div>
  );
}
