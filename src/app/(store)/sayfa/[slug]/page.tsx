import { excerpt, pageMeta } from "@/lib/seo";
import { redirectOrNotFound } from "@/lib/redirects";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { pages } from "@/db/schema";
import { renderContent } from "@/lib/markdown";
import { formatDate } from "@/lib/utils";
import { getSettings } from "@/lib/settings";
import { siteUrl } from "@/lib/seo";
import { fillLegal, legalTokens } from "@/lib/legal-tokens";
import { AboutPage } from "@/components/store/about-page";
import { getLocale, resolveLocaleSlug } from "@/lib/i18n/server";
import { localize } from "@/lib/i18n/content";
import { permanentRedirect } from "next/navigation";

async function get(slug: string) {
  const p = await db.query.pages.findFirst({ where: and(eq(pages.slug, slug), eq(pages.isPublished, true)) });
  if (!p) return p;
  // İngilizce: başlık her sayfada çevrilir; metni çevrilmemiş (yasal) sayfalarda Türkçe metin bir notla gösterilir
  const [l] = await localize([{ id: p.id, title: p.title, content: p.content, translated: false }], "page");
  return { ...p, title: l.title, content: l.content, translated: l.content !== p.content };
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const p = await get((await resolveLocaleSlug("sayfa", (await params).slug)).slug);
  if (!p) return {};
  return pageMeta({ title: p.title, description: p.seoDescription || excerpt(fillLegal(p.content, await getSettings().then((st) => legalTokens(st.store, st.payment, siteUrl())))), path: `/sayfa/${p.slug}` });
}
export default async function ContentPage({ params }: { params: Promise<{ slug: string }> }) {
  const r = await resolveLocaleSlug("sayfa", (await params).slug);
  if (r.redirect) permanentRedirect(r.redirect);
  const slug = r.slug;
  const [p, locale] = await Promise.all([get(slug), getLocale()]);
  if (!p) return redirectOrNotFound(`/sayfa/${slug}`);
  const st = await getSettings();
  const html = fillLegal(renderContent(p.content), legalTokens(st.store, st.payment, siteUrl()));
  // Hakkımızda: metin yine panelden (Sayfalar) yönetilir; çevresine harita, kısayollar ve markalar eklenir.
  // Metindeki "Showroom" başlığı ve adres satırı aşağıdaki showroom bölümüyle tekrar etmesin diye çıkarılır.
  if (slug === "hakkimizda") return <AboutPage title={p.title} html={html.replace(/<h2>\s*Showroom\s*<\/h2>[\s\S]*$/i, "")} settings={st} locale={locale} />;
  return (
    <article className="container-x max-w-3xl py-10">
      <h1 className="font-display text-3xl font-extrabold">{p.title}</h1>
      <p className="mt-1 text-xs text-mute">{locale === "en" ? "Last updated" : "Son güncelleme"} {formatDate(p.updatedAt, false, locale)}</p>
      {locale === "en" && !p.translated ? (
        <p className="mt-4 rounded-xl bg-soft p-4 text-sm text-mute" data-testid="legal-tr-note">
          This document is governed by Turkish law and the legally binding version is in Turkish. It is shown below in its original language; if you have any questions, please contact us.
        </p>
      ) : null}
      <div className="prose-lite mt-6" lang={locale === "en" && !p.translated ? "tr" : undefined} dangerouslySetInnerHTML={{ __html: html }} />
    </article>
  );
}
