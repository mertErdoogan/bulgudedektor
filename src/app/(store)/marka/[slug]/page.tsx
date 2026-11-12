import { redirectOrNotFound } from "@/lib/redirects";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { brands } from "@/db/schema";
import { Catalog, type SP } from "@/components/store/catalog";
import { AnswerBox } from "@/components/seo/blocks";
import { JsonLd } from "@/components/seo/json-ld";
import { abs, graph, metaDesc, pageMeta } from "@/lib/seo";
import { catalogStats, getBrandGroups } from "@/lib/store";
import { formatTL } from "@/lib/utils";

const getBrand = (slug: string) => db.query.brands.findFirst({ where: eq(brands.slug, slug) });

export async function generateMetadata({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<SP> }) {
  const b = await getBrand((await params).slug);
  if (!b || !b.isActive) return {};
  return pageMeta({
    title: `${b.name} Dedektör Modelleri ve Fiyatları`,
    description: metaDesc([b.description], `Orijinal ${b.name} metal dedektörleri: tüm modeller, güncel fiyatlar, teknik karşılaştırma. Faturalı, distribütör garantili, uzman desteğiyle.`),
    path: `/marka/${b.slug}`,
    image: b.logoUrl,
    noindex: Object.keys(await searchParams).length > 0,
  });
}

export default async function BrandPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<SP> }) {
  const { slug } = await params;
  const b = await getBrand(slug);
  if (!b || !b.isActive) return redirectOrNotFound(`/marka/${slug}`);
  const sp = await searchParams;
  const [st, groups] = await Promise.all([catalogStats({ brandId: b.id }), getBrandGroups()]);
  const cats = groups.find((g) => g.id === b.id)?.categories ?? [];
  const cur = typeof sp.kategori === "string" ? sp.kategori : "";
  const curCat = cats.find((c) => c.slug === cur);
  const chip = (on: boolean) => `shrink-0 rounded-full px-4 py-2 text-sm font-bold ${on ? "bg-deep text-white" : "border border-line bg-white hover:border-deep"}`;
  const chips = cats.length > 1 ? (
    <nav aria-label={`${b.name} kategorileri`} className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
      <Link href={`/marka/${b.slug}`} className={chip(!curCat)}>Tümü <span className="font-normal opacity-70">{st.count}</span></Link>
      {cats.map((c) => (
        <Link key={c.slug} href={`/marka/${b.slug}?kategori=${c.slug}`} className={chip(c.slug === cur)}>{c.name} <span className="font-normal opacity-70">{c.count}</span></Link>
      ))}
    </nav>
  ) : null;
  const answer = st.count && !curCat ? (
    <AnswerBox title={`${b.name} dedektör fiyatları`}>
      Arena Dedektör’de <b>{st.count} orijinal {b.name} modeli</b> var
      {st.min != null ? (st.min === st.max ? <>; fiyatı <b>{formatTL(st.min)}</b></> : <>; fiyatlar <b>{formatTL(st.min)}</b> – <b>{formatTL(st.max)}</b> arasında</>) : null}. Öne çıkanlar:{" "}
      {st.picks.map((p, i) => (
        <span key={p.id}>{i ? ", " : ""}<Link className="font-bold text-link" href={`/urun/${p.slug}`}>{p.name}</Link></span>
      ))}
      . Hepsi faturalı ve distribütör garantilidir.
    </AnswerBox>
  ) : null;
  const top = <div className="flex flex-col gap-3">{chips}{answer}</div>;
  return (
    <>
      <JsonLd data={graph({ "@type": "Brand", "@id": `${abs(`/marka/${b.slug}`)}#brand`, name: b.name, url: abs(`/marka/${b.slug}`), logo: abs(b.logoUrl), description: b.description ?? undefined })} />
      <Catalog title={curCat ? `${b.name} · ${curCat.name}` : `${b.name} dedektörleri`} intro={b.description} top={top} crumbs={[{ href: "/markalar", label: "Markalar" }, { href: `/marka/${b.slug}`, label: b.name }]} sp={sp} base={{ brand: [b.slug] }} hideBrand />
    </>
  );
}
