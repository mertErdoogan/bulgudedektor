import { pageMeta } from "@/lib/seo";
import { activeBrandNames } from "@/lib/settings";
import { Catalog, type SP } from "@/components/store/catalog";

export const generateMetadata = async () => {
  const names = (await activeBrandNames()).slice(0, 4);
  const lead = names.length ? `${names.join(", ")} markalarının orijinal metal dedektörleri.` : "Orijinal metal dedektörleri.";
  return pageMeta({ title: "Tüm Metal Dedektörleri — Modeller ve Fiyatlar", description: `${lead} Teknolojiye, su geçirmezliğe ve deneyime göre filtrele, fiyatları karşılaştır.`, path: "/urunler" });
};

export default async function AllProducts({ searchParams }: { searchParams: Promise<SP> }) {
  return <Catalog title="Tüm ürünler" crumbs={[{ href: "/urunler", label: "Tüm ürünler" }]} sp={await searchParams} />;
}
