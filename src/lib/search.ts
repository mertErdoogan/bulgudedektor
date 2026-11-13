import { q as qc } from "@/db/q";
import "server-only";
import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { brands, categories, posts, products, searchQueries } from "@/db/schema";

/**
 * Site içi arama (PostgreSQL pg_trgm).
 * - Türkçe karakter ve büyük/küçük harf duyarsız ("ışık" = "isik", "İ" = "i")
 * - Yazım hatasına dayanıklı ("vanqish" → Vanquish, "minelap" → Minelab)
 * - Eş anlamlılar ("pinpointer" → pointer, "bobin" → başlık)
 * - "dedektör", "fiyat" gibi her üründe geçen dolgu kelimeler yok sayılır
 * Katalog birkaç bin ürünü geçene kadar ayrı bir arama sunucusuna (Elasticsearch/Typesense) gerek yoktur.
 */
const MAP: Record<string, string> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u" };
export const trNorm = (s: string) =>
  s
    .replace(/[İI]/g, "i")
    .toLowerCase()
    .replace(/[çğıöşüâîû]/g, (c) => MAP[c] ?? c);

const STOP = new Set(["dedektor", "dedektoru", "dedektorleri", "dedektorler", "detektor", "detektoru", "dedektr", "fiyat", "fiyati", "fiyatlari", "en", "iyi", "ucuz", "satin", "al", "almak", "icin", "ve", "ile", "model", "modelleri", "metal", "cihaz", "cihazi"]);
const SYN: Record<string, string[]> = {
  pinpointer: ["pointer"],
  pinpoint: ["pointer"],
  bobin: ["baslik"],
  coil: ["baslik"],
  kafa: ["baslik"],
  deniz: ["sahil"],
  plaj: ["sahil"],
  sualti: ["su alti", "sahil"],
  nugget: ["altin"],
  para: ["sikke"],
  gomu: ["define"],
  hazine: ["define"],
  goruntulu: ["derin", "3d"],
  kulaklik: ["aksesuar"],
};

export function tokenize(q: string) {
  const all = trNorm(q)
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2)
    .slice(0, 6);
  const kept = all.filter((t) => !STOP.has(t));
  return kept;
}

/** Ürünün aranabilir metni (ad + marka + kod + kategori + kullanım amaçları), normalleştirilmiş. */
const doc = sql`arena_norm(${qc(products.name)} || ' ' || coalesce(${qc(brands.name)}, '') || ' ' || ${qc(products.sku)} || ' ' || coalesce((select ${qc(categories.name)} from ${categories} where ${qc(categories.id)} = ${qc(products.categoryId)}), '') || ' ' || array_to_string(${qc(products.useCases)}, ' '))`;
const nameDoc = sql`arena_norm(${products.name} || ' ' || coalesce(${brands.name}, ''))`;
/** Ürünün ana kategorisi: "altın dedektörü" aramasında asıl altın cihazları (kategorisi Doğal altın olanlar) öne çıksın. */
const catDoc = sql`arena_norm(coalesce((select ${qc(categories.name)} from ${categories} where ${qc(categories.id)} = ${qc(products.categoryId)}), ''))`;

/** Sorgu için WHERE koşulu ve alaka puanı. Anlamlı kelime yoksa null (filtre uygulanmaz). */
export function productSearch(q: string): { where: SQL; score: SQL } | null {
  const tokens = tokenize(q);
  if (!tokens.length) return null;
  const conds: SQL[] = [];
  const scores: SQL[] = [];
  for (const t of tokens) {
    const alts = [t, ...(SYN[t] ?? [])];
    const fuzzy = t.length >= 4 ? sql` or word_similarity(${t}, ${nameDoc}) >= ${t.length >= 6 ? 0.45 : 0.6}` : sql``;
    const likes = sql.join(alts.map((a) => sql`${doc} like ${"%" + a + "%"}`), sql` or `);
    conds.push(sql`(${likes}${fuzzy} or arena_norm(coalesce(${products.shortDescription}, '')) like ${"%" + t + "%"})`);
    scores.push(sql`(case when ${nameDoc} like ${"%" + t + "%"} then 1.0 when ${doc} like ${"%" + t + "%"} then 0.7 else word_similarity(${t}, ${nameDoc}) * 0.8 end)`);
    scores.push(sql`(case when ${catDoc} like ${"%" + t + "%"} then 0.6 else 0 end)`);
  }
  const full = trNorm(q).trim();
  return {
    where: and(...conds)!,
    score: sql`(${sql.join(scores, sql` + `)} + (case when arena_norm(${products.name}) like ${full + "%"} then 1 else 0 end) + (case when ${products.stock} > 0 then 0.2 else 0 end))`,
  };
}

/** Arama kutusundaki anlık öneriler: ürün, kategori, marka, rehber. */
export async function suggest(q: string) {
  const s = productSearch(q);
  const n = trNorm(q).trim();
  if (!s || n.length < 2) return { products: [], total: 0, categories: [], brands: [], posts: [] };
  const like = `%${tokenize(q)[0]}%`;
  const [prods, cats, brs, ps] = await Promise.all([
    db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        price: products.price,
        compareAtPrice: products.compareAtPrice,
        stock: products.stock,
        allowBackorder: products.allowBackorder,
        brand: brands.name,
        image: sql<string | null>`(select url from product_images pi where pi.product_id = ${qc(products.id)} order by pi.sort_order limit 1)`,
        total: sql<number>`(count(*) over ())::int`,
      })
      .from(products)
      .leftJoin(brands, eq(brands.id, products.brandId))
      .where(and(eq(products.status, "ACTIVE"), s.where))
      .orderBy(desc(s.score))
      .limit(6),
    db.select({ name: categories.name, slug: categories.slug }).from(categories).where(and(eq(categories.isActive, true), sql`arena_norm(${categories.name} || ' ' || coalesce(${categories.shortText}, '')) like ${like}`)).limit(3),
    db.select({ name: brands.name, slug: brands.slug }).from(brands).where(and(eq(brands.isActive, true), sql`(arena_norm(${brands.name}) like ${like} or word_similarity(${n}, arena_norm(${brands.name})) >= 0.5)`)).limit(3),
    db.select({ title: posts.title, slug: posts.slug }).from(posts).where(and(eq(posts.status, "PUBLISHED"), sql`${posts.publishedAt} <= now()`, sql`arena_norm(${posts.title}) like ${like}`)).limit(2),
  ]);
  return { products: prods.map(({ total: _t, ...p }) => p), total: prods[0]?.total ?? 0, categories: cats, brands: brs, posts: ps };
}

export async function logSearch(q: string, results: number) {
  const term = trNorm(q).replace(/\s+/g, " ").trim().slice(0, 80);
  if (term.length < 2) return;
  try {
    await db
      .insert(searchQueries)
      .values({ term, results })
      .onConflictDoUpdate({ target: searchQueries.term, set: { count: sql`${searchQueries.count} + 1`, results, lastAt: new Date() } });
  } catch {}
}

export async function popularSearches(limit = 6) {
  return db.select({ term: searchQueries.term }).from(searchQueries).where(sql`${searchQueries.results} > 0 and ${searchQueries.count} >= 3`).orderBy(desc(searchQueries.count)).limit(limit);
}
