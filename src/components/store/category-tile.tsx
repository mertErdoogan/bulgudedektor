import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { imgProps } from "@/lib/img";
import { cn } from "@/lib/utils";

/**
 * Kategori kutusu (ana sayfa "Ne arıyorsun?" ve /kategoriler). Ürün kartlarıyla aynı ölçülü dil:
 * spot ışığı zemin, köşede dekoratif daire; üzerine gelince kutu hafif kalkar, ürün az döner, ok kırmızılaşır.
 */
export function CategoryTile({ c, className, sizes = "(min-width: 768px) 200px, 45vw" }: { c: { slug: string; name: string; shortText?: string | null; imageUrl?: string | null }; className?: string; sizes?: string }) {
  return (
    <Link
      href={`/kategori/${c.slug}`}
      className={cn("group relative isolate flex flex-col overflow-hidden rounded-2xl bg-[radial-gradient(110%_80%_at_50%_30%,#ffffff_0%,#fdf0ee_60%,#fae3df_100%)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_34px_-18px_rgba(196,42,27,.45)]", className)}
    >
      <span aria-hidden className="absolute -right-10 -bottom-12 -z-10 h-32 w-32 rounded-full bg-white/70 transition duration-500 group-hover:scale-125" />
      <span className="block h-[110px] px-3 pt-3 md:h-[160px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {c.imageUrl ? <img {...imgProps(c.imageUrl, [256, 384], sizes)} alt="" loading="lazy" className="h-full w-full object-contain mix-blend-multiply transition duration-500 group-hover:-translate-y-1 group-hover:scale-105 group-hover:-rotate-2" /> : null}
      </span>
      <span className="flex flex-col px-3.5 pt-2 pb-3.5">
        <b className="truncate text-[15px]">{c.name}</b>
        {c.shortText ? <span className="truncate text-[13px] text-mute">{c.shortText}</span> : null}
      </span>
      <span className="absolute top-2 right-2 grid h-8 w-8 place-items-center rounded-full bg-white text-deep shadow-sm transition duration-300 group-hover:bg-brand group-hover:text-white">
        <ArrowRight size={15} className="transition duration-300 group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
