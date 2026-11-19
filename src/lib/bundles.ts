import { q } from "@/db/q";
import "server-only";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { bundleItems, bundles, productImages, products } from "@/db/schema";
import { localize } from "./i18n/content";
import { bundleLive, bundleSetDiscount } from "./pricing";

export type BundleOffer = {
  id: string;
  name: string;
  description: string | null;
  items: { productId: string; name: string; slug: string; price: number; image: string | null; quantity: number }[];
  setPrice: number;
  discount: number;
  price: number;
  pct: number;
};

/**
 * Bu ürünün içinde olduğu, şu an satılabilir paketler (bütün ürünleri aktif ve stokta).
 * Ürün sayfasındaki "Paketle al" kutusu ve sepet hesabı aynı indirim formülünü kullanır.
 */
export async function bundlesFor(productId: string, locale: string = "tr", limit = 2): Promise<BundleOffer[]> {
  const ids = await db.select({ id: bundleItems.bundleId }).from(bundleItems).where(eq(bundleItems.productId, productId));
  if (!ids.length) return [];
  const rows = await db.query.bundles.findMany({
    where: and(eq(bundles.isActive, true), inArray(bundles.id, ids.map((x) => x.id))),
    with: { items: { orderBy: asc(bundleItems.sortOrder) } },
    orderBy: [asc(bundles.sortOrder), asc(bundles.createdAt)],
  });
  const live = rows.filter((b) => bundleLive(b) && b.items.length >= 2);
  if (!live.length) return [];
  const pids = [...new Set(live.flatMap((b) => b.items.map((i) => i.productId)))];
  const prods0 = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      price: products.price,
      stock: products.stock,
      allowBackorder: products.allowBackorder,
      status: products.status,
      image: sql<string | null>`(select ${q(productImages.url)} from ${productImages} where ${q(productImages.productId)} = ${q(products.id)} order by ${q(productImages.sortOrder)} limit 1)`,
    })
    .from(products)
    .where(inArray(products.id, pids));
  const prods = await localize(prods0, "product", locale as "tr" | "en");
  const pm = new Map(prods.map((p) => [p.id, p]));
  const out: BundleOffer[] = [];
  for (const b of await localize(live, "bundle", locale as "tr" | "en")) {
    const items = b.items.map((i) => ({ i, p: pm.get(i.productId) }));
    if (items.some(({ i, p }) => !p || p.status !== "ACTIVE" || (!p.allowBackorder && p.stock < i.quantity))) continue;
    // Bulunduğumuz ürün başta görünsün
    items.sort((a, z) => (a.i.productId === productId ? -1 : z.i.productId === productId ? 1 : 0));
    const setPrice = Math.round(items.reduce((s, { i, p }) => s + p!.price * i.quantity, 0) * 100) / 100;
    const discount = bundleSetDiscount(b, setPrice);
    if (discount <= 0) continue;
    out.push({
      id: b.id,
      name: b.name,
      description: b.description,
      items: items.map(({ i, p }) => ({ productId: p!.id, name: p!.name, slug: p!.slug, price: p!.price, image: p!.image, quantity: i.quantity })),
      setPrice,
      discount,
      price: Math.round((setPrice - discount) * 100) / 100,
      pct: Math.round((discount / setPrice) * 100),
    });
    if (out.length >= limit) break;
  }
  return out;
}
