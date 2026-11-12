import { cardCtx } from "@/lib/card-ctx";
import Link from "next/link";
import { redirectOrNotFound } from "@/lib/redirects";
import { and, asc, desc, eq, ne } from "drizzle-orm";
import { Check, MessageCircle, Play, Star, Truck, Video } from "lucide-react";
import { db } from "@/db";
import { productImages, productQuestions, products, reviews } from "@/db/schema";
import { ProductCard } from "@/components/store/product-card";
import { BuyBox, Gallery, ProductViewTracker, StickyBuy } from "@/components/store/product-client";
import { DeliveryBadge, SocialProof } from "@/components/store/product-card";
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
  const [related, together, variants] = await Promise.all([
    similarTo(p, 4),
    boughtTogether([p.id], 4),
    p.variantGroup
      ? db
          .select({ id: products.id, slug: products.slug, name: products.name, label: products.variantLabel, price: products.price, stock: products.stock, allowBackorder: products.allowBackorder })
          .from(products)
          .where(and(eq(products.variantGroup, p.variantGroup), eq(products.status, "ACTIVE")))
          .orderBy(asc(products.price))
      : Promise.resolve([]),
  ]);
  const wa = s.store.whatsapp ? `https://wa.me/${s.store.whatsapp}?text=${encodeURIComponent(`Merhaba, ${p.name} hakkında bilgi almak istiyorum.`)}` : "/iletisim";
  const discount = p.compareAtPrice && p.compareAtPrice > p.price ? p.compareAtPrice - p.price : 0;
  const vid = ytId(p.videoUrl);
  const quick = [
    p.weightKg ? { k: "Ağırlık", v: `${p.weightKg.toLocaleString("tr-TR")} kg` } : null,
    p.technology ? { k: "Teknoloji", v: TECH_LABEL[p.technology] } : null,
    p.waterproof ? { k: "Su geçirmezlik", v: WATERPROOF_LABEL[p.waterproof] } : null,
    p.experience ? { k: "Kimin için", v: EXPERIENCE_LABEL[p.experience] } : null,
  ].filter(Boolean) as { k: string; v: string }[];
  const [dbFaq, guides, [act]] = await Promise.all([
    getFaqs({ productId: p.id }),
    relatedPosts({ productId: p.id, categoryId: p.categoryId, limit: 3 }),
    db
      .select({ views24: sql<number>`coalesce(sum(${productActivity.views}),0)::int`, carts24: sql<number>`coalesce(sum(${productActivity.carts}),0)::int` })
      .from(productActivity)
      .where(and(eq(productActivity.productId, p.id), sql`${productActivity.hour} > now() - interval '24 hours'`)),
  ]);
  const ctx = cardCtx(s);
  const banks = s.payment.cardEnabled && s.payment.provider !== "paytr" && p.price >= 1000 ? await installmentTable(p.price, s.payment.maxInstallment) : null;
  const faqItems = [...toQA(dbFaq), ...autoFaq(p, s)];

  return (
    <div className="container-x pt-4 pb-24 md:pb-10">
      <JsonLd data={graph(productLd(p, s))} />
      <ProductViewTracker id={p.id} name={p.name} price={p.price} brand={p.brand?.name} />
      <Breadcrumbs items={[...(p.category ? [{ name: p.category.name, path: `/kategori/${p.category.slug}` }] : []), ...(p.brand ? [{ name: p.brand.name, path: `/marka/${p.brand.slug}` }] : []), { name: p.name, path: `/urun/${p.slug}` }]} />
      <div className="grid gap-6 md:grid-cols-2 lg:gap-10">
        <Gallery images={p.images} name={p.name} badge={p.badges[0]} />
        <div className="flex flex-col gap-3">
          <p className="text-[13px] font-semibold text-mute">
            {p.brand ? <Link href={`/marka/${p.brand.slug}`} className="font-extrabold text-link">{p.brand.name}</Link> : null} · Kod {p.sku}
          </p>
          <div className="flex items-start justify-between gap-3">
            <h1 className="font-display text-[26px] leading-tight font-extrabold md:text-[34px]">{p.name}</h1>
            <FavoriteButton productId={p.id} name={p.name} className="mt-1 shrink-0" />
          </div>
          {rating ? (
            <a href="#yorumlar" className="flex items-center gap-1.5 text-sm">
              <Star size={15} className="fill-gold text-gold" /> <b>{rating.toFixed(1)}</b> <span className="text-mute">({p.reviews.length} yorum)</span>
            </a>
          ) : null}
          {p.shortDescription ? <p className="text-[15px] leading-relaxed text-[#3f3f46]">{p.shortDescription}</p> : null}
          {act ? <SocialProof p={act} ctx={ctx} className="text-[13px]" /> : null}

          {variants.length > 1 ? (
            <div>
              <p className="mb-1.5 text-[13px] font-bold">Seçenek</p>
              <div className="flex flex-wrap gap-2">
                {variants.map((v) => {
                  const cur = v.id === p.id;
                  const none = v.stock <= 0 && !v.allowBackorder;
                  return (
                    <Link
                      key={v.id}
                      href={`/urun/${v.slug}`}
                      aria-current={cur ? "page" : undefined}
                      className={`rounded-xl border px-3 py-2 text-sm transition ${cur ? "border-brand bg-tint font-bold text-brand" : "border-line hover:border-deep"} ${none ? "opacity-60" : ""}`}
                    >
                      <span className="block leading-tight">{v.label || v.name}</span>
                      <span className="text-xs text-mute">{none ? "Stokta yok" : formatTL(v.price)}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="rounded-2xl bg-soft p-4">
            <div className="flex flex-wrap items-baseline gap-x-3">
              <strong className="font-display text-[32px] font-extrabold">{formatTL(p.price)}</strong>
              {discount ? <s className="text-mute">{formatTL(p.compareAtPrice)}</s> : null}
              {discount ? <span className="rounded bg-accent px-2 py-0.5 text-xs font-extrabold text-white">{formatTL(discount)} indirim</span> : null}
            </div>
            {inst > 1 ? (
              <p className="mt-1 text-sm">
                {inst} ay vade farksız <b>{formatTL(Math.round(p.price / inst))}</b> × {inst} · en fazla {s.payment.maxInstallment} taksit
              </p>
            ) : null}
            {s.payment.transferEnabled && s.payment.transferDiscountPct ? (
              <p className="mt-0.5 text-sm font-bold text-link">Havale ile öde: %{s.payment.transferDiscountPct} indirim ({formatTL((p.price * s.payment.transferDiscountPct) / 100)})</p>
            ) : null}
          </div>

          {!archived ? (
            <p className="flex items-start gap-2.5 text-sm">
              {out ? <Truck size={20} className="mt-0.5 shrink-0 text-brand" /> : null}
              {out ? (
                <span><b className="text-danger">Şu an stokta yok.</b> Gelince haber verelim veya uzmana benzerini sor.</span>
              ) : (
                <span className="flex flex-col gap-1.5">
                  <DeliveryBadge p={p} ctx={ctx} className="w-fit text-[13px]" />
                  <span className="text-mute">
                    {p.sameDayShipping && p.stock > 0 ? `Saat ${s.shipping.sameDayCutoff}'e kadar verilen siparişler aynı gün kargoda.` : "Kargo süresi stok durumuna göre hesaplanır."}
                    {s.shipping.pickupEnabled ? " Showroom'dan da teslim alabilirsin." : ""}
                  </span>
                </span>
              )}
            </p>
          ) : (
            <p className="rounded-lg bg-warn-bg p-3 text-sm font-bold text-warn">Bu ürün artık satılmıyor. Benzer ürünler için uzmana sor.</p>
          )}

          <div className="hidden md:block">
            <BuyBox productId={p.id} name={p.name} max={p.allowBackorder ? 99 : p.stock} disabled={out} amount={p.price} brand={p.brand?.name} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <a href={wa} target="_blank" className="flex h-12 items-center justify-center gap-2 rounded-lg bg-[#15803d] text-sm font-extrabold text-white"><MessageCircle size={18} /> Bu ürünü sor</a>
            <Link href={`/iletisim?konu=goruntulu&urun=${encodeURIComponent(p.name)}`} className="flex h-12 items-center justify-center gap-2 rounded-lg border border-deep text-sm font-extrabold"><Video size={18} /> Kamerada göster</Link>
          </div>

          <ul className="mt-1 flex flex-col gap-2 text-sm">
            {[
              <><b>Yetkili distribütör ürünü</b>{p.trackSerial ? " · seri no ile sorgulanabilir" : ""}</>,
              <><b>{p.warrantyMonths} ay garanti</b> · faturalı</>,
              <><b>14 gün koşulsuz iade</b> · ücretsiz kargo kodu</>,
              <>Şirket adına e-fatura, hesabında</>,
            ].map((t, i) => (
              <li key={i} className="flex items-start gap-2.5"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-pop text-brand"><Check size={12} strokeWidth={3} /></span><span>{t}</span></li>
            ))}
          </ul>

          {p.trialRentalPrice ? (
            <div className="rounded-xl border border-dashed border-brand bg-tint p-4 text-sm">
              <b>Önce denemek ister misin?</b>
              <p className="mt-1">3 günlük deneme kiralaması {formatTL(p.trialRentalPrice)}. 30 gün içinde satın alırsan tamamı fiyattan düşülür. <Link href={`/iletisim?konu=kiralama&urun=${encodeURIComponent(p.name)}`} className="font-bold text-link">Talep et →</Link></p>
            </div>
          ) : null}
          {out && !archived ? <ProductForms productId={p.id} mode="alert" /> : null}
        </div>
      </div>

      <nav className="scrollbar-none sticky top-[132px] z-20 -mx-4 mt-8 flex gap-2 overflow-x-auto border-y border-line bg-white px-4 py-2.5 md:top-0" aria-label="Ürün bölümleri">
        {[["neden", "Kimler için"], ["ozellikler", "Teknik özellikler"], ...(vid ? [["video", "Video"]] : []), ["garanti", "Garanti ve servis"], ["sss", "SSS"], ["yorumlar", `Yorumlar (${p.reviews.length})`], ["sorular", `Sorular (${p.questions.length})`]].map(([id, l]) => (
          <a key={id} href={`#${id}`} className="shrink-0 rounded-full border border-line px-4 py-1.5 text-sm font-bold hover:bg-soft">{l}</a>
        ))}
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-10">
          <AnswerBox title={`${fullName(p)} nedir?`} updated={formatDate(p.updatedAt)}>{quickAnswer(p, s)}</AnswerBox>
          <section id="neden" className="scroll-mt-40">
            <h2 className="font-display mb-3 text-2xl font-extrabold">Kimler için ideal</h2>
            {quick.length ? (
              <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {quick.map((q) => <div key={q.k} className="rounded-xl bg-soft p-3"><span className="block text-xs text-mute">{q.k}</span><b className="text-sm">{q.v}</b></div>)}
              </div>
            ) : null}
            {p.idealFor.length ? <ul className="flex flex-col gap-2">{p.idealFor.map((t) => <li key={t} className="flex gap-2.5"><Check size={18} className="mt-0.5 shrink-0 text-brand" />{t}</li>)}</ul> : null}
            {p.notFor.length ? (
              <div className="mt-4 rounded-xl bg-[#fff4f2] p-4 text-sm text-[#7a2a20]">
                <b>Bilmen gereken:</b>
                <ul className="mt-1 list-disc pl-5">{p.notFor.map((t) => <li key={t}>{t}</li>)}</ul>
                <Link href="/sihirbaz" className="mt-2 inline-block font-bold underline">Farklı bir iş için mi arıyorsun? 6 soruda bulalım →</Link>
              </div>
            ) : null}
            {p.description ? <div className="prose-lite mt-5 text-[15px]" dangerouslySetInnerHTML={{ __html: markdownToHtml(p.description) }} /> : null}
          </section>

          <section id="ozellikler" className="scroll-mt-40">
            <h2 className="font-display mb-3 text-2xl font-extrabold">Teknik özellikler</h2>
            {p.specs.length ? (
              <dl className="divide-y divide-line rounded-xl border border-line">
                {p.specs.map((x) => (
                  <div key={x.key} className="grid grid-cols-[1fr_1.3fr] gap-3 px-4 py-3 text-sm"><dt className="text-mute">{x.key}</dt><dd className="font-semibold">{x.value}</dd></div>
                ))}
              </dl>
            ) : <p className="text-sm text-mute">Detaylı teknik bilgi için uzmana sor.</p>}
            {p.boxContents.length ? (
              <>
                <h3 className="mt-6 mb-2 font-extrabold">Kutudan çıkanlar</h3>
                <ul className="grid gap-1.5 text-sm sm:grid-cols-2">{p.boxContents.map((b) => <li key={b} className="flex gap-2"><Check size={16} className="mt-0.5 text-brand" />{b}</li>)}</ul>
              </>
            ) : null}
          </section>

          {vid ? (
            <section id="video" className="scroll-mt-40">
              <h2 className="font-display mb-3 flex items-center gap-2 text-2xl font-extrabold"><Play size={20} /> Elde gösterim</h2>
              <div className="aspect-video overflow-hidden rounded-xl bg-black">
                <iframe className="h-full w-full" src={`https://www.youtube-nocookie.com/embed/${vid}`} title={`${p.name} video`} loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
              </div>
            </section>
          ) : null}

          <section id="garanti" className="scroll-mt-40">
            <h2 className="font-display mb-3 text-2xl font-extrabold">Garanti ve servis</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-soft p-4 text-sm"><b>{p.warrantyMonths} ay garanti</b><p className="text-mute">Faturalı, distribütör garantisi.</p></div>
              <div className="rounded-xl bg-soft p-4 text-sm"><b>Arıza olursa</b><p className="text-mute">Hesabından kayıt aç → ücretsiz kargo kodu → aşama aşama takip.</p></div>
              <div className="rounded-xl bg-soft p-4 text-sm"><b>14 gün iade</b><p className="text-mute">Beğenmezsen tek tıkla iade talebi.</p></div>
            </div>
          </section>

          {!out && p.price >= 1000 ? (
            <section id="taksit" className="scroll-mt-40">
              <h2 className="font-display mb-3 text-2xl font-extrabold">Taksit seçenekleri</h2>
              <InstallmentTable price={p.price} banks={banks} noInterest={s.payment.noInterestInstallments} max={s.payment.maxInstallment} rates={s.payment.installmentRates} />
            </section>
          ) : null}

          <FaqSection items={faqItems} title={`${fullName(p)} hakkında sık sorulanlar`} />

          <section id="yorumlar" className="scroll-mt-40">
            <h2 className="font-display mb-3 text-2xl font-extrabold">Yorumlar</h2>
            {p.reviews.length ? (
              <ul className="divide-y divide-line">
                {p.reviews.map((r) => (
                  <li key={r.id} className="py-4 text-sm">
                    <p className="flex flex-wrap items-center gap-2"><b>{r.name}</b> <span className="text-gold">{"★".repeat(r.rating)}<span className="text-line">{"★".repeat(5 - r.rating)}</span></span>{r.isVerified ? <span className="rounded bg-pop px-1.5 py-0.5 text-[11px] font-bold text-on-pop">Doğrulanmış alıcı</span> : null}<span className="text-xs text-mute">{formatDate(r.createdAt)}</span></p>
                    <p className="mt-1">{r.body}</p>
                    {r.reply ? <p className="mt-2 rounded-lg bg-soft p-3"><b>Mağaza:</b> {r.reply}</p> : null}
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-mute">Henüz yorum yok. İlk yorumu sen yaz.</p>}
            <ProductForms productId={p.id} mode="review" />
          </section>

          <section id="sorular" className="scroll-mt-40">
            <h2 className="font-display mb-3 text-2xl font-extrabold">Sorular</h2>
            <ul className="divide-y divide-line">
              {p.questions.map((q) => (
                <li key={q.id} className="py-4 text-sm">
                  <p><b>Soru:</b> {q.question} <span className="text-xs text-mute">· {q.name}</span></p>
                  {q.answer ? <p className="mt-1 rounded-lg bg-tint p-3"><b>Uzman:</b> {q.answer}</p> : null}
                </li>
              ))}
            </ul>
            <ProductForms productId={p.id} mode="question" />
          </section>
        </div>
        <aside className="hidden lg:block">
          <div className="sticky top-20 rounded-2xl border border-line p-5">
            <b className="text-lg">{p.name}</b>
            <p className="font-display mt-1 text-2xl font-extrabold">{formatTL(p.price)}</p>
            {inst > 1 ? <p className="text-sm text-mute">{inst} × {formatTL(Math.round(p.price / inst))} vade farksız</p> : null}
            <div className="mt-4"><BuyBox productId={p.id} name={p.name} max={p.allowBackorder ? 99 : p.stock} disabled={out} amount={p.price} brand={p.brand?.name} /></div>
            <a href={wa} target="_blank" className="mt-2 flex h-11 items-center justify-center gap-2 rounded-lg bg-[#e9f9ef] text-sm font-extrabold text-[#11643a]"><MessageCircle size={17} /> Uzmana sor</a>
          </div>
        </aside>
      </div>

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
      <StickyBuy productId={p.id} name={p.name} price={formatTL(p.price)} inst={inst > 1 ? `${inst} × ${formatTL(Math.round(p.price / inst))}` : undefined} disabled={out} amount={p.price} brand={p.brand?.name} />
    </div>
  );
}
