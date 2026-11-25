import { Breadcrumbs } from "@/components/seo/blocks";
import { FocusBrands } from "@/components/store/brand-cards";
import { pageMeta } from "@/lib/seo";
import { getT } from "@/lib/i18n/server";
import { activeBrandNames, fillBrands } from "@/lib/settings";
import { getBrandGroups } from "@/lib/store";

export const dynamic = "force-dynamic";
export const generateMetadata = async () => {
  // Yalnız satıştaki markalar yazılır: katalogda olmayan marka başlıkta vaat edilmez
  const [names, t] = await Promise.all([activeBrandNames(), getT()]);
  return pageMeta({
    title: names.length ? `${t("brands.metaTitle")} — ${names.slice(0, 4).join(", ")}` : t("brands.metaTitle"),
    description: t.locale === "en" ? `Shop by brand: ${names.slice(0, 4).join(", ")} products by category. All models genuine, invoiced and under warranty.` : fillBrands("Markaya göre alışveriş: {markalar} dedektörleri kategorilerine göre. Tüm modeller orijinal, faturalı ve garantili.", names, 4),
    path: "/markalar",
  });
};

export default async function BrandsPage() {
  const [brands, t] = await Promise.all([getBrandGroups(), getT()]);
  return (
    <div className="container-x py-6">
      <Breadcrumbs items={[{ name: t("brand.crumb"), path: "/markalar" }]} />
      <h1 className="font-display text-[28px] font-extrabold md:text-[36px]">{t("home.brands")}</h1>
      <p className="mt-2 mb-6 max-w-3xl text-[15px] text-[#3f3f46]">{t("brands.intro")}</p>
      <FocusBrands brands={brands} />
    </div>
  );
}
