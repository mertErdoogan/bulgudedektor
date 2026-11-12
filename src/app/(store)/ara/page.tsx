import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Catalog, parseFilter, type SP } from "@/components/store/catalog";
import { ProductCard } from "@/components/store/product-card";
import { TrackSearch } from "@/components/store/track-search";
import { cardCtx } from "@/lib/card-ctx";
import { logSearch } from "@/lib/search";
import { getSettings } from "@/lib/settings";
import { bestSellers, listProducts } from "@/lib/store";

export const metadata = { title: "Arama", robots: { index: false } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  let n = 0;
  if (q) {
    const found = await listProducts(parseFilter(sp));
    // Yalnızca filtresiz ilk aramayı kaydet (en çok arananlar ve sonuçsuz aramalar raporu)
    if (Object.keys(sp).length === 1) void logSearch(q, found.length);
    n = found.length;
    if (!found.length) {
      const [s, popular] = await Promise.all([getSettings(), bestSellers(4)]);
      const wa = s.store.whatsapp ? `https://wa.me/${s.store.whatsapp}?text=${encodeURIComponent(`Merhaba, sitede "${q}" aradım ama bulamadım.`)}` : "/iletisim";
      return (
        <div className="container-x py-8">
          <TrackSearch q={q} results={0} />
          <h1 className="font-display text-[26px] font-extrabold md:text-[32px]">“{q}” için sonuç bulamadık</h1>
          <p className="mt-2 max-w-2xl text-[15px] text-[#3f3f46]">Yazımı kontrol edip daha kısa bir kelimeyle (ör. sadece model adı) tekrar deneyebilirsin. Aradığın ürün sitede yoksa da temin edebiliyor olabiliriz.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href={wa} target="_blank" className="flex h-11 items-center gap-2 rounded-lg bg-[#15803d] px-4 text-sm font-extrabold text-white"><MessageCircle size={17} /> Uzmana sor</a>
            <Link href="/sihirbaz" className="flex h-11 items-center rounded-lg border border-deep px-4 text-sm font-extrabold">6 soruda cihaz öner</Link>
            <Link href="/urunler" className="flex h-11 items-center rounded-lg bg-soft px-4 text-sm font-extrabold">Tüm ürünler</Link>
          </div>
          <h2 className="font-display mt-10 mb-4 text-2xl font-extrabold">En çok tercih edilenler</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">{popular.map((p) => <ProductCard key={p.id} p={p} ctx={cardCtx(s)} />)}</div>
        </div>
      );
    }
  }
  return (
    <>
      {q ? <TrackSearch q={q} results={n} /> : null}
      <Catalog title={q ? `“${q}” için sonuçlar` : "Ara"} sp={sp} />
    </>
  );
}
