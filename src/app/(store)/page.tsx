import { imgProps } from "@/lib/img";
import Link from "next/link";
import { HeroStage, type HeroCard } from "@/components/store/home-client";
import { resolveShortcuts, Shortcuts } from "@/components/store/shortcuts";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { Ticker } from "@/components/store/ticker";
import { BestSellers, CategoryRail, Deals, NewArrivals } from "@/components/store/home-lists";
import { PersonalPicks, RecentlyViewed } from "@/components/store/rails";
import { HomeReviews } from "@/components/store/home-reviews";
import { cardCtx } from "@/lib/card-ctx";
import { getSettings } from "@/lib/settings";
import { bestSellers, categoryRail, getActiveBrands, getBrandGroups, getHome, getNav, productsFor, railWhere, type ProductCard as ProductCardT } from "@/lib/store";
import { BlogShowcase, ExpertBand, TrustBand, WizardBand } from "@/components/store/home-sections";
import { ExploreTabs } from "@/components/store/explore-tabs";
import { RevealSections } from "@/components/store/reveal";

/** Ana sayfa "Amacına göre keşfet" sekmeleri */
const EXPLORE = [
  { k: "define", l: "Define ve sikke", d: "Tarla, bağ, harabe: sikke ve takı için iyi ayrım yapan cihazlar.", href: "/urunler?amac=define", cond: sql`'define' = any(${products.useCases})` },
  { k: "altin", l: "Doğal altın", d: "Mineralli toprakta küçük nugget'ı kaçırmayan altın cihazları.", href: "/urunler?amac=altin", cond: sql`'altin' = any(${products.useCases})` },
  { k: "sahil", l: "Sahil ve su altı", d: "Islak kumda, tuzlu suda ve dalışta çalışan su geçirmez modeller.", href: "/urunler?amac=sahil", cond: sql`'sahil' = any(${products.useCases})` },
  { k: "baslangic", l: "İlk cihazım", d: "Kurulumu kolay, hazır modlu, bütçe dostu başlangıç cihazları.", href: "/urunler?seviye=BEGINNER", cond: sql`${products.experience} = 'BEGINNER'` },
  { k: "pro", l: "Profesyonel", d: "Derin arama, görüntüleme ve uzman ayarları olan üst seviye cihazlar.", href: "/kategori/derin-arama", cond: sql`${products.isPro}` },
];

const unseen = <T extends { id: string }>(list: T[], seen: Set<string>) => list.filter((p) => !seen.has(p.id));
import { BrandGrid, BrandShowcase } from "@/components/store/brand-cards";
import { getMerch, latestFocus } from "@/lib/merch";
import { Head } from "@/components/store/home-lists";
import { FaqSection } from "@/components/seo/blocks";
import { JsonLd } from "@/components/seo/json-ld";
import { QueryToast } from "@/components/store/query-toast";
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
  const side = banners.filter((b) => b.placement === "SIDE").slice(0, 3);
  // Banner altı 3 kart: öncelikli markanın en yeni cihazları (panelden "kampanya kartları"na çevrilebilir).
  // Yeterli yeni cihaz yoksa kalan yer kampanya kartlarıyla dolar.
  const latest = s.merch.heroCards === "latest" ? await latestFocus(s.merch, 3) : [];
  const brandName = latest[0]?.brand ?? "";
  const cards: HeroCard[] = [
    ...latest.map((p) => ({
      id: p.id,
      href: `/urun/${p.slug}`,
      eyebrow: brandName.toLocaleUpperCase("en-US"),
      title: p.name,
      line: p.shortDescription,
      price: p.price,
      oldPrice: p.compareAtPrice,
      image: p.image,
      isNew: p.badges.some((b) => /^yeni/i.test(b)),
    })),
    ...side.map((b) => ({ id: b.id, href: b.linkUrl || "#", eyebrow: b.eyebrow ?? "KAMPANYA", title: b.title, line: b.subtitle, image: b.imageUrl })),
  ].slice(0, 3);
  const strip = banners.find((b) => b.placement === "STRIP");
  const ctx = cardCtx(s);
  const wa = s.store.whatsapp ? `https://wa.me/${s.store.whatsapp}` : "/iletisim";

  // Ana sayfa üst rafları bir kez hesaplanır; alttaki raflar bunlarda görünen ürünleri tekrar etmez.
  let top: Promise<{ best: ProductCardT[]; fresh: ProductCardT[]; deals: ProductCardT[]; seen: Set<string> }> | null = null;
  const topLists = () =>
    (top ??= (async () => {
      const hasTabs = sections.some((x) => x.type === "PRODUCT_TABS");
      if (!hasTabs) return { best: [], fresh: [], deals: [], seen: new Set<string>() };
      const [best, fresh0, deals0] = await Promise.all([bestSellers(8), productsFor("new", 22), productsFor("deals", 20)]);
      const seen = new Set(best.map((p) => p.id));
      const fresh = unseen(fresh0, seen).slice(0, 10);
      fresh.forEach((p) => seen.add(p.id));
      const deals = unseen(deals0, seen).slice(0, 10);
      deals.forEach((p) => seen.add(p.id));
      return { best, fresh, deals, seen };
    })());
  const rendered = await Promise.all(
    sections.map(async (sec) => {
      const limit = Number(sec.config.limit) || 10;
      switch (sec.type) {
        case "WIZARD_BAND":
          return <WizardBand key={sec.id} title={sec.title} subtitle={sec.subtitle} />;
        case "CATEGORY_TILES": {
          // "Ne arıyorsun?": paneldeki yuvarlak kısayollar (kategori kutuları /kategoriler sayfasında)
          const [allCats, allBrands] = await Promise.all([
            db.select({ slug: categories.slug, imageUrl: categories.imageUrl }).from(categories).where(eq(categories.isActive, true)),
            getActiveBrands(),
          ]);
          return <Shortcuts key={sec.id} title={sec.title || "Ne arıyorsun?"} items={resolveShortcuts(s.nav.shortcuts, allCats, allBrands)} />;
        }
        case "PRODUCT_TABS": {
          // Eski "sekmeli" bölüm artık alt alta listeler: çok satanlar, yeni gelenler, fırsatlar, aynı gün kargo
          // Raflar arası tekrar yok: bir ürün yukarıdaki rafta göründüyse aşağıdakinde tekrar çıkmaz.
          // "Aynı gün kargo" ayrı raf değil; her kartta kargo satırı zaten yazıyor.
          const { best, fresh, deals } = await topLists();
          // "Amacına göre keşfet": aynı katalog, müşterinin amacına göre sekmeli (tekrar değil, farklı bir bakış)
          const explore = await Promise.all(
            EXPLORE.map(async (t) => ({ k: t.k, l: t.l, d: t.d, href: t.href, items: await railWhere(t.cond, 8) })),
          );
          return (
            <div key={sec.id}>
              <BestSellers items={best} ctx={ctx} />
              {fresh.length >= 3 ? <NewArrivals items={fresh} ctx={ctx} /> : null}
              <ExploreTabs tabs={explore} ctx={ctx} />
              {deals.length >= 3 ? <Deals items={deals} ctx={ctx} /> : null}
            </div>
          );
        }
        case "PRODUCT_ROW": {
          const seen = (await topLists()).seen;
          const items = unseen(await productsFor("pro", Math.max(limit, 10) + seen.size), seen);
          return items.length >= 4 ? <CategoryRail key={sec.id} title={sec.title || "Profesyonel seçim"} href="/kategori/derin-arama" items={items} ctx={ctx} /> : null;
        }
        case "BRANDS": {
          const [groups, m] = await Promise.all([getBrandGroups(), getMerch()]);
          if (!groups.length) return null;
          const f = groups.find((g) => g.slug === m.focusBrand);
          const models = f ? await latestFocus(m, 4) : [];
          return (
            <section key={sec.id} className="container-x mt-14">
              <Head title={sec.title || "Markaya göre alışveriş"} sub={sec.subtitle || "Markanı seç, kategorisine göre modelleri gör"} href="/markalar" cta="Tüm markalar" />
              {f ? (
                <BrandShowcase focus={f} models={models} note={m.focusNote || undefined} rest={groups.filter((g) => g !== f)} />
              ) : (
                <BrandGrid brands={groups.slice(0, 8)} />
              )}
            </section>
          );
        }
        case "CATEGORY_RAILS": {
          const cats = nav.categories.filter((c) => !c.parentId).slice(0, Number(sec.config.count) || 4);
          const seen = (await topLists()).seen;
          const rails = (await Promise.all(cats.map((c) => categoryRail(c.id, 12 + seen.size)))).map((r) => unseen(r, seen).slice(0, 12));
          // Yukarıdaki raflarda zaten görünenler çıkınca 4'ten az ürün kalan kategori rafı gösterilmez (sayfa kısa ve tekrarsız kalsın)
          return (
            <div key={sec.id}>
              {cats.map((c, i) => (rails[i].length >= 4 ? <CategoryRail key={c.id} title={c.name} href={`/kategori/${c.slug}`} items={rails[i]} ctx={ctx} /> : null))}
            </div>
          );
        }
        case "EXPERT_BAND":
          return <ExpertBand key={sec.id} title={sec.title} wa={wa} phone={s.store.phone} hours={s.store.workingHours} />;
        case "TRUST":
          return <TrustBand key={sec.id} />;
        default:
          return null;
      }
    }),
  );

  return (
    <>
      <Ticker t={s.ticker} />
      <HeroStage slides={hero} cards={cards} />
      {strip ? (
        <Link href={strip.linkUrl || "#"} className="container-x mt-4 block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img {...imgProps(strip.imageUrl, [640, 1080, 1600], "100vw")} loading="lazy" alt={strip.title} className="w-full rounded-xl" />
        </Link>
      ) : null}
      <div className="container-x mt-4">
        <h1 className="sr-only">{s.store.name} · Metal dedektörü ve define dedektörü modelleri — orijinal, faturalı, garantili</h1>
      </div>
      <RecentlyViewed compact className="container-x mt-6" />
      <RevealSections>
      {rendered}
      <PersonalPicks className="container-x mt-12" />
      <HomeReviews googleReviewUrl={s.store.googleReviewUrl || undefined} />
      <BlogShowcase posts={posts.slice(0, 3)} />
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
      </RevealSections>
      <JsonLd data={graph(storeLd(s))} />
      <QueryToast />
    </>
  );
}
