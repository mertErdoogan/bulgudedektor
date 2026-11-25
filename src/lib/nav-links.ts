/** Kurumsal/bilgi sayfaları: menüde alışveriş linklerinden ayrı, soluk durur. */
export const INFO_LINK = /^\/(sayfa\/|iletisim|sss|blog|servis|seri-no|sozluk)/;

/** Sektöre özel modül sayfaları (Ayarlar > Katalog). Modül kapalıysa bu adreslere giden menü/link gösterilmez. */
const FEATURE_ROUTES = [
  [/^\/sihirbaz(\/|\?|$)/, "wizard"],
  [/^\/sozluk(\/|\?|$)/, "glossary"],
  [/^\/seri-no(\/|\?|$)/, "serial"],
  [/^\/servis(\/|\?|$)/, "service"],
] as const;
export type FeatureFlags = { wizard: boolean; glossary: boolean; serial: boolean; service: boolean };
export function linkAllowed(href: string, f: FeatureFlags) {
  const hit = FEATURE_ROUTES.find(([re]) => re.test(href));
  return !hit || f[hit[1]];
}
