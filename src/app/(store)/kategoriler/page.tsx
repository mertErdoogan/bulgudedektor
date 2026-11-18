import { pageMeta } from "@/lib/seo";
import { getT } from "@/lib/i18n/server";
import Link from "@/components/locale-link";
import { getBrandGroups, getNav } from "@/lib/store";
import { FocusBrands } from "@/components/store/brand-cards";
import { CategoryTile } from "@/components/store/category-tile";

export const generateMetadata = async () => {
  const t = await getT();
  return pageMeta({ title: t("cats.metaTitle"), description: t("cats.metaDesc"), path: "/kategoriler" });
};

export default async function CategoriesPage() {
  const [nav, brands, t] = await Promise.all([getNav(), getBrandGroups(), getT()]);
  return (
    <div className="container-x py-6">
      <h1 className="font-display mb-4 text-2xl font-extrabold">{t("nav.categories")}</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {nav.categories.map((c) => (
          <CategoryTile key={c.id} c={c} sizes="(min-width: 768px) 30vw, 50vw" />
        ))}
      </div>
      <h2 className="font-display mt-10 mb-3 text-2xl font-extrabold">{t("cats.byBrand")}</h2>
      <FocusBrands brands={brands} />
      <Link href="/urunler" className="group mt-6 flex items-center justify-center gap-2 rounded-xl bg-deep p-4 text-center font-bold text-white transition hover:bg-black">{t("cats.allProducts")} <span aria-hidden className="transition group-hover:translate-x-1">→</span></Link>
    </div>
  );
}
