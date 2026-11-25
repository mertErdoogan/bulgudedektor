import { variantAxes } from "@/lib/variants";
import { IfFeature } from "@/components/brand";
import { fillNiche } from "@/lib/i18n/dict";
import { bundlesFor } from "@/lib/bundles";
import { BundleOffers } from "@/components/store/bundle-offer";
import { localePath } from "@/lib/i18n/config";
import { permanentRedirect } from "next/navigation";
import { resolveLocaleSlug } from "@/lib/i18n/server";
import { cardCtx } from "@/lib/card-ctx";
import { cardReady } from "@/lib/card-ready";
import Link from "@/components/locale-link";
import { getT, getLocale } from "@/lib/i18n/server";
import { localize, localizeOne } from "@/lib/i18n/content";
import { enumLabel } from "@/lib/i18n/dict";
import { Suspense } from "react";
import { redirectOrNotFound } from "@/lib/redirects";
import { and, asc, desc, eq, ne } from "drizzle-orm";
import { ShowroomCard } from "@/components/store/showroom-card";
import { Truck, BadgeCheck, Check, Cpu, CreditCard, Droplets, Headset, Info, Landmark, MessageCircle, PackageOpen, Phone, Play, RotateCcw, ShieldCheck, Star, ThumbsUp, UserRound, Weight, Wrench } from "lucide-react";
import { db } from "@/db";
import { productImages, productQuestions, products, reviews } from "@/db/schema";
import { ProductCard } from "@/components/store/product-card";
import { BuyBox, Gallery, ProductViewTracker, StickyBuy } from "@/components/store/product-client";
import { DeliveryLine, SocialProof } from "@/components/store/product-card";
import { PdpTabs } from "@/components/store/pdp-tabs";
import { autoDealFor } from "@/lib/pricing";
import { FavoriteButton } from "@/components/store/bits";
import { RecentlyViewed } from "@/components/store/rails";
import { productActivity } from "@/db/schema";
import { sql } from "drizzle-orm";
import { getSettings } from "@/lib/settings";
import { boughtTogether, similarTo } from "@/lib/recommend";
import { installmentTable } from "@/lib/iyzico";
import { InstallmentTable } from "@/components/store/installments";
import { markdownToHtml } from "@/lib/markdown";
import { TECH_LABEL, WATERPROOF_LABEL, formatDate, formatTL } from "@/lib/utils";
import { ProductForms } from "./forms";
import { AnswerBox, Breadcrumbs, FaqSection } from "@/components/seo/blocks";
import { JsonLd } from "@/components/seo/json-ld";
import { PostCards } from "@/components/store/post-cards";
import { getFaqs, relatedPosts, toQA } from "@/lib/content";
import { graph, metaDesc, pageMeta, productLd } from "@/lib/seo";
import type { AllSettings } from "@/lib/settings";
import type { Locale } from "@/lib/i18n/config";

async function getProduct(slug: string) {
  const p = await getProductRaw(slug);
  if (!p) return p;
  // İsteğin diline çevrilmiş ad/açıklama (çevirisi olmayan alan Türkçe kalır)
  const [lp, lc] = await Promise.all([localizeOne(p, "product"), p.category ? localizeOne(p.category, "category") : Promise.resolve(null)]);
  return { ...lp, category: lc };
}

async function getProductRaw(slug: string) {
  return db.query.products.findFirst({
    where: and(eq(products.slug, slug), ne(products.status, "DRAFT")),
    with: {
      images: { orderBy: asc(productImages.sortOrder) },
      brand: true,
      category: true,
      reviews: { where: eq(reviews.isApproved, true), orderBy: desc(reviews.createdAt) },
      questions: { where: eq(productQuestions.isPublished, true), orderBy: desc(productQuestions.createdAt) },
    },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const p = await getProduct((await resolveLocaleSlug("urun", (await params).slug)).slug);
  if (!p) return {};
  const full = fullName(p);
  const t = await getT();
  return pageMeta({
    title: p.seoTitle || t("pdp.metaTitle", { ad: full }),
    description: metaDesc([p.seoDescription, p.shortDescription], t("pdp.metaDesc", { ad: full, ay: p.warrantyMonths })),
    path: `/urun/${p.slug}`,
    image: p.images[0]?.url,
    noindex: p.status === "ARCHIVED",
  });
}

type P = NonNullable<Awaited<ReturnType<typeof getProduct>>>;
const WHO: Record<string, string> = { BEGINNER: "yeni başlayan", INTERMEDIATE: "deneyimli", PRO: "profesyonel" };
const WHO_EN: Record<string, string> = { BEGINNER: "beginner", INTERMEDIATE: "experienced", PRO: "professional" };
const fullName = (p: P) => (p.brand && !p.name.toLowerCase().startsWith(p.brand.name.toLowerCase()) ? `${p.brand.name} ${p.name}` : p.name);

/** Ürün verisinden kısa, doğrudan yanıt (AI özetleri için 40–60 kelime). */
function quickAnswer(p: P, s: AllSettings, locale: Locale) {
  if (locale === "en") return quickAnswerEn(p, s);
  const bits: string[] = [];
  const who = p.experience ? WHO[p.experience] : null;
  const uses = p.idealFor.slice(0, 2).map((x) => x.replace(/\.$/, "").toLocaleLowerCase("tr-TR"));
  bits.push(`${fullName(p)}, ${p.technology && p.technology !== "OTHER" ? `${TECH_LABEL[p.technology]} teknolojili ` : ""}${p.category ? `${p.category.name} kategorisinde ` : ""}bir ${fillNiche("{tür}")}${who ? ` ve ${who} kullanıcılar için uygundur` : ""}.`);
  if (uses.length) bits.push(`Öne çıktığı alanlar: ${uses.join(", ")}.`);
  const facts = [p.weightKg ? `${p.weightKg.toLocaleString("tr-TR")} kg` : null, p.waterproof ? WATERPROOF_LABEL[p.waterproof].toLocaleLowerCase("tr-TR") : null].filter(Boolean);
  if (facts.length) bits.push(`Ağırlığı ve su dayanımı: ${facts.join(", ")}.`);
  bits.push(`Fiyatı ${formatTL(p.price)}; faturalı, ${p.warrantyMonths} ay garantili${s.payment.noInterestInstallments > 1 ? `, ${s.payment.noInterestInstallments} ay vade farksız taksitle` : ""} satılır.`);
  return bits.join(" ");
}

/** Ürün verisinden otomatik SSS (yalnızca gerçek veriden; uydurma yok). */
function quickAnswerEn(p: P, s: AllSettings) {
  const bits: string[] = [];
  const who = p.experience ? WHO_EN[p.experience] : null;
  const tech = p.technology && p.technology !== "OTHER" ? `${enumLabel("en", "tech", p.technology).toLowerCase()} ` : "";
  bits.push(`The ${fullName(p)} is a ${tech}${p.category?.name.toLowerCase() ?? "metal"} detector${who ? ` suited to ${who} users` : ""}.`);
  const uses = p.idealFor.slice(0, 2).map((x) => x.replace(/\.$/, "").toLowerCase());
  if (uses.length) bits.push(`Best for: ${uses.join(", ")}.`);
  const facts = [p.weightKg ? `${p.weightKg.toLocaleString("en-US")} kg` : null, p.waterproof ? enumLabel("en", "water", p.waterproof).toLowerCase() : null].filter(Boolean);
  if (facts.length) bits.push(`Weight and water resistance: ${facts.join(", ")}.`);
  bits.push(`Price ${formatTL(p.price)}; sold with an invoice and a ${p.warrantyMonths}-month warranty${s.payment.noInterestInstallments > 1 ? `, with up to ${s.payment.noInterestInstallments} interest-free installments` : ""}.`);
  return bits.join(" ");
}

function autoFaqEn(p: P, s: AllSettings) {
  const n = fullName(p);
  const out: { q: string; a: string }[] = [];
  out.push({ q: `Is the ${n} genuine, and does it come with a warranty?`, a: `Yes. Every ${n} we sell is a genuine product with an invoice and a ${p.warrantyMonths}-month warranty.${p.trackSerial && s.catalog.serial ? " You can check the device's serial number on our Serial Number Check page." : ""}` });
  if (p.waterproof) out.push({ q: `Is the ${n} waterproof?`, a: `Water resistance of the ${n}: ${enumLabel("en", "water", p.waterproof)}.${p.waterproof === "NONE" ? " A rain cover is recommended in wet weather." : ""}` });
  if (p.weightKg) out.push({ q: `How much does the ${n} weigh?`, a: `The ${n} weighs about ${p.weightKg.toLocaleString("en-US")} kg.${p.weightKg <= 1.5 ? " It is in the lightweight class, comfortable for long hunts." : ""}` });
  if (p.experience) out.push({ q: `Is the ${n} good for beginners?`, a: p.experience === "BEGINNER" ? `Yes. With its simple menu and preset modes, the ${n} is well suited to beginners.` : `The ${n} is designed for ${WHO_EN[p.experience]} users. If you are just starting out, you can join our free setup training after purchase.` });
  if (s.payment.cardEnabled) out.push({ q: `Can I buy the ${n} in installments?`, a: `You can pay for the ${n} in up to ${s.payment.maxInstallment} credit card installments${s.payment.noInterestInstallments > 1 ? `; up to ${s.payment.noInterestInstallments} installments are interest-free` : ""}.${s.payment.transferEnabled && s.payment.transferDiscountPct ? ` Paying by bank transfer gives you a ${s.payment.transferDiscountPct}% discount.` : ""}` });
  out.push({ q: `When will the ${n} ship?`, a: p.sameDayShipping ? `If in stock, orders placed before ${s.shipping.sameDayCutoff} ship the same day; estimated delivery is ${s.shipping.deliveryEstimate.replace("iş günü", "business days")}.` : `Orders ship within 1–2 business days; estimated delivery is ${s.shipping.deliveryEstimate.replace("iş günü", "business days")}.` });
  return out;
}

function autoFaq(p: P, s: AllSettings, locale: Locale) {
  if (locale === "en") return autoFaqEn(p, s);
  const n = fullName(p);
  const out: { q: string; a: string }[] = [];
  out.push({ q: `${n} orijinal mi, garantisi var mı?`, a: `Evet. ${s.store.name} mağazasında satılan ${n} yetkili distribütör ürünüdür; faturalı ve ${p.warrantyMonths} ay garantilidir.${p.trackSerial && s.catalog.serial ? " Cihazın seri numarasını sitemizdeki Seri No Sorgula sayfasından kontrol edebilirsiniz." : ""}` });
  if (p.waterproof) out.push({ q: `${n} su geçirmez mi?`, a: `${n} için su dayanımı: ${WATERPROOF_LABEL[p.waterproof]}.${p.waterproof === "NONE" ? " Yağmurda koruyucu kılıf kullanılması önerilir." : ""}` });
  if (p.weightKg) out.push({ q: `${n} kaç kilo?`, a: `${n} yaklaşık ${p.weightKg.toLocaleString("tr-TR")} kg ağırlığındadır.${p.weightKg <= 1.5 ? " Uzun süreli aramalarda yormayan hafif sınıftadır." : ""}` });
  if (p.experience) out.push({ q: `${n} yeni başlayanlar için uygun mu?`, a: p.experience === "BEGINNER" ? `Evet, ${n} kolay menüsü ve hazır programlarıyla yeni başlayanlar için uygundur.` : `${n} ${WHO[p.experience]} kullanıcılar için tasarlanmıştır. Yeni başlıyorsanız satın alma sonrası ücretsiz kurulum eğitimimizden yararlanabilirsiniz.` });
  if (s.payment.cardEnabled) out.push({ q: `${n} taksitle alınabilir mi?`, a: `${n} kredi kartına ${s.payment.maxInstallment} taksite kadar alınabilir${s.payment.noInterestInstallments > 1 ? `; ${s.payment.noInterestInstallments} taksite kadar vade farkı yoktur` : ""}.${s.payment.transferEnabled && s.payment.transferDiscountPct ? ` Havale/EFT ile ödemede %${s.payment.transferDiscountPct} indirim uygulanır.` : ""}` });
  out.push({ q: `${n} ne zaman kargoya verilir?`, a: p.sameDayShipping ? `Stoktaysa saat ${s.shipping.sameDayCutoff}'e kadar verilen siparişler aynı gün kargoya verilir; tahmini teslim süresi ${s.shipping.deliveryEstimate}.` : `Siparişler 1–2 iş günü içinde kargoya verilir; tahmini teslim süresi ${s.shipping.deliveryEstimate}.` });
  return out;
}

function ytId(url: string | null) {
  if (!url) return null;
  const m = url.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{11})/);
  return m?.[1] ?? null;
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const r = await resolveLocaleSlug("urun", (await params).slug);
  if (r.redirect) permanentRedirect(r.redirect);
  const p = await getProduct(r.slug);
  if (!p) return redirectOrNotFound(`/urun/${r.slug}`);
  const raw = await getSettings();
  // Kart ödemesi çalışmıyorsa (anahtar yok) sayfada hiçbir taksit vaadi olmasın: özet, SSS, bilgi satırı, tablo
  const s: AllSettings = cardReady(raw) ? raw : { ...raw, payment: { ...raw.payment, cardEnabled: false, noInterestInstallments: 1 } };
  const t = await getT();
  const archived = p.status === "ARCHIVED";
  const out = archived || (p.stock <= 0 && !p.allowBackorder);
  const inst = s.payment.noInterestInstallments;
  const rating = p.reviews.length ? p.reviews.reduce((a, r) => a + r.rating, 0) / p.reviews.length : null;
  const wa = s.store.whatsapp ? `https://wa.me/${s.store.whatsapp}?text=${encodeURIComponent(t("pdp.waText", { ad: p.name }))}` : "/iletisim";
  const discount = p.compareAtPrice && p.compareAtPrice > p.price ? p.compareAtPrice - p.price : 0;
  const vid = ytId(p.videoUrl);
  const ctx = cardCtx(s, await getLocale());
  // Sayfanın üst kısmı için gerekenler tek seferde, paralel: ardışık bekleme (şelale) yok.
  // Benzer modeller, birlikte alınanlar ve rehberler aşağıda <Suspense> ile ayrıca akar: ürün, fiyat ve
  // sepete ekle butonu onları beklemeden ekrana gelir.
  const [variants, dbFaq, [act], deal, banks] = await Promise.all([
    p.variantGroup
      ? db
          .select({ id: products.id, slug: products.slug, name: products.name, label: products.variantLabel, price: products.price, stock: products.stock, allowBackorder: products.allowBackorder })
          .from(products)
          .where(and(eq(products.variantGroup, p.variantGroup), eq(products.status, "ACTIVE")))
          .orderBy(asc(products.price))
      : Promise.resolve([]),
    getFaqs({ productId: p.id }),
    db
      .select({ views24: sql<number>`coalesce(sum(${productActivity.views}),0)::int`, carts24: sql<number>`coalesce(sum(${productActivity.carts}),0)::int` })
      .from(productActivity)
      .where(and(eq(productActivity.productId, p.id), sql`${productActivity.hour} > now() - interval '24 hours'`)),
    // Otomatik kampanya sepette düşüyorsa ürün sayfasında da söyle: en güçlü satış argümanı saklı kalmasın
    out || archived ? Promise.resolve(null) : autoDealFor({ id: p.id, price: p.price, brandId: p.brandId, categoryId: p.categoryId }),
    s.payment.cardEnabled && s.payment.provider !== "paytr" && p.price >= 1000 ? installmentTable(p.price, s.payment.maxInstallment) : Promise.resolve(null),
  ]);
  // "Renk: Siyah / Beden: 42" biçimli varyant adlarında her boyut ayrı satırda seçilir
  const axes = variantAxes(variants, p.id);
  const faqItems = [...toQA(dbFaq), ...autoFaq(p, s, t.locale)];

  const rCount = p.reviews.length;
  const dist = [5, 4, 3, 2, 1].map((r) => ({ r, n: p.reviews.filter((x) => x.rating === r).length }));
  const warranty = p.warrantyMonths % 12 === 0 ? t("pdp.year", { n: p.warrantyMonths / 12 }) : t("pdp.month", { n: p.warrantyMonths });
  const facts = [
    p.technology ? { I: Cpu, k: t("pdp.factTech"), v: enumLabel(t.locale, "tech", p.technology) } : null,
    p.waterproof ? { I: Droplets, k: t("pdp.factWater"), v: enumLabel(t.locale, "water", p.waterproof) } : null,
    p.weightKg ? { I: Weight, k: t("pdp.factWeight"), v: `${p.weightKg.toLocaleString(t.locale === "en" ? "en-US" : "tr-TR")} kg` } : null,
    p.experience ? { I: UserRound, k: t("pdp.factFor"), v: enumLabel(t.locale, "exp", p.experience) } : null,
  ].filter(Boolean) as { I: typeof Cpu; k: string; v: string }[];
  const tabs = [
    { id: "genel", label: t("pdp.tabOverview") },
    { id: "ozellikler", label: t("pdp.tabSpecs"), count: p.specs.length || undefined },
    ...(vid ? [{ id: "video", label: t("pdp.tabVideo") }] : []),
    { id: "yorumlar", label: t("pdp.tabReviews"), count: rCount || undefined },
    { id: "sorular", label: t("pdp.tabQa"), count: p.questions.length || undefined },
    { id: "sss", label: t("pdp.tabFaq") },
    { id: "garanti", label: t("pdp.tabWarranty") },
  ];
  const h2 = "font-display text-[24px] leading-tight font-extrabold tracking-tight md:text-[30px]";
  // Bölümler kart: sekmeyle atlanan her bölüm kendi çerçevesinde, birbirinden net ayrılır
  const sec = "scroll-mt-40 rounded-[28px] border border-line bg-white p-5 shadow-[0_1px_0_rgba(20,20,22,.03)] md:p-8";
  const eyebrow = "inline-flex items-center rounded-full bg-soft px-2.5 py-1 text-[11px] font-extrabold tracking-[.14em] text-mute";

  return (
    <div className="container-x pt-4 pb-24 md:pb-10">
      <JsonLd data={graph(productLd(p, s, t.locale))} />
      <ProductViewTracker id={p.id} name={p.name} price={p.price} brand={p.brand?.name} />
      <Breadcrumbs items={[...(p.category ? [{ name: p.category.name, path: `/kategori/${p.category.slug}` }] : []), ...(p.brand ? [{ name: p.brand.name, path: `/marka/${p.brand.slug}` }] : []), { name: p.name, path: `/urun/${p.slug}` }]} />

      {/* ───────── Üst: galeri + satın alma ─────────
          Masaüstünde galeri yapışkan; sağ sütun sırası karar verdirecek şekilde: marka/puan → ad → öne çıkanlar →
          fiyat + butonlar (ilk ekranda) → güven. */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-10 xl:grid-cols-[minmax(0,1.04fr)_minmax(0,.96fr)]">
        <div className="md:sticky md:top-[84px] md:self-start">
          <Gallery images={p.images} name={p.name} badge={p.badges[0]} brand={p.brand?.name} discountPct={discount && p.compareAtPrice ? Math.round((discount / p.compareAtPrice) * 100) : 0} />
        </div>

        <div className="flex flex-col gap-4 md:gap-5">
          <div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              {p.brand ? <Link href={`/marka/${p.brand.slug}`} className="rounded-full bg-deep px-3 py-1 text-[11px] font-extrabold tracking-[.14em] text-white transition hover:bg-black">{p.brand.name.toLocaleUpperCase("en-US")}</Link> : null}
              {rating ? (
                <a href="#yorumlar" className="flex items-center gap-1.5 text-[13.5px] hover:underline">
                  <span className="flex">{Array.from({ length: 5 }, (_, i) => <Star key={i} size={14} className={i < Math.round(rating) ? "fill-gold text-gold" : "text-line"} />)}</span>
                  <b>{rating.toFixed(1)}</b> <span className="text-mute">· {t("pdp.reviews", { n: rCount })}</span>
                </a>
              ) : (
                <a href="#yorumlar" className="text-[13px] font-semibold text-mute hover:text-deep">{t("pdp.firstReview")}</a>
              )}
              <span className="ml-auto text-[12px] text-mute">{t("pdp.code")} {p.sku}</span>
            </div>
            <div className="mt-2.5 flex items-start justify-between gap-3">
              <h1 className="font-display text-[30px] leading-[1.05] font-extrabold tracking-tight md:text-[44px]">{p.name}</h1>
              <FavoriteButton productId={p.id} name={p.name} className="mt-1 shrink-0" />
            </div>
          </div>

          {/* Öne çıkanlar: fiyatın hemen üstünde, bir bakışta "bu cihaz ne" */}
          {facts.length ? (
            <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 xl:[grid-template-columns:repeat(var(--n),minmax(0,1fr))]" style={{ ["--n" as string]: facts.length }} data-testid="pdp-facts">
              {facts.map(({ I, k, v }) => (
                <span key={k} className="flex shrink-0 items-center gap-2.5 rounded-2xl border border-line bg-white py-2 pr-3.5 pl-2">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-soft text-deep"><I size={16} /></span>
                  <span className="flex min-w-0 flex-col leading-tight">
                    <span className="text-[10.5px] font-semibold text-mute md:text-[11px]">{k}</span>
                    <b className="text-[12.5px] md:text-[13.5px]">{v}</b>
                  </span>
                </span>
              ))}
            </div>
          ) : null}

          {axes ? (
            <div className="flex flex-col gap-3" data-testid="variant-axes">
              {axes.map((ax) => (
                <div key={ax.name}>
                  <p className="mb-2 text-[13px] font-bold">
                    {ax.name}: <span className="font-semibold text-mute">{ax.options.find((o) => o.current)?.value}</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {ax.options.map((o) => (
                      <Link
                        key={o.value}
                        href={o.href}
                        aria-current={o.current ? "true" : undefined}
                        title={o.available ? undefined : t("card.outOfStock")}
                        className={`min-w-11 rounded-xl border px-3 py-2 text-center text-sm font-bold transition ${o.current ? "border-deep bg-deep text-white" : "border-line hover:border-deep"} ${!o.available ? "text-mute line-through opacity-60" : ""} ${!o.exact && !o.current ? "border-dashed" : ""}`}
                      >
                        {o.value}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : variants.length > 1 ? (
            <div>
              <p className="mb-2 text-[13px] font-bold">{t("pdp.option")}</p>
              <div className="flex flex-wrap gap-2">
                {variants.map((v) => {
                  const cur = v.id === p.id;
                  const none = v.stock <= 0 && !v.allowBackorder;
                  return (
                    <Link key={v.id} href={`/urun/${v.slug}`} aria-current={cur ? "page" : undefined} className={`rounded-2xl border px-3.5 py-2 text-sm transition ${cur ? "border-deep bg-deep text-white" : "border-line hover:border-deep"} ${none ? "opacity-60" : ""}`}>
                      <span className="block leading-tight font-bold">{v.label || v.name}</span>
                      <span className={`text-xs ${cur ? "text-white/70" : "text-mute"}`}>{none ? t("card.outOfStock") : formatTL(v.price)}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Satın alma kartı. Sıra: durum → FİYAT → BUTONLAR (en önde) → bilgi satırları (her biri kendi ikonu ve
              etiketiyle, bir bakışta ne olduğu anlaşılsın) → rozet. */}
          <div className="rounded-[26px] border border-[#e2e2e6] bg-white p-5 shadow-[0_24px_50px_-34px_rgba(20,20,22,.4)] md:p-6" id="satin-al">
            {!archived ? (
              <div className="mb-3 flex flex-wrap items-center gap-2 text-[12.5px] font-bold">
                {out ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-danger-bg px-2.5 py-1 text-danger"><span className="h-1.5 w-1.5 rounded-full bg-danger" /> {t("card.outOfStock")}</span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-ok-bg px-2.5 py-1 text-ok" data-testid="pdp-stock">
                    <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-60" /><span className="relative h-1.5 w-1.5 rounded-full bg-ok" /></span>
                    {t("pdp.inStock")}{p.stock > 0 && p.stock <= 5 ? ` · ${t("pdp.lastN", { n: p.stock })}` : ""}
                  </span>
                )}
                {discount ? <span className="rounded-full bg-brand px-2.5 py-1 text-white">{t("pdp.discountPct", { n: Math.round((discount / (p.compareAtPrice || 1)) * 100) })}</span> : null}
              </div>
            ) : null}
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <strong className="font-display text-[38px] leading-none font-extrabold tracking-tight md:text-[48px]">{formatTL(p.price)}</strong>
              {discount ? <s className="text-[16px] text-mute">{formatTL(p.compareAtPrice)}</s> : null}
            </div>
            {deal ? (
              <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-2xl bg-ok-bg px-3.5 py-2.5 text-sm" data-testid="pdp-deal">
                <span className="font-semibold text-ok">{t("pdp.inCartPrice")}</span>
                <b className="font-display text-[20px] text-ok">{formatTL(Math.round((p.price - deal.amount) * 100) / 100)}</b>
                <span className="text-[#2f5d43]">· {t("pdp.dealAuto", { kampanya: deal.name, tutar: formatTL(deal.amount) })}</span>
              </p>
            ) : null}
            {archived ? (
              <p className="mt-4 rounded-xl bg-warn-bg p-3 text-sm font-bold text-warn">{t("pdp.archived")}</p>
            ) : out ? (
              <div className="mt-4 flex flex-col gap-2">
                <p className="text-sm"><b className="text-danger">{t("pdp.outNow")}</b> {t("pdp.notifyMe")}</p>
                <ProductForms productId={p.id} mode="alert" />
              </div>
            ) : (
              <div className="mt-5">
                <BuyBox productId={p.id} name={p.name} max={p.allowBackorder ? 99 : p.stock} disabled={out} amount={p.price} brand={p.brand?.name} />
              </div>
            )}

            {/* Bilgi satırları: renkli ikon + kısa etiket + değer; satırlar çizgiyle ayrık */}
            <dl className="mt-5 divide-y divide-line rounded-2xl border border-line" data-testid="pdp-info">
              {inst > 1 ? (
                <div className="flex items-center gap-3 px-3.5 py-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#eef3ff] text-[#2952cc]"><CreditCard size={17} /></span>
<div className="min-w-0 flex-1 md:flex md:items-center md:gap-3">
                  <dt className="text-[11.5px] font-semibold text-mute md:w-[74px] md:shrink-0 md:text-[12px]">{t("pdp.rowInstallment")}</dt>
                  <dd className="min-w-0 md:flex-1 text-[13.5px]"><b>{inst} × {formatTL(Math.round(p.price / inst))}</b> {t("pdp.instValue")} <a href="#garanti" className="block text-[12px] text-mute underline-offset-2 hover:underline">{t("pdp.instUpTo", { n: s.payment.maxInstallment })}</a></dd>
</div>
                </div>
              ) : null}
              {s.payment.transferEnabled && s.payment.transferDiscountPct ? (
                <div className="flex items-center gap-3 px-3.5 py-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ok-bg text-ok"><Landmark size={17} /></span>
<div className="min-w-0 flex-1 md:flex md:items-center md:gap-3">
                  <dt className="text-[11.5px] font-semibold text-mute md:w-[74px] md:shrink-0 md:text-[12px]">{t("pdp.rowTransfer")}</dt>
                  <dd className="min-w-0 md:flex-1 text-[13.5px]"><b>{t("pdp.transferValue", { n: s.payment.transferDiscountPct })}</b> <span className="text-mute">· {formatTL(p.price - Math.round((p.price * s.payment.transferDiscountPct) / 100))}</span></dd>
</div>
                </div>
              ) : null}
              {!archived && !out ? (
                <div className="flex items-center gap-3 px-3.5 py-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#fff4e5] text-[#b45309]"><Truck size={17} /></span>
<div className="min-w-0 flex-1 md:flex md:items-center md:gap-3">
                  <dt className="text-[11.5px] font-semibold text-mute md:w-[74px] md:shrink-0 md:text-[12px]">{t("pdp.rowDelivery")}</dt>
                  <dd className="pdp-delivery-plain min-w-0 md:flex-1 text-[13.5px]"><DeliveryLine p={p} ctx={ctx} pickup={s.shipping.pickupEnabled} /></dd>
</div>
                </div>
              ) : null}
              <div className="flex items-center gap-3 px-3.5 py-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-soft text-deep"><ShieldCheck size={17} /></span>
                <div className="min-w-0 flex-1 md:flex md:items-center md:gap-3">
                <dt className="text-[11.5px] font-semibold text-mute md:w-[74px] md:shrink-0 md:text-[12px]">{t("pdp.rowWarranty")}</dt>
                <dd className="min-w-0 text-[13.5px] md:flex-1">
                  {s.merch.badge && p.brand && p.brand.slug === s.merch.focusBrand ? (
                    <span className="inline-flex items-center gap-1.5 font-bold" data-testid="focus-badge"><BadgeCheck size={15} className="text-ok" /> {t("pdp.distWarranty", { sure: warranty })}</span>
                  ) : (
                    <b>{t("pdp.invoiced", { sure: warranty })}</b>
                  )}
                </dd>
                </div>
              </div>
            </dl>
            {act ? <SocialProof p={act} ctx={ctx} className="mt-3 justify-center text-[12px] font-medium text-mute" /> : null}
          </div>

          {/* Güven: dört renkli kutu; her biri kendi rengi ve hareketli ikonuyla, bir bakışta ayırt edilir */}
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4" data-testid="pdp-trust">
            {[
              { I: BadgeCheck, t: t("pdp.trustDist"), d: p.trackSerial && s.catalog.serial ? t("pdp.trustSerial") : t("pdp.trustOriginal"), href: p.trackSerial && s.catalog.serial ? "/seri-no" : undefined, c: "22,163,74" },
              { I: Truck, t: t("pdp.trustShip"), d: t("pdp.trustShipD"), c: "37,99,235" },
              { I: RotateCcw, t: t("pdp.trustReturn"), d: t("pdp.trustReturnD"), c: "217,119,6" },
              { I: Headset, t: t("pdp.trustExpert"), d: t("pdp.trustExpertD"), href: wa, c: "124,58,237" },
            ].map(({ I, t: title, d, href, c }) => {
              const body = (
                <>
                  <I aria-hidden size={64} strokeWidth={1.4} className="pointer-events-none absolute -right-3 -bottom-4 text-[rgba(var(--tc),.09)] transition duration-500 group-hover:-rotate-12 group-hover:scale-110" />
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[rgb(var(--tc))] text-white shadow-[0_8px_16px_-8px_rgba(var(--tc),.9)] transition duration-300 group-hover:-translate-y-0.5 group-hover:-rotate-6">
                    <I size={17} strokeWidth={2.2} />
                  </span>
                  <span className="relative min-w-0">
                    <b className="block truncate text-[12.5px] text-deep">{title}</b>
                    <span className="block truncate text-[11.5px] text-[rgb(var(--tc))]">{d}{href ? " →" : ""}</span>
                  </span>
                </>
              );
              const cls = "group relative isolate flex items-center gap-2.5 overflow-hidden rounded-2xl bg-[linear-gradient(135deg,rgba(var(--tc),.13),rgba(var(--tc),.03))] px-3 py-3 ring-1 ring-[rgba(var(--tc),.16)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_24px_-18px_rgba(var(--tc),.9)] lg:flex-col lg:items-start lg:gap-2.5";
              const st = { ["--tc" as string]: c } as React.CSSProperties;
              return href ? (
                <a key={title} href={href.startsWith("/") ? localePath(href, t.locale) : href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener" className={cls} style={st}>{body}</a>
              ) : (
                <div key={title} className={cls} style={st}>{body}</div>
              );
            })}
          </div>

          {t.locale === "tr" ? <ShowroomCard productName={p.name} onDisplay={p.onDisplay} st={s.store} /> : null}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span className="text-mute">{t("pdp.question")}</span>
            <a href={wa} target="_blank" className="inline-flex items-center gap-1.5 font-bold text-[#11643a] hover:underline"><MessageCircle size={17} /> {t("pdp.askWhatsapp")}</a>
            {s.store.phone ? <a href={`tel:${s.store.phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1.5 font-bold hover:underline"><Phone size={16} /> {s.store.phone}</a> : null}
          </div>
        </div>
      </div>

      {/* Paket (kombin): bu ürünle birlikte indirimli alınabilecek ürünler */}
      {!out ? (
        <Suspense fallback={null}>
          <BundleRail productId={p.id} />
        </Suspense>
      ) : null}

      {/* Benzer modeller üstte: karar aşamasındaki müşteri alternatifleri hemen görsün */}
      <Suspense fallback={null}>
        <SimilarRail p={p} ctx={ctx} />
      </Suspense>

      <PdpTabs tabs={tabs} product={{ id: p.id, name: p.name, price: formatTL(p.price), amount: p.price, image: p.images[0]?.url ?? null, brand: p.brand?.name, disabled: out }} />

      <div className="-mx-4 mt-6 flex flex-col gap-3 bg-[#f4f4f5] px-3 py-4 md:mx-auto md:mt-8 md:max-w-[1120px] md:gap-5 md:rounded-[36px] md:p-5">
        {/* ───────── Genel bakış ───────── */}
        <section id="genel" className={sec}>
          <span className={eyebrow}>{t("pdp.eyOverview")}</span>
          <h2 className={`${h2} mt-3`}>{t("pdp.whoFor", { ad: fullName(p) })}</h2>
          {p.shortDescription ? <p className="mt-2 max-w-3xl text-[16px] leading-relaxed text-[#52525b]">{p.shortDescription}</p> : null}
          <div className="mt-5">
            <AnswerBox title={t("pdp.whatIs", { ad: fullName(p) })} updated={formatDate(p.updatedAt, false, t.locale)}>{quickAnswer(p, s, t.locale)}</AnswerBox>
          </div>
          {p.idealFor.length || p.notFor.length ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {p.idealFor.length ? (
                <div className="rounded-[22px] border border-line bg-white p-5">
                  <b className="flex items-center gap-2 text-[15px]"><span className="grid h-8 w-8 place-items-center rounded-full bg-ok-bg text-ok"><ThumbsUp size={16} /></span> {t("pdp.idealFor")}</b>
                  <ul className="mt-3 flex flex-col gap-2.5 text-[14.5px]">{p.idealFor.map((x) => <li key={x} className="flex gap-2.5"><Check size={18} className="mt-0.5 shrink-0 text-ok" />{x}</li>)}</ul>
                </div>
              ) : null}
              {p.notFor.length ? (
                <div className="rounded-[22px] border border-[#f1e2c4] bg-[#fffbf2] p-5">
                  <b className="flex items-center gap-2 text-[15px]"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#fdefd0] text-[#8a5a00]"><Info size={16} /></span> {t("pdp.notFor")}</b>
                  <ul className="mt-3 flex flex-col gap-2.5 text-[14.5px] text-[#5c4a26]">{p.notFor.map((x) => <li key={x} className="flex gap-2.5"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c99a3a]" />{x}</li>)}</ul>
                  <IfFeature f="wizard"><Link href="/sihirbaz" className="mt-3 inline-block text-[13.5px] font-bold text-deep underline-offset-2 hover:underline">{t("pdp.otherJob")}</Link></IfFeature>
                </div>
              ) : null}
            </div>
          ) : null}
          {p.description ? <div className="prose-lite prose-article mt-6 max-w-3xl text-[15.5px]" dangerouslySetInnerHTML={{ __html: markdownToHtml(p.description) }} /> : null}
        </section>

        {/* ───────── Özellikler ───────── */}
        <section id="ozellikler" className={sec}>
          <span className={eyebrow}>{t("pdp.eySpecs")}</span>
          <h2 className={`${h2} mt-3`}>{t("pdp.specsTitle")}</h2>
          {p.specs.length ? (
            <dl className="mt-5 grid overflow-hidden rounded-[22px] border border-line md:grid-cols-2" data-testid="pdp-specs">
              {p.specs.map((x) => (
                <div key={x.key} className="flex items-baseline justify-between gap-4 border-b border-line px-5 py-3.5 text-[14.5px] odd:bg-[#fcfcfc] md:[&:nth-child(4n+3)]:bg-[#fcfcfc] md:[&:nth-child(4n+4)]:bg-[#fcfcfc] md:odd:bg-white md:[&:nth-last-child(-n+2)]:border-b-0 [&:last-child]:border-b-0">
                  <dt className="text-mute">{x.key}</dt>
                  <dd className="text-right font-semibold">{x.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-4 rounded-2xl bg-soft p-5 text-sm text-mute">{t("pdp.specsAsk1")} <a href={wa} target="_blank" className="font-bold text-deep underline">{t("pdp.specsAsk2")}</a>.</p>
          )}
          {p.boxContents.length ? (
            <div className="mt-6 rounded-[22px] bg-soft p-5">
              <b className="flex items-center gap-2 text-[15px]"><PackageOpen size={18} /> {t("pdp.inBox")}</b>
              <ul className="mt-3 flex flex-wrap gap-2">{p.boxContents.map((b) => <li key={b} className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[13.5px] font-semibold ring-1 ring-line"><Check size={14} className="text-ok" />{b}</li>)}</ul>
            </div>
          ) : null}
        </section>

        {vid ? (
          <section id="video" className={sec}>
            <span className={eyebrow}>{t("pdp.eyVideo")}</span>
            <h2 className={`${h2} mt-3 flex items-center gap-2`}><Play size={22} /> {t("pdp.videoTitle")}</h2>
            <div className="mt-5 aspect-video overflow-hidden rounded-[22px] bg-black">
              <iframe className="h-full w-full" src={`https://www.youtube-nocookie.com/embed/${vid}`} title={`${p.name} video`} loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            </div>
          </section>
        ) : null}

        {/* ───────── Yorumlar ───────── */}
        <section id="yorumlar" className={sec}>
          <span className={eyebrow}>{t("pdp.eyReviews")}</span>
          <h2 className={`${h2} mt-3`}>{t("pdp.reviewsTitle")}</h2>
          <div className="mt-5 grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
            <div className="flex flex-col rounded-[22px] bg-[linear-gradient(160deg,#fffaf0_0%,#ffffff_60%)] p-5 ring-1 ring-[#f1e6cf]">
              {rCount ? (
                <>
                  <span className="font-display text-[52px] leading-none font-black">{(rating ?? 0).toFixed(1)}</span>
                  <span className="mt-1 flex">{Array.from({ length: 5 }, (_, i) => <Star key={i} size={17} className={i < Math.round(rating ?? 0) ? "fill-gold text-gold" : "text-[#e5d9bd]"} />)}</span>
                  <span className="mt-1 text-[13px] text-mute">{t("pdp.reviews", { n: rCount })}</span>
                  <div className="mt-4 flex flex-col gap-1.5">
                    {dist.map(({ r, n }) => (
                      <span key={r} className="flex items-center gap-2 text-[12.5px] text-mute">
                        <span className="w-3 text-right font-bold text-deep">{r}</span>
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#f1ece0]"><span className="block h-full rounded-full bg-gold" style={{ width: `${(n / rCount) * 100}%` }} /></span>
                        <span className="w-4 text-right">{n}</span>
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <span className="flex">{Array.from({ length: 5 }, (_, i) => <Star key={i} size={22} className="text-[#e5d9bd]" />)}</span>
                  <b className="mt-3 text-[16px]">{t("pdp.noReviews")}</b>
                  <span className="text-[13.5px] text-mute">{t("pdp.noReviewsD")}</span>
                </>
              )}
              <div className="mt-auto pt-4"><ProductForms productId={p.id} mode="review" /></div>
            </div>
            {rCount ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {p.reviews.map((r) => (
                  <article key={r.id} className="flex flex-col rounded-[22px] border border-line bg-white p-5">
                    <div className="flex items-center gap-3">
                      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-[15px] font-extrabold text-white ${AVATAR[[...r.name].reduce((n, c) => n + c.charCodeAt(0), 0) % AVATAR.length]}`}>{r.name.trim().charAt(0).toLocaleUpperCase("tr")}</span>
                      <span className="min-w-0">
                        <b className="block truncate text-[14.5px]">{r.name}</b>
                        <span className="flex items-center gap-1.5 text-[12px] text-mute">
                          {r.isVerified ? <span className="flex items-center gap-1 font-semibold text-ok"><BadgeCheck size={13} /> {t("pdp.verified")}</span> : null}
                          <time dateTime={r.createdAt.toISOString()}>{formatDate(r.createdAt, false, t.locale)}</time>
                        </span>
                      </span>
                    </div>
                    <span className="mt-3 flex" aria-label={t("pdp.starsAria", { n: r.rating })}>{Array.from({ length: 5 }, (_, i) => <Star key={i} size={15} className={i < r.rating ? "fill-gold text-gold" : "text-line"} />)}</span>
                    <p className="mt-2 text-[15px] leading-relaxed text-[#2a2a2e]">{r.body}</p>
                    {r.reply ? <p className="mt-3 rounded-2xl bg-soft p-3.5 text-[13.5px]"><b>{s.store.name}:</b> {r.reply}</p> : null}
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        {/* ───────── Soru-cevap ───────── */}
        <section id="sorular" className={sec}>
          <span className={eyebrow}>{t("pdp.eyQa")}</span>
          <h2 className={`${h2} mt-3`}>{t("pdp.qaTitle")}</h2>
          {p.questions.length ? (
            <div className="mt-5 flex flex-col gap-3">
              {p.questions.map((q) => (
                <div key={q.id} className="rounded-[22px] border border-line bg-white p-5 text-[14.5px]">
                  <p className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-soft text-[12px] font-extrabold">{t("pdp.qLetter")}</span><span><b>{q.question}</b> <span className="text-[12px] text-mute">· {q.name}</span></span></p>
                  {q.answer ? <p className="mt-3 flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-deep text-[12px] font-extrabold text-white">{t("pdp.aLetter")}</span><span className="rounded-2xl rounded-tl-sm bg-soft px-4 py-2.5">{q.answer}</span></p> : <p className="mt-2 pl-10 text-[13px] text-mute">{t("pdp.awaiting")}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-[14.5px] text-mute">{t("pdp.askPrompt")}</p>
          )}
          <ProductForms productId={p.id} mode="question" />
        </section>

        <div className={sec}>
          <FaqSection items={faqItems} title={t("pdp.faqTitle", { ad: fullName(p) })} />
        </div>

        {/* ───────── Garanti ve ödeme ───────── */}
        <section id="garanti" className={sec}>
          <span className={eyebrow}>{t("pdp.eyWarranty")}</span>
          <h2 className={`${h2} mt-3`}>{t("pdp.warrantyTitle")}</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              { I: ShieldCheck, h: t("pdp.wBox1", { sure: warranty }), d: t("pdp.wBox1D") },
              { I: Wrench, h: t("pdp.wBox2"), d: t("pdp.wBox2D") },
              { I: RotateCcw, h: t("pdp.wBox3"), d: t("pdp.wBox3D") },
            ].map(({ I, h, d }) => (
              <div key={h} className="rounded-[22px] border border-line bg-white p-5">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-soft"><I size={21} /></span>
                <b className="mt-3 block text-[15.5px]">{h}</b>
                <p className="mt-1 text-[13.5px] text-mute">{d}</p>
              </div>
            ))}
          </div>
          {!out && p.price >= 1000 && s.payment.cardEnabled ? (
            <div className="mt-6">
              <b className="flex items-center gap-2 text-[16px]"><CreditCard size={18} /> {t("pdp.instTitle")}</b>
              <div className="mt-3"><InstallmentTable price={p.price} banks={banks} noInterest={s.payment.noInterestInstallments} max={s.payment.maxInstallment} rates={s.payment.installmentRates} /></div>
            </div>
          ) : null}
        </section>
      </div>

      <Suspense fallback={<ExtrasSkeleton />}>
        <PdpExtras p={p} ctx={ctx} />
      </Suspense>
      <StickyBuy productId={p.id} name={p.name} price={formatTL(p.price)} inst={inst > 1 ? `${inst} × ${formatTL(Math.round(p.price / inst))}` : undefined} disabled={out} amount={p.price} brand={p.brand?.name} />
    </div>
  );
}

const AVATAR = ["bg-brand", "bg-[#1f3b8f]", "bg-[#11643a]", "bg-[#7a4a14]", "bg-[#3a3a40]"];

async function BundleRail({ productId }: { productId: string }) {
  const offers = await bundlesFor(productId, (await getT()).locale);
  return <BundleOffers offers={offers} />;
}

/** Ürün sayfasının alt kısmı (rehberler, birlikte alınanlar, son gezilenler, benzer modeller): ayrı akar. */
async function PdpExtras({ p, ctx }: { p: NonNullable<Awaited<ReturnType<typeof getProduct>>>; ctx: ReturnType<typeof cardCtx> }) {
  const [together0, guides] = await Promise.all([boughtTogether([p.id], 4), relatedPosts({ productId: p.id, categoryId: p.categoryId, limit: 3 })]);
  const [together, t] = await Promise.all([localize(together0, "product"), getT()]);
  return (
    <>
      {guides.length ? (
        <section className="mt-12">
          <h2 className="font-display mb-4 text-2xl font-extrabold">{t("pdp.guides")}</h2>
          <PostCards posts={guides} />
        </section>
      ) : null}
      {together.length ? (
        <section className="mt-12">
          <h2 className="font-display mb-4 text-2xl font-extrabold">{t("pdp.together")}</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">{together.map((r) => <ProductCard key={r.id} p={r} ctx={ctx} />)}</div>
        </section>
      ) : null}
      <RecentlyViewed exclude={p.id} className="mt-12" />
    </>
  );
}

/** Benzer modeller: ürünün hemen altında; telefonda yatay kayan, masaüstünde 4'lü. */
async function SimilarRail({ p, ctx }: { p: NonNullable<Awaited<ReturnType<typeof getProduct>>>; ctx: ReturnType<typeof cardCtx> }) {
  const [rel, t] = await Promise.all([similarTo(p, 4), getT()]);
  const related = await localize(rel, "product");
  if (!related.length) return null;
  return (
    <section className="mt-10" data-testid="pdp-similar">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-[22px] leading-tight font-extrabold tracking-tight md:text-[26px]">{t("pdp.similar")}</h2>
          <p className="mt-0.5 text-[13.5px] text-mute">{t("pdp.similarD")}</p>
        </div>
        <Link href={`/karsilastir?ids=${[p.id, ...related.slice(0, 2).map((r) => r.id)].join(",")}`} className="shrink-0 rounded-full border border-line px-3.5 py-2 text-[13px] font-bold transition hover:border-deep">{t("pdp.compare")}</Link>
      </div>
      <div className="scrollbar-none -mx-4 flex snap-x gap-3 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-4 md:gap-4 md:overflow-visible md:px-0">
        {related.map((r) => (
          <div key={r.id} className="w-[46%] shrink-0 snap-start md:w-auto">
            <ProductCard p={r} ctx={ctx} />
          </div>
        ))}
      </div>
    </section>
  );
}

function ExtrasSkeleton() {
  return (
    <section className="mt-12" aria-hidden>
      <div className="skel mb-4 h-7 w-64 rounded-lg" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {Array.from({ length: 4 }, (_, i) => <div key={i} className="skel h-[340px] rounded-2xl" />)}
      </div>
    </section>
  );
}
