import Link from "next/link";
import { Breadcrumbs } from "@/components/seo/blocks";
import { JsonLd } from "@/components/seo/json-ld";
import { PostCards } from "@/components/store/post-cards";
import { getPublishedPosts } from "@/lib/content";
import { abs, graph, ORG_ID, pageMeta } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ k?: string }> }) {
  const k = (await searchParams).k;
  return pageMeta({
    title: k ? `${k} — Dedektör Rehberleri` : "Dedektör Rehberleri ve Blog",
    description: "Metal dedektörü seçimi, kullanım, ayarlar, bakım ve yasal mevzuat üzerine uzman rehberleri. Hangi dedektör, nasıl kullanılır, hangi bölgede ne aranır.",
    path: k ? `/blog?k=${encodeURIComponent(k)}` : "/blog",
  });
}

export default async function BlogIndex({ searchParams }: { searchParams: Promise<{ k?: string }> }) {
  const k = (await searchParams).k;
  const all = await getPublishedPosts();
  const cats = [...new Set(all.map((p) => p.category))];
  const list = k ? all.filter((p) => p.category === k) : all;
  return (
    <div className="container-x py-6">
      <JsonLd
        data={graph({
          "@type": "Blog",
          "@id": `${abs("/blog")}#blog`,
          name: "Arena Dedektör Rehberleri",
          url: abs("/blog"),
          inLanguage: "tr-TR",
          publisher: { "@id": ORG_ID() },
          blogPost: list.slice(0, 20).map((p) => ({ "@type": "BlogPosting", headline: p.title, url: abs(`/blog/${p.slug}`), datePublished: (p.publishedAt ?? p.updatedAt).toISOString() })),
        })}
      />
      <Breadcrumbs items={[{ name: "Rehberler", path: "/blog" }]} />
      <h1 className="font-display text-[28px] font-extrabold md:text-[36px]">Dedektör rehberleri</h1>
      <p className="mt-2 max-w-3xl text-[15px] text-[#3f3f46]">Cihaz seçiminden ayarlara, sahada kullanımdan yasal mevzuata: sahada çalışan uzmanlarımızın sade ve doğrudan yanıtları.</p>
      {cats.length > 1 ? (
        <div className="scrollbar-none mt-5 flex gap-2 overflow-x-auto">
          <Link href="/blog" className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-bold ${!k ? "bg-deep text-white" : "border border-line"}`}>Tümü</Link>
          {cats.map((c) => (
            <Link key={c} href={`/blog?k=${encodeURIComponent(c)}`} className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-bold ${k === c ? "bg-deep text-white" : "border border-line"}`}>{c}</Link>
          ))}
        </div>
      ) : null}
      <div className="mt-6">{list.length ? <PostCards posts={list} /> : <p className="rounded-xl bg-soft p-8 text-center text-mute">Henüz yayınlanmış yazı yok.</p>}</div>
    </div>
  );
}
