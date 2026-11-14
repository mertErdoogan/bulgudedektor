import { cardCtx } from "@/lib/card-ctx";
import Link from "next/link";
import { Suspense } from "react";
import { redirectOrNotFound } from "@/lib/redirects";
import { and, asc, desc, eq, ne } from "drizzle-orm";
import { BadgeCheck, Check, Cpu, CreditCard, Droplets, Headset, Info, Landmark, MessageCircle, PackageOpen, Phone, Play, RotateCcw, ShieldCheck, Star, ThumbsUp, UserRound, Weight, Wrench } from "lucide-react";
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
import { EXPERIENCE_LABEL, TECH_LABEL, WATERPROOF_LABEL, formatDate, formatTL } from "@/lib/utils";
import { ProductForms } from "./forms";
import { AnswerBox, Breadcrumbs, FaqSection } from "@/components/seo/blocks";
import { JsonLd } from "@/components/seo/json-ld";
import { PostCards } from "@/components/store/post-cards";
import { getFaqs, relatedPosts, toQA } from "@/lib/content";
import { graph, metaDesc, pageMeta, productLd } from "@/lib/seo";
import type { AllSettings } from "@/lib/settings";

async function getProduct(slug: string) {
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
  const p = await getProduct((await params).slug);
  if (!p) return {};
  const full = fullName(p);
  return pageMeta({
    title: p.seoTitle || `${full} Fiyatı ve Özellikleri`,
    description: metaDesc([p.seoDescription, p.shortDescription], `${full}: orijinal, faturalı, ${p.warrantyMonths} ay garantili. Teknik özellikler, taksit seçenekleri ve uzman desteği.`),
    path: `/urun/${p.slug}`,
    image: p.images[0]?.url,
    noindex: p.status === "ARCHIVED",
  });
}

type P = NonNullable<Awaited<ReturnType<typeof getProduct>>>;
const WHO: Record<string, string> = { BEGINNER: "yeni başlayan", INTERMEDIATE: "deneyimli", PRO: "profesyonel" };
const fullName = (p: P) => (p.brand && !p.name.toLowerCase().startsWith(p.brand.name.toLowerCase()) ? `${p.brand.name} ${p.name}` : p.name);

/** Ürün verisinden kısa, doğrudan yanıt (AI özetleri için 40–60 kelime). */
function quickAnswer(p: P, s: AllSettings) {
  const bits: string[] = [];
  const who = p.experience ? WHO[p.experience] : null;
  const uses = p.idealFor.slice(0, 2).map((x) => x.replace(/\.$/, "").toLocaleLowerCase("tr-TR"));
  bits.push(`${fullName(p)}, ${p.technology && p.technology !== "OTHER" ? `${TECH_LABEL[p.technology]} teknolojili ` : ""}bir ${p.category?.name.toLocaleLowerCase("tr-TR") ?? "metal"} dedektörüdür${who ? ` ve ${who} kullanıcılar için uygundur` : ""}.`);
  if (uses.length) bits.push(`Öne çıktığı alanlar: ${uses.join(", ")}.`);
  const facts = [p.weightKg ? `${p.weightKg.toLocaleString("tr-TR")} kg` : null, p.waterproof ? WATERPROOF_LABEL[p.waterproof].toLocaleLowerCase("tr-TR") : null].filter(Boolean);
  if (facts.length) bits.push(`Ağırlığı ve su dayanımı: ${facts.join(", ")}.`);
  bits.push(`Fiyatı ${formatTL(p.price)}; faturalı, ${p.warrantyMonths} ay garantili${s.payment.noInterestInstallments > 1 ? `, ${s.payment.noInterestInstallments} ay vade farksız taksitle` : ""} satılır.`);
  return bits.join(" ");
}

/** Ürün verisinden otomatik SSS (yalnızca gerçek veriden; uydurma yok). */
function autoFaq(p: P, s: AllSettings) {
  const n = fullName(p);
  const out: { q: string; a: string }[] = [];
  out.push({ q: `${n} orijinal mi, garantisi var mı?`, a: `Evet. Arena Dedektör'de satılan ${n} yetkili distribütör ürünüdür; faturalı ve ${p.warrantyMonths} ay garantilidir.${p.trackSerial ? " Cihazın seri numarasını sitemizdeki Seri No Sorgula sayfasından kontrol edebilirsiniz." : ""}` });
  if (p.waterproof) out.push({ q: `${n} su geçirmez mi?`, a: `${n} için su dayanımı: ${WATERPROOF_LABEL[p.waterproof]}.${p.waterproof === "NONE" ? " Yağmurda koruyucu kılıf kullanılması önerilir." : ""}` });
  if (p.weightKg) out.push({ q: `${n} kaç kilo?`, a: `${n} yaklaşık ${p.weightKg.toLocaleString("tr-TR")} kg ağırlığındadır.${p.weightKg <= 1.5 ? " Uzun süreli aramalarda yormayan hafif sınıftadır." : ""}` });
  if (p.experience) out.push({ q: `${n} yeni başlayanlar için uygun mu?`, a: p.experience === "BEGINNER" ? `Evet, ${n} kolay menüsü ve hazır programlarıyla yeni başlayanlar için uygundur.` : `${n} ${WHO[p.experience]} kullanıcılar için tasarlanmıştır. Yeni başlıyorsanız satın alma sonrası ücretsiz kurulum eğitimimizden yararlanabilirsiniz.` });
  out.push({ q: `${n} taksitle alınabilir mi?`, a: `${n} kredi kartına ${s.payment.maxInstallment} taksite kadar alınabilir${s.payment.noInterestInstallments > 1 ? `; ${s.payment.noInterestInstallments} taksite kadar vade farkı yoktur` : ""}.${s.payment.transferEnabled && s.payment.transferDiscountPct ? ` Havale/EFT ile ödemede %${s.payment.transferDiscountPct} indirim uygulanır.` : ""}` });
  out.push({ q: `${n} ne zaman kargoya verilir?`, a: p.sameDayShipping ? `Stoktaysa saat ${s.shipping.sameDayCutoff}'e kadar verilen siparişler aynı gün kargoya verilir; tahmini teslim süresi ${s.shipping.deliveryEstimate}.` : `Siparişler 1–2 iş günü içinde kargoya verilir; tahmini teslim süresi ${s.shipping.deliveryEstimate}.` });
  return out;
}

function ytId(url: string | null) {
  if (!url) return null;
  const m = url.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{11})/);
  return m?.[1] ?? null;
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = await getProduct((await params).slug);
  if (!p) return redirectOrNotFound(`/urun/${(await params).slug}`);
  const s = await getSettings();
  const archived = p.status === "ARCHIVED";
  const out = archived || (p.stock <= 0 && !p.allowBackorder);
  const inst = s.payment.noInterestInstallments;
  const rating = p.reviews.length ? p.reviews.reduce((a, r) => a + r.rating, 0) / p.reviews.length : null;
  const wa = s.store.whatsapp ? `https://wa.me/${s.store.whatsapp}?text=${encodeURIComponent(`Merhaba, ${p.name} hakkında bilgi almak istiyorum.`)}` : "/iletisim";
  const discount = p.compareAtPrice && p.compareAtPrice > p.price ? p.compareAtPrice - p.price : 0;
  const vid = ytId(p.videoUrl);
  const ctx = cardCtx(s);
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
  const faqItems = [...toQA(dbFaq), ...autoFaq(p, s)];

  const rCount = p.reviews.length;
  const dist = [5, 4, 3, 2, 1].map((r) => ({ r, n: p.reviews.filter((x) => x.rating === r).length }));
  const warranty = p.warrantyMonths % 12 === 0 ? `${p.warrantyMonths / 12} yıl` : `${p.warrantyMonths} ay`;
  const facts = [
    p.technology ? { I: Cpu, k: "Teknoloji", v: TECH_LABEL[p.technology] } : null,
    p.waterproof ? { I: Droplets, k: "Su dayanımı", v: WATERPROOF_LABEL[p.waterproof] } : null,
    p.weightKg ? { I: Weight, k: "Ağırlık", v: `${p.weightKg.toLocaleString("tr-TR")} kg` } : null,
    p.experience ? { I: UserRound, k: "Kimin için", v: EXPERIENCE_LABEL[p.experience] } : null,
  ].filter(Boolean) as { I: typeof Cpu; k: string; v: string }[];
  const tabs = [
    { id: "genel", label: "Genel bakış" },
    { id: "ozellikler", label: "Özellikler", count: p.specs.length || undefined },
    ...(vid ? [{ id: "video", label: "Video" }] : []),
    { id: "yorumlar", label: "Yorumlar", count: rCount || undefined },
    { id: "sorular", label: "Soru-cevap", count: p.questions.length || undefined },
    { id: "sss", label: "SSS" },
    { id: "garanti", label: "Garanti ve ödeme" },
  ];
  const h2 = "font-display text-[24px] leading-tight font-extrabold tracking-tight md:text-[30px]";
  const eyebrow = "text-[11.5px] font-extrabold tracking-[.14em] text-mute";

  return (
    <div className="container-x pt-4 pb-24 md:pb-10">
      <JsonLd data={graph(productLd(p, s))} />
      <ProductViewTracker id={p.id} name={p.name} price={p.price} brand={p.brand?.name} />
      <Breadcrumbs items={[...(p.category ? [{ name: p.category.name, path: `/kategori/${p.category.slug}` }] : []), ...(p.brand ? [{ name: p.brand.name, path: `/marka/${p.brand.slug}` }] : []), { name: p.name, path: `/urun/${p.slug}` }]} />

      {/* ───────── Üst: galeri + satın alma ───────── */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)] lg:gap-12">
        <div className="flex flex-col gap-4">
          <Gallery images={p.images} name={p.name} badge={p.badges[0]} brand={p.brand?.name} discountPct={discount && p.compareAtPrice ? Math.round((discount / p.compareAtPrice) * 100) : 0} />
          {facts.length ? (
            <div className="hidden grid-cols-4 gap-2.5 md:grid" data-testid="pdp-facts">
              {facts.map(({ I, k, v }) => (
                <div key={k} className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-3.5">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-soft text-deep"><I size={18} /></span>
                  <span>
                    <span className="block text-[11.5px] font-semibold text-mute">{k}</span>
                    <b className="text-[14px] leading-tight">{v}</b>
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {p.brand ? <Link href={`/marka/${p.brand.slug}`} className="rounded-full bg-deep px-3 py-1 text-[11.5px] font-extrabold tracking-[.12em] text-white">{p.brand.name.toLocaleUpperCase("en-US")}</Link> : null}
            {rating ? (
              <a href="#yorumlar" className="flex items-center gap-1.5 text-[13.5px] hover:underline">
                <span className="flex">{Array.from({ length: 5 }, (_, i) => <Star key={i} size={14} className={i < Math.round(rating) ? "fill-gold text-gold" : "text-line"} />)}</span>
                <b>{rating.toFixed(1)}</b> <span className="text-mute">· {rCount} yorum</span>
              </a>
            ) : (
              <a href="#yorumlar" className="text-[13px] font-semibold text-mute hover:text-deep">İlk yorumu sen yaz</a>
            )}
            <span className="ml-auto text-[12px] text-mute">Kod {p.sku}</span>
          </div>
          <div className="flex items-start justify-between gap-3">
            <h1 className="font-display text-[28px] leading-[1.1] font-extrabold tracking-tight md:text-[40px]">{p.name}</h1>
            <FavoriteButton productId={p.id} name={p.name} className="mt-1 shrink-0" />
          </div>
          {p.shortDescription ? <p className="text-[15.5px] leading-relaxed text-[#3f3f46]">{p.shortDescription}</p> : null}

          {variants.length > 1 ? (
            <div>
              <p className="mb-2 text-[13px] font-bold">Seçenek</p>
              <div className="flex flex-wrap gap-2">
                {variants.map((v) => {
                  const cur = v.id === p.id;
                  const none = v.stock <= 0 && !v.allowBackorder;
                  return (
                    <Link key={v.id} href={`/urun/${v.slug}`} aria-current={cur ? "page" : undefined} className={`rounded-2xl border px-3.5 py-2 text-sm transition ${cur ? "border-deep bg-deep text-white" : "border-line hover:border-deep"} ${none ? "opacity-60" : ""}`}>
                      <span className="block leading-tight font-bold">{v.label || v.name}</span>
                      <span className={`text-xs ${cur ? "text-white/70" : "text-mute"}`}>{none ? "Stokta yok" : formatTL(v.price)}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Fiyat kartı */}
          <div className="rounded-[24px] border border-line bg-[linear-gradient(160deg,#ffffff_0%,#fafafa_100%)] p-5" id="satin-al">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <strong className="font-display text-[34px] leading-none font-extrabold tracking-tight md:text-[40px]">{formatTL(p.price)}</strong>
              {discount ? <s className="text-[15px] text-mute">{formatTL(p.compareAtPrice)}</s> : null}
              {discount ? <span className="rounded-full bg-brand px-2.5 py-0.5 text-[12px] font-extrabold text-white">{formatTL(discount)} indirim</span> : null}
            </div>
            {deal ? (
              <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-2xl bg-ok-bg px-3.5 py-2.5 text-sm" data-testid="pdp-deal">
                <span className="font-semibold text-ok">Sepette</span>
                <b className="font-display text-[20px] text-ok">{formatTL(Math.round((p.price - deal.amount) * 100) / 100)}</b>
                <span className="text-[#2f5d43]">· {deal.name}, {formatTL(deal.amount)} otomatik düşer</span>
              </p>
            ) : null}
            {s.merch.badge && p.brand && p.brand.slug === s.merch.focusBrand ? (
              <p className="mt-3 flex w-fit items-center gap-1.5 rounded-full bg-deep px-3 py-1 text-[12.5px] font-bold text-white" data-testid="focus-badge">
                <BadgeCheck size={15} className="text-[#86efac]" /> Türkiye distribütör garantili · {warranty}
              </p>
            ) : null}
            <div className="mt-3 flex flex-col gap-1 text-[13.5px] text-[#3f3f46]">
              {inst > 1 ? <span className="flex items-center gap-2"><CreditCard size={15} className="text-mute" /> {inst} × <b className="text-deep">{formatTL(Math.round(p.price / inst))}</b> vade farksız <a href="#garanti" className="text-mute underline-offset-2 hover:underline">· {s.payment.maxInstallment} taksite kadar</a></span> : null}
              {s.payment.transferEnabled && s.payment.transferDiscountPct ? <span className="flex items-center gap-2"><Landmark size={15} className="text-mute" /> Havale/EFT ile %{s.payment.transferDiscountPct} indirim ({formatTL((p.price * s.payment.transferDiscountPct) / 100)})</span> : null}
              {!archived && !out ? <DeliveryLine p={p} ctx={ctx} pickup={s.shipping.pickupEnabled} /> : null}
            </div>
            {archived ? (
              <p className="mt-4 rounded-xl bg-warn-bg p-3 text-sm font-bold text-warn">Bu ürün artık satılmıyor. Benzer ürünler için uzmana sor.</p>
            ) : out ? (
              <div className="mt-4 flex flex-col gap-2">
                <p className="text-sm"><b className="text-danger">Şu an stokta yok.</b> Gelince haber verelim.</p>
                <ProductForms productId={p.id} mode="alert" />
              </div>
            ) : (
              <div className="mt-4 hidden md:block">
                <BuyBox productId={p.id} name={p.name} max={p.allowBackorder ? 99 : p.stock} disabled={out} amount={p.price} brand={p.brand?.name} />
              </div>
            )}
            {act ? <SocialProof p={act} ctx={ctx} className="mt-3 text-[12.5px]" /> : null}
          </div>

          {/* Mobilde öne çıkan bilgiler fiyattan sonra, tek satır kaydırılabilir haplar (galeri altında yer kaplamasın) */}
          {facts.length ? (
            <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 md:hidden">
              {facts.map(({ I, k, v }) => (
                <span key={k} className="flex shrink-0 items-center gap-2 rounded-full border border-line bg-white py-1.5 pr-3.5 pl-1.5">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-soft"><I size={15} /></span>
                  <span className="flex flex-col leading-tight"><span className="text-[10.5px] text-mute">{k}</span><b className="text-[12.5px]">{v}</b></span>
                </span>
              ))}
            </div>
          ) : null}

          {/* Güven: 4 kısa madde, ikonlu */}
          <div className="grid grid-cols-2 gap-2" data-testid="pdp-trust">
            {[
              { I: BadgeCheck, t: "Yetkili distribütör", d: p.trackSerial ? "Seri no ile sorgula" : "Orijinal ürün", href: p.trackSerial ? "/seri-no" : undefined },
              { I: ShieldCheck, t: `${warranty} garanti`, d: "Faturalı, Türkiye garantili" },
              { I: RotateCcw, t: "14 gün iade", d: "Ücretsiz kargo kodu" },
              { I: Headset, t: "Uzman desteği", d: "Kurulum ve kullanım" },
            ].map(({ I, t, d, href }) => {
              const body = (
                <>
                  <I size={19} className="shrink-0 text-deep" />
                  <span className="min-w-0">
                    <b className="block truncate text-[13px]">{t}</b>
                    <span className="block truncate text-[12px] text-mute">{d}</span>
                  </span>
                </>
              );
              return href ? (
                <Link key={t} href={href} className="flex items-center gap-2.5 rounded-xl bg-soft px-3 py-2.5 transition hover:bg-[#ececee]">{body}</Link>
              ) : (
                <div key={t} className="flex items-center gap-2.5 rounded-xl bg-soft px-3 py-2.5">{body}</div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span className="text-mute">Sorunuz mu var?</span>
            <a href={wa} target="_blank" className="inline-flex items-center gap-1.5 font-bold text-[#11643a] hover:underline"><MessageCircle size={17} /> WhatsApp&apos;tan sor</a>
            {s.store.phone ? <a href={`tel:${s.store.phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1.5 font-bold hover:underline"><Phone size={16} /> {s.store.phone}</a> : null}
          </div>
          {p.trialRentalPrice ? (
            <p className="rounded-2xl border border-dashed border-[#d6d6db] px-4 py-3 text-[13.5px] text-mute">
              <b className="text-deep">Önce dene:</b> 3 günlük kiralama {formatTL(p.trialRentalPrice)}, 30 gün içinde alırsan fiyattan düşülür.{" "}
              <Link href={`/iletisim?konu=kiralama&urun=${encodeURIComponent(p.name)}`} className="font-bold text-deep underline-offset-2 hover:underline">Talep et →</Link>
            </p>
          ) : null}
        </div>
      </div>

      <PdpTabs tabs={tabs} product={{ id: p.id, name: p.name, price: formatTL(p.price), amount: p.price, image: p.images[0]?.url ?? null, brand: p.brand?.name, disabled: out }} />

      <div className="mx-auto mt-10 flex max-w-[1080px] flex-col gap-16">
        {/* ───────── Genel bakış ───────── */}
        <section id="genel" className="scroll-mt-40">
          <span className={eyebrow}>GENEL BAKIŞ</span>
          <h2 className={`${h2} mt-1`}>{fullName(p)} kimin için?</h2>
          <div className="mt-5">
            <AnswerBox title={`${fullName(p)} nedir?`} updated={formatDate(p.updatedAt)}>{quickAnswer(p, s)}</AnswerBox>
          </div>
          {p.idealFor.length || p.notFor.length ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {p.idealFor.length ? (
                <div className="rounded-[22px] border border-line bg-white p-5">
                  <b className="flex items-center gap-2 text-[15px]"><span className="grid h-8 w-8 place-items-center rounded-full bg-ok-bg text-ok"><ThumbsUp size={16} /></span> Kimler için ideal</b>
                  <ul className="mt-3 flex flex-col gap-2.5 text-[14.5px]">{p.idealFor.map((t) => <li key={t} className="flex gap-2.5"><Check size={18} className="mt-0.5 shrink-0 text-ok" />{t}</li>)}</ul>
                </div>
              ) : null}
              {p.notFor.length ? (
                <div className="rounded-[22px] border border-[#f1e2c4] bg-[#fffbf2] p-5">
                  <b className="flex items-center gap-2 text-[15px]"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#fdefd0] text-[#8a5a00]"><Info size={16} /></span> Bilmen gereken</b>
                  <ul className="mt-3 flex flex-col gap-2.5 text-[14.5px] text-[#5c4a26]">{p.notFor.map((t) => <li key={t} className="flex gap-2.5"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c99a3a]" />{t}</li>)}</ul>
                  <Link href="/sihirbaz" className="mt-3 inline-block text-[13.5px] font-bold text-deep underline-offset-2 hover:underline">Farklı bir iş için mi? 6 soruda bulalım →</Link>
                </div>
              ) : null}
            </div>
          ) : null}
          {p.description ? <div className="prose-lite prose-article mt-6 max-w-3xl text-[15.5px]" dangerouslySetInnerHTML={{ __html: markdownToHtml(p.description) }} /> : null}
        </section>

        {/* ───────── Özellikler ───────── */}
        <section id="ozellikler" className="scroll-mt-40">
          <span className={eyebrow}>ÖZELLİKLER</span>
          <h2 className={`${h2} mt-1`}>Teknik özellikler</h2>
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
            <p className="mt-4 rounded-2xl bg-soft p-5 text-sm text-mute">Detaylı teknik bilgi için <a href={wa} target="_blank" className="font-bold text-deep underline">uzmana sor</a>.</p>
          )}
          {p.boxContents.length ? (
            <div className="mt-6 rounded-[22px] bg-soft p-5">
              <b className="flex items-center gap-2 text-[15px]"><PackageOpen size={18} /> Kutudan çıkanlar</b>
              <ul className="mt-3 flex flex-wrap gap-2">{p.boxContents.map((b) => <li key={b} className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[13.5px] font-semibold ring-1 ring-line"><Check size={14} className="text-ok" />{b}</li>)}</ul>
            </div>
          ) : null}
        </section>

        {vid ? (
          <section id="video" className="scroll-mt-40">
            <span className={eyebrow}>VİDEO</span>
            <h2 className={`${h2} mt-1 flex items-center gap-2`}><Play size={22} /> Elde gösterim</h2>
            <div className="mt-5 aspect-video overflow-hidden rounded-[22px] bg-black">
              <iframe className="h-full w-full" src={`https://www.youtube-nocookie.com/embed/${vid}`} title={`${p.name} video`} loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            </div>
          </section>
        ) : null}

        {/* ───────── Yorumlar ───────── */}
        <section id="yorumlar" className="scroll-mt-40">
          <span className={eyebrow}>YORUMLAR</span>
          <h2 className={`${h2} mt-1`}>Kullananlar ne diyor?</h2>
          <div className="mt-5 grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
            <div className="flex flex-col rounded-[22px] bg-[linear-gradient(160deg,#fffaf0_0%,#ffffff_60%)] p-5 ring-1 ring-[#f1e6cf]">
              {rCount ? (
                <>
                  <span className="font-display text-[52px] leading-none font-black">{(rating ?? 0).toFixed(1)}</span>
                  <span className="mt-1 flex">{Array.from({ length: 5 }, (_, i) => <Star key={i} size={17} className={i < Math.round(rating ?? 0) ? "fill-gold text-gold" : "text-[#e5d9bd]"} />)}</span>
                  <span className="mt-1 text-[13px] text-mute">{rCount} yorum</span>
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
                  <b className="mt-3 text-[16px]">Henüz yorum yok</b>
                  <span className="text-[13.5px] text-mute">Bu cihazı kullandıysan deneyimini paylaş; başkalarının kararına yardımcı ol.</span>
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
                          {r.isVerified ? <span className="flex items-center gap-1 font-semibold text-ok"><BadgeCheck size={13} /> Doğrulanmış alıcı</span> : null}
                          <time dateTime={r.createdAt.toISOString()}>{formatDate(r.createdAt)}</time>
                        </span>
                      </span>
                    </div>
                    <span className="mt-3 flex" aria-label={`5 üzerinden ${r.rating} yıldız`}>{Array.from({ length: 5 }, (_, i) => <Star key={i} size={15} className={i < r.rating ? "fill-gold text-gold" : "text-line"} />)}</span>
                    <p className="mt-2 text-[15px] leading-relaxed text-[#2a2a2e]">{r.body}</p>
                    {r.reply ? <p className="mt-3 rounded-2xl bg-soft p-3.5 text-[13.5px]"><b>Arena Dedektör:</b> {r.reply}</p> : null}
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        {/* ───────── Soru-cevap ───────── */}
        <section id="sorular" className="scroll-mt-40">
          <span className={eyebrow}>SORU-CEVAP</span>
          <h2 className={`${h2} mt-1`}>Uzmana sorulanlar</h2>
          {p.questions.length ? (
            <div className="mt-5 flex flex-col gap-3">
              {p.questions.map((q) => (
                <div key={q.id} className="rounded-[22px] border border-line bg-white p-5 text-[14.5px]">
                  <p className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-soft text-[12px] font-extrabold">S</span><span><b>{q.question}</b> <span className="text-[12px] text-mute">· {q.name}</span></span></p>
                  {q.answer ? <p className="mt-3 flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-deep text-[12px] font-extrabold text-white">C</span><span className="rounded-2xl rounded-tl-sm bg-soft px-4 py-2.5">{q.answer}</span></p> : <p className="mt-2 pl-10 text-[13px] text-mute">Uzman yanıtı bekleniyor.</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-[14.5px] text-mute">Aklına takılan bir şey mi var? Sor, uzmanımız burada yanıtlasın.</p>
          )}
          <ProductForms productId={p.id} mode="question" />
        </section>

        <FaqSection items={faqItems} title={`${fullName(p)} hakkında sık sorulanlar`} />

        {/* ───────── Garanti ve ödeme ───────── */}
        <section id="garanti" className="scroll-mt-40">
          <span className={eyebrow}>GARANTİ VE ÖDEME</span>
          <h2 className={`${h2} mt-1`}>İçin rahat olsun</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              { I: ShieldCheck, t: `${warranty} garanti`, d: "Faturalı, distribütör garantisi. Seri numarası kayıtlı." },
              { I: Wrench, t: "Arıza olursa", d: "Hesabından kayıt aç → ücretsiz kargo kodu → aşama aşama takip." },
              { I: RotateCcw, t: "14 gün iade", d: "Beğenmezsen hesabından tek tıkla iade talebi." },
            ].map(({ I, t, d }) => (
              <div key={t} className="rounded-[22px] border border-line bg-white p-5">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-soft"><I size={21} /></span>
                <b className="mt-3 block text-[15.5px]">{t}</b>
                <p className="mt-1 text-[13.5px] text-mute">{d}</p>
              </div>
            ))}
          </div>
          {!out && p.price >= 1000 ? (
            <div className="mt-6">
              <b className="flex items-center gap-2 text-[16px]"><CreditCard size={18} /> Taksit seçenekleri</b>
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

const AVATAR = ["bg-[#d42e1e]", "bg-[#1f3b8f]", "bg-[#11643a]", "bg-[#7a4a14]", "bg-[#3a3a40]"];

/** Ürün sayfasının alt kısmı (rehberler, birlikte alınanlar, son gezilenler, benzer modeller): ayrı akar. */
async function PdpExtras({ p, ctx }: { p: NonNullable<Awaited<ReturnType<typeof getProduct>>>; ctx: ReturnType<typeof cardCtx> }) {
  const [related, together, guides] = await Promise.all([similarTo(p, 4), boughtTogether([p.id], 4), relatedPosts({ productId: p.id, categoryId: p.categoryId, limit: 3 })]);
  return (
    <>
      {guides.length ? (
        <section className="mt-12">
          <h2 className="font-display mb-4 text-2xl font-extrabold">Uzman rehberleri</h2>
          <PostCards posts={guides} />
        </section>
      ) : null}
      {together.length ? (
        <section className="mt-12">
          <h2 className="font-display mb-4 text-2xl font-extrabold">Bunu alanlar şunları da aldı</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">{together.map((r) => <ProductCard key={r.id} p={r} ctx={ctx} />)}</div>
        </section>
      ) : null}
      <RecentlyViewed exclude={p.id} className="mt-12" />
      {related.length ? (
        <section className="mt-12">
          <h2 className="font-display mb-4 text-2xl font-extrabold">Benzer modeller</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">{related.map((r) => <ProductCard key={r.id} p={r} ctx={ctx} />)}</div>
        </section>
      ) : null}
    </>
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
