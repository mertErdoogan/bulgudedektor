import { pageMeta } from "@/lib/seo";
import { redirectOrNotFound } from "@/lib/redirects";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { pages } from "@/db/schema";
import { renderContent } from "@/lib/markdown";
import { formatDate } from "@/lib/utils";
import { getSettings } from "@/lib/settings";
import { siteUrl } from "@/lib/seo";
import { fillLegal, legalTokens } from "@/lib/legal-tokens";

async function get(slug: string) {
  return db.query.pages.findFirst({ where: and(eq(pages.slug, slug), eq(pages.isPublished, true)) });
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const p = await get((await params).slug);
  return p ? pageMeta({ title: p.title, description: p.seoDescription, path: `/sayfa/${p.slug}` }) : {};
}
export default async function ContentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await get(slug);
  if (!p) return redirectOrNotFound(`/sayfa/${slug}`);
  const st = await getSettings();
  const html = fillLegal(renderContent(p.content), legalTokens(st.store, st.payment, siteUrl()));
  return (
    <article className="container-x max-w-3xl py-10">
      <h1 className="font-display text-3xl font-extrabold">{p.title}</h1>
      <p className="mt-1 text-xs text-mute">Son güncelleme {formatDate(p.updatedAt)}</p>
      <div className="prose-lite mt-6" dangerouslySetInnerHTML={{ __html: html }} />
    </article>
  );
}
