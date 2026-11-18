import "server-only";
import { cache } from "react";
import { and, arrayContains, asc, desc, eq, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { localize } from "@/lib/i18n/content";
import { getLocale } from "@/lib/i18n/server";
import { faqs, posts } from "@/db/schema";

const live = () => and(eq(posts.status, "PUBLISHED"), lte(posts.publishedAt, new Date()));

export const postCard = {
  id: posts.id,
  title: posts.title,
  slug: posts.slug,
  excerpt: posts.excerpt,
  coverImage: posts.coverImage,
  category: posts.category,
  publishedAt: posts.publishedAt,
  updatedAt: posts.updatedAt,
  authorName: posts.authorName,
  /** Okuma süresi için kelime sayısı */
  words: sql<number>`coalesce(array_length(regexp_split_to_array(trim(${posts.content}), '\\s+'), 1), 0)`,
};
export type PostCard = { id: string; title: string; slug: string; excerpt: string | null; coverImage: string | null; category: string; publishedAt: Date | null; updatedAt: Date; authorName: string; words?: number };

export const getPublishedPosts = cache(async (category?: string) =>
  db.select(postCard).from(posts).where(category ? and(live(), eq(posts.category, category)) : live()).orderBy(desc(posts.publishedAt)),
);

export const getPost = cache(async (slug: string) => db.query.posts.findFirst({ where: and(eq(posts.slug, slug), live()) }));

export async function relatedPosts(o: { productId?: string; categoryId?: string | null; excludeId?: string; limit?: number }) {
  // Rehber yazıları yalnızca Türkçe: İngilizce sayfalarda Türkçe yazı önerilmez
  if ((await getLocale()) !== "tr") return [];
  const conds = [
    o.productId ? arrayContains(posts.relatedProductIds, [o.productId]) : undefined,
    o.categoryId ? arrayContains(posts.relatedCategoryIds, [o.categoryId]) : undefined,
  ].filter(Boolean);
  const rows = await db
    .select(postCard)
    .from(posts)
    .where(and(live(), conds.length ? or(...conds) : undefined, o.excludeId ? sql`${posts.id} <> ${o.excludeId}` : undefined))
    .orderBy(desc(posts.publishedAt))
    .limit(o.limit ?? 3);
  if (rows.length >= (o.limit ?? 3) || !o.excludeId) return rows;
  // Yeterli bağlantılı yazı yoksa en yeni yazılarla tamamla
  const more = await db.select(postCard).from(posts).where(and(live(), sql`${posts.id} <> ${o.excludeId}`)).orderBy(desc(posts.publishedAt)).limit(6);
  const seen = new Set(rows.map((r) => r.id));
  return [...rows, ...more.filter((m) => !seen.has(m.id))].slice(0, o.limit ?? 3);
}

type FaqFilter = { productId?: string; categoryId?: string; home?: boolean; general?: boolean };

export async function getFaqs(f: FaqFilter = {}) {
  const base = and(eq(faqs.kind, "FAQ"), eq(faqs.isPublished, true));
  const where = f.productId
    ? and(base, eq(faqs.productId, f.productId))
    : f.categoryId
      ? and(base, eq(faqs.categoryId, f.categoryId))
      : f.home
        ? and(base, eq(faqs.showOnHome, true))
        : f.general
          ? and(base, isNull(faqs.productId), isNull(faqs.categoryId))
          : base;
  const rows = await db.select().from(faqs).where(where).orderBy(asc(faqs.group), asc(faqs.sortOrder), asc(faqs.createdAt));
  return localize(rows, "faq");
}

export const getGlossary = cache(async () => {
  const rows = await localize(await db.select().from(faqs).where(and(eq(faqs.kind, "GLOSSARY"), eq(faqs.isPublished, true))), "faq");
  return rows.sort((a, b) => a.question.localeCompare(b.question, "tr"));
});

export const toQA = (rows: { question: string; answer: string }[]) => rows.map((r) => ({ q: r.question, a: r.answer }));
