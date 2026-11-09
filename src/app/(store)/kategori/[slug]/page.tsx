import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { Catalog, type SP } from "@/components/store/catalog";

async function getCat(slug: string) {
  return db.query.categories.findFirst({ where: and(eq(categories.slug, slug), eq(categories.isActive, true)) });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const c = await getCat((await params).slug);
  return c ? { title: c.seoTitle || `${c.name} dedektörleri`, description: c.seoDescription || c.description || undefined } : {};
}

export default async function CategoryPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<SP> }) {
  const { slug } = await params;
  const c = await getCat(slug);
  if (!c) notFound();
  return <Catalog title={`${c.name} için dedektörler`} intro={c.description} crumbs={[{ href: `/kategori/${c.slug}`, label: c.name }]} sp={await searchParams} base={{ category: c.slug }} />;
}
