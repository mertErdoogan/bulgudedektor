import { Breadcrumbs } from "@/components/seo/blocks";
import { FocusBrands } from "@/components/store/brand-cards";
import { pageMeta } from "@/lib/seo";
import { activeBrandNames, fillBrands } from "@/lib/settings";
import { getBrandGroups } from "@/lib/store";

export const dynamic = "force-dynamic";
export const generateMetadata = async () => {
  // Yalnız satıştaki markalar yazılır: katalogda olmayan marka başlıkta vaat edilmez
  const names = await activeBrandNames();
  return pageMeta({
    title: names.length ? `Dedektör Markaları — ${names.slice(0, 4).join(", ")}` : "Dedektör Markaları",
    description: fillBrands("Markaya göre alışveriş: {markalar} dedektörleri kategorilerine göre. Tüm modeller orijinal, faturalı ve garantili.", names, 4),
    path: "/markalar",
  });
};

export default async function BrandsPage() {
  const brands = await getBrandGroups();
  return (
    <div className="container-x py-6">
      <Breadcrumbs items={[{ name: "Markalar", path: "/markalar" }]} />
      <h1 className="font-display text-[28px] font-extrabold md:text-[36px]">Markaya göre alışveriş</h1>
      <p className="mt-2 mb-6 max-w-3xl text-[15px] text-[#3f3f46]">Markanı seç, o markanın ürünlerini kategorilerine göre gör. Tüm markalarda yetkili distribütör garantisi geçerlidir.</p>
      <FocusBrands brands={brands} />
    </div>
  );
}
