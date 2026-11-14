import { and, eq, inArray } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import { translations } from "@/db/schema";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "./config";
import { getLocale } from "./server";

export type Entity = "product" | "category" | "brand" | "page" | "menu";
/** Panelde çevrilebilen alanlar */
export const TRANSLATABLE: Record<Entity, string[]> = {
  product: ["name", "shortDescription", "description", "seoTitle", "seoDescription"],
  category: ["name", "shortText", "description", "seoTitle", "seoDescription", "seoContent"],
  brand: ["description"],
  page: ["title", "content"],
  menu: ["label"],
};

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
    for (const [f, v] of Object.entries(tr)) if (v && f in out) out[f] = v;
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
      const value = String(fd.get(key) ?? "").trim();
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
