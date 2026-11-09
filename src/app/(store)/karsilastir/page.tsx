import Link from "next/link";
import { asc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { AddToCart } from "@/components/store/bits";
import { EXPERIENCE_LABEL, TECH_LABEL, WATERPROOF_LABEL, formatTL } from "@/lib/utils";

export const metadata = { title: "Karşılaştır", robots: { index: false } };

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const ids = ((await searchParams).ids ?? "").split(",").filter(Boolean).slice(0, 4);
  const rows = ids.length ? await db.query.products.findMany({ where: inArray(products.id, ids), with: { brand: true, images: { orderBy: (i) => asc(i.sortOrder), limit: 1 } } }) : [];
  const specKeys = [...new Set(rows.flatMap((r) => r.specs.map((s) => s.key)))];
  const line = (label: string, get: (r: (typeof rows)[number]) => React.ReactNode) => (
    <tr className="border-b border-line"><th className="sticky left-0 bg-white py-3 pr-4 text-left text-sm font-semibold text-mute">{label}</th>{rows.map((r) => <td key={r.id} className="px-3 py-3 text-sm">{get(r) ?? "—"}</td>)}</tr>
  );
  return (
    <div className="container-x py-8">
      <h1 className="font-display mb-5 text-2xl font-extrabold">Karşılaştır</h1>
      {rows.length < 2 ? <p className="text-mute">Karşılaştırmak için ürün kartlarındaki &quot;Karşılaştır&quot; kutusundan en az 2 ürün seç. <Link href="/urunler" className="font-bold text-link">Ürünler →</Link></p> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr>
                <th />
                {rows.map((r) => (
                  <th key={r.id} className="px-3 pb-4 text-left align-top">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {r.images[0] ? <img src={r.images[0].url} alt="" className="h-36 w-full object-contain" /> : null}
                    <Link href={`/urun/${r.slug}`} className="mt-2 block font-extrabold hover:text-link">{r.name}</Link>
                    <span className="block text-lg font-extrabold">{formatTL(r.price)}</span>
                    <div className="mt-2"><AddToCart productId={r.id} name={r.name} disabled={r.stock <= 0 && !r.allowBackorder} /></div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {line("Marka", (r) => r.brand?.name)}
              {line("Teknoloji", (r) => (r.technology ? TECH_LABEL[r.technology] : null))}
              {line("Su geçirmezlik", (r) => (r.waterproof ? WATERPROOF_LABEL[r.waterproof] : null))}
              {line("Kimin için", (r) => (r.experience ? EXPERIENCE_LABEL[r.experience] : null))}
              {line("Ağırlık", (r) => (r.weightKg ? `${r.weightKg} kg` : null))}
              {line("Garanti", (r) => `${r.warrantyMonths} ay`)}
              {line("Stok", (r) => (r.stock > 0 ? "Stokta" : "Tükendi"))}
              {specKeys.map((k) => line(k, (r) => r.specs.find((s) => s.key === k)?.value))}
              {line("Bilmen gereken", (r) => r.notFor.join("; ") || null)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
