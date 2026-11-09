import { redirectOrNotFound } from "@/lib/redirects";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { Catalog, type SP } from "@/components/store/catalog";
import { PostCards } from "@/components/store/post-cards";
import { AnswerBox, FaqSection } from "@/components/seo/blocks";
import { getFaqs, relatedPosts, toQA } from "@/lib/content";
import { markdownToHtml } from "@/lib/markdown";
import { pageMeta } from "@/lib/seo";
import { catalogStats } from "@/lib/store";
import { formatTL } from "@/lib/utils";

async function getCat(slug: string) {
  return db.query.categories.findFirst({ where: and(eq(categories.slug, slug), eq(categories.isActive, true)) });
}

export async function generateMetadata({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<SP> }) {
  const c = await getCat((await params).slug);
  if (!c) return {};
  const filtered = Object.keys(await searchParams).length > 0;
  const year = new Date().getFullYear();
  return pageMeta({
    title: c.seoTitle || `${c.name} Dedektörleri ve Fiyatları (${year})`,
    description: c.seoDescription || c.description || `${c.name} için en iyi metal dedektörü modelleri, güncel fiyatlar ve uzman önerileri. Orijinal, faturalı, 2 yıl garantili.`,
    path: `/kategori/${c.slug}`,
    image: c.imageUrl,
    noindex: filtered,
  });
}

export default async function CategoryPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<SP> }) {
  const { slug } = await params;
  const c = await getCat(slug);
  if (!c) return redirectOrNotFound(`/kategori/${slug}`);
  const [stats, faq, guides] = await Promise.all([catalogStats({ categoryId: c.id }), getFaqs({ categoryId: c.id }), relatedPosts({ categoryId: c.id, limit: 3 })]);
  const lower = c.name.toLocaleLowerCase("tr-TR");
  const summary = stats.count ? (
    <AnswerBox title={`${c.name} için hangi dedektör?`}>
      Arena Dedektör’de {lower} için <b>{stats.count} model</b> var
      {stats.min != null ? (stats.min === stats.max ? <>; fiyatı <b>{formatTL(stats.min)}</b></> : <>; fiyatlar <b>{formatTL(stats.min)}</b> ile <b>{formatTL(stats.max)}</b> arasında</>) : null}
      {stats.brands.length ? <> ({stats.brands.join(", ")})</> : null}. Öne çıkanlar:{" "}
      {stats.picks.map((p, i) => (
        <span key={p.id}>{i ? ", " : ""}<Link className="font-bold text-link" href={`/urun/${p.slug}`}>{p.name}</Link></span>
      ))}
      . Tüm cihazlar orijinal, faturalı ve garantilidir; emin değilsen 6 soruluk sihirbaz sana uygun modeli önerir.
    </AnswerBox>
  ) : null;
  return (
    <Catalog title={`${c.name} için dedektörler`} intro={c.description} top={summary} crumbs={[{ href: `/kategori/${c.slug}`, label: c.name }]} sp={await searchParams} base={{ category: c.slug }}>
      {c.seoContent ? (
        <section className="max-w-3xl">
          <div className="prose-lite prose-article" dangerouslySetInnerHTML={{ __html: markdownToHtml(c.seoContent) }} />
        </section>
      ) : null}
      {faq.length ? <FaqSection className="max-w-3xl" items={toQA(faq)} title={`${c.name} dedektörleri hakkında sık sorulanlar`} /> : null}
      {guides.length ? (
        <section>
          <h2 className="font-display mb-4 text-2xl font-extrabold">{c.name} rehberleri</h2>
          <PostCards posts={guides} />
        </section>
      ) : null}
    </Catalog>
  );
}
