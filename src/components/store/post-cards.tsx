import { imgProps } from "@/lib/img";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import type { PostCard } from "@/lib/content";
import { formatDate } from "@/lib/utils";

export function PostCards({ posts, cols = 3 }: { posts: PostCard[]; cols?: 2 | 3 }) {
  return (
    <div className={`grid gap-4 sm:grid-cols-2 ${cols === 3 ? "lg:grid-cols-3" : ""}`}>
      {posts.map((p) => (
        <Link key={p.id} href={`/blog/${p.slug}`} className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white transition duration-300 hover:-translate-y-1 hover:border-[#f0c9c2] hover:shadow-[0_18px_34px_-20px_rgba(196,42,27,.4)]">
          <div className="relative aspect-[16/9] overflow-hidden bg-tint">
            {p.coverImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img {...imgProps(p.coverImage, [384, 640, 828], "(min-width: 768px) 33vw, 100vw")} alt={p.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
            ) : (
              <div className="grid h-full place-items-center text-brand"><BookOpen size={36} /></div>
            )}
          </div>
          <div className="flex flex-1 flex-col gap-1.5 p-4">
            <span className="w-fit rounded-full bg-tint px-2.5 py-0.5 text-[11px] font-extrabold tracking-wider text-link uppercase">{p.category}</span>
            <h3 className="font-display text-[17px] leading-snug font-extrabold group-hover:text-link">{p.title}</h3>
            {p.excerpt ? <p className="line-clamp-2 text-sm text-mute">{p.excerpt}</p> : null}
            <p className="mt-auto flex items-center justify-between gap-2 pt-2 text-[12px] text-mute">
              <span>{formatDate(p.publishedAt ?? p.updatedAt)} · {p.authorName}</span>
              <span className="shrink-0 font-extrabold text-link transition duration-300 group-hover:translate-x-1">Oku →</span>
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
