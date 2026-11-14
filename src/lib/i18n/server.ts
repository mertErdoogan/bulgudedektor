import { headers } from "next/headers";
import { DEFAULT_LOCALE, isLocale, type Locale } from "./config";
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

/** İsteğin dilindeki ön eksiz adres (ör. /en/urun/x → /urun/x) */
export async function getPathname(): Promise<string> {
  try {
    return (await headers()).get("x-pathname") ?? "/";
  } catch {
    return "/";
  }
}

export async function getT() {
  const locale = await getLocale();
  return Object.assign((key: DictKey, vars?: Record<string, string | number>) => translate(locale, key, vars), { locale });
}
