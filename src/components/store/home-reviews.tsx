import { imgUrl } from "@/lib/img";
import { q } from "@/db/q";
import Link from "next/link";
import { BadgeCheck, Star } from "lucide-react";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { productImages, products, reviews } from "@/db/schema";
import { formatDate } from "@/lib/utils";
import { Rail } from "./rails";

/**
 * Ana sayfadaki müşteri yorumları: yalnızca onaylanmış, gerçek ürün yorumları.
 * Yorum yoksa bölüm hiç çizilmez.
 */
export async function HomeReviews({ googleReviewUrl }: { googleReviewUrl?: string }) {
  const [rows, [agg]] = await Promise.all([
    db
      .select({
        id: reviews.id,
        name: reviews.name,
        rating: reviews.rating,
        body: reviews.body,
        isVerified: reviews.isVerified,
        createdAt: reviews.createdAt,
        productName: products.name,
        productSlug: products.slug,
        image: sql<string | null>`(select ${q(productImages.url)} from ${productImages} where ${q(productImages.productId)} = ${q(products.id)} order by ${q(productImages.sortOrder)} limit 1)`,
      })
      .from(reviews)
      .innerJoin(products, eq(products.id, reviews.productId))
      .where(sql`${reviews.isApproved} and ${products.status} = 'ACTIVE' and length(${reviews.body}) >= 20`)
      .orderBy(desc(reviews.rating), desc(reviews.createdAt))
      .limit(12),
    db.select({ n: sql<number>`count(*)::int`, avg: sql<number | null>`avg(${reviews.rating})::float` }).from(reviews).where(eq(reviews.isApproved, true)),
  ]);
  if (!rows.length) return null;
  return (
    <section className="container-x mt-12" aria-labelledby="yorumlar-baslik">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="border-l-4 border-brand pl-3.5">
          <h2 id="yorumlar-baslik" className="font-display text-[23px] leading-tight font-extrabold md:text-[30px]">Müşterilerimiz ne diyor?</h2>
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-sm text-mute">
            <Star size={14} className="fill-gold text-gold" />
            <b className="text-deep">{agg.avg?.toFixed(1)}</b> ortalama · {agg.n} onaylı ürün yorumu
          </p>
        </div>
        {googleReviewUrl ? (
          <a href={googleReviewUrl} target="_blank" rel="noopener" className="flex h-10 items-center rounded-full border border-line px-4 text-sm font-extrabold hover:border-deep">Google&apos;da yorum yaz</a>
        ) : null}
      </div>
      <Rail itemClass="w-[82%] sm:w-[46%] lg:w-[31.8%] xl:w-[23.8%]">
        {rows.map((r) => (
          <article key={r.id} className="group relative isolate flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white p-4 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_30px_-20px_rgba(20,20,20,.35)]">
            {/* Büyük tırnak işareti: sayfayı yormayan dekor */}
            <span aria-hidden className="pointer-events-none absolute top-10 right-4 -z-10 font-serif text-[88px] leading-[0.8] text-[#f8dcd6] transition duration-500 group-hover:-translate-y-0.5 group-hover:text-[#f3c4bb]">“</span>
            <div className="flex items-center justify-between gap-2">
              <span className="text-gold" aria-label={`5 üzerinden ${r.rating} yıldız`}>
                {"★".repeat(r.rating)}
                <span className="text-line">{"★".repeat(5 - r.rating)}</span>
              </span>
              <time dateTime={r.createdAt.toISOString()} className="text-xs text-mute">{formatDate(r.createdAt)}</time>
            </div>
            <blockquote className="mt-2 line-clamp-5 flex-1 text-[14.5px] leading-relaxed">“{r.body}”</blockquote>
            <p className="mt-3 flex items-center gap-1.5 text-sm font-bold">
              {r.name}
              {r.isVerified ? <span className="flex items-center gap-1 text-xs font-semibold text-ok"><BadgeCheck size={14} /> Satın aldı</span> : null}
            </p>
            <Link href={`/urun/${r.productSlug}#yorumlar`} className="mt-3 flex items-center gap-2.5 rounded-xl bg-soft p-2 transition hover:bg-tint">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {r.image ? <img src={imgUrl(r.image, 96)} alt="" loading="lazy" className="h-10 w-10 shrink-0 object-contain mix-blend-multiply" /> : null}
              <span className="min-w-0 truncate text-[13px] font-bold">{r.productName}</span>
            </Link>
          </article>
        ))}
      </Rail>
    </section>
  );
}
