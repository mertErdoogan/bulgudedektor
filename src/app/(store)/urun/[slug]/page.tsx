import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, ne } from "drizzle-orm";
import { Check, MessageCircle, Play, Star, Truck, Video } from "lucide-react";
import { db } from "@/db";
import { productImages, productQuestions, products, reviews } from "@/db/schema";
import { ProductCard } from "@/components/store/product-card";
import { BuyBox, Gallery, StickyBuy } from "@/components/store/product-client";
import { getSettings } from "@/lib/settings";
import { cardQuery } from "@/lib/store";
import { markdownToHtml } from "@/lib/markdown";
import { EXPERIENCE_LABEL, TECH_LABEL, WATERPROOF_LABEL, formatDate, formatTL } from "@/lib/utils";
import { ProductForms } from "./forms";

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
  return {
    title: p.seoTitle || `${p.brand?.name ?? ""} ${p.name}`.trim(),
    description: p.seoDescription || p.shortDescription || undefined,
    openGraph: { images: p.images[0]?.url ? [p.images[0].url] : [] },
  };
}

function ytId(url: string | null) {
  if (!url) return null;
  const m = url.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{11})/);
  return m?.[1] ?? null;
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = await getProduct((await params).slug);
  if (!p) notFound();
  const s = await getSettings();
  const archived = p.status === "ARCHIVED";
  const out = archived || (p.stock <= 0 && !p.allowBackorder);
  const inst = s.payment.noInterestInstallments;
  const rating = p.reviews.length ? p.reviews.reduce((a, r) => a + r.rating, 0) / p.reviews.length : null;
  const related = p.categoryId ? await cardQuery().where(and(eq(products.status, "ACTIVE"), eq(products.categoryId, p.categoryId), ne(products.id, p.id))).limit(4) : [];
  const wa = s.store.whatsapp ? `https://wa.me/${s.store.whatsapp}?text=${encodeURIComponent(`Merhaba, ${p.name} hakkında bilgi almak istiyorum.`)}` : "/iletisim";
  const discount = p.compareAtPrice && p.compareAtPrice > p.price ? p.compareAtPrice - p.price : 0;
  const vid = ytId(p.videoUrl);
  const quick = [
    p.weightKg ? { k: "Ağırlık", v: `${p.weightKg.toLocaleString("tr-TR")} kg` } : null,
    p.technology ? { k: "Teknoloji", v: TECH_LABEL[p.technology] } : null,
    p.waterproof ? { k: "Su geçirmezlik", v: WATERPROOF_LABEL[p.waterproof] } : null,
    p.experience ? { k: "Kimin için", v: EXPERIENCE_LABEL[p.experience] } : null,
  ].filter(Boolean) as { k: string; v: string }[];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    sku: p.sku,
    gtin: p.barcode ?? undefined,
    brand: p.brand ? { "@type": "Brand", name: p.brand.name } : undefined,
    image: p.images.map((i) => i.url),
    description: p.shortDescription ?? undefined,
    offers: { "@type": "Offer", priceCurrency: "TRY", price: p.price, availability: out ? "https://schema.org/OutOfStock" : "https://schema.org/InStock" },
    ...(rating ? { aggregateRating: { "@type": "AggregateRating", ratingValue: rating.toFixed(1), reviewCount: p.reviews.length } } : {}),
  };

  return (
    <div className="container-x pt-4 pb-24 md:pb-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav className="mb-3 text-[13px] text-mute" aria-label="Konum">
        <Link href="/">Ana sayfa</Link>
        {p.category ? <> / <Link href={`/kategori/${p.category.slug}`}>{p.category.name}</Link></> : null} / {p.name}
      </nav>
      <div className="grid gap-6 md:grid-cols-2 lg:gap-10">
        <Gallery images={p.images} name={p.name} badge={p.badges[0]} />
        <div className="flex flex-col gap-3">
          <p className="text-[13px] font-semibold text-mute">
            {p.brand ? <Link href={`/marka/${p.brand.slug}`} className="font-extrabold text-link">{p.brand.name}</Link> : null} · Kod {p.sku}
          </p>
          <h1 className="font-display text-[26px] leading-tight font-extrabold md:text-[34px]">{p.name}</h1>
          {rating ? (
            <a href="#yorumlar" className="flex items-center gap-1.5 text-sm">
              <Star size={15} className="fill-gold text-gold" /> <b>{rating.toFixed(1)}</b> <span className="text-mute">({p.reviews.length} yorum)</span>
            </a>
          ) : null}
          {p.shortDescription ? <p className="text-[15px] leading-relaxed text-[#3e4440]">{p.shortDescription}</p> : null}

          <div className="rounded-2xl bg-soft p-4">
            <div className="flex flex-wrap items-baseline gap-x-3">
              <strong className="font-display text-[32px] font-extrabold">{formatTL(p.price)}</strong>
              {discount ? <s className="text-mute">{formatTL(p.compareAtPrice)}</s> : null}
              {discount ? <span className="rounded bg-gold px-2 py-0.5 text-xs font-extrabold text-white">{formatTL(discount)} indirim</span> : null}
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
              <Truck size={20} className="mt-0.5 shrink-0 text-brand" />
              {out ? (
                <span><b className="text-danger">Şu an stokta yok.</b> Gelince haber verelim veya uzmana benzerini sor.</span>
              ) : (
                <span>
                  <b className="text-link">Stokta.</b> {p.sameDayShipping ? `${s.shipping.sameDayCutoff}'e kadar verilen siparişler bugün kargoda.` : "1–2 iş günü içinde kargoda."}
                  <span className="block text-mute">Tahmini teslim {s.shipping.deliveryEstimate}{s.shipping.pickupEnabled ? " · Showroom'dan aynı gün teslim alınabilir" : ""}</span>
                </span>
              )}
            </p>
          ) : (
            <p className="rounded-lg bg-warn-bg p-3 text-sm font-bold text-warn">Bu ürün artık satılmıyor. Benzer ürünler için uzmana sor.</p>
          )}

          <div className="hidden md:block">
            <BuyBox productId={p.id} name={p.name} max={p.allowBackorder ? 99 : p.stock} disabled={out} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <a href={wa} target="_blank" className="flex h-12 items-center justify-center gap-2 rounded-lg bg-[#25D366] text-sm font-extrabold text-white"><MessageCircle size={18} /> Bu ürünü sor</a>
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
        {[["neden", "Kimler için"], ["ozellikler", "Teknik özellikler"], ...(vid ? [["video", "Video"]] : []), ["garanti", "Garanti ve servis"], ["yorumlar", `Yorumlar (${p.reviews.length})`], ["sorular", `Sorular (${p.questions.length})`]].map(([id, l]) => (
          <a key={id} href={`#${id}`} className="shrink-0 rounded-full border border-line px-4 py-1.5 text-sm font-bold hover:bg-soft">{l}</a>
        ))}
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-10">
          <section id="neden" className="scroll-mt-40">
            <h2 className="font-display mb-3 text-2xl font-extrabold">Kimler için ideal</h2>
            {quick.length ? (
              <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {quick.map((q) => <div key={q.k} className="rounded-xl bg-soft p-3"><span className="block text-xs text-mute">{q.k}</span><b className="text-sm">{q.v}</b></div>)}
              </div>
            ) : null}
            {p.idealFor.length ? <ul className="flex flex-col gap-2">{p.idealFor.map((t) => <li key={t} className="flex gap-2.5"><Check size={18} className="mt-0.5 shrink-0 text-brand" />{t}</li>)}</ul> : null}
            {p.notFor.length ? (
              <div className="mt-4 rounded-xl bg-[#f6efe3] p-4 text-sm text-[#6b5128]">
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
            <div className="mt-4"><BuyBox productId={p.id} name={p.name} max={p.allowBackorder ? 99 : p.stock} disabled={out} /></div>
            <a href={wa} target="_blank" className="mt-2 flex h-11 items-center justify-center gap-2 rounded-lg bg-[#e9f9ef] text-sm font-extrabold text-[#11643a]"><MessageCircle size={17} /> Uzmana sor</a>
          </div>
        </aside>
      </div>

      {related.length ? (
        <section className="mt-12">
          <h2 className="font-display mb-4 text-2xl font-extrabold">Bunlara da bak</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">{related.map((r) => <ProductCard key={r.id} p={r} installments={inst} />)}</div>
        </section>
      ) : null}
      <StickyBuy productId={p.id} name={p.name} price={formatTL(p.price)} inst={inst > 1 ? `${inst} × ${formatTL(Math.round(p.price / inst))}` : undefined} disabled={out} />
    </div>
  );
}
