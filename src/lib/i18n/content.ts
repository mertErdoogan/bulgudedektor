import { and, eq, inArray } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import { translations } from "@/db/schema";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "./config";
import { getLocale } from "./server";
import { revalidateTag } from "next/cache";
import { slugify } from "@/lib/utils";
import { SLUG_TAG } from "./slugs";

export type Entity = "product" | "category" | "brand" | "page" | "menu" | "faq" | "section" | "banner" | "campaign" | "bundle" | "text";
/** Panelde çevrilebilen alanlar */
export const TRANSLATABLE: Record<Entity, string[]> = {
  product: ["name", "slug", "shortDescription", "description", "seoTitle", "seoDescription"],
  category: ["name", "slug", "shortText", "description", "seoTitle", "seoDescription", "seoContent"],
  brand: ["description"],
  page: ["title", "slug", "content"],
  menu: ["label"],
  faq: ["question", "answer", "group"],
  section: ["title", "subtitle"],
  banner: ["title", "subtitle", "eyebrow", "ctaLabel"],
  campaign: ["name", "description"],
  bundle: ["name", "description"],
  text: ["value"],
};
/** Panelde düz metin olarak değil, JSON olarak saklanan liste alanları (teknik özellikler, kutu içeriği…) */
const JSON_FIELDS = new Set(["specs", "idealFor", "notFor", "boxContents", "useCases", "badges"]);

const load = cache(async (entity: Entity, locale: Locale, ids: string) => {
  const list = ids.split(",").filter(Boolean);
  if (!list.length) return new Map<string, Record<string, string>>();
  const rows = await db
    .select({ id: translations.entityId, field: translations.field, value: translations.value })
    .from(translations)
    .where(and(eq(translations.entity, entity), eq(translations.locale, locale), inArray(translations.entityId, list)));
  const m = new Map<string, Record<string, string>>();
  for (const r of rows) m.set(r.id, { ...(m.get(r.id) ?? {}), [r.field]: r.value });
  return m;
});

/**
 * Kayıtları isteğin diline çevirir: çevirisi olan alanlar değişir, olmayanlar Türkçe kalır.
 * Türkçe isteklerde hiçbir sorgu yapılmaz.
 */
export async function localize<T extends { id: string }>(rows: T[], entity: Entity, locale?: Locale): Promise<T[]> {
  const l = locale ?? (await getLocale());
  if (l === DEFAULT_LOCALE || !rows.length) return rows;
  const m = await load(entity, l, [...new Set(rows.map((r) => r.id))].sort().join(","));
  if (!m.size) return rows;
  return rows.map((r) => {
    const tr = m.get(r.id);
    if (!tr) return r;
    const out = { ...r } as Record<string, unknown>;
    for (const [f, v] of Object.entries(tr)) {
      // slug kaydın kimliğidir (filtre, bağlantı); İngilizce adres localePath ile üretilir
      if (!v || f === "slug" || !(f in out)) continue;
      if (JSON_FIELDS.has(f) || (out[f] !== null && typeof out[f] === "object")) {
        try {
          out[f] = JSON.parse(v);
        } catch {
          /* bozuk çeviri: Türkçe kalsın */
        }
      } else out[f] = v;
    }
    return out as T;
  });
}

export async function localizeOne<T extends { id: string }>(row: T, entity: Entity): Promise<T> {
  return (await localize([row], entity))[0];
}

/** Panel: bir kaydın tüm dillerdeki çevirileri { en: { name: "..." } } */
export async function getEntityTranslations(entity: Entity, entityId: string) {
  const rows = await db.select().from(translations).where(and(eq(translations.entity, entity), eq(translations.entityId, entityId)));
  const out: Record<string, Record<string, string>> = {};
  for (const r of rows) out[r.locale] = { ...(out[r.locale] ?? {}), [r.field]: r.value };
  return out;
}

/** Panel kaydı: formdaki tr_<dil>_<alan> alanlarını yazar; boş alan çeviriyi siler (Türkçeye döner). */
export async function saveEntityTranslations(entity: Entity, entityId: string, fd: FormData) {
  for (const locale of LOCALES) {
    if (locale === DEFAULT_LOCALE) continue;
    for (const field of TRANSLATABLE[entity]) {
      const key = `tr_${locale}_${field}`;
      if (!fd.has(key)) continue;
      const raw = String(fd.get(key) ?? "").trim();
      // Dil adresindeki slug: yalnız a-z, 0-9 ve tire
      const value = field === "slug" ? slugify(raw) : raw;
      if (field === "slug") revalidateTag(SLUG_TAG);
      const where = and(eq(translations.entity, entity), eq(translations.entityId, entityId), eq(translations.locale, locale), eq(translations.field, field));
      if (!value) await db.delete(translations).where(where);
      else
        await db
          .insert(translations)
          .values({ entity, entityId, locale, field, value })
          .onConflictDoUpdate({ target: [translations.entity, translations.entityId, translations.locale, translations.field], set: { value, updatedAt: new Date() } });
    }
  }
}

/** Ayarlardaki serbest metinlerin (duyuru şeridi, kayan şerit…) çevirisi: translations(entity="text", entityId=anahtar). */
export async function localizeText(key: string, value: string, locale?: Locale): Promise<string> {
  const l = locale ?? (await getLocale());
  if (l === DEFAULT_LOCALE || !value) return value;
  const m = await load("text", l, key);
  return m.get(key)?.value || value;
}
