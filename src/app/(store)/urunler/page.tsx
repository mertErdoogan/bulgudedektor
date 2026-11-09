import { Catalog, type SP } from "@/components/store/catalog";

export const metadata = { title: "Tüm ürünler" };

export default async function AllProducts({ searchParams }: { searchParams: Promise<SP> }) {
  return <Catalog title="Tüm ürünler" crumbs={[{ href: "/urunler", label: "Tüm ürünler" }]} sp={await searchParams} />;
}
