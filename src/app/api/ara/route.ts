import { NextResponse } from "next/server";
import { allowIp } from "@/lib/guard";
import { getHeaderData } from "@/lib/header-data";
import { popularSearches, suggest } from "@/lib/search";
import { localize } from "@/lib/i18n/content";
import { getActiveBrands, getNav } from "@/lib/store";

const NONE = { products: [], total: 0, categories: [], brands: [], posts: [], popular: [], models: [], uses: [] };

/**
 * Arama kutusu anlık önerileri.
 * Boş sorgu: çok arananlar + öne çıkan modeller + markalar + kullanım alanları (arama paletinin ilk ekranı).
 * Yazarken: ürün (görsel, fiyat, stok), marka, kategori, rehber ve toplam sonuç sayısı.
 */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const q = (sp.get("q") ?? "").slice(0, 80);
  const lang = sp.get("lang") === "en" ? "en" : "tr";
  if (!(await allowIp("suggest", 240, 5 * 60 * 1000))) return NextResponse.json(NONE);
  if (q.trim().length < 2) {
    const [pop, hd, brands, nav] = await Promise.all([popularSearches(), getHeaderData(lang), getActiveBrands(), getNav()]);
    const uses = await localize(nav.categories.filter((c) => !c.parentId), "category", lang);
    return NextResponse.json(
      {
        ...NONE,
        popular: pop.map((p) => p.term),
        models: hd.focus?.models ?? [],
        brands: brands.map((b) => ({ name: b.name, slug: b.slug })),
        uses: uses.map((c) => ({ name: c.name, slug: c.slug })),
      },
      { headers: { "Cache-Control": "public, max-age=60" } },
    );
  }
  return NextResponse.json({ ...NONE, ...(await suggest(q, lang)) }, { headers: { "Cache-Control": "private, max-age=30" } });
}
