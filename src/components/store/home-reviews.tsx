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
  const dist = await db
    .select({ r: reviews.rating, n: sql<number>`count(*)::int` })
    .from(reviews)
    .where(eq(reviews.isApproved, true))
    .groupBy(reviews.rating);
  if (!rows.length) return null;
  const by = (r: number) => dist.find((d) => d.r === r)?.n ?? 0;
  const avg = agg.avg ?? 0;
  return (
    <section className="container-x mt-14" aria-labelledby="yorumlar-baslik" data-testid="home-reviews">
      <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-stretch">
        {/* Özet: büyük puan, yıldızlar ve dağılım çubukları */}
        <div className="flex flex-col rounded-[26px] bg-[linear-gradient(160deg,#fffaf0_0%,#ffffff_55%)] p-6 ring-1 ring-[#f1e6cf]">
          <span className="text-[11.5px] font-extrabold tracking-[.14em] text-mute">MÜŞTERİ YORUMLARI</span>
          <h2 id="yorumlar-baslik" className="font-display mt-1 text-[24px] leading-tight font-extrabold md:text-[28px]">Müşterilerimiz ne diyor?</h2>
          <div className="mt-5 flex items-end gap-3">
            <span className="font-display text-[56px] leading-none font-black tracking-tight">{avg.toFixed(1)}</span>
            <span className="pb-1.5">
              <span className="flex text-[18px] leading-none text-gold" aria-label={`5 üzerinden ${avg.toFixed(1)}`}>
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} size={18} className={i < Math.round(avg) ? "fill-gold text-gold" : "text-[#e5d9bd]"} />
                ))}
              </span>
              <span className="mt-1 block text-[13px] text-mute">{agg.n} onaylı yorum</span>
            </span>
          </div>
          <div className="mt-5 flex flex-col gap-1.5">
            {[5, 4, 3, 2, 1].map((r) => (
              <span key={r} className="flex items-center gap-2 text-[12.5px] text-mute">
                <span className="w-3 text-right font-bold text-deep">{r}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#f1ece0]">
                  <span className="block h-full rounded-full bg-gold" style={{ width: `${agg.n ? (by(r) / agg.n) * 100 : 0}%` }} />
                </span>
                <span className="w-6 text-right">{by(r)}</span>
              </span>
            ))}
          </div>
          {googleReviewUrl ? (
            <a href={googleReviewUrl} target="_blank" rel="noopener" className="mt-6 flex h-11 items-center justify-center rounded-full bg-deep text-sm font-extrabold text-white hover:bg-black">Google&apos;da yorum yaz</a>
          ) : null}
        </div>
        <Rail itemClass="w-[84%] sm:w-[48%] xl:w-[32.2%]">
          {rows.map((r) => (
            <article key={r.id} className="group relative isolate flex h-full flex-col overflow-hidden rounded-[22px] border border-line bg-white p-5 transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_36px_-24px_rgba(20,20,22,.45)]">
              <span aria-hidden className="pointer-events-none absolute -top-3 right-4 -z-10 font-serif text-[110px] leading-none text-[#f3efe6] transition duration-500 group-hover:text-[#efe3c8]">&rdquo;</span>
              <div className="flex items-center gap-3">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-[15px] font-extrabold text-white ${AVATAR[[...r.name].reduce((n, c) => n + c.charCodeAt(0), 0) % AVATAR.length]}`}>
                  {r.name.trim().charAt(0).toLocaleUpperCase("tr")}
                </span>
                <span className="min-w-0">
                  <b className="block truncate text-[14.5px]">{r.name}</b>
                  <span className="flex items-center gap-1.5 text-[12px] text-mute">
                    {r.isVerified ? <span className="flex items-center gap-1 font-semibold text-ok"><BadgeCheck size={13} /> Satın aldı</span> : null}
                    <time dateTime={r.createdAt.toISOString()}>{formatDate(r.createdAt)}</time>
                  </span>
                </span>
              </div>
              <span className="mt-3 flex" aria-label={`5 üzerinden ${r.rating} yıldız`}>
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} size={15} className={i < r.rating ? "fill-gold text-gold" : "text-line"} />
                ))}
              </span>
              <blockquote className="mt-2 line-clamp-5 flex-1 text-[15px] leading-relaxed text-[#2a2a2e]">{r.body}</blockquote>
              <Link href={`/urun/${r.productSlug}#yorumlar`} className="mt-4 flex items-center gap-2.5 rounded-xl border border-line p-2 pr-3 transition hover:border-deep">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-soft">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {r.image ? <img src={imgUrl(r.image, 96)} alt="" loading="lazy" className="h-9 w-9 object-contain mix-blend-multiply" /> : null}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-bold">{r.productName}</span>
                <span className="text-[12px] font-bold text-mute">İncele →</span>
              </Link>
            </article>
          ))}
        </Rail>
      </div>
    </section>
  );
}

const AVATAR = ["bg-[#d42e1e]", "bg-[#1f3b8f]", "bg-[#11643a]", "bg-[#7a4a14]", "bg-[#3a3a40]"];
