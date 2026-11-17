import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { NavProgress } from "@/components/nav-progress";
import { FormValidation } from "@/components/form-validation";
import { I18nProvider } from "@/components/i18n";
import { getLocale } from "@/lib/i18n/server";
import { HTML_LANG } from "@/lib/i18n/config";
import { siteUrl } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "Arena Dedektör", template: "%s · Arena Dedektör" },
  description: "Metal dedektörü modelleri ve fiyatları. Orijinal, faturalı, garantili.",
  applicationName: "Arena Dedektör",
  formatDetection: { telephone: false },
  alternates: { types: { "application/rss+xml": "/blog/rss.xml" } },
};

export const viewport: Viewport = { themeColor: "#D42E1E", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={HTML_LANG[locale]}>
      <head>
        <link rel="preload" href="/fonts/public-sans-latin-wght-normal.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preload" href="/fonts/public-sans-latin-ext-wght-normal.woff2" as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body>
        <I18nProvider locale={locale}>
          <NavProgress />
          <FormValidation />
          {children}
        </I18nProvider>
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
