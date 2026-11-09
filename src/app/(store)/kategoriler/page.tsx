import Link from "next/link";
import { getActiveBrands, getNav } from "@/lib/store";

export const metadata = { title: "Kategoriler" };

export default async function CategoriesPage() {
  const [nav, brands] = await Promise.all([getNav(), getActiveBrands()]);
  return (
    <div className="container-x py-6">
      <h1 className="font-display mb-4 text-2xl font-extrabold">Kategoriler</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {nav.categories.map((c) => (
          <Link key={c.id} href={`/kategori/${c.slug}`} className="overflow-hidden rounded-xl bg-tint">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {c.imageUrl ? <img src={c.imageUrl} alt="" className="h-28 w-full object-contain p-3 mix-blend-multiply" /> : null}
            <span className="block px-3 pb-3"><b>{c.name}</b><span className="block text-xs text-mute">{c.shortText}</span></span>
          </Link>
        ))}
      </div>
      <h2 className="mt-8 mb-3 text-lg font-extrabold">Markalar</h2>
      <div className="flex flex-wrap gap-2">
        {brands.map((b) => <Link key={b.id} href={`/marka/${b.slug}`} className="rounded-lg border border-line px-4 py-2 font-bold">{b.name}</Link>)}
      </div>
      <Link href="/urunler" className="mt-6 block rounded-xl bg-deep p-4 text-center font-bold text-white">Tüm ürünleri gör</Link>
    </div>
  );
}
