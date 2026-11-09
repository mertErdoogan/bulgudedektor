import { getPublishedPosts } from "@/lib/content";
import { abs, siteUrl } from "@/lib/seo";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
const x = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function GET() {
  const [posts, s] = await Promise.all([getPublishedPosts(), getSettings()]);
  const items = posts
    .slice(0, 50)
    .map((p) => `<item><title>${x(p.title)}</title><link>${abs(`/blog/${p.slug}`)}</link><guid isPermaLink="true">${abs(`/blog/${p.slug}`)}</guid><pubDate>${(p.publishedAt ?? p.updatedAt).toUTCString()}</pubDate><category>${x(p.category)}</category><description>${x(p.excerpt ?? "")}</description></item>`)
    .join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${x(s.store.name)} Rehberleri</title><link>${siteUrl()}/blog</link><atom:link href="${siteUrl()}/blog/rss.xml" rel="self" type="application/rss+xml"/><description>${x(s.seo.description)}</description><language>tr-TR</language>${items}</channel></rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
