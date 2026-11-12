import { imgProps } from "@/lib/img";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import type { PostCard } from "@/lib/content";
import { formatDate } from "@/lib/utils";

export function PostCards({ posts, cols = 3 }: { posts: PostCard[]; cols?: 2 | 3 }) {
  return (
    <div className={`grid gap-4 sm:grid-cols-2 ${cols === 3 ? "lg:grid-cols-3" : ""}`}>
      {posts.map((p) => (
        <Link key={p.id} href={`/blog/${p.slug}`} className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white transition hover:shadow-md">
          <div className="aspect-[16/9] overflow-hidden bg-tint">
            {p.coverImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img {...imgProps(p.coverImage, [384, 640, 828], "(min-width: 768px) 33vw, 100vw")} alt={p.title} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-[1.03]" />
            ) : (
              <div className="grid h-full place-items-center text-brand"><BookOpen size={36} /></div>
            )}
          </div>
          <div className="flex flex-1 flex-col gap-1.5 p-4">
            <span className="text-[11px] font-extrabold tracking-wider text-brand uppercase">{p.category}</span>
            <h3 className="font-display text-[17px] leading-snug font-extrabold group-hover:text-link">{p.title}</h3>
            {p.excerpt ? <p className="line-clamp-2 text-sm text-mute">{p.excerpt}</p> : null}
            <p className="mt-auto pt-2 text-[12px] text-mute">{formatDate(p.publishedAt ?? p.updatedAt)} · {p.authorName}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
