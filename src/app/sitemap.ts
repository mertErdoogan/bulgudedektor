import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { brands, categories, pages, products } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL || "http://localhost:3000";
  const [p, c, b, pg] = await Promise.all([
    db.select({ slug: products.slug, u: products.updatedAt }).from(products).where(eq(products.status, "ACTIVE")),
    db.select({ slug: categories.slug }).from(categories).where(eq(categories.isActive, true)),
    db.select({ slug: brands.slug }).from(brands).where(eq(brands.isActive, true)),
    db.select({ slug: pages.slug, u: pages.updatedAt }).from(pages).where(eq(pages.isPublished, true)),
  ]);
  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/sihirbaz`, priority: 0.8 },
    { url: `${base}/kampanyalar`, changeFrequency: "weekly" },
    ...c.map((x) => ({ url: `${base}/kategori/${x.slug}`, priority: 0.8 })),
    ...b.map((x) => ({ url: `${base}/marka/${x.slug}` })),
    ...p.map((x) => ({ url: `${base}/urun/${x.slug}`, lastModified: x.u, priority: 0.9 })),
    ...pg.map((x) => ({ url: `${base}/sayfa/${x.slug}`, lastModified: x.u, priority: 0.3 })),
  ];
}
