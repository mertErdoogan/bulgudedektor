import { getT } from "@/lib/i18n/server";
import { imgUrl } from "@/lib/img";
import Link from "@/components/locale-link";
import { asc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { AddToCart } from "@/components/store/bits";
import { formatTL } from "@/lib/utils";
import { enumLabel } from "@/lib/i18n/dict";
import { localize } from "@/lib/i18n/content";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("meta.karsilastir"), robots: { index: false } };
}

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const ids = ((await searchParams).ids ?? "").split(",").filter(Boolean).slice(0, 4);
  const t = await getT();
  const L = t.locale;
  const rows0 = ids.length ? await db.query.products.findMany({ where: inArray(products.id, ids), with: { brand: true, images: { orderBy: (i) => asc(i.sortOrder), limit: 1 } } }) : [];
  const rows = await localize(rows0, "product", L);
  const brands = new Map((await localize(rows.flatMap((r) => (r.brand ? [r.brand] : [])), "brand", L)).map((b) => [b.id, b.name]));
  const specKeys = [...new Set(rows.flatMap((r) => r.specs.map((s) => s.key)))];
  const line = (label: string, get: (r: (typeof rows)[number]) => React.ReactNode) => (
    <tr className="border-b border-line"><th className="sticky left-0 bg-white py-3 pr-4 text-left text-sm font-semibold text-mute">{label}</th>{rows.map((r) => <td key={r.id} className="px-3 py-3 text-sm">{get(r) ?? "—"}</td>)}</tr>
  );
  return (
    <div className="container-x py-8">
      <h1 className="font-display mb-5 text-2xl font-extrabold">{t("cmpp.title")}</h1>
      {rows.length < 2 ? <p className="text-mute">{t("cmpp.empty")} <Link href="/urunler" className="font-bold text-link">{t("cmpp.products")} →</Link></p> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr>
                <th />
                {rows.map((r) => (
                  <th key={r.id} className="px-3 pb-4 text-left align-top">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {r.images[0] ? <img src={imgUrl(r.images[0].url, 384)} alt="" className="h-36 w-full object-contain" /> : null}
                    <Link href={`/urun/${r.slug}`} className="mt-2 block font-extrabold hover:text-link">{r.name}</Link>
                    <span className="block text-lg font-extrabold">{formatTL(r.price)}</span>
                    <div className="mt-2"><AddToCart productId={r.id} name={r.name} disabled={r.stock <= 0 && !r.allowBackorder} /></div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {line(t("cmpp.brand"), (r) => (r.brand ? brands.get(r.brand.id) ?? r.brand.name : null))}
              {line(t("cmpp.tech"), (r) => enumLabel(L, "tech", r.technology) || null)}
              {line(t("cmpp.water"), (r) => enumLabel(L, "water", r.waterproof) || null)}
              {line(t("cmpp.exp"), (r) => enumLabel(L, "exp", r.experience) || null)}
              {line(t("cmpp.weight"), (r) => (r.weightKg ? `${r.weightKg} kg` : null))}
              {line(t("cmpp.warranty"), (r) => t("cmpp.months", { n: r.warrantyMonths }))}
              {line(t("cmpp.stock"), (r) => (r.stock > 0 ? t("cmpp.in") : t("cmpp.out")))}
              {specKeys.map((k) => line(k, (r) => r.specs.find((s) => s.key === k)?.value))}
              {line(t("cmpp.note"), (r) => r.notFor.join("; ") || null)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
