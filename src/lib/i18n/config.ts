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

/**
 * İngilizce adreslerin bölüm adları: /urun/x → /en/product/x. Sayfalar Türkçe klasörlerde durur;
 * middleware İngilizce adı Türkçeye çevirip aynı sayfayı çalıştırır.
 */
export const SEGMENTS_EN: Record<string, string> = {
  urun: "product",
  urunler: "products",
  kategori: "category",
  kategoriler: "categories",
  marka: "brand",
  markalar: "brands",
  ara: "search",
  sepet: "cart",
  odeme: "checkout",
  sayfa: "page",
  kampanyalar: "deals",
  karsilastir: "compare",
  favoriler: "favorites",
  sihirbaz: "finder",
  iletisim: "contact",
  sss: "faq",
  sozluk: "glossary",
  "seri-no": "serial-check",
  servis: "service",
  "siparis-takip": "order-tracking",
  siparis: "order",
  hesabim: "account",
  giris: "login",
  kayit: "register",
  "sifremi-unuttum": "forgot-password",
  "sifre-yenile": "reset-password",
  "eposta-dogrula": "verify-email",
  bulten: "newsletter",
};
/** İkinci düzey sabit bölümler */
const SUB_EN: Record<string, string> = { "bulten/cikis": "unsubscribe", "odeme/simulasyon": "simulation" };
const SEGMENTS_TR = Object.fromEntries(Object.entries(SEGMENTS_EN).map(([a, b]) => [b, a]));
const SUB_TR = Object.fromEntries(Object.entries(SUB_EN).map(([k, v]) => [`${SEGMENTS_EN[k.split("/")[0]]}/${v}`, k.split("/")[1]]));

/** Kayıt slug'larının İngilizcesi: { "urun/eqx-11-baslik": "eqx-11-coil" } (kaynak: translations, alan "slug") */
export type SlugMap = Record<string, string>;
let ACTIVE: SlugMap = {};
/** İstemcide I18nProvider, sunucuda getSlugMap() sonrası çağrılır; localePath varsayılan olarak bunu kullanır. */
export function setSlugMap(m: SlugMap) {
  ACTIVE = m;
}

/** Ön eki olmayan iç (Türkçe) adres → o dildeki adres. Dış bağlantılar, /api, /admin ve # dokunulmaz. */
export function localePath(href: string, locale: Locale, slugs: SlugMap = ACTIVE): string {
  if (locale === DEFAULT_LOCALE) return href;
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  if (/^\/(api|admin|_next|media|demo|brand|fonts)(\/|$)/.test(href)) return href;
  if (href === `/${locale}` || href.startsWith(`/${locale}/`) || href.startsWith(`/${locale}?`)) return href;
  const m = href.match(/^([^?#]*)(.*)$/)!;
  const [, path, rest] = m;
  if (path === "/" || path === "") return `/${locale}${rest}`;
  const parts = path.split("/");
  const seg = parts[1];
  if (locale === "en") {
    if (parts[2] && SUB_EN[`${seg}/${parts[2]}`]) parts[2] = SUB_EN[`${seg}/${parts[2]}`];
    else if (parts[2] && slugs[`${seg}/${parts[2]}`]) parts[2] = slugs[`${seg}/${parts[2]}`];
    if (SEGMENTS_EN[seg]) parts[1] = SEGMENTS_EN[seg];
  }
  return `/${locale}${parts.join("/")}${rest}`;
}

/** Dil adresinin bölüm adlarını Türkçe klasör adına çevirir: /product/x → /urun/x (slug'a dokunmaz). */
export function internalPath(path: string, locale: Locale): string {
  if (locale !== "en") return path;
  const parts = path.split("/");
  const sub = parts[2] ? SUB_TR[`${parts[1]}/${parts[2]}`] : undefined;
  if (sub) parts[2] = sub;
  if (SEGMENTS_TR[parts[1]]) parts[1] = SEGMENTS_TR[parts[1]];
  return parts.join("/");
}

/** İngilizce adreste Türkçe bölüm adı kullanılmış mı (/en/urun/x)? Kalıcı yönlendirme için. */
export function hasLegacySegment(path: string, locale: Locale): boolean {
  if (locale !== "en") return false;
  const seg = path.split("/")[1];
  return !!SEGMENTS_EN[seg] && SEGMENTS_EN[seg] !== seg;
}

/** İç adresteki İngilizce slug'ı Türkçeye çevirir (hreflang ve dil seçici Türkçe karşılığı bulsun) */
export function trInternalPath(path: string, slugs: SlugMap = ACTIVE): string {
  const parts = path.split("/");
  if (parts[2]) for (const [k, v] of Object.entries(slugs)) if (v === parts[2] && k.startsWith(`${parts[1]}/`)) parts[2] = k.slice(parts[1].length + 1);
  return parts.join("/");
}

/** /en/urun/x → { locale: "en", path: "/urun/x" } */
export function splitLocale(pathname: string): { locale: Locale; path: string } {
  const m = pathname.match(/^\/([a-z]{2})(\/.*)?$/);
  if (m && isLocale(m[1]) && m[1] !== DEFAULT_LOCALE) return { locale: m[1], path: m[2] || "/" };
  return { locale: DEFAULT_LOCALE, path: pathname };
}
