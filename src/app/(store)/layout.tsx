import Script from "next/script";
import { CartProvider } from "@/components/store/cart";
import { CompareBar, MobileTabBar } from "@/components/store/bits";
import { StoreFooter } from "@/components/store/footer";
import { StoreHeader } from "@/components/store/header";
import { getSettings } from "@/lib/settings";

export async function generateMetadata() {
  const s = await getSettings();
  return { title: { default: s.seo.title, template: `%s · ${s.store.name}` }, description: s.seo.description };
}

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  const ga = s.integrations.gaMeasurementId;
  const px = s.integrations.metaPixelId;
  return (
    <CartProvider>
      <StoreHeader />
      <main className="min-h-[50vh]">{children}</main>
      <StoreFooter />
      <CompareBar />
      <MobileTabBar />
      {ga ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga}`} strategy="afterInteractive" />
          <Script id="ga" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${ga.replace(/[^A-Z0-9-]/gi, "")}');`}</Script>
        </>
      ) : null}
      {px ? (
        <Script id="px" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${px.replace(/\D/g, "")}');fbq('track','PageView');`}</Script>
      ) : null}
    </CartProvider>
  );
}
