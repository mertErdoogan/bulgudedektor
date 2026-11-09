import type { Metadata } from "next";
import type { AllSettings } from "./settings";

/**
 * SEO + GEO (AI arama motorları) yardımcıları.
 * Tüm JSON-LD'ler @id ile birbirine bağlanır: Organization ⇄ WebSite ⇄ Store ⇄ Product/Article.
 * Böylece Google AI Overviews, ChatGPT Search, Perplexity ve Claude aynı varlığı (entity) tek parça görür.
 */

export const siteUrl = () => (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
export const abs = (path?: string | null) => (!path ? undefined : /^https?:\/\//.test(path) ? path : `${siteUrl()}${path.startsWith("/") ? "" : "/"}${path}`);
export const isPublicHost = () => !/localhost|127\.0\.0\.1|\.local\b|\.test\b/.test(siteUrl());

export const ORG_ID = () => `${siteUrl()}/#organization`;
export const SITE_ID = () => `${siteUrl()}/#website`;
export const STORE_ID = () => `${siteUrl()}/#store`;

/** "[ŞİRKET UNVANI]" gibi doldurulmamış yer tutucuları boş say. */
export const isPlaceholder = (v: unknown) => typeof v === "string" && /^\[.*\]$/.test(v.trim());
export const real = (v: string | null | undefined) => (v && !isPlaceholder(v) ? v : "");
const clean = <T,>(o: T): T => JSON.parse(JSON.stringify(o, (_, v) => (v === "" || v === null || isPlaceholder(v) || (Array.isArray(v) && v.length === 0) ? undefined : v)));

export function sameAs(s: AllSettings) {
  const st = s.store;
  return [st.instagram, st.youtube, st.facebook, st.tiktok, st.x, st.linkedin, st.googleBusinessUrl, st.sikayetvarUrl].filter(Boolean);
}

/** Sayfa başına metadata: canonical, Open Graph, Twitter. */
export function pageMeta(o: { title?: string; description?: string | null; path: string; image?: string | null; type?: "website" | "article"; noindex?: boolean; publishedTime?: Date | null; modifiedTime?: Date | null; absoluteTitle?: boolean }): Metadata {
  const url = abs(o.path)!;
  const images = o.image ? [{ url: abs(o.image)!, width: 1200, height: 630 }] : undefined;
  return {
    ...(o.title ? { title: o.absoluteTitle ? { absolute: o.title } : o.title } : {}),
    ...(o.description ? { description: o.description.slice(0, 300) } : {}),
    alternates: { canonical: url },
    openGraph: {
      type: o.type ?? "website",
      url,
      locale: "tr_TR",
      ...(o.title ? { title: o.title } : {}),
      ...(o.description ? { description: o.description.slice(0, 300) } : {}),
      ...(images ? { images } : {}),
      ...(o.type === "article" && o.publishedTime ? { publishedTime: o.publishedTime.toISOString(), modifiedTime: (o.modifiedTime ?? o.publishedTime).toISOString() } : {}),
    },
    twitter: { card: "summary_large_image", ...(o.title ? { title: o.title } : {}), ...(o.description ? { description: o.description.slice(0, 200) } : {}), ...(images ? { images: images.map((i) => i.url) } : {}) },
    ...(o.noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

export function organizationLd(s: AllSettings) {
  const st = s.store;
  return clean({
    "@type": "Organization",
    "@id": ORG_ID(),
    name: st.name,
    legalName: st.legalName,
    url: siteUrl(),
    logo: { "@type": "ImageObject", url: abs("/icon.svg") },
    email: st.email,
    telephone: st.phone,
    foundingDate: st.foundingYear,
    taxID: st.taxNumber,
    description: s.seo.aboutForAi || s.seo.description,
    sameAs: sameAs(s),
    contactPoint: [
      { "@type": "ContactPoint", contactType: "customer service", telephone: st.phone, email: st.email, areaServed: "TR", availableLanguage: ["Turkish"] },
      ...(st.whatsapp ? [{ "@type": "ContactPoint", contactType: "sales", url: `https://wa.me/${st.whatsapp}`, areaServed: "TR", availableLanguage: ["Turkish"] }] : []),
    ],
    knowsAbout: ["Metal dedektörü", "Altın dedektörü", "Define arama cihazı", "Minelab", "Garrett", "Nokta", "XP Deus", "Pulse Induction", "VLF dedektör", "Çok frekanslı dedektör"],
  });
}

export function websiteLd(s: AllSettings) {
  return {
    "@type": "WebSite",
    "@id": SITE_ID(),
    url: siteUrl(),
    name: s.store.name,
    inLanguage: "tr-TR",
    publisher: { "@id": ORG_ID() },
    potentialAction: { "@type": "SearchAction", target: { "@type": "EntryPoint", urlTemplate: `${siteUrl()}/ara?q={search_term_string}` }, "query-input": "required name=search_term_string" },
  };
}

/** OSM biçimindeki "Mo-Fr 09:00-20:00, Sa 10:00-18:00" → OpeningHoursSpecification */
function openingSpec(src: string) {
  const D: Record<string, string> = { Mo: "Monday", Tu: "Tuesday", We: "Wednesday", Th: "Thursday", Fr: "Friday", Sa: "Saturday", Su: "Sunday" };
  const order = Object.keys(D);
  const out: object[] = [];
  for (const part of src.split(",").map((x) => x.trim()).filter(Boolean)) {
    const m = part.match(/^([A-Z][a-z])(?:-([A-Z][a-z]))?\s+(\d{2}:\d{2})-(\d{2}:\d{2})$/);
    if (!m) continue;
    const a = order.indexOf(m[1]);
    const b = m[2] ? order.indexOf(m[2]) : a;
    if (a < 0 || b < 0) continue;
    out.push({ "@type": "OpeningHoursSpecification", dayOfWeek: order.slice(a, b + 1).map((d) => D[d]), opens: m[3], closes: m[4] });
  }
  return out;
}

export function storeLd(s: AllSettings) {
  const st = s.store;
  return clean({
    "@type": "Store",
    "@id": STORE_ID(),
    name: st.name,
    url: siteUrl(),
    image: abs(s.seo.ogImage),
    telephone: st.phone,
    email: st.email,
    priceRange: st.priceRange,
    parentOrganization: { "@id": ORG_ID() },
    address: real(st.address) ? { "@type": "PostalAddress", streetAddress: st.address, addressLocality: st.district || st.city, addressRegion: st.city, postalCode: st.postalCode, addressCountry: "TR" } : undefined,
    geo: st.latitude && st.longitude ? { "@type": "GeoCoordinates", latitude: Number(st.latitude), longitude: Number(st.longitude) } : undefined,
    hasMap: st.googleBusinessUrl,
    openingHoursSpecification: openingSpec(st.openingHours),
    paymentAccepted: ["Kredi kartı", "Banka kartı", ...(s.payment.transferEnabled ? ["Havale/EFT"] : [])],
    currenciesAccepted: "TRY",
    areaServed: { "@type": "Country", name: "Türkiye" },
  });
}

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Ana sayfa", path: "/" }, ...items].map((x, i) => ({ "@type": "ListItem", position: i + 1, name: x.name, item: abs(x.path) })),
  };
}

export function faqLd(list: { q: string; a: string }[]) {
  if (!list.length) return null;
  return {
    "@type": "FAQPage",
    mainEntity: list.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}

export function itemListLd(name: string, items: { slug: string; name: string; image?: string | null; price?: number }[]) {
  return {
    "@type": "ItemList",
    name,
    numberOfItems: items.length,
    itemListElement: items.slice(0, 30).map((p, i) => ({ "@type": "ListItem", position: i + 1, url: abs(`/urun/${p.slug}`), name: p.name })),
  };
}

type ProductInput = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  barcode: string | null;
  price: number;
  shortDescription: string | null;
  seoDescription: string | null;
  warrantyMonths: number;
  weightKg: number | null;
  stock: number;
  allowBackorder: boolean;
  status: string;
  updatedAt: Date;
  specs: { key: string; value: string }[];
  brand: { name: string; slug: string } | null;
  category: { name: string; slug: string } | null;
  images: { url: string; alt?: string | null }[];
  reviews: { name: string; rating: number; body: string; createdAt: Date }[];
};

export function productLd(p: ProductInput, s: AllSettings) {
  const out = p.status === "ARCHIVED" || (p.stock <= 0 && !p.allowBackorder);
  const rating = p.reviews.length ? p.reviews.reduce((a, r) => a + r.rating, 0) / p.reviews.length : null;
  const validUntil = new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString().slice(0, 10);
  const freeShip = s.shipping.flatRate === 0 || (s.shipping.freeThreshold > 0 && p.price >= s.shipping.freeThreshold);
  const url = abs(`/urun/${p.slug}`)!;
  return clean({
    "@type": "Product",
    "@id": `${url}#product`,
    name: p.brand && !p.name.toLowerCase().startsWith(p.brand.name.toLowerCase()) ? `${p.brand.name} ${p.name}` : p.name,
    url,
    sku: p.sku,
    mpn: p.sku,
    gtin: p.barcode && /^\d{8,14}$/.test(p.barcode) ? p.barcode : undefined,
    image: p.images.map((i) => abs(i.url)),
    description: p.seoDescription || p.shortDescription,
    brand: p.brand ? { "@type": "Brand", name: p.brand.name, url: abs(`/marka/${p.brand.slug}`) } : undefined,
    category: p.category ? `Metal dedektörü > ${p.category.name}` : "Metal dedektörü",
    weight: p.weightKg ? { "@type": "QuantitativeValue", value: p.weightKg, unitCode: "KGM" } : undefined,
    additionalProperty: p.specs.slice(0, 25).map((x) => ({ "@type": "PropertyValue", name: x.key, value: x.value })),
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "TRY",
      price: p.price.toFixed(2),
      priceValidUntil: validUntil,
      itemCondition: "https://schema.org/NewCondition",
      availability: out ? "https://schema.org/OutOfStock" : p.stock <= 0 ? "https://schema.org/BackOrder" : "https://schema.org/InStock",
      seller: { "@id": ORG_ID() },
      warranty: { "@type": "WarrantyPromise", durationOfWarranty: { "@type": "QuantitativeValue", value: p.warrantyMonths, unitCode: "MON" } },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: { "@type": "MonetaryAmount", value: freeShip ? 0 : s.shipping.flatRate, currency: "TRY" },
        shippingDestination: { "@type": "DefinedRegion", addressCountry: "TR" },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 1, unitCode: "DAY" },
          transitTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 3, unitCode: "DAY" },
        },
      },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "TR",
        returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: 14,
        returnMethod: "https://schema.org/ReturnByMail",
        returnFees: "https://schema.org/FreeReturn",
      },
    },
    ...(rating
      ? {
          aggregateRating: { "@type": "AggregateRating", ratingValue: rating.toFixed(1), reviewCount: p.reviews.length, bestRating: 5, worstRating: 1 },
          review: p.reviews.slice(0, 8).map((r) => ({
            "@type": "Review",
            author: { "@type": "Person", name: r.name },
            datePublished: r.createdAt.toISOString().slice(0, 10),
            reviewBody: r.body,
            reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
          })),
        }
      : {}),
  });
}

export function articleLd(post: { title: string; slug: string; excerpt: string | null; answer: string | null; coverImage: string | null; authorName: string; authorTitle: string | null; publishedAt: Date | null; updatedAt: Date; tags: string[]; category: string }, wordCount: number) {
  const url = abs(`/blog/${post.slug}`)!;
  return clean({
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    headline: post.title.slice(0, 110),
    description: post.excerpt || post.answer,
    abstract: post.answer,
    url,
    mainEntityOfPage: url,
    image: post.coverImage ? [abs(post.coverImage)] : undefined,
    inLanguage: "tr-TR",
    datePublished: (post.publishedAt ?? post.updatedAt).toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: { "@type": "Person", name: post.authorName, jobTitle: post.authorTitle, worksFor: { "@id": ORG_ID() } },
    publisher: { "@id": ORG_ID() },
    isPartOf: { "@id": SITE_ID() },
    articleSection: post.category,
    keywords: post.tags.join(", "),
    wordCount,
    speakable: { "@type": "SpeakableSpecification", cssSelector: [".answer-box", "h1"] },
  });
}

export function definedTermSetLd(terms: { id: string; question: string; answer: string }[]) {
  const url = abs("/sozluk")!;
  return {
    "@type": "DefinedTermSet",
    "@id": `${url}#terms`,
    name: "Metal dedektörü sözlüğü",
    url,
    hasDefinedTerm: terms.map((t) => ({ "@type": "DefinedTerm", name: t.question, description: t.answer, url: `${url}#${t.id}`, inDefinedTermSet: `${url}#terms` })),
  };
}

/** Birden çok şemayı tek @graph içinde döndür. */
export function graph(...nodes: (object | null | undefined | false)[]) {
  return { "@context": "https://schema.org", "@graph": nodes.filter(Boolean) };
}

export const wordCount = (s: string) => s.replace(/[#*>|`[\]()_-]/g, " ").split(/\s+/).filter(Boolean).length;
