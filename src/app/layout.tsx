import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { NavProgress } from "@/components/nav-progress";
import { FormValidation } from "@/components/form-validation";
import { I18nProvider } from "@/components/i18n";
import { getSlugMap } from "@/lib/i18n/slugs";
import { getLocale } from "@/lib/i18n/server";
import { HTML_LANG } from "@/lib/i18n/config";
import { siteUrl } from "@/lib/seo";
import { getSettings } from "@/lib/settings";
import { brandCss } from "@/lib/brand-color";
import { BrandProvider } from "@/components/brand";
import { setNiche } from "@/lib/i18n/dict";
import "./globals.css";

/* Mağaza adı, açıklama, ikon ve tema rengi ayarlardan gelir (Ayarlar > Mağaza / Marka / SEO) */
export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const name = s.store.name;
  const icon = s.brand.iconUrl || "/favicon-brand";
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: name, template: `%s · ${name}` },
    description: s.seo.description || undefined,
    applicationName: name,
    formatDetection: { telephone: false },
    icons: { icon, apple: icon },
    alternates: { types: { "application/rss+xml": "/blog/rss.xml" } },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const s = await getSettings();
  return { themeColor: s.brand.color, width: "device-width", initialScale: 1 };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const slugs = locale === "en" ? await getSlugMap() : undefined;
  const s = await getSettings();
  const c = s.catalog;
  const brand = { name: s.store.name, logoUrl: s.brand.logoUrl, logoWhiteUrl: s.brand.logoWhiteUrl, features: { wizard: c.wizard, glossary: c.glossary, serial: c.serial, service: c.service, detectorSpecs: c.detectorSpecs } };
  const niche = { one: c.nounOne, acc: c.nounAcc, many: c.nounMany, oneEn: c.nounOneEn, manyEn: c.nounManyEn };
  setNiche(niche);
  return (
    <html lang={HTML_LANG[locale]}>
      <head>
        <link rel="preload" href="/fonts/public-sans-latin-wght-normal.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preload" href="/fonts/public-sans-latin-ext-wght-normal.woff2" as="font" type="font/woff2" crossOrigin="" />
        {/* Ana renk ve türetilmiş tonlar (Ayarlar > Marka) */}
        <style id="brand-colors" dangerouslySetInnerHTML={{ __html: brandCss(s.brand.color) }} />
      </head>
      <body>
        <BrandProvider value={brand}>
        <I18nProvider locale={locale} slugs={slugs} niche={niche}>
          <NavProgress />
          <FormValidation />
          {children}
        </I18nProvider>
        </BrandProvider>
        <Toaster position="top-center" richColors closeButton />
        {process.env.PREPROD === "1" ? (
          <span className="pointer-events-none fixed top-0 left-1/2 z-[95] -translate-x-1/2 rounded-b-md bg-[#1d1d1f]/80 px-2.5 pt-px pb-0.5 text-[9px] leading-tight font-extrabold tracking-[.14em] text-white" aria-hidden>
            ÖN İZLEME
          </span>
        ) : null}
      </body>
    </html>
  );
}
