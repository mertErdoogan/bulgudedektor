import { CartProvider } from "@/components/store/cart";
import { CompareBar, MobileTabBar } from "@/components/store/bits";
import { StoreFooter } from "@/components/store/footer";
import { ConsentAndAnalytics } from "@/components/store/consent";
import { StoreHeader } from "@/components/store/header";
import { JsonLd } from "@/components/seo/json-ld";
import { getSettings } from "@/lib/settings";
import { abs, graph, organizationLd, websiteLd } from "@/lib/seo";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const other: Record<string, string> = {};
  if (s.seo.yandexVerification) other["yandex-verification"] = s.seo.yandexVerification;
  if (s.seo.bingVerification) other["msvalidate.01"] = s.seo.bingVerification;
  return {
    title: { default: s.seo.title, template: `%s · ${s.store.name}` },
    description: s.seo.description,
    openGraph: { siteName: s.store.name, locale: "tr_TR", type: "website", images: s.seo.ogImage ? [{ url: abs(s.seo.ogImage)!, width: 1200, height: 630 }] : undefined },
    twitter: { card: "summary_large_image" },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
    verification: { google: s.seo.googleVerification || undefined, other },
  };
}

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  const ga = s.integrations.gaMeasurementId;
  const px = s.integrations.metaPixelId;
  return (
    <CartProvider>
      <JsonLd data={graph(organizationLd(s), websiteLd(s))} />
      <StoreHeader />
      <main className="min-h-[50vh]">{children}</main>
      <StoreFooter />
      <CompareBar />
      <MobileTabBar />
      <ConsentAndAnalytics ga={ga || undefined} px={px || undefined} />
    </CartProvider>
  );
}
