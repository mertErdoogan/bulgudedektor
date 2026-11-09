import { pageMeta } from "@/lib/seo";
import { Catalog, type SP } from "@/components/store/catalog";

export const metadata = pageMeta({ title: "Tüm Metal Dedektörleri — Modeller ve Fiyatlar", description: "Minelab, Garrett, Nokta, XP ve diğer markaların orijinal metal dedektörleri. Teknolojiye, su geçirmezliğe ve deneyime göre filtrele, fiyatları karşılaştır.", path: "/urunler" });

export default async function AllProducts({ searchParams }: { searchParams: Promise<SP> }) {
  return <Catalog title="Tüm ürünler" crumbs={[{ href: "/urunler", label: "Tüm ürünler" }]} sp={await searchParams} />;
}
