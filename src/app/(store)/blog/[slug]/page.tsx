import { imgProps } from "@/lib/img";
import { cardCtx } from "@/lib/card-ctx";
import { redirectOrNotFound } from "@/lib/redirects";
import Link from "next/link";
import { and, eq, inArray } from "drizzle-orm";
import { Clock, MessageCircle, UserRound } from "lucide-react";
import { products } from "@/db/schema";
import { AnswerBox, Breadcrumbs, FaqSection } from "@/components/seo/blocks";
import { JsonLd } from "@/components/seo/json-ld";
import { PostCards } from "@/components/store/post-cards";
import { ProductCard } from "@/components/store/product-card";
import { getPost, relatedPosts } from "@/lib/content";
import { extractHeadings, markdownToHtml } from "@/lib/markdown";
import { articleLd, graph, pageMeta, wordCount } from "@/lib/seo";
import { getSettings } from "@/lib/settings";
import { cardQuery } from "@/lib/store";
import { formatDate } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const p = await getPost((await params).slug);
  if (!p) return {};
  return pageMeta({
    title: p.seoTitle || p.title,
    description: p.seoDescription || p.excerpt || p.answer,
    path: `/blog/${p.slug}`,
    image: p.coverImage,
    type: "article",
    publishedTime: p.publishedAt,
    modifiedTime: p.updatedAt,
  });
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = await getPost((await params).slug);
  if (!p) return redirectOrNotFound(`/blog/${(await params).slug}`);
  const [s, items, more] = await Promise.all([
    getSettings(),
    p.relatedProductIds.length ? cardQuery().where(and(eq(products.status, "ACTIVE"), inArray(products.id, p.relatedProductIds))).limit(4) : Promise.resolve([]),
    relatedPosts({ categoryId: p.relatedCategoryIds[0], excludeId: p.id, limit: 3 }),
  ]);
  const words = wordCount(`${p.answer ?? ""} ${p.content}`);
  const minutes = Math.max(2, Math.round(words / 200));
  const toc = extractHeadings(p.content);
  const wa = s.store.whatsapp ? `https://wa.me/${s.store.whatsapp}?text=${encodeURIComponent(`Merhaba, "${p.title}" yazısını okudum, bir sorum var.`)}` : "/iletisim";
  return (
    <article className="container-x py-6">
      <JsonLd data={graph(articleLd(p, words))} />
      <Breadcrumbs items={[{ name: "Rehberler", path: "/blog" }, { name: p.category, path: `/blog?k=${encodeURIComponent(p.category)}` }, { name: p.title, path: `/blog/${p.slug}` }]} />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 max-w-3xl">
          <header>
            <p className="text-[12px] font-extrabold tracking-wider text-brand uppercase">{p.category}</p>
            <h1 className="font-display mt-1 text-[28px] leading-tight font-extrabold md:text-[38px]">{p.title}</h1>
            <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-mute">
              <span className="flex items-center gap-1.5"><UserRound size={14} /> <b className="text-deep">{p.authorName}</b>{p.authorTitle ? `, ${p.authorTitle}` : ""}</span>
              <span>Yayın: <time dateTime={(p.publishedAt ?? p.createdAt).toISOString()}>{formatDate(p.publishedAt ?? p.createdAt)}</time></span>
              <span>Güncelleme: <time dateTime={p.updatedAt.toISOString()}>{formatDate(p.updatedAt)}</time></span>
              <span className="flex items-center gap-1"><Clock size={14} /> {minutes} dk okuma</span>
            </p>
          </header>
          {p.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img {...imgProps(p.coverImage, [640, 1080, 1600], "(min-width: 1024px) 800px, 100vw")} alt={p.title} className="mt-5 aspect-[16/9] w-full rounded-2xl object-cover" />
          ) : null}
          {p.answer ? <div className="mt-6"><AnswerBox>{p.answer}</AnswerBox></div> : null}
          {toc.length > 2 ? (
            <nav aria-label="İçindekiler" className="mt-6 rounded-2xl border border-line p-4 lg:hidden">
              <b className="text-sm">İçindekiler</b>
              <ol className="mt-2 flex flex-col gap-1 text-sm">{toc.map((h) => <li key={h.id} className={h.level === 3 ? "pl-4" : ""}><a href={`#${h.id}`} className="text-link">{h.text}</a></li>)}</ol>
            </nav>
          ) : null}
          <div className="prose-lite prose-article mt-6" dangerouslySetInnerHTML={{ __html: markdownToHtml(p.content) }} />
          {p.faq.length ? <FaqSection className="mt-10" items={p.faq} /> : null}
          <aside className="mt-10 flex gap-4 rounded-2xl bg-soft p-5" aria-label="Yazar">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-brand text-xl font-extrabold text-white">{p.authorName.slice(0, 1)}</span>
            <div>
              <p className="font-bold">{p.authorName}</p>
              {p.authorTitle ? <p className="text-sm text-mute">{p.authorTitle}</p> : null}
              <p className="mt-1 text-sm leading-relaxed">{p.authorBio || `${s.store.name} uzman ekibi, sahada test ettiği cihazlar ve müşterilerinden gelen gerçek sorular üzerinden yazar. İçerikler düzenli olarak güncellenir.`}</p>
              <a href={wa} target="_blank" className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-link"><MessageCircle size={15} /> Yazara / uzmana soru sor</a>
            </div>
          </aside>
          {p.tags.length ? <p className="mt-4 flex flex-wrap gap-2">{p.tags.map((t) => <span key={t} className="rounded-full bg-tint px-3 py-1 text-[12px] font-bold">#{t}</span>)}</p> : null}
        </div>
        <aside className="hidden lg:block">
          <div className="sticky top-20 flex flex-col gap-4">
            {toc.length > 2 ? (
              <nav aria-label="İçindekiler" className="rounded-2xl border border-line p-4">
                <b className="text-sm">İçindekiler</b>
                <ol className="mt-2 flex flex-col gap-1.5 text-sm">{toc.map((h) => <li key={h.id} className={h.level === 3 ? "pl-3" : ""}><a href={`#${h.id}`} className="text-link hover:underline">{h.text}</a></li>)}</ol>
              </nav>
            ) : null}
            <div className="rounded-2xl bg-deep p-5 text-white">
              <b className="text-lg">Hangi dedektör sana uygun?</b>
              <p className="mt-1 text-sm text-white/80">6 soruyu yanıtla, sana özel 3 öneri al.</p>
              <Link href="/sihirbaz" className="mt-3 inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-extrabold text-white">Sihirbazı başlat</Link>
            </div>
          </div>
        </aside>
      </div>
      {items.length ? (
        <section className="mt-12">
          <h2 className="font-display mb-4 text-2xl font-extrabold">Yazıda geçen cihazlar</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">{items.map((r) => <ProductCard key={r.id} p={r} ctx={cardCtx(s)} />)}</div>
        </section>
      ) : null}
      {more.length ? (
        <section className="mt-12">
          <h2 className="font-display mb-4 text-2xl font-extrabold">Bunları da oku</h2>
          <PostCards posts={more} />
        </section>
      ) : null}
    </article>
  );
}
