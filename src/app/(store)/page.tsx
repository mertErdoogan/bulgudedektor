import Link from "next/link";
import { ArrowRight, Compass, FileText, MessageCircle, RotateCcw, ShieldCheck, Store, Video } from "lucide-react";
import { HeroSlider } from "@/components/store/home-client";
import { BestSellers, CategoryRail, Deals, NewArrivals, SameDay } from "@/components/store/home-lists";
import { RecentlyViewed } from "@/components/store/rails";
import { HomeReviews } from "@/components/store/home-reviews";
import { cardCtx } from "@/lib/card-ctx";
import { msToCutoff } from "@/lib/delivery";
import { and, eq } from "drizzle-orm";
import { products } from "@/db/schema";
import { cardQuery } from "@/lib/store";
import { getSettings } from "@/lib/settings";
import { bestSellers, getHome, getNav, productsFor } from "@/lib/store";
import { FaqSection } from "@/components/seo/blocks";
import { JsonLd } from "@/components/seo/json-ld";
import { PostCards } from "@/components/store/post-cards";
import { getFaqs, getPublishedPosts, toQA } from "@/lib/content";
import { graph, pageMeta, storeLd } from "@/lib/seo";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return pageMeta({ title: s.seo.title, absoluteTitle: true, description: s.seo.description, path: "/", image: s.seo.ogImage });
}

export const dynamic = "force-dynamic";

export default async function Home() {
  const [{ sections, banners }, nav, s, homeFaq, posts] = await Promise.all([getHome(), getNav(), getSettings(), getFaqs({ home: true }), getPublishedPosts()]);
  const hero = banners.filter((b) => b.placement === "HERO");
  const side = banners.filter((b) => b.placement === "SIDE").slice(0, 2);
  const strip = banners.find((b) => b.placement === "STRIP");
  const ctx = cardCtx(s);
  const wa = s.store.whatsapp ? `https://wa.me/${s.store.whatsapp}` : "/iletisim";

  const rendered = await Promise.all(
    sections.map(async (sec) => {
      const limit = Number(sec.config.limit) || 10;
      switch (sec.type) {
        case "WIZARD_BAND":
          return (
            <section key={sec.id} className="container-x mt-6">
              <div className="flex flex-col gap-4 rounded-2xl border-[1.5px] border-brand bg-tint p-4 md:flex-row md:items-center md:p-5">
                <div className="flex flex-1 items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand text-white"><Compass size={22} /></span>
                  <span>
                    <b className="text-[17px]">{sec.title}</b>
                    <span className="block text-sm text-mute">{sec.subtitle}</span>
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="hidden text-sm font-bold text-mute lg:inline">Ne arayacaksın?</span>
                  {[["define", "Sikke ve define"], ["altin", "Doğal altın"], ["sahil", "Sahil ve su altı"]].map(([k, l]) => (
                    <Link key={k} href={`/sihirbaz?amac=${k}`} className="rounded-lg border border-line bg-white px-3.5 py-2 text-sm font-bold hover:border-brand">{l}</Link>
                  ))}
                  <Link href="/sihirbaz" className="rounded-lg bg-brand px-4 py-2 text-sm font-extrabold text-white">Başla →</Link>
                </div>
              </div>
            </section>
          );
        case "CATEGORY_TILES":
          return (
            <section key={sec.id} className="container-x mt-10">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <h2 className="font-display text-2xl font-extrabold md:text-[32px]">
                  {sec.title} {sec.subtitle ? <span className="text-link">{sec.subtitle}</span> : null}
                </h2>
                <Link href="/sihirbaz" className="rounded-lg border-[1.5px] border-deep px-4 py-2 text-sm font-extrabold">Emin değilim, 6 soruda öner →</Link>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {nav.categories.filter((c) => !c.parentId).map((c) => (
                  <Link key={c.id} href={`/kategori/${c.slug}`} className="group relative flex flex-col overflow-hidden rounded-xl bg-tint transition hover:-translate-y-0.5 hover:shadow-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <span className="block h-[110px] px-3 pt-3 md:h-[160px]">{c.imageUrl ? <img src={c.imageUrl} alt="" className="h-full w-full object-contain mix-blend-multiply" /> : null}</span>
                    <span className="flex flex-col px-3.5 pt-2 pb-3.5">
                      <b className="truncate text-[15px]">{c.name}</b>
                      <span className="truncate text-[13px] text-mute">{c.shortText}</span>
                    </span>
                    <span className="absolute top-2 right-2 grid h-8 w-8 place-items-center rounded-full bg-white shadow-sm transition group-hover:translate-x-0.5"><ArrowRight size={15} /></span>
                  </Link>
                ))}
              </div>
            </section>
          );
        case "PRODUCT_TABS": {
          // Eski "sekmeli" bölüm artık alt alta listeler: çok satanlar, yeni gelenler, fırsatlar, aynı gün kargo
          const n = Math.max(limit, 10);
          const [best, fresh, deals, sameday] = await Promise.all([bestSellers(n), productsFor("new", n + 1), productsFor("deals", 12), productsFor("sameday", 12)]);
          return (
            <div key={sec.id}>
              <BestSellers items={best} ctx={ctx} />
              <NewArrivals items={fresh} ctx={ctx} />
              <Deals items={deals} ctx={ctx} />
              <SameDay items={sameday} ctx={ctx} ms={msToCutoff(s.shipping)} cutoff={s.shipping.sameDayCutoff} />
            </div>
          );
        }
        case "PRODUCT_ROW": {
          const items = await productsFor("pro", Math.max(limit, 10));
          return <CategoryRail key={sec.id} title={sec.title || "Profesyonel seçim"} href="/kategori/derin-arama" items={items} ctx={ctx} />;
        }
        case "CATEGORY_RAILS": {
          const cats = nav.categories.filter((c) => !c.parentId).slice(0, Number(sec.config.count) || 4);
          const rails = await Promise.all(cats.map((c) => cardQuery().where(and(eq(products.status, "ACTIVE"), eq(products.categoryId, c.id))).orderBy(products.sortOrder).limit(12)));
          return (
            <div key={sec.id}>
              {cats.map((c, i) => (
                <CategoryRail key={c.id} title={c.name} href={`/kategori/${c.slug}`} items={rails[i]} ctx={ctx} />
              ))}
            </div>
          );
        }
        case "EXPERT_BAND":
          return (
            <section key={sec.id} className="container-x mt-10">
              <div className="flex flex-col gap-4 rounded-2xl bg-deep p-6 text-white md:flex-row md:items-center">
                <div className="flex-1">
                  <b className="font-display text-xl md:text-2xl">{sec.title}</b>
                  <p className="text-sm opacity-80">{s.store.workingHours} · {sec.subtitle ?? "ortalama yanıt birkaç dakika"}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <a href={wa} target="_blank" className="flex h-12 items-center justify-center gap-2 rounded-lg bg-[#25D366] px-5 font-extrabold"><MessageCircle size={18} /> WhatsApp&apos;tan yaz</a>
                  <Link href="/iletisim?konu=goruntulu" className="flex h-12 items-center justify-center gap-2 rounded-lg bg-white px-5 font-extrabold text-deep"><Video size={18} /> Görüntülü randevu</Link>
                </div>
              </div>
            </section>
          );
        case "TRUST":
          return (
            <section key={sec.id} className="container-x mt-10 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[1.7fr_1fr_1fr_1fr]">
              <form action="/seri-no" className="flex min-w-0 items-center gap-3 rounded-xl border border-[#f3d6d1] bg-tint p-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand text-white"><ShieldCheck size={24} /></span>
                <span className="flex min-w-0 flex-1 flex-col gap-2">
                  <span><b>Cihazın orijinal mi?</b> <span className="text-[13px] text-mute">Seri numarasıyla distribütör kaydını kontrol et</span></span>
                  <span className="flex gap-2">
                    <input name="no" required placeholder="Seri no" className="h-11 min-w-0 flex-1 rounded-lg border border-[#d6d6d9] bg-white px-3" />
                    <button className="h-11 shrink-0 rounded-lg bg-brand px-4 text-sm font-extrabold text-white">Sorgula</button>
                  </span>
                </span>
              </form>
              {[[FileText, "Faturalı, 2 yıl garanti", "Distribütör garantisi"], [RotateCcw, "14 gün kolay iade", "Tek tıkla talep"], [Store, "Showroom'da dene", "Test alanında, elinde"]].map(([I, t, d]) => {
                const Icon = I as typeof FileText;
                return (
                  <div key={t as string} className="flex items-center gap-3 rounded-xl bg-soft p-4">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-pop text-on-pop"><Icon size={22} /></span>
                    <span><b className="block">{t as string}</b><span className="text-sm text-mute">{d as string}</span></span>
                  </div>
                );
              })}
            </section>
          );
        default:
          return null;
      }
    }),
  );

  return (
    <>
      <section className="bg-soft py-4 md:py-5">
        <div className="container-x grid gap-3 md:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)] md:gap-4">
          <HeroSlider slides={hero} />
          {side.length ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-1 md:gap-4">
              {side.map((b) => (
                <Link key={b.id} href={b.linkUrl || "#"} className="flex items-center gap-2 overflow-hidden rounded-2xl bg-tint p-4 hover:shadow-md md:p-5">
                  <span className="min-w-0 flex-1">
                    {b.eyebrow ? <span className="block text-[11px] font-extrabold tracking-wider text-link">{b.eyebrow}</span> : null}
                    <b className="block text-[15px] leading-tight md:text-lg">{b.title}</b>
                    {b.subtitle ? <span className="mt-1 block text-sm font-bold text-link">{b.subtitle} →</span> : null}
                  </span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.imageUrl} alt="" className="h-20 w-20 shrink-0 object-contain mix-blend-multiply md:h-28 md:w-28" />
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </section>
      {strip ? (
        <Link href={strip.linkUrl || "#"} className="container-x mt-4 block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={strip.imageUrl} alt={strip.title} className="w-full rounded-xl" />
        </Link>
      ) : null}
      <div className="container-x mt-4">
        <h1 className="text-[13.5px] font-bold text-mute">{s.store.name} · Metal dedektörü ve define dedektörü modelleri — orijinal, faturalı, garantili</h1>
      </div>
      <RecentlyViewed className="container-x mt-8" />
      {rendered}
      <HomeReviews googleReviewUrl={s.store.googleReviewUrl || undefined} />
      {posts.length ? (
        <section className="container-x mt-12">
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 className="font-display text-2xl font-extrabold md:text-[30px]">Dedektör rehberleri</h2>
            <Link href="/blog" className="flex items-center gap-1 text-sm font-bold text-link">Tümü <ArrowRight size={16} /></Link>
          </div>
          <PostCards posts={posts.slice(0, 3)} />
        </section>
      ) : null}
      <section className="container-x mt-12 max-w-4xl">
        <h2 className="font-display text-[22px] leading-tight font-extrabold md:text-[26px]">{s.store.name}: metal dedektörü ve define dedektörü, uzman desteğiyle</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-[#3f3f46]">{s.seo.aboutForAi}</p>
      </section>
      {homeFaq.length ? (
        <div className="container-x mt-12 max-w-4xl">
          <FaqSection items={toQA(homeFaq)} title="Metal dedektörü hakkında sık sorulan sorular" />
          <p className="mt-3 text-sm"><Link href="/sss" className="font-bold text-link">Tüm soruları gör →</Link> · <Link href="/sozluk" className="font-bold text-link">Dedektör sözlüğü →</Link></p>
        </div>
      ) : null}
      <JsonLd data={graph(storeLd(s))} />
    </>
  );
}
