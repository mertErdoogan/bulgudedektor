import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import { getBrandGroups, getNav } from "@/lib/store";
import { BrandGrid } from "@/components/store/brand-cards";

export const metadata = pageMeta({ title: "Dedektör Kategorileri ve Markaları", description: "Define, doğal altın, sahil ve derin arama dedektörleri; pinpointer ve aksesuarlar. Tüm kategoriler ve markalar tek sayfada.", path: "/kategoriler" });

export default async function CategoriesPage() {
  const [nav, brands] = await Promise.all([getNav(), getBrandGroups()]);
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
      <h2 className="font-display mt-10 mb-3 text-2xl font-extrabold">Markaya göre</h2>
      <BrandGrid brands={brands} />
      <Link href="/urunler" className="mt-6 block rounded-xl bg-deep p-4 text-center font-bold text-white">Tüm ürünleri gör</Link>
    </div>
  );
}
