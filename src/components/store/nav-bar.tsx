"use client";

import { imgUrl } from "@/lib/img";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BookOpen, ChevronDown, Flame } from "lucide-react";
import type { BrandGroup } from "@/lib/store";
import { cn } from "@/lib/utils";
import { MegaMenu } from "./bits";

type Item = { id: string; label: string; url: string; highlight: boolean; image: string | null };
type Cat = Parameters<typeof MegaMenu>[0]["categories"];

/**
 * Kategori menüsü: beyaz zemin, küçük ürün görselli seçenekler, aktif sayfada kırmızı alt çizgi.
 * Kampanya gibi vurgulu öğeler kırmızı hap, rehberler sağda sade.
 */
export function NavBar({ items, categories, brands, brandGroups }: { items: Item[]; categories: Cat; brands: { name: string; slug: string }[]; brandGroups: BrandGroup[] }) {
  const path = usePathname();
  const [bOpen, setBOpen] = useState(false);
  const isActive = (url: string) => (url === "/" ? path === "/" : path === url || path.startsWith(url + "/") || path.startsWith(url + "?"));
  const main = items.filter((i) => !i.highlight && !/^\/blog/.test(i.url));
  const hot = items.filter((i) => i.highlight);
  const side = items.filter((i) => !i.highlight && /^\/blog/.test(i.url));
  return (
    <nav className="hidden border-b border-line bg-white shadow-[0_1px_0_rgba(0,0,0,.02)] md:block" aria-label="Kategoriler">
      <div className="container-x flex h-[58px] items-center gap-3">
        <MegaMenu categories={categories} brands={brands} />
        {brandGroups.length ? (
          <div className="relative flex h-full items-center" onMouseEnter={() => setBOpen(true)} onMouseLeave={() => setBOpen(false)}>
            <Link
              href="/markalar"
              onClick={() => setBOpen(false)}
              aria-expanded={bOpen}
              className={cn("flex h-[40px] items-center gap-1.5 rounded-full border px-4 text-sm font-extrabold", bOpen || path.startsWith("/marka") ? "border-deep" : "border-line hover:border-deep")}
            >
              Markalar <ChevronDown size={15} className={cn("transition", bOpen && "rotate-180")} />
            </Link>
            {bOpen ? (
              <div className="absolute top-full left-0 z-40 w-[min(880px,calc(100vw-48px))] rounded-xl border border-line bg-white p-4 text-deep shadow-2xl">
                <div className="grid gap-x-6 gap-y-5" style={{ gridTemplateColumns: `repeat(${Math.min(4, brandGroups.length)}, minmax(0, 1fr))` }}>
                  {brandGroups.slice(0, 8).map((b) => (
                    <div key={b.id} className="min-w-0">
                      <Link href={`/marka/${b.slug}`} onClick={() => setBOpen(false)} className="font-display block truncate border-b border-line pb-2 text-[17px] font-black tracking-tight hover:text-link">
                        {b.name.toLocaleUpperCase("en-US")} <span className="text-xs font-normal text-mute">{b.total}</span>
                      </Link>
                      <ul className="mt-1.5 flex flex-col">
                        {b.categories.map((c) => (
                          <li key={c.slug}>
                            <Link href={`/marka/${b.slug}?kategori=${c.slug}`} onClick={() => setBOpen(false)} className="block truncate rounded-md px-1.5 py-1.5 text-[13.5px] hover:bg-soft hover:text-link">{c.name}</Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <Link href="/markalar" onClick={() => setBOpen(false)} className="mt-4 block rounded-lg bg-soft py-2.5 text-center text-sm font-extrabold hover:bg-tint">Tüm markalar →</Link>
              </div>
            ) : null}
          </div>
        ) : null}
        <span className="h-7 w-px shrink-0 bg-line" />
        <div className="scrollbar-none flex h-full min-w-0 flex-1 items-stretch gap-0.5 overflow-x-auto whitespace-nowrap">
          {main.map((m) => {
            const on = isActive(m.url);
            return (
              <Link
                key={m.id}
                href={m.url}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-2 px-3 text-[14px] font-bold text-deep/85 transition hover:text-deep",
                  "after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:rounded-t-full after:transition",
                  on ? "text-deep after:bg-brand" : "after:bg-transparent hover:after:bg-line",
                )}
              >
                {m.image ? (
                  <span className="hidden h-8 w-8 shrink-0 place-items-center rounded-full bg-soft ring-1 ring-line transition group-hover:bg-tint group-hover:ring-[#f3d6d1] 2xl:grid">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imgUrl(m.image, 64)} alt="" className="h-6 w-6 object-contain mix-blend-multiply" />
                  </span>
                ) : null}
                {m.label}
              </Link>
            );
          })}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {hot.map((m) => (
            <Link key={m.id} href={m.url} className="flex h-9 items-center gap-1.5 rounded-full bg-brand px-4 text-[13.5px] font-extrabold text-white shadow-sm hover:bg-brand-dark">
              <Flame size={15} /> {m.label}
            </Link>
          ))}
          {side.map((m) => (
            <Link key={m.id} href={m.url} className={cn("flex h-9 items-center gap-1.5 rounded-full px-3 text-[13.5px] font-bold hover:bg-soft", isActive(m.url) ? "bg-soft text-deep" : "text-mute")}>
              <BookOpen size={15} /> {m.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
