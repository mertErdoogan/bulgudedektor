import { and, eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { categories, pages, products, translations } from "@/db/schema";
import { setSlugMap, type SlugMap } from "./config";

export const SLUG_TAG = "slug-map";

/**
 * İngilizce adreslerdeki kayıt slug'ları: { "urun/eqx-11-baslik": "eqx-11-coil" }.
 * Çevirisi olmayan kayıt Türkçe slug'ıyla yayınlanır (haritada yer almaz).
 */
const loadSlugMap = unstable_cache(
  async (): Promise<SlugMap> => {
    try {
      const out: SlugMap = {};
      const q = (entity: string) => and(eq(translations.entity, entity), eq(translations.locale, "en"), eq(translations.field, "slug"));
      const [p, c, s] = await Promise.all([
        db.select({ tr: products.slug, en: translations.value }).from(translations).innerJoin(products, eq(products.id, translations.entityId)).where(q("product")),
        db.select({ tr: categories.slug, en: translations.value }).from(translations).innerJoin(categories, eq(categories.id, translations.entityId)).where(q("category")),
        db.select({ tr: pages.slug, en: translations.value }).from(translations).innerJoin(pages, eq(pages.id, translations.entityId)).where(q("page")),
      ]);
      for (const r of p) out[`urun/${r.tr}`] = r.en;
      for (const r of c) out[`kategori/${r.tr}`] = r.en;
      for (const r of s) out[`sayfa/${r.tr}`] = r.en;
      return out;
    } catch {
      return {}; // derleme sırasında veritabanı yoksa
    }
  },
  ["slug-map-v1"],
  { tags: [SLUG_TAG], revalidate: 600 },
);

/** Haritayı döner ve sunucudaki localePath'in varsayılanı yapar (tüm istekler için aynı veri) */
export async function getSlugMap(): Promise<SlugMap> {
  const m = await loadSlugMap();
  setSlugMap(m);
  return m;
}

/** İngilizce slug → Türkçe slug (ör. kategori, "coins-and-relics" → "define-ve-sikke"); yoksa null */
export async function trSlugFor(seg: "urun" | "kategori" | "sayfa", enSlug: string) {
  const m = await getSlugMap();
  for (const [k, v] of Object.entries(m)) if (v === enSlug && k.startsWith(`${seg}/`)) return k.slice(seg.length + 1);
  return null;
}
