import Link from "next/link";
import { ArrowRight, Flame, Sparkles, Star, Tag, TrendingUp } from "lucide-react";
import { imgUrl } from "@/lib/img";
import type { Shortcut, ShortcutIcon } from "@/lib/settings";
import { cn } from "@/lib/utils";

const ICON: Record<Exclude<ShortcutIcon, "">, typeof Star> = { star: Star, trend: TrendingUp, flame: Flame, tag: Tag, sparkles: Sparkles };

type CatLite = { slug: string; imageUrl: string | null; isActive?: boolean };
type BrandLite = { slug: string; name: string; logoUrl: string | null };

/**
 * Kısayolun görseli: panelde yüklenen görsel → kategori görseli → marka logosu → ikon → marka adı (yazı).
 * Var olmayan kategori/markaya giden kısayol gösterilmez (silinen kategori kırık link bırakmasın).
 */
export function resolveShortcuts(list: Shortcut[], cats: CatLite[], brands: BrandLite[]) {
  return list
    .map((s) => {
      const cat = /^\/kategori\/([^/?#]+)/.exec(s.href)?.[1];
      const br = /^\/marka\/([^/?#]+)/.exec(s.href)?.[1];
      if (cat && !cats.some((c) => c.slug === cat)) return null;
      const brand = br ? brands.find((b) => b.slug === br) : undefined;
      if (br && !brand) return null;
      const image = s.image || (cat ? cats.find((c) => c.slug === cat)?.imageUrl : null) || brand?.logoUrl || null;
      return { ...s, image, word: !image && !s.icon ? (brand?.name ?? s.label) : null };
    })
    .filter((x): x is Shortcut & { image: string | null; word: string | null } => !!x);
}

/** Ana sayfadaki "Ne arıyorsun?" yuvarlak kısayolları (panelden: Ana sayfa ve banner → Kısayollar). */
export function Shortcuts({ title, items }: { title: string; items: ReturnType<typeof resolveShortcuts> }) {
  if (!items.length) return null;
  return (
    <section className="container-x mt-2 md:mt-14" data-testid="shortcuts">
      <div className="mb-4 flex items-baseline justify-between gap-3 md:mb-6">
        <h2 className="font-display text-[22px] font-extrabold tracking-tight md:text-[28px]">{title}</h2>
        <Link href="/kategoriler" className="flex items-center gap-1.5 text-sm font-bold hover:text-brand">
          Tüm kategoriler <ArrowRight size={15} />
        </Link>
      </div>
      <div className="scrollbar-none -mx-4 flex snap-x gap-1 overflow-x-auto px-4 pt-1 pb-2 md:mx-0 md:justify-between md:gap-2 md:overflow-visible md:px-0">
        {items.map((s, i) => {
          const Icon = s.icon ? ICON[s.icon] : null;
          return (
            <Link key={i} href={s.href} className="group flex w-[84px] shrink-0 snap-start flex-col items-center gap-2.5 md:w-[112px]">
              <span
                className={cn(
                  "grid h-[68px] w-[68px] place-items-center overflow-hidden rounded-full border border-line bg-[radial-gradient(circle_at_50%_35%,#fff_0%,#f4f4f5_75%)] transition duration-300 group-hover:-translate-y-0.5 group-hover:border-[#d0d0d6] group-hover:shadow-[0_12px_22px_-14px_rgba(20,20,22,.45)] md:h-[80px] md:w-[80px]",
                  s.featured && "ring-2 ring-brand ring-offset-2",
                )}
              >
                {s.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imgUrl(s.image, 128)} alt="" loading="lazy" className="h-[74%] w-[74%] object-contain mix-blend-multiply transition duration-300 group-hover:scale-105" />
                ) : Icon ? (
                  <Icon size={27} strokeWidth={1.9} className="text-brand" />
                ) : (
                  <span className="px-1 text-center text-[10.5px] font-black tracking-[.06em] md:text-[11.5px]">{s.word?.toLocaleUpperCase("en-US")}</span>
                )}
              </span>
              <span className="text-center text-[12.5px] leading-tight font-semibold text-deep group-hover:text-brand md:text-[13px]">{s.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
