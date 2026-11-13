import { imgProps } from "@/lib/img";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import type { PostCard } from "@/lib/content";
import { formatDate } from "@/lib/utils";

export function PostCards({ posts, cols = 3 }: { posts: PostCard[]; cols?: 2 | 3 }) {
  return (
    <div className={`grid gap-4 sm:grid-cols-2 ${cols === 3 ? "lg:grid-cols-3" : ""}`}>
      {posts.map((p) => (
        <Link key={p.id} href={`/blog/${p.slug}`} className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white transition duration-300 hover:-translate-y-1 hover:border-[#dcdce0] hover:shadow-[0_18px_34px_-22px_rgba(20,20,22,.4)]">
          <div className="relative aspect-[16/9] overflow-hidden bg-soft">
            {p.coverImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img {...imgProps(p.coverImage, [384, 640, 828], "(min-width: 768px) 33vw, 100vw")} alt={p.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
            ) : (
              // Kapak görseli yoksa: boş kutu yerine sade, editoryal bir kapak
              <div className="relative flex h-full flex-col justify-end overflow-hidden bg-[linear-gradient(135deg,#1d1d1f_0%,#2c2c31_60%,#3d2320_100%)] p-5 text-white">
                <BookOpen aria-hidden size={56} strokeWidth={1.2} className="absolute top-5 right-5 text-white/20 transition duration-500 group-hover:scale-110" />
                <span className="text-[10.5px] font-extrabold tracking-[.2em] text-white/55">ARENA REHBER</span>
                <span className="font-display mt-1 line-clamp-2 text-[20px] leading-tight font-extrabold">{p.category}</span>
              </div>
            )}
          </div>
          <div className="flex flex-1 flex-col gap-1.5 p-4">
            <span className="w-fit rounded-full bg-soft px-2.5 py-0.5 text-[11px] font-extrabold tracking-wider text-mute uppercase">{p.category}</span>
            <h3 className="font-display text-[17px] leading-snug font-extrabold group-hover:text-brand">{p.title}</h3>
            {p.excerpt ? <p className="line-clamp-2 text-sm text-mute">{p.excerpt}</p> : null}
            <p className="mt-auto flex items-center justify-between gap-2 pt-2 text-[12px] text-mute">
              <span>{formatDate(p.publishedAt ?? p.updatedAt)} · {p.authorName}</span>
              <span className="shrink-0 font-extrabold text-deep transition duration-300 group-hover:translate-x-1">Oku →</span>
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
