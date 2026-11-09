import "server-only";
import { cache } from "react";
import { createHmac } from "node:crypto";
import { and, asc, desc, eq, gte, ilike, inArray, isNull, lte, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { banners, brands, campaigns, categories, homeSections, menuItems, pages, productImages, products, reviews } from "@/db/schema";

export const cardColumns = {
  id: products.id,
  name: products.name,
  slug: products.slug,
  price: products.price,
  compareAtPrice: products.compareAtPrice,
  stock: products.stock,
  allowBackorder: products.allowBackorder,
  badges: products.badges,
  sameDayShipping: products.sameDayShipping,
  trialRentalPrice: products.trialRentalPrice,
  shortDescription: products.shortDescription,
  experience: products.experience,
  weightKg: products.weightKg,
  waterproof: products.waterproof,
  technology: products.technology,
  brand: brands.name,
  image: sql<string | null>`(select ${productImages.url} from ${productImages} where ${productImages.productId} = ${products.id} order by ${productImages.sortOrder} limit 1)`,
  rating: sql<number | null>`(select avg(${reviews.rating})::float from ${reviews} where ${reviews.productId} = ${products.id} and ${reviews.isApproved})`,
  reviewCount: sql<number>`(select count(*)::int from ${reviews} where ${reviews.productId} = ${products.id} and ${reviews.isApproved})`,
};

export type ProductCard = {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  allowBackorder: boolean;
  badges: string[];
  sameDayShipping: boolean;
  trialRentalPrice: number | null;
  shortDescription: string | null;
  experience: string | null;
  weightKg: number | null;
  waterproof: string | null;
  technology: string | null;
  brand: string | null;
  image: string | null;
  rating: number | null;
  reviewCount: number;
};

const active = eq(products.status, "ACTIVE");

export function cardQuery() {
  return db.select(cardColumns).from(products).leftJoin(brands, eq(brands.id, products.brandId));
}

export const getNav = cache(async () => {
  const [menu, cats] = await Promise.all([
    db.select().from(menuItems).where(eq(menuItems.isActive, true)).orderBy(asc(menuItems.sortOrder)),
    db
      .select({ id: categories.id, name: categories.name, slug: categories.slug, shortText: categories.shortText, imageUrl: categories.imageUrl, description: categories.description, parentId: categories.parentId })
      .from(categories)
      .where(and(eq(categories.isActive, true), eq(categories.showInMenu, true)))
      .orderBy(asc(categories.sortOrder)),
  ]);
  return { menu, categories: cats };
});

export const getFooterPages = cache(async () =>
  db.select({ slug: pages.slug, title: pages.title, group: pages.footerGroup }).from(pages).where(and(eq(pages.isPublished, true), eq(pages.showInFooter, true))).orderBy(asc(pages.title)),
);

export const getActiveBrands = cache(async () => db.select().from(brands).where(eq(brands.isActive, true)).orderBy(asc(brands.sortOrder)));

function liveBanner() {
  const now = new Date();
  return and(eq(banners.isActive, true), or(isNull(banners.startsAt), lte(banners.startsAt, now)), or(isNull(banners.endsAt), gte(banners.endsAt, now)));
}

export async function getHome() {
  const [secs, bs] = await Promise.all([
    db.select().from(homeSections).where(eq(homeSections.isActive, true)).orderBy(asc(homeSections.sortOrder)),
    db.select().from(banners).where(liveBanner()).orderBy(asc(banners.sortOrder)),
  ]);
  return { sections: secs, banners: bs };
}

export async function productsFor(kind: "featured" | "new" | "deals" | "sameday" | "pro", limit = 10): Promise<ProductCard[]> {
  const base = cardQuery();
  const where =
    kind === "featured"
      ? and(active, eq(products.isFeatured, true))
      : kind === "deals"
        ? and(active, sql`${products.compareAtPrice} > ${products.price}`)
        : kind === "sameday"
          ? and(active, eq(products.sameDayShipping, true), sql`${products.stock} > 0`)
          : kind === "pro"
            ? and(active, eq(products.isPro, true))
            : active;
  const order = kind === "new" ? desc(products.createdAt) : asc(products.sortOrder);
  return base.where(where).orderBy(order).limit(limit);
}

export type CatalogFilter = {
  q?: string;
  category?: string;
  brand?: string[];
  tech?: string[];
  water?: string[];
  exp?: string[];
  use?: string;
  min?: number;
  max?: number;
  stock?: boolean;
  light?: boolean;
  sort?: string;
  ids?: string[];
};

export async function listProducts(f: CatalogFilter) {
  const conds: SQL[] = [active];
  if (f.q) {
    const words = f.q.trim().split(/\s+/).slice(0, 5);
    for (const w of words) conds.push(or(ilike(products.name, `%${w}%`), ilike(products.sku, `%${w}%`), ilike(brands.name, `%${w}%`), ilike(products.shortDescription, `%${w}%`))!);
  }
  if (f.category) {
    const cat = await db.query.categories.findFirst({ where: eq(categories.slug, f.category) });
    if (cat) {
      const children = await db.select({ id: categories.id }).from(categories).where(eq(categories.parentId, cat.id));
      conds.push(inArray(products.categoryId, [cat.id, ...children.map((c) => c.id)]));
    }
  }
  if (f.brand?.length) conds.push(inArray(brands.slug, f.brand));
  if (f.tech?.length) conds.push(inArray(products.technology, f.tech as ("MULTI" | "VLF")[]));
  if (f.water?.length) conds.push(inArray(products.waterproof, f.water as "FULL"[]));
  if (f.exp?.length) conds.push(inArray(products.experience, f.exp as "BEGINNER"[]));
  if (f.use) conds.push(sql`${f.use} = any(${products.useCases})`);
  if (f.min) conds.push(gte(products.price, f.min));
  if (f.max) conds.push(lte(products.price, f.max));
  if (f.stock) conds.push(sql`${products.stock} > 0`);
  if (f.light) conds.push(lte(products.weightKg, 1.5));
  if (f.ids?.length) conds.push(inArray(products.id, f.ids));
  const order =
    f.sort === "fiyat-artan"
      ? asc(products.price)
      : f.sort === "fiyat-azalan"
        ? desc(products.price)
        : f.sort === "yeni"
          ? desc(products.createdAt)
          : f.sort === "hafif"
            ? sql`${products.weightKg} asc nulls last`
            : sql`(${products.stock} > 0) desc, ${products.isFeatured} desc, ${products.sortOrder} asc`;
  return cardQuery().where(and(...conds)).orderBy(order).limit(120);
}

export async function facetCounts(category?: string) {
  const conds: SQL[] = [active];
  if (category) {
    const cat = await db.query.categories.findFirst({ where: eq(categories.slug, category) });
    if (cat) conds.push(eq(products.categoryId, cat.id));
  }
  const rows = await db
    .select({ brand: brands.slug, brandName: brands.name, tech: products.technology, water: products.waterproof, exp: products.experience, price: products.price })
    .from(products)
    .leftJoin(brands, eq(brands.id, products.brandId))
    .where(and(...conds));
  const count = <K extends string>(key: (r: (typeof rows)[number]) => K | null) => {
    const m = new Map<K, number>();
    for (const r of rows) {
      const k = key(r);
      if (k) m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  };
  return {
    brands: [...count((r) => r.brand)].map(([slug, n]) => ({ slug, n, name: rows.find((r) => r.brand === slug)?.brandName ?? slug })),
    tech: count((r) => r.tech),
    water: count((r) => r.water),
    exp: count((r) => r.exp),
    maxPrice: Math.max(0, ...rows.map((r) => r.price)),
  };
}

export async function liveCampaigns() {
  const now = new Date();
  return db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.isActive, true), eq(campaigns.showOnSite, true), or(isNull(campaigns.startsAt), lte(campaigns.startsAt, now)), or(isNull(campaigns.endsAt), gte(campaigns.endsAt, now))))
    .orderBy(desc(campaigns.createdAt));
}

/** Misafir siparişlerinde sipariş sayfasına erişim anahtarı */
export function orderKey(orderId: string) {
  return createHmac("sha256", process.env.AUTH_SECRET || "dev-secret").update(`order:${orderId}`).digest("hex").slice(0, 24);
}

export function installmentText(price: number, n: number) {
  return `${n} × ${Math.round(price / n).toLocaleString("tr-TR")} TL`;
}

/** Kategori/marka özet istatistikleri: "Kısa cevap" kutusu ve llms.txt için. */
export async function catalogStats(where: { categoryId?: string; brandId?: string }) {
  const cond = and(
    eq(products.status, "ACTIVE"),
    where.categoryId ? eq(products.categoryId, where.categoryId) : undefined,
    where.brandId ? eq(products.brandId, where.brandId) : undefined,
  );
  const [agg] = await db
    .select({ n: sql<number>`count(*)::int`, min: sql<number | null>`min(${products.price})::float`, max: sql<number | null>`max(${products.price})::float` })
    .from(products)
    .where(cond);
  const top = await db
    .select({ name: brands.name, n: sql<number>`count(*)::int` })
    .from(products)
    .innerJoin(brands, eq(brands.id, products.brandId))
    .where(cond)
    .groupBy(brands.name)
    .orderBy(desc(sql`count(*)`))
    .limit(5);
  const best = await cardQuery().where(cond).orderBy(desc(products.isFeatured), asc(products.price)).limit(3);
  return { count: agg?.n ?? 0, min: agg?.min ?? null, max: agg?.max ?? null, brands: top.map((t) => t.name), picks: best };
}
