import { Catalog, type SP } from "@/components/store/catalog";

export const metadata = { title: "Arama", robots: { index: false } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  return <Catalog title={q ? `"${q}" için sonuçlar` : "Ara"} sp={sp} />;
}
