"use client";

import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useContext, useMemo, type ComponentProps } from "react";
import { DEFAULT_LOCALE, localePath, type Locale } from "@/lib/i18n/config";
import { translate, type DictKey } from "@/lib/i18n/dict";

const Ctx = createContext<Locale>(DEFAULT_LOCALE);

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <Ctx.Provider value={locale}>{children}</Ctx.Provider>;
}

export const useLocale = () => useContext(Ctx);

export function useT() {
  const locale = useLocale();
  return useMemo(() => Object.assign((key: DictKey, vars?: Record<string, string | number>) => translate(locale, key, vars), { locale }), [locale]);
}

/** Dil ön ekini otomatik ekleyen bağlantı: /urun/x, İngilizcede /en/urun/x olur. */
export function LocaleLink({ href, ...props }: ComponentProps<typeof NextLink>) {
  const locale = useLocale();
  const h = typeof href === "string" ? localePath(href, locale) : href && typeof href === "object" && typeof href.pathname === "string" ? { ...href, pathname: localePath(href.pathname, locale) } : href;
  return <NextLink href={h} {...props} />;
}

/** router.push/replace için dil ön eki */
export function useLocaleRouter() {
  const router = useRouter();
  const locale = useLocale();
  return useMemo(
    () => ({ ...router, push: (h: string, o?: Parameters<typeof router.push>[1]) => router.push(localePath(h, locale), o), replace: (h: string, o?: Parameters<typeof router.replace>[1]) => router.replace(localePath(h, locale), o) }),
    [router, locale],
  );
}

/** Hem sunucu hem istemci bileşeninde kullanılabilen çeviri: <T k="card.notify" /> */
export function T({ k, v }: { k: DictKey; v?: Record<string, string | number> }) {
  return <>{useT()(k, v)}</>;
}
