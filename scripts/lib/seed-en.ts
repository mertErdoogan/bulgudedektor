/* Demo İngilizce içeriğini translations tablosuna yazar. Var olan çeviriyi günceller, eşleşmeyen kaydı atlar. */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../../src/db";
import * as t from "../../src/db/schema";
import { EN_BANNERS, EN_BRANDS, EN_CAMPAIGNS, EN_CATEGORIES, EN_FAQS, EN_FAQ_GROUPS, EN_MENU, EN_PAGES, EN_PRODUCTS, EN_SECTIONS, EN_TEXTS } from "./en-content";

type Row = { entity: string; entityId: string; locale: string; field: string; value: string };

export async function seedEnglish() {
  const rows: Row[] = [];
  const add = (entity: string, entityId: string, fields: Record<string, unknown>) => {
    for (const [field, v] of Object.entries(fields)) {
      if (v === undefined || v === null || v === "") continue;
      rows.push({ entity, entityId, locale: "en", field, value: typeof v === "string" ? v : JSON.stringify(v) });
    }
  };

  for (const p of await db.select({ id: t.products.id, slug: t.products.slug }).from(t.products)) {
    const e = EN_PRODUCTS[p.slug];
    if (e) add("product", p.id, e);
  }
  for (const c of await db.select({ id: t.categories.id, slug: t.categories.slug }).from(t.categories)) {
    const e = EN_CATEGORIES[c.slug];
    if (e) add("category", c.id, e);
  }
  for (const b of await db.select({ id: t.brands.id, slug: t.brands.slug }).from(t.brands)) {
    if (EN_BRANDS[b.slug]) add("brand", b.id, { description: EN_BRANDS[b.slug] });
  }
  for (const m of await db.select({ id: t.menuItems.id, label: t.menuItems.label }).from(t.menuItems)) {
    if (EN_MENU[m.label]) add("menu", m.id, { label: EN_MENU[m.label] });
  }
  for (const p of await db.select({ id: t.pages.id, slug: t.pages.slug }).from(t.pages)) {
    if (EN_PAGES[p.slug]) add("page", p.id, EN_PAGES[p.slug]);
  }
  for (const f of await db.select({ id: t.faqs.id, question: t.faqs.question, group: t.faqs.group }).from(t.faqs)) {
    const e = EN_FAQS[f.question];
    if (e) add("faq", f.id, { question: e[0], answer: e[1], group: EN_FAQ_GROUPS[f.group] });
  }
  for (const s of await db.select({ id: t.homeSections.id, title: t.homeSections.title }).from(t.homeSections)) {
    const e = s.title ? EN_SECTIONS[s.title] : undefined;
    if (e) add("section", s.id, { title: e[0], subtitle: e[1] });
  }
  for (const b of await db.select({ id: t.banners.id, title: t.banners.title }).from(t.banners)) {
    const e = b.title ? EN_BANNERS[b.title] : undefined;
    if (e) add("banner", b.id, e);
  }
  for (const c of await db.select({ id: t.campaigns.id, name: t.campaigns.name }).from(t.campaigns)) {
    const e = EN_CAMPAIGNS[c.name];
    if (e) add("campaign", c.id, { name: e[0], description: e[1] });
  }
  for (const [k, v] of Object.entries(EN_TEXTS)) add("text", k, { value: v });

  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    await db
      .insert(t.translations)
      .values(chunk)
      .onConflictDoUpdate({ target: [t.translations.entity, t.translations.entityId, t.translations.locale, t.translations.field], set: { value: sqlExcluded(), updatedAt: new Date() } });
  }
  return rows.length;
}

const sqlExcluded = () => sql`excluded.value`;

if (process.argv[1]?.endsWith("seed-en.ts")) {
  seedEnglish()
    .then((n) => {
      console.log(`${n} İngilizce çeviri yazıldı.`);
      process.exit(0);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
