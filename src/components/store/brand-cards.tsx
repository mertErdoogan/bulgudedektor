import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { BrandGroup } from "@/lib/store";
import { cn } from "@/lib/utils";

/** Marka kartı: marka adı (veya logosu), temsilî ürün görseli ve o markanın kategorileri. */
export function BrandCard({ b, className }: { b: BrandGroup; className?: string }) {
  return (
    <div className={cn("group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white transition hover:shadow-[0_14px_30px_rgba(20,20,20,.10)]", className)}>
      <Link href={`/marka/${b.slug}`} className="relative flex items-center gap-3 bg-[#f6f6f6] p-4">
        <span className="min-w-0 flex-1">
          {b.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={b.logoUrl} alt={b.name} className="h-9 max-w-[150px] object-contain object-left mix-blend-multiply" />
          ) : (
            <span className="font-display block truncate text-[19px] leading-none font-black tracking-tight md:text-[26px]">{b.name.toLocaleUpperCase("en-US")}</span>
          )}
          <span className="mt-1.5 block text-[13px] text-mute">{b.total} ürün</span>
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {b.image ? <img src={b.image} alt="" loading="lazy" className="hidden h-[84px] w-[110px] shrink-0 object-contain sm:block mix-blend-multiply transition duration-300 group-hover:scale-105" /> : null}
      </Link>
      <ul className="flex flex-1 flex-col p-2">
        {b.categories.map((c) => (
          <li key={c.slug}>
            <Link href={`/marka/${b.slug}?kategori=${c.slug}`} className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-[13.5px] font-semibold md:px-2.5 md:text-[14px] hover:bg-soft hover:text-link">
              <span className="truncate">{c.name}</span>
              <span className="shrink-0 text-xs font-normal text-mute">{c.count}</span>
            </Link>
          </li>
        ))}
      </ul>
      <Link href={`/marka/${b.slug}`} className="flex items-center justify-between border-t border-line px-3 py-3 text-[13px] font-extrabold text-link md:px-4 md:text-sm">
        Tüm {b.name}<span className="hidden sm:inline">&nbsp;ürünleri</span> <ArrowRight size={15} />
      </Link>
    </div>
  );
}

export function BrandGrid({ brands }: { brands: BrandGroup[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
      {brands.map((b) => (
        <BrandCard key={b.id} b={b} />
      ))}
    </div>
  );
}
