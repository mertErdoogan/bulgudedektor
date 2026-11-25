import { setNiche } from "./dict";
import { headers } from "next/headers";
import { DEFAULT_LOCALE, isLocale, localePath, setSlugMap, trInternalPath, type Locale } from "./config";
import { getSlugMap } from "./slugs";
import { translate, type DictKey } from "./dict";

/** İsteğin dili: middleware /en/... adreslerinde x-locale başlığını koyar; yoksa Türkçe. */
export async function getLocale(): Promise<Locale> {
  try {
    const v = (await headers()).get("x-locale");
    return isLocale(v) ? v : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE; // istek dışı (derleme, cron) çağrılar
  }
}

/** İsteğin Türkçe iç adresi (ör. /en/product/eqx-11-coil → /urun/eqx-11-baslik); hreflang ve dil seçici bunu kullanır */
export async function getPathname(): Promise<string> {
  let p = "/";
  try {
    p = (await headers()).get("x-pathname") ?? "/";
  } catch {
    return "/";
  }
  // Slug haritası her istekte hazır olsun: hreflang, dil seçici ve sunucudaki localePath çağrıları kullanır
  const map = await getSlugMap();
  setSlugMap(map);
  return (await getLocale()) === DEFAULT_LOCALE ? p : trInternalPath(p, map);
}

export async function getT() {
  const locale = await getLocale();
  await syncNiche();
  return Object.assign((key: DictKey, vars?: Record<string, string | number>) => translate(locale, key, vars), { locale });
}

/**
 * [slug] sayfaları için: İngilizce slug'ı Türkçe kayda çevirir; İngilizce adreste Türkçe slug kullanılmışsa
 * İngilizce adrese yönlendirme önerir. Türkçede slug olduğu gibi döner.
 */
export async function resolveLocaleSlug(seg: "urun" | "kategori" | "sayfa", slug: string): Promise<{ slug: string; redirect?: string }> {
  if ((await getLocale()) !== "en") return { slug };
  const map = await getSlugMap();
  const en = map[`${seg}/${slug}`];
  if (en && en !== slug) return { slug, redirect: localePath(`/${seg}/${slug}`, "en", map) };
  const hit = Object.entries(map).find(([k, v]) => v === slug && k.startsWith(`${seg}/`));
  return { slug: hit ? hit[0].slice(seg.length + 1) : slug };
}

/** Sunucu yönlendirmesi, isteğin dilinde: /giris → /en/login */
export async function localRedirect(path: string): Promise<never> {
  const { redirect } = await import("next/navigation");
  return redirect(localePath(path, await getLocale()));
}

/** Tek seferlik metinler için: L("Türkçe", "English") isteğin dilindekini döner */
export async function getL() {
  const l = await getLocale();
  return Object.assign((tr: string, en: string) => (l === "en" ? en : tr), { locale: l });
}

/** Sunucuda ürün türü adlarını ayarlardan yükler (her istekte; ayarlar istek başına önbellekte) */
export async function syncNiche() {
  const { getSettings } = await import("@/lib/settings");
  const c = (await getSettings()).catalog;
  setNiche({ one: c.nounOne, acc: c.nounAcc, many: c.nounMany, oneEn: c.nounOneEn, manyEn: c.nounManyEn });
}
