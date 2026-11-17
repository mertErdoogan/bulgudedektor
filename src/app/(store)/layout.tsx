import { RouteSkeleton } from "@/components/store/route-skeleton";
import { CartProvider } from "@/components/store/cart";
import { CompareBar, MobileTabBar } from "@/components/store/bits";
import { StoreFooter } from "@/components/store/footer";
import { ConsentAndAnalytics } from "@/components/store/consent";
import { Attribution } from "@/components/store/attribution";
import { StoreHeader } from "@/components/store/header";
import { JsonLd } from "@/components/seo/json-ld";
import { activeBrandNames, getSettings } from "@/lib/settings";
import { abs, graph, organizationLd, websiteLd } from "@/lib/seo";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DEFAULT_LOCALE, HTML_LANG, LOCALES, localePath } from "@/lib/i18n/config";
import { getLocale, getPathname } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const [s, locale] = await Promise.all([getSettings(), getLocale()]);
  const other: Record<string, string> = {};
  if (s.seo.yandexVerification) other["yandex-verification"] = s.seo.yandexVerification;
  if (s.seo.bingVerification) other["msvalidate.01"] = s.seo.bingVerification;
  return {
    title: { default: s.seo.title, template: `%s · ${s.store.name}` },
    description: s.seo.description,
    openGraph: { siteName: s.store.name, locale: locale === "en" ? "en_US" : "tr_TR", type: "website", images: [s.seo.ogImage ? { url: abs(s.seo.ogImage)! } : { url: abs("/og-default")!, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image" },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
    verification: { google: s.seo.googleVerification || undefined, other },
  };
}

// Mağaza sayfaları her istekte sunucuda üretilir (fiyat, stok, kampanya canlı). Ayrıca derleme sırasında
// veritabanı olmadığı için (Docker/Render derlemesi) hiçbir sayfa önceden üretilmeye çalışılmaz.
export const dynamic = "force-dynamic";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [s, locale, path] = await Promise.all([getSettings(), getLocale(), getPathname()]);
  // Kapalı bir dilin adresine gelindiyse (ör. İngilizce panelden kapatıldı) Türkçe karşılığına yönlendir
  if (locale !== DEFAULT_LOCALE && !s.i18n.locales.includes(locale)) redirect(path);
  const langs = LOCALES.filter((l) => l === DEFAULT_LOCALE || s.i18n.locales.includes(l));
  const { gaMeasurementId: ga, metaPixelId: px, googleAdsIds, adsPurchaseLabels, gtmId } = s.integrations;
  const list = (v: string) => (v || "").split(",").map((x) => x.trim()).filter(Boolean);
  return (
    <CartProvider>
      <JsonLd data={graph(organizationLd(s, await activeBrandNames()), websiteLd(s))} />
      {/* Dil alternatifleri (hreflang): her dilin karşılığı arama motoruna bildirilir */}
      {langs.length > 1 ? (
        <>
          {langs.map((l) => <link key={l} rel="alternate" hrefLang={HTML_LANG[l]} href={abs(localePath(path, l))} />)}
          <link rel="alternate" hrefLang="x-default" href={abs(path)} />
        </>
      ) : null}
      <StoreHeader />
      <main className="min-h-[50vh]">{children}</main>
      <RouteSkeleton />
      <StoreFooter />
      <CompareBar />
      <MobileTabBar />
      <ConsentAndAnalytics ga={ga || undefined} ads={list(googleAdsIds)} labels={list(adsPurchaseLabels)} gtm={gtmId || undefined} px={px || undefined} />
      <Attribution />
    </CartProvider>
  );
}
