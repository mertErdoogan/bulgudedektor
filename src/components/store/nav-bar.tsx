"use client";

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
 * Kategori menüsü: sade, nefes alan tek satır. Aktif sayfada kırmızı alt çizgi;
 * kampanya gibi vurgulu öğeler kırmızı yazı, rehberler sağda soluk.
 */
export function NavBar({ items, categories, brands, brandGroups }: { items: Item[]; categories: Cat; brands: { name: string; slug: string }[]; brandGroups: BrandGroup[] }) {
  const path = usePathname();
  const [bOpen, setBOpen] = useState(false);
  const isActive = (url: string) => (url === "/" ? path === "/" : path === url || path.startsWith(url + "/") || path.startsWith(url + "?"));
  const main = items.filter((i) => !i.highlight && !/^\/blog/.test(i.url));
  const hot = items.filter((i) => i.highlight);
  const side = items.filter((i) => !i.highlight && /^\/blog/.test(i.url));
  return (
    <nav className="hidden border-b border-line bg-white md:block" aria-label="Kategoriler">
      <div className="container-x flex h-[52px] items-center gap-2">
        <MegaMenu categories={categories} brands={brands} />
        {brandGroups.length ? (
          <div className="relative flex h-full items-center" onMouseEnter={() => setBOpen(true)} onMouseLeave={() => setBOpen(false)}>
            <Link
              href="/markalar"
              onClick={() => setBOpen(false)}
              aria-expanded={bOpen}
              className={cn("flex h-9 items-center gap-1 rounded-full px-3 text-[14px] font-bold transition", bOpen || path.startsWith("/marka") ? "bg-soft text-deep" : "text-deep/80 hover:bg-soft hover:text-deep")}
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
        <div className="scrollbar-none flex h-full min-w-0 flex-1 items-stretch gap-0.5 overflow-x-auto whitespace-nowrap">
          {main.map((m) => {
            const on = isActive(m.url);
            return (
              <Link
                key={m.id}
                href={m.url}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "group relative flex items-center px-3 text-[14px] font-semibold text-deep/75 transition hover:text-deep",
                  "after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:rounded-t-full after:transition",
                  on ? "text-deep after:bg-brand" : "after:bg-transparent hover:after:bg-line",
                )}
              >
                {m.label}
              </Link>
            );
          })}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {hot.map((m) => (
            <Link key={m.id} href={m.url} className="flex h-9 items-center gap-1.5 rounded-full px-3 text-[14px] font-extrabold text-brand transition hover:bg-tint">
              <Flame size={15} /> {m.label}
            </Link>
          ))}
          {side.map((m) => (
            <Link key={m.id} href={m.url} className={cn("flex h-9 items-center gap-1.5 rounded-full px-3 text-[14px] font-semibold transition hover:bg-soft", isActive(m.url) ? "bg-soft text-deep" : "text-mute")}>
              <BookOpen size={15} /> {m.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
