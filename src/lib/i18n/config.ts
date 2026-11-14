/**
 * Çok dil altyapısı. Türkçe varsayılan dildir ve adresleri ön eksizdir (/urun/x). Diğer diller adreste ön ekle
 * yayınlanır (/en/urun/x): middleware ön eki kaldırıp aynı sayfayı x-locale başlığıyla çalıştırır, böylece her dil
 * ayrı bir adreste durur ve arama motorları ayrı ayrı indeksler. Hangi dillerin açık olduğu admin > Ayarlar > Diller'den
 * yönetilir.
 */
export const LOCALES = ["tr", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "tr";
export const LOCALE_LABEL: Record<Locale, string> = { tr: "Türkçe", en: "English" };
export const LOCALE_SHORT: Record<Locale, string> = { tr: "TR", en: "EN" };
export const HTML_LANG: Record<Locale, string> = { tr: "tr-TR", en: "en" };

export const isLocale = (v: string | null | undefined): v is Locale => !!v && (LOCALES as readonly string[]).includes(v);

/** Ön eki olmayan iç adres → o dildeki adres. Dış bağlantılar, /api, /admin ve # dokunulmaz. */
export function localePath(href: string, locale: Locale): string {
  if (locale === DEFAULT_LOCALE) return href;
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  if (/^\/(api|admin|_next|media|demo|brand|fonts)(\/|$)/.test(href)) return href;
  if (href === `/${locale}` || href.startsWith(`/${locale}/`) || href.startsWith(`/${locale}?`)) return href;
  return href === "/" ? `/${locale}` : `/${locale}${href}`;
}

/** /en/urun/x → { locale: "en", path: "/urun/x" } */
export function splitLocale(pathname: string): { locale: Locale; path: string } {
  const m = pathname.match(/^\/([a-z]{2})(\/.*)?$/);
  if (m && isLocale(m[1]) && m[1] !== DEFAULT_LOCALE) return { locale: m[1], path: m[2] || "/" };
  return { locale: DEFAULT_LOCALE, path: pathname };
}
