"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { MegaMenu } from "./bits";

type Item = { id: string; label: string; url: string; highlight: boolean; image: string | null };
type Cat = Parameters<typeof MegaMenu>[0]["categories"];

/**
 * Kategori menüsü: beyaz zemin, küçük ürün görselli seçenekler, aktif sayfada kırmızı alt çizgi.
 * Kampanya gibi vurgulu öğeler kırmızı hap, rehberler sağda sade.
 */
export function NavBar({ items, categories, brands }: { items: Item[]; categories: Cat; brands: { name: string; slug: string }[] }) {
  const path = usePathname();
  const isActive = (url: string) => (url === "/" ? path === "/" : path === url || path.startsWith(url + "/") || path.startsWith(url + "?"));
  const main = items.filter((i) => !i.highlight && !/^\/blog/.test(i.url));
  const hot = items.filter((i) => i.highlight);
  const side = items.filter((i) => !i.highlight && /^\/blog/.test(i.url));
  return (
    <nav className="hidden border-b border-line bg-white shadow-[0_1px_0_rgba(0,0,0,.02)] md:block" aria-label="Kategoriler">
      <div className="container-x flex h-[58px] items-center gap-3">
        <MegaMenu categories={categories} brands={brands} />
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
                    <img src={m.image} alt="" className="h-6 w-6 object-contain mix-blend-multiply" />
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
