import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { siteUrl } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "Bulgu Dedektör", template: "%s · Bulgu Dedektör" },
  description: "Orijinal metal dedektörleri, uzman desteğiyle.",
  applicationName: "Bulgu Dedektör",
  formatDetection: { telephone: false },
  alternates: { types: { "application/rss+xml": "/blog/rss.xml" } },
};

export const viewport: Viewport = { themeColor: "#1F2421", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Archivo:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
