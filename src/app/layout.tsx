import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { NavProgress } from "@/components/nav-progress";
import { siteUrl } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "Arena Dedektör", template: "%s · Arena Dedektör" },
  description: "Minelab, XP, Nokta, Garrett dedektör modelleri ve fiyatları. Orijinal, faturalı, garantili.",
  applicationName: "Arena Dedektör",
  formatDetection: { telephone: false },
  alternates: { types: { "application/rss+xml": "/blog/rss.xml" } },
};

export const viewport: Viewport = { themeColor: "#D42E1E", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <head>
        <link rel="preload" href="/fonts/public-sans-latin-wght-normal.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preload" href="/fonts/public-sans-latin-ext-wght-normal.woff2" as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body>
        <NavProgress />
        {children}
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
