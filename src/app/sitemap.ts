import { q } from "@/db/q";
import type { MetadataRoute } from "next";
import { and, asc, eq, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { brands, categories, pages, posts, productImages, products } from "@/db/schema";
import { abs, siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const [p, c, b, pg, bl] = await Promise.all([
    db
      .select({
        slug: products.slug,
        u: products.updatedAt,
        imgs: sql<string[]>`coalesce((select array_agg(${q(productImages.url)} order by ${q(productImages.sortOrder)}) from ${productImages} where ${q(productImages.productId)} = ${q(products.id)}), '{}')`,
      })
      .from(products)
      .where(eq(products.status, "ACTIVE")),
    db.select({ slug: categories.slug }).from(categories).where(eq(categories.isActive, true)).orderBy(asc(categories.sortOrder)),
    db.select({ slug: brands.slug }).from(brands).where(eq(brands.isActive, true)),
    db.select({ slug: pages.slug, u: pages.updatedAt }).from(pages).where(eq(pages.isPublished, true)),
    db.select({ slug: posts.slug, u: posts.updatedAt, img: posts.coverImage }).from(posts).where(and(eq(posts.status, "PUBLISHED"), lte(posts.publishedAt, new Date()))),
  ]);
  const now = new Date();
  return [
    { url: base, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/urunler`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/sihirbaz`, priority: 0.8 },
    { url: `${base}/blog`, lastModified: bl[0]?.u ?? now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/sss`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/sozluk`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/kampanyalar`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/markalar`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/kategoriler`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/seri-no`, priority: 0.5 },
    { url: `${base}/servis`, priority: 0.5 },
    { url: `${base}/iletisim`, priority: 0.5 },
    ...c.map((x) => ({ url: `${base}/kategori/${x.slug}`, changeFrequency: "weekly" as const, priority: 0.85 })),
    ...b.map((x) => ({ url: `${base}/marka/${x.slug}`, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...p.map((x) => ({ url: `${base}/urun/${x.slug}`, lastModified: x.u, changeFrequency: "weekly" as const, priority: 0.9, images: x.imgs.map((i) => abs(i)!) })),
    ...bl.map((x) => ({ url: `${base}/blog/${x.slug}`, lastModified: x.u, changeFrequency: "monthly" as const, priority: 0.75, images: x.img ? [abs(x.img)!] : undefined })),
    ...pg.map((x) => ({ url: `${base}/sayfa/${x.slug}`, lastModified: x.u, priority: 0.3 })),
  ];
}
