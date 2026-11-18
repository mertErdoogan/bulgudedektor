import { redirectOrNotFound } from "@/lib/redirects";
import Link from "@/components/locale-link";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { brands, categories } from "@/db/schema";
import { Catalog, type SP } from "@/components/store/catalog";
import { AnswerBox } from "@/components/seo/blocks";
import { JsonLd } from "@/components/seo/json-ld";
import { abs, graph, metaDesc, pageMeta } from "@/lib/seo";
import { catalogStats, getBrandGroups } from "@/lib/store";
import { formatTL } from "@/lib/utils";
import { getT } from "@/lib/i18n/server";
import { localize, localizeOne } from "@/lib/i18n/content";

const getBrand = async (slug: string) => {
  const b = await db.query.brands.findFirst({ where: eq(brands.slug, slug) });
  return b ? localizeOne(b, "brand") : b;
};

export async function generateMetadata({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<SP> }) {
  const b = await getBrand((await params).slug);
  if (!b || !b.isActive) return {};
  const t = await getT();
  return pageMeta({
    title: t("brand.metaTitle", { ad: b.name }),
    description: metaDesc([b.description], t("brand.metaDesc", { ad: b.name })),
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
  const [st, groups, t] = await Promise.all([catalogStats({ brandId: b.id }), getBrandGroups(), getT()]);
  const cats0 = groups.find((g) => g.id === b.id)?.categories ?? [];
  // Seri adları (kategoriler) isteğin dilinde
  const catRows = cats0.length ? await localize(await db.select({ id: categories.id, slug: categories.slug, name: categories.name }).from(categories).where(inArray(categories.slug, cats0.map((c) => c.slug))), "category", t.locale) : [];
  const cats = cats0.map((c) => ({ ...c, name: catRows.find((r) => r.slug === c.slug)?.name ?? c.name }));
  const cur = typeof sp.kategori === "string" ? sp.kategori : "";
  const curCat = cats.find((c) => c.slug === cur);
  const chip = (on: boolean) => `shrink-0 rounded-full px-4 py-2 text-sm font-bold ${on ? "bg-deep text-white" : "border border-line bg-white hover:border-deep"}`;
  const chips = cats.length > 1 ? (
    <nav aria-label={t("brand.cats", { ad: b.name })} className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
      <Link href={`/marka/${b.slug}`} className={chip(!curCat)}>{t("brand.all")} <span className="font-normal opacity-70">{st.count}</span></Link>
      {cats.map((c) => (
        <Link key={c.slug} href={`/marka/${b.slug}?kategori=${c.slug}`} className={chip(c.slug === cur)}>{c.name} <span className="font-normal opacity-70">{c.count}</span></Link>
      ))}
    </nav>
  ) : null;
  const answer = st.count && !curCat ? (
    <AnswerBox title={t("brand.answerTitle", { ad: b.name })}>
      {t.locale === "en" ? <>We carry <b>{st.count} genuine {b.name} models</b></> : <>Mağazamızda <b>{st.count} orijinal {b.name} modeli</b> var</>}
      {st.min != null ? (st.min === st.max ? <>{t.locale === "en" ? ", priced at " : "; fiyatı "}<b>{formatTL(st.min)}</b></> : <>{t.locale === "en" ? ", from " : "; fiyatlar "}<b>{formatTL(st.min)}</b> – <b>{formatTL(st.max)}</b>{t.locale === "en" ? "" : " arasında"}</>) : null}. {t("brand.picks")}{" "}
      {st.picks.map((p, i) => (
        <span key={p.id}>{i ? ", " : ""}<Link className="font-bold text-link" href={`/urun/${p.slug}`}>{p.name}</Link></span>
      ))}
      . {t("brand.allInvoiced")}
    </AnswerBox>
  ) : null;
  const top = <div className="flex flex-col gap-3">{chips}{answer}</div>;
  return (
    <>
      <JsonLd data={graph({ "@type": "Brand", "@id": `${abs(`/marka/${b.slug}`)}#brand`, name: b.name, url: abs(`/marka/${b.slug}`), logo: abs(b.logoUrl), description: b.description ?? undefined })} />
      <Catalog title={curCat ? `${b.name} · ${curCat.name}` : t("brand.title", { ad: b.name })} intro={b.description} top={top} crumbs={[{ href: "/markalar", label: t("brand.crumb") }, { href: `/marka/${b.slug}`, label: b.name }]} sp={sp} base={{ brand: [b.slug] }} hideBrand />
    </>
  );
}
