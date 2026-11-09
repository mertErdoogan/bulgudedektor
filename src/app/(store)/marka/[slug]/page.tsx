import { redirectOrNotFound } from "@/lib/redirects";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { brands } from "@/db/schema";
import { Catalog, type SP } from "@/components/store/catalog";
import { AnswerBox } from "@/components/seo/blocks";
import { JsonLd } from "@/components/seo/json-ld";
import { abs, graph, pageMeta } from "@/lib/seo";
import { catalogStats } from "@/lib/store";
import { formatTL } from "@/lib/utils";

const getBrand = (slug: string) => db.query.brands.findFirst({ where: eq(brands.slug, slug) });

export async function generateMetadata({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<SP> }) {
  const b = await getBrand((await params).slug);
  if (!b || !b.isActive) return {};
  return pageMeta({
    title: `${b.name} Dedektör Modelleri ve Fiyatları`,
    description: b.description || `Orijinal ${b.name} metal dedektörleri: tüm modeller, güncel fiyatlar, teknik karşılaştırma. Faturalı, distribütör garantili, uzman desteğiyle.`,
    path: `/marka/${b.slug}`,
    image: b.logoUrl,
    noindex: Object.keys(await searchParams).length > 0,
  });
}

export default async function BrandPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<SP> }) {
  const { slug } = await params;
  const b = await getBrand(slug);
  if (!b || !b.isActive) return redirectOrNotFound(`/marka/${slug}`);
  const st = await catalogStats({ brandId: b.id });
  const top = st.count ? (
    <AnswerBox title={`${b.name} dedektör fiyatları`}>
      Bulgu Dedektör’de <b>{st.count} orijinal {b.name} modeli</b> var
      {st.min != null ? (st.min === st.max ? <>; fiyatı <b>{formatTL(st.min)}</b></> : <>; fiyatlar <b>{formatTL(st.min)}</b> – <b>{formatTL(st.max)}</b> arasında</>) : null}. Öne çıkanlar:{" "}
      {st.picks.map((p, i) => (
        <span key={p.id}>{i ? ", " : ""}<Link className="font-bold text-link" href={`/urun/${p.slug}`}>{p.name}</Link></span>
      ))}
      . Hepsi faturalı ve distribütör garantilidir.
    </AnswerBox>
  ) : null;
  return (
    <>
      <JsonLd data={graph({ "@type": "Brand", "@id": `${abs(`/marka/${b.slug}`)}#brand`, name: b.name, url: abs(`/marka/${b.slug}`), logo: abs(b.logoUrl), description: b.description ?? undefined })} />
      <Catalog title={`${b.name} dedektörleri`} intro={b.description} top={top} crumbs={[{ href: `/marka/${b.slug}`, label: b.name }]} sp={await searchParams} base={{ brand: [b.slug] }} hideBrand />
    </>
  );
}
