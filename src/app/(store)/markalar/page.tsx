import { Breadcrumbs } from "@/components/seo/blocks";
import { BrandGrid } from "@/components/store/brand-cards";
import { pageMeta } from "@/lib/seo";
import { getBrandGroups } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata = pageMeta({
  title: "Dedektör Markaları — Minelab, Garrett, Nokta, XP",
  description: "Markaya göre alışveriş: Minelab, Garrett, Nokta ve XP dedektörleri kategorilerine göre. Tüm modeller orijinal, faturalı ve garantili.",
  path: "/markalar",
});

export default async function BrandsPage() {
  const brands = await getBrandGroups();
  return (
    <div className="container-x py-6">
      <Breadcrumbs items={[{ name: "Markalar", path: "/markalar" }]} />
      <h1 className="font-display text-[28px] font-extrabold md:text-[36px]">Markaya göre alışveriş</h1>
      <p className="mt-2 mb-6 max-w-3xl text-[15px] text-[#3f3f46]">Markanı seç, o markanın ürünlerini kategorilerine göre gör. Tüm markalarda yetkili distribütör garantisi geçerlidir.</p>
      <BrandGrid brands={brands} />
    </div>
  );
}
