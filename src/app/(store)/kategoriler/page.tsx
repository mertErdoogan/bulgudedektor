import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import { getBrandGroups, getNav } from "@/lib/store";
import { BrandGrid } from "@/components/store/brand-cards";
import { CategoryTile } from "@/components/store/category-tile";

export const metadata = pageMeta({ title: "Dedektör Kategorileri ve Markaları", description: "Define, doğal altın, sahil ve derin arama dedektörleri; pinpointer ve aksesuarlar. Tüm kategoriler ve markalar tek sayfada.", path: "/kategoriler" });

export default async function CategoriesPage() {
  const [nav, brands] = await Promise.all([getNav(), getBrandGroups()]);
  return (
    <div className="container-x py-6">
      <h1 className="font-display mb-4 text-2xl font-extrabold">Kategoriler</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {nav.categories.map((c) => (
          <CategoryTile key={c.id} c={c} sizes="(min-width: 768px) 30vw, 50vw" />
        ))}
      </div>
      <h2 className="font-display mt-10 mb-3 text-2xl font-extrabold">Markaya göre</h2>
      <BrandGrid brands={brands} />
      <Link href="/urunler" className="group mt-6 flex items-center justify-center gap-2 rounded-xl bg-deep p-4 text-center font-bold text-white transition hover:bg-black">Tüm ürünleri gör <span aria-hidden className="transition group-hover:translate-x-1">→</span></Link>
    </div>
  );
}
