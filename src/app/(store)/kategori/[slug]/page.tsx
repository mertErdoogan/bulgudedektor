import { redirectOrNotFound } from "@/lib/redirects";
import Link from "@/components/locale-link";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { Catalog, type SP } from "@/components/store/catalog";
import { PostCards } from "@/components/store/post-cards";
import { AnswerBox, FaqSection } from "@/components/seo/blocks";
import { getFaqs, relatedPosts, toQA } from "@/lib/content";
import { markdownToHtml } from "@/lib/markdown";
import { metaDesc, pageMeta } from "@/lib/seo";
import { catalogStats } from "@/lib/store";
import { formatTL } from "@/lib/utils";
import { getT } from "@/lib/i18n/server";
import { localizeOne } from "@/lib/i18n/content";
import { getSettings } from "@/lib/settings";
import { ArrowRight, BookOpen, Compass, MessageCircle } from "lucide-react";

async function getCat(slug: string) {
  const c = await db.query.categories.findFirst({ where: and(eq(categories.slug, slug), eq(categories.isActive, true)) });
  return c ? localizeOne(c, "category") : c;
}

export async function generateMetadata({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<SP> }) {
  const c = await getCat((await params).slug);
  if (!c) return {};
  const filtered = Object.keys(await searchParams).length > 0;
  const year = new Date().getFullYear();
  return pageMeta({
    title: c.seoTitle || `${c.name} Dedektörleri ve Fiyatları (${year})`,
    description: metaDesc([c.seoDescription, c.description], `${c.name} için en iyi metal dedektörü modelleri, güncel fiyatlar ve uzman önerileri. Orijinal, faturalı, 2 yıl garantili.`),
    path: `/kategori/${c.slug}`,
    image: c.imageUrl,
    noindex: filtered,
  });
}

export default async function CategoryPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<SP> }) {
  const { slug } = await params;
  const c = await getCat(slug);
  if (!c) return redirectOrNotFound(`/kategori/${slug}`);
  const [stats, faq, guides, t, s] = await Promise.all([catalogStats({ categoryId: c.id }), getFaqs({ categoryId: c.id }), relatedPosts({ categoryId: c.id, limit: 3 }), getT(), getSettings()]);
  const wa = s.store.whatsapp ? `https://wa.me/${s.store.whatsapp}?text=${encodeURIComponent(`Merhaba, ${c.name} için cihaz önerisi almak istiyorum.`)}` : "/iletisim";
  const lower = c.name.toLocaleLowerCase("tr-TR");
  const summary = stats.count && t.locale === "en" ? (
    <AnswerBox title={`Which ${c.name} detector?`}>
      We carry <b>{stats.count} models</b> for {c.name.toLocaleLowerCase("en-US")}
      {stats.min != null ? (stats.min === stats.max ? <>, priced at <b>{formatTL(stats.min)}</b></> : <>, from <b>{formatTL(stats.min)}</b> to <b>{formatTL(stats.max)}</b></>) : null}
      {stats.brands.length ? <> ({stats.brands.join(", ")})</> : null}. Popular picks:{" "}
      {stats.picks.map((p, i) => (
        <span key={p.id}>{i ? ", " : ""}<Link className="font-bold text-link" href={`/urun/${p.slug}`}>{p.name}</Link></span>
      ))}
      . Every device is genuine, invoiced and under warranty; not sure? Our 6-question finder suggests the right model.
    </AnswerBox>
  ) : stats.count ? (
    <AnswerBox title={`${c.name} için hangi dedektör?`}>
      Derinova Dedektör’de {lower} için <b>{stats.count} model</b> var
      {stats.min != null ? (stats.min === stats.max ? <>; fiyatı <b>{formatTL(stats.min)}</b></> : <>; fiyatlar <b>{formatTL(stats.min)}</b> ile <b>{formatTL(stats.max)}</b> arasında</>) : null}
      {stats.brands.length ? <> ({stats.brands.join(", ")})</> : null}. Öne çıkanlar:{" "}
      {stats.picks.map((p, i) => (
        <span key={p.id}>{i ? ", " : ""}<Link className="font-bold text-link" href={`/urun/${p.slug}`}>{p.name}</Link></span>
      ))}
      . Tüm cihazlar orijinal, faturalı ve garantilidir; emin değilsen 6 soruluk sihirbaz sana uygun modeli önerir.
    </AnswerBox>
  ) : null;
  return (
    <Catalog title={t("cat.title", { ad: c.name })} intro={c.description} top={summary} crumbs={[{ href: `/kategori/${c.slug}`, label: c.name }]} sp={await searchParams} base={{ category: c.slug }}>
      {c.seoContent || faq.length ? (
        /* Satın alma rehberi: içerik kartı + yanda yapışkan yardım kartları; madde, tablo ve uyarılar özel biçimde */
        <section className="rounded-[32px] bg-[#f4f4f5] p-2 md:p-3" data-testid="category-guide">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="flex flex-col gap-3">
              {c.seoContent ? (
                <div className="rounded-[26px] bg-white p-5 md:p-10">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fdecea] px-3 py-1 text-[11px] font-extrabold tracking-[.14em] text-brand"><BookOpen size={13} /> SATIN ALMA REHBERİ</span>
                  <div className="guide-premium prose-lite prose-article mt-1" dangerouslySetInnerHTML={{ __html: markdownToHtml(c.seoContent) }} />
                </div>
              ) : null}
              {faq.length ? (
                <div className="rounded-[26px] bg-white p-5 md:p-10">
                  <FaqSection variant="cards" items={toQA(faq)} title={`${c.name} dedektörleri hakkında sık sorulanlar`} />
                </div>
              ) : null}
            </div>
            <aside className="flex flex-col gap-3 lg:sticky lg:top-24 lg:self-start">
              <div className="relative isolate overflow-hidden rounded-[26px] bg-deep p-6 text-white">
                <Compass aria-hidden size={120} strokeWidth={1} className="absolute -right-6 -bottom-8 -z-10 text-white/[.06]" />
                <span className="text-[11px] font-extrabold tracking-[.14em] text-white/60">1 DAKİKALIK TEST</span>
                <p className="font-display mt-2 text-[21px] leading-tight font-extrabold">Hâlâ emin değil misin?</p>
                <p className="mt-1.5 text-[13.5px] text-white/70">6 kısa soruya cevap ver, sana uygun 3 cihazı nedenleriyle gösterelim.</p>
                <Link href="/sihirbaz" className="mt-5 flex h-11 items-center justify-center gap-2 rounded-full bg-white text-[14px] font-extrabold text-deep transition hover:-translate-y-0.5">Teste başla <ArrowRight size={16} /></Link>
              </div>
              <a href={wa} target="_blank" rel="noopener" className="group flex items-center gap-3 rounded-[22px] bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-20px_rgba(20,20,22,.5)]">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#e8f8ee] text-[#1f8a4c] transition group-hover:-rotate-6"><MessageCircle size={20} /></span>
                <span className="min-w-0"><b className="block text-[14px]">Uzmanına sor</b><span className="block text-[12.5px] text-mute">WhatsApp&apos;tan yaz, hızlı cevap al</span></span>
              </a>
              {stats.count ? (
                <div className="grid grid-cols-2 gap-2 rounded-[22px] bg-white p-4 text-center">
                  <span><b className="font-display block text-[24px] leading-none">{stats.count}</b><span className="text-[11.5px] text-mute">model</span></span>
                  <span><b className="font-display block text-[24px] leading-none">{stats.brands.length}</b><span className="text-[11.5px] text-mute">marka</span></span>
                  {stats.min != null ? <span className="col-span-2 mt-1 rounded-xl bg-soft px-2 py-1.5 text-[12.5px] font-bold">{formatTL(stats.min)} – {formatTL(stats.max ?? stats.min)}</span> : null}
                </div>
              ) : null}
            </aside>
          </div>
        </section>
      ) : null}
      {guides.length ? (
        <section>
          <h2 className="font-display mb-4 text-2xl font-extrabold">{c.name} rehberleri</h2>
          <PostCards posts={guides} />
        </section>
      ) : null}
    </Catalog>
  );
}
