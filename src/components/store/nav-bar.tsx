"use client";

import Link from "@/components/locale-link";
import { BrandMark } from "./brand-mark";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, BadgeCheck, ChevronDown, Compass, Flame } from "lucide-react";
import type { BrandsMenu, CatMenu, FocusMenu, NavCard } from "@/lib/header-data";
import { imgUrl } from "@/lib/img";
import { INFO_LINK } from "@/lib/nav-links";
import { cn, formatTL } from "@/lib/utils";
import { MegaMenu } from "./bits";
import { useT } from "@/components/i18n";
import { T } from "@/components/i18n";

type Item = { id: string; label: string; url: string; highlight: boolean };
type Cat = Parameters<typeof MegaMenu>[0]["categories"];

const INFO = INFO_LINK;

/**
 * Ana menü: sade metin linkler. Markalar (ya da panelden seçilen öncelikli marka) ve kategori linkleri üzerine gelince görselli menü açar.
 * Açılış 120 ms gecikmeli (fare üstünden geçerken yanlışlıkla açılmasın), kapanış 160 ms (panele geçerken kapanmasın).
 */
/** Menü öğeleri arasındaki kısa dikey ayırıcı (tam yükseklik değil) */
const Sep = () => <span className="my-auto h-[18px] w-px shrink-0 bg-[#d9d9de]" aria-hidden />;

export function NavBar({ items, categories, brands, focus, brandsMenu, cats }: { items: Item[]; categories: Cat; brands: { name: string; slug: string; logoUrl?: string | null }[]; focus: FocusMenu | null; brandsMenu?: BrandsMenu | null; cats: Record<string, CatMenu> }) {
  const path = usePathname();
  const [open, setOpen] = useState<string | null>(null);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tr = useT();
  const isActive = (url: string) => path === url || path.startsWith(url + "/") || path.startsWith(url + "?");
  const later = (v: string | null, ms: number) => {
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => setOpen(v), ms);
  };
  useEffect(() => setOpen(null), [path]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, []);

  const main = items.filter((i) => !i.highlight && !INFO.test(i.url));
  const hot = items.filter((i) => i.highlight);

  const drop = (key: string, href: string, label: React.ReactNode, panel: React.ReactNode, on: boolean) => (
    <div className="flex h-full" onMouseEnter={() => later(key, open ? 0 : 120)} onMouseLeave={() => later(null, 160)}>
      <Link
        href={href}
        aria-expanded={open === key}
        aria-haspopup="true"
        onFocus={() => setOpen(key)}
        className={cn(
          "relative flex items-center gap-1.5 px-3 text-[14.5px] font-semibold whitespace-nowrap transition",
          "after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:transition",
          open === key || on ? "text-brand after:bg-brand" : "text-deep after:bg-transparent hover:text-brand",
        )}
      >
        {label}
        <ChevronDown size={15} strokeWidth={2.3} className={cn("transition", open === key && "rotate-180")} />
      </Link>
      {open === key ? (
        <div className="absolute inset-x-0 top-full z-40" onMouseEnter={() => later(key, 0)}>
          <div className="container-x">
            <div className="overflow-hidden rounded-b-[24px] border border-t-0 border-line bg-white text-deep shadow-[0_30px_60px_-24px_rgba(20,20,22,.35)]">{panel}</div>
          </div>
        </div>
      ) : null}
    </div>
  );

  return (
    <nav className="relative hidden border-b border-line bg-white md:block" aria-label={tr("nav.main")}>
      <div className="container-x flex h-[52px] items-stretch">
        <MegaMenu categories={categories} brands={brands} />
        <Sep />
        <div className="scrollbar-none ml-2 flex min-w-0 items-stretch overflow-x-auto">
          {focus
            ? drop(
                "focus",
                `/marka/${focus.brand.slug}`,
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden />
                  {focus.brand.name}
                </>,
                <FocusPanel f={focus} close={() => setOpen(null)} />,
                path.startsWith(`/marka/${focus.brand.slug}`),
              )
            : brandsMenu
              ? drop("brands", "/markalar", tr("nav.brands"), <BrandsPanel b={brandsMenu} close={() => setOpen(null)} />, path.startsWith("/markalar") || path.startsWith("/marka/"))
              : null}
          {main.map((m, i) => {
            const sep = i > 0 || focus || brandsMenu ? <Sep /> : null;
            const slug = /^\/kategori\/([^/?#]+)/.exec(m.url)?.[1];
            const c = slug ? cats[slug] : undefined;
            if (c && (c.products.length || c.subs.length || c.brands.length)) return <span key={m.id} className="contents">{sep}{drop(m.id, m.url, m.label, <CatPanel c={c} href={m.url} label={m.label} close={() => setOpen(null)} />, isActive(m.url))}</span>;
            return (
              <span key={m.id} className="contents">
              {sep}
              <Link
                href={m.url}
                aria-current={isActive(m.url) ? "page" : undefined}
                className={cn(
                  "relative flex items-center px-3 text-[14.5px] font-semibold whitespace-nowrap transition after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full",
                  isActive(m.url) ? "text-brand after:bg-brand" : "text-deep hover:text-brand",
                )}
              >
                {m.label}
              </Link>
              </span>
            );
          })}
          {hot.map((m) => (
            <span key={m.id} className="contents">
            <Sep />
            <Link href={m.url} className="flex items-center gap-1.5 px-3 text-[14.5px] font-bold whitespace-nowrap text-brand transition hover:text-brand-dark">
              <Flame size={16} /> {m.label}
            </Link>
            </span>
          ))}
        </div>
      </div>
    </nav>
  );
}

function Price({ p }: { p: NavCard }) {
  return (
    <span className="mt-1 flex items-baseline gap-1.5">
      <b className="text-[14.5px]">{formatTL(p.price)}</b>
      {p.compareAtPrice && p.compareAtPrice > p.price ? <s className="text-xs text-mute">{formatTL(p.compareAtPrice)}</s> : null}
    </span>
  );
}

function ModelCard({ p, onClick, tall }: { p: NavCard; onClick: () => void; tall?: boolean }) {
  return (
    <Link href={`/urun/${p.slug}`} onClick={onClick} className="group flex flex-col overflow-hidden rounded-[18px] border border-line bg-white transition hover:-translate-y-0.5 hover:border-[#d6d6db] hover:shadow-[0_14px_28px_-18px_rgba(20,20,22,.4)]">
      <span className={cn("relative grid place-items-center bg-[radial-gradient(circle_at_50%_60%,#fff_0%,#f4f4f5_72%)]", tall ? "h-[132px]" : "h-[112px]")}>
        {p.isNew ? <span className="absolute top-2.5 left-2.5 rounded-full bg-brand px-2 py-0.5 text-[10.5px] font-extrabold tracking-wider text-white"><T k="card.new" /></span> : null}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {p.image ? <img src={imgUrl(p.image, 256)} alt="" className={cn("max-w-[80%] object-contain mix-blend-multiply transition duration-300 group-hover:scale-105", tall ? "h-[110px]" : "h-[92px]")} /> : null}
      </span>
      <span className="flex flex-col px-3.5 pt-2.5 pb-3">
        <span className="truncate text-[14px] font-bold">{p.name}</span>
        {p.line ? <span className="truncate text-xs text-mute">{p.line}</span> : null}
        <Price p={p} />
      </span>
    </Link>
  );
}

function FocusPanel({ f, close }: { f: FocusMenu; close: () => void }) {
  return (
    <div className="grid grid-cols-[230px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)_290px]">
      <div className="border-r border-line px-3 py-5">
        <p className="px-3 pb-2 text-[11px] font-extrabold tracking-[.1em] text-mute"><T k="nav.series" /></p>
        <Link href={`/marka/${f.brand.slug}`} onClick={close} className="flex items-center justify-between rounded-xl bg-soft px-3 py-2.5 text-[14px] font-bold">
          <T k="nav.allOf" v={{ ad: f.brand.name }} /> <span className="text-xs font-semibold text-mute">{f.total}</span>
        </Link>
        {f.series.map((s) => (
          <Link key={s.slug} href={`/marka/${f.brand.slug}?kategori=${s.slug}`} onClick={close} className="flex items-center justify-between rounded-xl px-3 py-2.5 text-[14px] font-medium transition hover:bg-soft">
            <span className="truncate">{s.name}</span> <span className="text-xs font-semibold text-mute">{s.count}</span>
          </Link>
        ))}
        <Link href="/markalar" onClick={close} className="mt-3 flex items-center gap-1.5 px-3 text-[13px] font-bold text-mute hover:text-deep"><T k="nav.otherBrands" /> <ArrowRight size={14} /></Link>
      </div>
      <div className="p-5">
        <div className="mb-3.5 flex items-baseline justify-between">
          <p className="text-[16px] font-extrabold"><T k="nav.featuredModels" /></p>
          <Link href={`/marka/${f.brand.slug}`} onClick={close} className="flex items-center gap-1 text-[13px] font-bold text-brand"><T k="nav.allProductsOf" v={{ ad: f.brand.name }} /> <ArrowRight size={14} /></Link>
        </div>
        <div className="grid grid-cols-3 gap-3.5">
          {f.models.slice(0, 6).map((p) => (
            <ModelCard key={p.id} p={p} onClick={close} />
          ))}
        </div>
      </div>
      <div className="hidden flex-col gap-3.5 border-l border-line p-5 xl:flex">
        {f.promo ? (
          <Link href={f.promo.href} onClick={close} className="relative flex h-[236px] flex-col overflow-hidden rounded-[18px] bg-[linear-gradient(150deg,#2a1210,#7a1d14_60%,#d42e1e)] p-5 text-white">
            {f.promo.eyebrow ? <span className="text-[11px] font-extrabold tracking-[.12em] text-[#ffb4a8]">{f.promo.eyebrow}</span> : null}
            <span className="relative z-10 mt-1.5 line-clamp-3 max-w-[85%] text-[20px] leading-tight font-extrabold">{f.promo.title}</span>
            {f.promo.image ? (
              <span className="absolute -right-5 -bottom-5 grid h-[132px] w-[132px] place-items-center rounded-full bg-white shadow-[0_0_0_6px_rgba(255,255,255,.18)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imgUrl(f.promo.image, 256)} alt="" className="h-[96px] w-[96px] object-contain" />
              </span>
            ) : null}
            <span className="relative z-10 mt-auto inline-flex items-center gap-1.5 text-[13px] font-bold"><T k="nav.seeDeal" /> <ArrowRight size={14} /></span>
          </Link>
        ) : null}
        <Link href="/sihirbaz" onClick={close} className="flex items-center gap-3 rounded-[18px] border border-line p-4 transition hover:border-deep">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-soft text-brand"><Compass size={22} /></span>
          <span>
            <b className="block text-[14px]"><T k="nav.whichFits" /></b>
            <span className="text-[12.5px] text-mute"><T k="nav.whichFitsD" /></span>
          </span>
        </Link>
        <span className="flex items-center gap-1.5 px-1 text-[12.5px] text-mute"><BadgeCheck size={15} className="text-[#11643a]" /> <T k="nav.genuine" /></span>
      </div>
    </div>
  );
}

/** "Markalar" menüsü: bütün markalar eşit (alfabetik), sağda markalar arası çok satanlar */
function BrandsPanel({ b, close }: { b: BrandsMenu; close: () => void }) {
  return (
    <div className="grid grid-cols-[250px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)_290px]" data-testid="brands-menu">
      <div className="border-r border-line px-3 py-5">
        <p className="px-3 pb-2 text-[11px] font-extrabold tracking-[.1em] text-mute"><T k="nav.allBrandsCap" /></p>
        {b.brands.map((x) => (
          <Link key={x.slug} href={`/marka/${x.slug}`} onClick={close} className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-[14px] font-medium hover:bg-soft">
            <BrandMark name={x.name} logoUrl={x.logoUrl} size={28} className="rounded-lg" />
            <span className="min-w-0 flex-1 truncate">{x.name}</span> <span className="text-xs font-semibold text-mute">{x.total}</span>
          </Link>
        ))}
        <Link href="/markalar" onClick={close} className="mt-3 flex items-center gap-1.5 px-3 text-[13px] font-bold text-brand"><T k="nav.compareBrands" /> <ArrowRight size={14} /></Link>
      </div>
      <div className="p-5">
        <div className="mb-3.5 flex items-baseline justify-between">
          <p className="text-[16px] font-extrabold"><T k="nav.bestSellers" /></p>
          <Link href="/urunler?sirala=cok-satan" onClick={close} className="flex items-center gap-1 text-[13px] font-bold text-brand"><T k="nav.allBestSellers" /> <ArrowRight size={14} /></Link>
        </div>
        <div className="grid grid-cols-3 gap-3.5">
          {b.models.slice(0, 6).map((p) => (
            <ModelCard key={p.id} p={p} onClick={close} />
          ))}
        </div>
      </div>
      <div className="hidden flex-col gap-3.5 border-l border-line p-5 xl:flex">
        {b.promo ? (
          <Link href={b.promo.href} onClick={close} className="relative flex h-[236px] flex-col overflow-hidden rounded-[18px] bg-[linear-gradient(150deg,#2a1210,#7a1d14_60%,#d42e1e)] p-5 text-white">
            {b.promo.eyebrow ? <span className="text-[11px] font-extrabold tracking-[.12em] text-[#ffb4a8]">{b.promo.eyebrow}</span> : null}
            <span className="relative z-10 mt-1.5 line-clamp-3 max-w-[85%] text-[20px] leading-tight font-extrabold">{b.promo.title}</span>
            {b.promo.image ? (
              <span className="absolute -right-5 -bottom-5 grid h-[132px] w-[132px] place-items-center rounded-full bg-white shadow-[0_0_0_6px_rgba(255,255,255,.18)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imgUrl(b.promo.image, 256)} alt="" className="h-[96px] w-[96px] object-contain" />
              </span>
            ) : null}
            <span className="relative z-10 mt-auto inline-flex items-center gap-1.5 text-[13px] font-bold"><T k="nav.seeDeal" /> <ArrowRight size={14} /></span>
          </Link>
        ) : null}
        <Link href="/sihirbaz" onClick={close} className="flex items-center gap-3 rounded-[18px] border border-line p-4 transition hover:border-deep">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-soft text-brand"><Compass size={22} /></span>
          <span>
            <b className="block text-[14px]"><T k="nav.whichFits" /></b>
            <span className="text-[12.5px] text-mute"><T k="nav.whichFitsD" /></span>
          </span>
        </Link>
        <span className="flex items-center gap-1.5 px-1 text-[12.5px] text-mute"><BadgeCheck size={15} className="text-[#11643a]" /> <T k="nav.genuine" /></span>
      </div>
    </div>
  );
}

function CatPanel({ c, href, label, close }: { c: CatMenu; href: string; label: string; close: () => void }) {
  return (
    <div className="grid grid-cols-[250px_minmax(0,1fr)]">
      <div className="border-r border-line px-3 py-5">
        {c.subs.length ? (
          <>
            <p className="px-3 pb-2 text-[11px] font-extrabold tracking-[.1em] text-mute"><T k="nav.subcats" /></p>
            {c.subs.map((s) => (
              <Link key={s.slug} href={`/kategori/${s.slug}`} onClick={close} className="block rounded-xl px-3 py-2 text-[14px] font-medium hover:bg-soft">{s.name}</Link>
            ))}
            <div className="h-3" />
          </>
        ) : null}
        {c.brands.length ? (
          <>
            <p className="px-3 pb-2 text-[11px] font-extrabold tracking-[.1em] text-mute"><T k="nav.byBrand" /></p>
            {c.brands.map((b) => (
              <Link key={b.slug} href={`${href}?marka=${b.slug}`} onClick={close} className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-[14px] font-medium hover:bg-soft">
                <BrandMark name={b.name} logoUrl={b.logoUrl} size={28} className="rounded-lg" />
                <span className="min-w-0 flex-1 truncate">{b.name}</span> <span className="text-xs font-semibold text-mute">{b.count}</span>
              </Link>
            ))}
          </>
        ) : null}
        <Link href={href} onClick={close} className="mt-3 flex items-center gap-1.5 px-3 text-[13px] font-bold text-brand"><T k="nav.allOf" v={{ ad: label }} /> <ArrowRight size={14} /></Link>
      </div>
      <div className="p-5">
        {c.products.length ? (
          <>
            <p className="mb-3.5 text-[16px] font-extrabold"><T k="nav.featured" /></p>
            <div className="grid grid-cols-3 gap-3.5">
              {c.products.map((p) => (
                <ModelCard key={p.id} p={p} onClick={close} tall />
              ))}
            </div>
          </>
        ) : null}
        <Link href="/sihirbaz" onClick={close} className="mt-4 flex items-center gap-2 text-[13px] font-semibold text-mute hover:text-deep"><Compass size={16} className="text-brand" /> <T k="nav.unsureTest" /></Link>
      </div>
    </div>
  );
}
