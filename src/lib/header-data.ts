import { and, asc, eq, gte, isNull, or, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { campaigns } from "@/db/schema";
import { latestFocus } from "./merch";
import { getSettings } from "./settings";
import { localize } from "./i18n/content";
import { getLocale } from "./i18n/server";
import { DEFAULT_LOCALE, type Locale } from "./i18n/config";
import { categoryRail, getBrandGroups, getNav, type ProductCard } from "./store";

/** Menülerde gösterilen sade ürün kartı (önbelleğe JSON olarak girer; Date yok). */
export type NavCard = { id: string; name: string; slug: string; image: string | null; price: number; compareAtPrice: number | null; isNew: boolean; line: string | null };
export type CatMenu = { subs: { id: string; name: string; slug: string }[]; brands: { name: string; slug: string; logoUrl: string | null; count: number }[]; products: NavCard[] };
export type FocusMenu = {
  brand: { name: string; slug: string };
  total: number;
  series: { name: string; slug: string; count: number }[];
  models: NavCard[];
  promo: { eyebrow: string; title: string; href: string; image: string | null } | null;
};
export type HeaderData = { focus: FocusMenu | null; cats: Record<string, CatMenu> };

const card = (p: ProductCard): NavCard => ({
  id: p.id,
  name: p.name,
  slug: p.slug,
  image: p.image ?? null,
  price: p.price,
  compareAtPrice: p.compareAtPrice,
  isNew: (p.badges ?? []).includes("Yeni"),
  line: p.shortDescription,
});

async function build(_key: string): Promise<HeaderData> {
  const [s, nav, groups] = await Promise.all([getSettings(), getNav(), getBrandGroups()]);
  const m = s.merch;

  // Menüdeki /kategori/... öğeleri için açılır menü içeriği: alt kategoriler, markalar, öne çıkan 3 ürün
  const slugs = nav.menu.filter((i) => i.location === "HEADER").map((i) => /^\/kategori\/([^/?#]+)/.exec(i.url)?.[1]).filter((x): x is string => !!x);
  const cats: Record<string, CatMenu> = {};
  await Promise.all(
    slugs.map(async (slug) => {
      const c = nav.categories.find((x) => x.slug === slug);
      if (!c) return;
      const subs = nav.categories.filter((x) => x.parentId === c.id).map((x) => ({ id: x.id, name: x.name, slug: x.slug }));
      const brands = groups
        .map((g) => ({ name: g.name, slug: g.slug, logoUrl: g.logoUrl, count: g.categories.find((k) => k.slug === slug)?.count ?? 0 }))
        .filter((b) => b.count > 0);
      const products = (await categoryRail(c.id, 3)).map(card);
      cats[slug] = { subs, brands, products };
    }),
  );

  // Öncelikli marka (Minelab) menüsü
  let focus: FocusMenu | null = null;
  const g = m.focusBrand ? groups.find((x) => x.slug === m.focusBrand) : undefined;
  if (g) {
    const models = (await latestFocus(m, 6)).map(card);
    let promo: FocusMenu["promo"] = null;
    if (s.nav.promo.mode === "custom" && s.nav.promo.title) {
      promo = { eyebrow: s.nav.promo.eyebrow, title: s.nav.promo.title, href: s.nav.promo.href || "/kampanyalar", image: s.nav.promo.image || models[0]?.image || null };
    } else if (s.nav.promo.mode === "auto") {
      const now = new Date();
      const [c] = await db
        .select({ name: campaigns.name, description: campaigns.description, endsAt: campaigns.endsAt })
        .from(campaigns)
        .where(and(eq(campaigns.isActive, true), eq(campaigns.showOnSite, true), or(isNull(campaigns.startsAt), sql`${campaigns.startsAt} <= now()`), or(isNull(campaigns.endsAt), gte(campaigns.endsAt, now))))
        .orderBy(sql`${campaigns.endsAt} asc nulls last`, asc(campaigns.name))
        .limit(1);
      if (c) {
        const days = c.endsAt ? Math.ceil((new Date(c.endsAt).getTime() - now.getTime()) / 86400000) : null;
        promo = { eyebrow: days !== null && days <= 14 ? `SON ${days} GÜN` : "KAMPANYA", title: c.description || c.name, href: "/kampanyalar", image: models[0]?.image ?? null };
      }
    }
    focus = { brand: { name: g.name, slug: g.slug }, total: g.total, series: g.categories, models, promo };
  }
  return { focus, cats };
}

/**
 * Header menüleri her sayfada çizilir; veriyi 60 sn önbellekte tutar (sayfa açılışı hızlı kalsın).
 * Paneldeki kayıtlar revalidatePath("/", "layout") ile önbelleği hemen tazeler.
 */
const cached = unstable_cache(build, ["header-data-v3"], { revalidate: 60, tags: ["header"] });
/** Vitrin/menü kartı ayarları önbellek anahtarına girer: ayar değişince eski menü hiç gösterilmez. */
export async function getHeaderData(locale?: Locale): Promise<HeaderData> {
  const s = await getSettings();
  const hd = await cached(JSON.stringify([s.merch, s.nav.promo]));
  const l = locale ?? (await getLocale());
  if (l === DEFAULT_LOCALE) return hd;
  // Önbellekteki Türkçe menüyü isteğin diline çevir (ürün adları, kısa açıklama, alt kategoriler, kampanya etiketi)
  const allCards = [...(hd.focus?.models ?? []), ...Object.values(hd.cats).flatMap((c) => c.products)];
  const allSubs = Object.values(hd.cats).flatMap((c) => c.subs);
  const [lp, lc] = await Promise.all([
    localize(allCards.map((p) => ({ id: p.id, name: p.name, shortDescription: p.line })), "product", l),
    localize(allSubs, "category", l),
  ]);
  const pm = new Map(lp.map((p) => [p.id, p]));
  const cm = new Map(lc.map((c) => [c.id, c.name]));
  const tc = (p: NavCard): NavCard => ({ ...p, name: pm.get(p.id)?.name ?? p.name, line: pm.get(p.id)?.shortDescription ?? p.line });
  const eyebrow = (e: string) => e.replace(/^SON (\d+) GÜN$/, "LAST $1 DAYS").replace(/^KAMPANYA$/, "OFFER");
  return {
    focus: hd.focus ? { ...hd.focus, models: hd.focus.models.map(tc), promo: hd.focus.promo ? { ...hd.focus.promo, eyebrow: eyebrow(hd.focus.promo.eyebrow) } : null } : null,
    cats: Object.fromEntries(Object.entries(hd.cats).map(([k, c]) => [k, { ...c, subs: c.subs.map((x) => ({ ...x, name: cm.get(x.id) ?? x.name })), products: c.products.map(tc) }])),
  };
}
