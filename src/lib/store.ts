import "server-only";
import { q } from "@/db/q";
import { cache } from "react";
import { createHmac } from "node:crypto";
import { and, asc, desc, eq, gte, inArray, isNull, lte, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { productSearch } from "./search";
import { banners, brands, campaigns, categories, homeSections, menuItems, orderItems, orders, pages, productActivity, productImages, products, reviews } from "@/db/schema";

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
  brandSlug: brands.slug,
  /** İngilizce ad (varsa): kart, dili İngilizce olan sayfada bunu gösterir; listeler ayrıca çevrilmek zorunda kalmaz */
  nameEn: sql<string | null>`(select tr.value from translations tr where tr.entity = 'product' and tr.entity_id = ${q(products.id)} and tr.locale = 'en' and tr.field = 'name')`,
  image: sql<string | null>`(select ${q(productImages.url)} from ${productImages} where ${q(productImages.productId)} = ${q(products.id)} order by ${q(productImages.sortOrder)} limit 1)`,
  rating: sql<number | null>`(select avg(${q(reviews.rating)})::float from ${reviews} where ${q(reviews.productId)} = ${q(products.id)} and ${q(reviews.isApproved)})`,
  reviewCount: sql<number>`(select count(*)::int from ${reviews} where ${q(reviews.productId)} = ${q(products.id)} and ${q(reviews.isApproved)})`,
  createdAt: products.createdAt,
  views24: sql<number>`coalesce((select sum(${q(productActivity.views)})::int from ${productActivity} where ${q(productActivity.productId)} = ${q(products.id)} and ${q(productActivity.hour)} > now() - interval '24 hours'), 0)`,
  carts24: sql<number>`coalesce((select sum(${q(productActivity.carts)})::int from ${productActivity} where ${q(productActivity.productId)} = ${q(products.id)} and ${q(productActivity.hour)} > now() - interval '24 hours'), 0)`,
  /** Kodsuz (otomatik) kampanyaların bu ürüne tek başına sepette sağladığı en yüksek indirim (TL). Sepet hesabıyla aynı kural. */
  cartDeal: sql<number>`coalesce((select max(least(coalesce(c.max_discount, 1e12), case when c.type = 'PERCENT' then ${q(products.price)} * c.value / 100 else least(c.value, ${q(products.price)}) end)) from campaigns c where c.code is null and c.is_active and c.type <> 'FREE_SHIPPING' and (c.starts_at is null or c.starts_at <= now()) and (c.ends_at is null or c.ends_at >= now()) and (c.usage_limit is null or c.usage_count < c.usage_limit) and ${q(products.price)} >= c.min_subtotal and (c.scope = 'ALL' or (c.scope = 'BRAND' and ${q(products.brandId)} = any(c.target_ids)) or (c.scope = 'CATEGORY' and ${q(products.categoryId)} = any(c.target_ids)) or (c.scope = 'PRODUCT' and ${q(products.id)} = any(c.target_ids)))), 0)::float`,
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
  brandSlug?: string | null;
  nameEn?: string | null;
  image: string | null;
  rating: number | null;
  reviewCount: number;
  createdAt: Date | string;
  views24: number;
  carts24: number;
  /** Sepette otomatik düşen kampanya indirimi (TL, 0 = yok) */
  cartDeal?: number;
};

const active = eq(products.status, "ACTIVE");

/**
 * Son 90 günde satılan adet: raflarda ve "Önerilen" sıralamada çok satanlar öne çıkar (markadan bağımsız).
 * Satış verisi az olan yeni mağazada isFeatured ("öne çıkan") ve sıra alanı devreye girer.
 */
export const soldLast90 = sql`(select coalesce(sum(oi.quantity), 0) from order_items oi join orders o on o.id = oi.order_id where oi.product_id = ${q(products.id)} and o.status not in ('CANCELLED','REFUNDED','PENDING_PAYMENT') and o.created_at > now() - interval '90 days')`;

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
  // İsteğin diline çevir (Türkçede sorgu yapılmaz)
  const { localize } = await import("./i18n/content");
  const [lm, lc] = await Promise.all([localize(menu, "menu"), localize(cats, "category")]);
  // Kapalı sektör modüllerine giden menü öğeleri gizlenir (Ayarlar > Katalog)
  const { getSettings } = await import("./settings");
  const { linkAllowed } = await import("./nav-links");
  const f = (await getSettings()).catalog;
  return { menu: lm.filter((m) => linkAllowed(m.url, f)), categories: lc };
});

export const getFooterPages = cache(async () => {
  const rows = await db.select({ id: pages.id, slug: pages.slug, title: pages.title, group: pages.footerGroup }).from(pages).where(and(eq(pages.isPublished, true), eq(pages.showInFooter, true))).orderBy(asc(pages.title));
  const { localize } = await import("./i18n/content");
  return localize(rows, "page");
});

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
  // İngilizce sayfa: yazılı banner'ın İngilizce görseli varsa onu kullan
  const { getLocale } = await import("./i18n/server");
  const en = (await getLocale()) === "en";
  const out = en ? bs.map((b) => ({ ...b, imageUrl: b.imageUrlEn || b.imageUrl, mobileImageUrl: b.imageUrlEn ? b.mobileImageUrlEn || null : b.mobileImageUrl })) : bs;
  return { sections: secs, banners: out };
}

/**
 * Son 60 günde en çok satanlar (iptal/iade hariç); yetersizse öne çıkanlarla tamamlanır.
 * Vitrin önceliği (merch.ts) uygulanır: öncelikli marka ağırlığı ve sabit ürünler.
 */
export async function bestSellers(limit = 10): Promise<ProductCard[]> {
  const { weighed } = await import("./merch");
  return weighed(
    (n) => rawBestSellers(n),
    (cond, n) => cardQuery().where(and(active, cond)).orderBy(desc(products.isFeatured), asc(products.sortOrder)).limit(n),
    limit,
  );
}

async function rawBestSellers(limit: number): Promise<ProductCard[]> {
  const sold = db
    .select({ pid: orderItems.productId, q: sql<number>`sum(${orderItems.quantity})`.as("q") })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(and(gte(orders.createdAt, sql`now() - interval '60 days'`), sql`${orders.status} not in ('CANCELLED','REFUNDED','PENDING_PAYMENT')`))
    .groupBy(orderItems.productId)
    .as("sold");
  const top = await db
    .select(cardColumns)
    .from(products)
    .leftJoin(brands, eq(brands.id, products.brandId))
    .innerJoin(sold, eq(sold.pid, products.id))
    .where(active)
    .orderBy(desc(sold.q))
    .limit(limit);
  if (top.length >= limit) return top;
  const more = await rawProductsFor("featured", limit);
  const seen = new Set(top.map((t) => t.id));
  return [...top, ...more.filter((m) => !seen.has(m.id))].slice(0, limit);
}

type Kind = "featured" | "new" | "deals" | "sameday" | "pro";

/** Ana sayfa rafları; vitrin önceliği uygulanmış */
export async function productsFor(kind: Kind, limit = 10): Promise<ProductCard[]> {
  const { weighed } = await import("./merch");
  const { where, order } = railQuery(kind);
  return weighed((n) => rawProductsFor(kind, n), (cond, n) => cardQuery().where(and(where, cond)).orderBy(order).limit(n), limit);
}

function railQuery(kind: Kind) {
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
  const order =
    kind === "new"
      ? desc(products.createdAt)
      : kind === "deals"
        ? desc(sql`(${products.compareAtPrice} - ${products.price}) / ${products.compareAtPrice}`)
        : sql`(${products.stock} > 0 or ${products.allowBackorder}) desc, ${soldLast90} desc, ${products.sortOrder} asc`;
  return { where: where!, order };
}

async function rawProductsFor(kind: Kind, limit: number): Promise<ProductCard[]> {
  const { where, order } = railQuery(kind);
  return cardQuery().where(where).orderBy(order).limit(limit);
}

/** Bir kategorinin rafı (ana sayfa kategori şeritleri) */
export async function categoryRail(categoryId: string, limit = 12): Promise<ProductCard[]> {
  const { weighed } = await import("./merch");
  const where = and(active, eq(products.categoryId, categoryId))!;
  const order = [sql`(${products.stock} > 0) desc`, sql`${soldLast90} desc`, desc(products.isFeatured), asc(products.sortOrder)];
  return weighed((n) => cardQuery().where(where).orderBy(...order).limit(n), (cond, n) => cardQuery().where(and(where, cond)).orderBy(...order).limit(n), limit);
}

/** Koşula uyan ürünlerin rafı (ana sayfa "Amacına göre keşfet" sekmeleri): stokta olanlar önce, vitrin önceliğiyle */
export async function railWhere(cond: SQL, limit = 8): Promise<ProductCard[]> {
  const { weighed } = await import("./merch");
  const where = and(active, cond)!;
  const order = [sql`(${products.stock} > 0) desc`, sql`${soldLast90} desc`, desc(products.isFeatured), asc(products.sortOrder)];
  return weighed((n) => cardQuery().where(where).orderBy(...order).limit(n), (c, n) => cardQuery().where(and(where, c)).orderBy(...order).limit(n), limit);
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

/** Liste filtresinin SQL koşulları. `skip` = sayımda kendi boyutu hariç tutulacak filtreler (facet sayıları için). */
async function filterConds(f: CatalogFilter, skip: ReadonlySet<string> = new Set()) {
  const conds: SQL[] = [active];
  const search = f.q ? productSearch(f.q) : null;
  if (search) conds.push(search.where);
  if (f.category) {
    const cat = await db.query.categories.findFirst({ where: eq(categories.slug, f.category) });
    if (cat) {
      const children = await db.select({ id: categories.id }).from(categories).where(eq(categories.parentId, cat.id));
      conds.push(inArray(products.categoryId, [cat.id, ...children.map((c) => c.id)]));
    }
  }
  if (f.brand?.length && !skip.has("brand")) conds.push(inArray(brands.slug, f.brand));
  if (f.tech?.length && !skip.has("tech")) conds.push(inArray(products.technology, f.tech as ("MULTI" | "VLF")[]));
  if (f.water?.length && !skip.has("water")) conds.push(inArray(products.waterproof, f.water as "FULL"[]));
  if (f.exp?.length && !skip.has("exp")) conds.push(inArray(products.experience, f.exp as "BEGINNER"[]));
  if (f.use) conds.push(sql`${f.use} = any(${products.useCases})`);
  if (f.min && !skip.has("price")) conds.push(gte(products.price, f.min));
  if (f.max && !skip.has("price")) conds.push(lte(products.price, f.max));
  if (f.stock) conds.push(sql`${products.stock} > 0`);
  if (f.light) conds.push(lte(products.weightKg, 1.5));
  if (f.ids?.length) conds.push(inArray(products.id, f.ids));
  return { conds, search };
}

export async function listProducts(f: CatalogFilter) {
  const { conds, search } = await filterConds(f);
  const order =
    f.sort === "fiyat-artan"
      ? asc(products.price)
      : f.sort === "fiyat-azalan"
        ? desc(products.price)
        : f.sort === "yeni"
          ? desc(products.createdAt)
          : f.sort === "cok-satan"
            ? sql`${soldLast90} desc, ${products.isFeatured} desc`
          : f.sort === "hafif"
            ? sql`${products.weightKg} asc nulls last`
            : search
              ? sql`${search.score} desc, ${products.isFeatured} desc`
              : sql`(${products.stock} > 0) desc, ${soldLast90} desc, ${products.isFeatured} desc, ${products.sortOrder} asc`;
  // Listeler sayfalanarak gösterilir (Catalog, 24'er); sıralama/vitrin ağırlığı tüm sonuç üzerinde yapılsın diye hepsi alınır
  const rows = await cardQuery().where(and(...conds)).orderBy(order).limit(2000);
  // "Önerilen" sıralama (kullanıcı sıralama seçmediyse, arama değilse): vitrin önceliği. Stoktakiler yine önce.
  if (!f.sort && !search && !f.ids?.length) {
    const { getMerch, weigh } = await import("./merch");
    const m = await getMerch();
    const inStock = rows.filter((r) => r.stock > 0);
    const out = rows.filter((r) => r.stock <= 0);
    return [...weigh(inStock, m), ...weigh(out, m, { pins: false })];
  }
  return rows;
}

/**
 * Filtre panelindeki sayılar: her seçeneğin yanındaki sayı, sayfadaki diğer bütün filtreler (marka sayfası, kategori,
 * arama, fiyat, stok…) uygulanmışken o seçenek de işaretlenirse kaç ürün kalacağıdır. Bir boyutun kendi seçimi kendi
 * sayısını daraltmaz (ör. "Çok frekans" seçiliyken "Tek frekans" sayısı yine görünür).
 */
export async function facetCounts(f: CatalogFilter = {}) {
  const dims = new Set(["brand", "tech", "water", "exp", "price"]);
  const { conds } = await filterConds(f, dims);
  const rows = await db
    .select({ brand: brands.slug, brandName: brands.name, tech: products.technology, water: products.waterproof, exp: products.experience, price: products.price })
    .from(products)
    .leftJoin(brands, eq(brands.id, products.brandId))
    .where(and(...conds));
  type R = (typeof rows)[number];
  const ok: Record<string, (r: R) => boolean> = {
    brand: (r) => !f.brand?.length || (!!r.brand && f.brand.includes(r.brand)),
    tech: (r) => !f.tech?.length || (!!r.tech && f.tech.includes(r.tech)),
    water: (r) => !f.water?.length || (!!r.water && f.water.includes(r.water)),
    exp: (r) => !f.exp?.length || (!!r.exp && f.exp.includes(r.exp)),
    price: (r) => (!f.min || r.price >= f.min) && (!f.max || r.price <= f.max),
  };
  const except = (dim: string) => rows.filter((r) => Object.entries(ok).every(([k, fn]) => k === dim || fn(r)));
  const count = <K extends string>(dim: string, key: (r: R) => K | null) => {
    const m = new Map<K, number>();
    for (const r of except(dim)) {
      const k = key(r);
      if (k) m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  };
  return {
    brands: [...count("brand", (r) => r.brand)].map(([slug, n]) => ({ slug, n, name: rows.find((r) => r.brand === slug)?.brandName ?? slug })),
    tech: count("tech", (r) => r.tech),
    water: count("water", (r) => r.water),
    exp: count("exp", (r) => r.exp),
    maxPrice: Math.max(0, ...except("price").map((r) => r.price)),
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

/** E-posta listesinden çıkış bağlantısı için imza (e-postayı bilen herkes başkasını listeden çıkaramasın diye). */
export function unsubKey(email: string) {
  return createHmac("sha256", process.env.AUTH_SECRET || "dev-secret").update(`unsub:${email.toLowerCase()}`).digest("hex").slice(0, 24);
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

export type BrandGroup = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  description: string | null;
  total: number;
  image: string | null;
  categories: { name: string; slug: string; count: number }[];
};

/** İngilizce sayfada kart adlarını İngilizce adla değiştirir (kart sorgusu nameEn'i ayrıca getirir) */
export function withLocaleNames<T extends { name: string; nameEn?: string | null }>(rows: T[], locale: string): T[] {
  return locale === "en" ? rows.map((r) => (r.nameEn ? { ...r, name: r.nameEn } : r)) : rows;
}

/** Markalar ve her markanın ürün bulunan kategorileri (marka → kategori gezinmesi için). */
export const getBrandGroups = cache(async (): Promise<BrandGroup[]> => {
  const [bs, rows, imgs] = await Promise.all([
    getActiveBrands(),
    db
      .select({ brandId: products.brandId, id: categories.id, name: categories.name, slug: categories.slug, sort: categories.sortOrder, count: sql<number>`count(*)::int` })
      .from(products)
      .innerJoin(categories, eq(categories.id, products.categoryId))
      .where(and(active, eq(categories.isActive, true)))
      .groupBy(products.brandId, categories.id, categories.name, categories.slug, categories.sortOrder)
      .orderBy(asc(categories.sortOrder)),
    db
      .selectDistinctOn([products.brandId], {
        brandId: products.brandId,
        image: sql<string | null>`(select ${q(productImages.url)} from ${productImages} where ${q(productImages.productId)} = ${q(products.id)} order by ${q(productImages.sortOrder)} limit 1)`,
      })
      .from(products)
      .where(active)
      .orderBy(products.brandId, desc(products.isFeatured), desc(products.price)),
  ]);
  const { localize } = await import("./i18n/content");
  const [rowsL, bsL] = await Promise.all([localize(rows, "category"), localize(bs, "brand")]);
  return bsL
    .map((b) => {
      const cats = rowsL.filter((r) => r.brandId === b.id).map(({ name, slug, count }) => ({ name, slug, count }));
      return { id: b.id, name: b.name, slug: b.slug, logoUrl: b.logoUrl, description: b.description, total: cats.reduce((a, c) => a + c.count, 0), image: imgs.find((i) => i.brandId === b.id)?.image ?? null, categories: cats };
    })
    .filter((b) => b.total > 0);
});

/** Ticari ileti iznini tüm kanallarda geri alır (bülten, müşteri izni, sepet hatırlatma). */
export async function revokeMarketing(email: string) {
  const { cartSnapshots, customers, newsletterSubscribers } = await import("@/db/schema");
  const e = email.toLowerCase();
  await db.update(newsletterSubscribers).set({ isActive: false }).where(eq(newsletterSubscribers.email, e));
  await db.update(customers).set({ marketingConsent: false }).where(eq(customers.email, e));
  await db.update(cartSnapshots).set({ consent: false }).where(eq(cartSnapshots.email, e));
}
