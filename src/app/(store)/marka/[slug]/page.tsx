import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { brands } from "@/db/schema";
import { Catalog, type SP } from "@/components/store/catalog";

export default async function BrandPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<SP> }) {
  const { slug } = await params;
  const b = await db.query.brands.findFirst({ where: eq(brands.slug, slug) });
  if (!b || !b.isActive) notFound();
  return <Catalog title={`${b.name} dedektörleri`} intro={b.description} crumbs={[{ href: `/marka/${b.slug}`, label: b.name }]} sp={await searchParams} base={{ brand: [b.slug] }} hideBrand />;
}
