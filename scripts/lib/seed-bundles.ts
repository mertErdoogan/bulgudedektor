/* Demo paketleri (kombin): yalnızca hiç paket yoksa eklenir. */
import { sql } from "drizzle-orm";
import { db } from "../../src/db";
import * as t from "../../src/db/schema";

export async function seedDemoBundles() {
  if ((await db.select({ id: t.bundles.id }).from(t.bundles).limit(1)).length) return 0;
  const pidOf = async (slug: string) => (await db.select({ id: t.products.id }).from(t.products).where(sql`${t.products.slug} = ${slug}`))[0]?.id;
  const [manticore, pointer, vanquish] = await Promise.all([pidOf("manticore"), pidOf("pro-pointer-at"), pidOf("vanquish-560-pro-pack")]);
  if (manticore && pointer && vanquish) {
    const [b1, b2] = await db
      .insert(t.bundles)
      .values([
        { name: "Manticore + Pro-Pointer AT seti", description: "Dedektör hedefi bulur, pinpointer çukurda yerini saniyede gösterir. Birlikte alınca %8 indirim.", discountType: "PERCENT", discountValue: 8, sortOrder: 0 },
        { name: "Vanquish başlangıç seti", description: "İlk dedektörünü pinpointer'la birlikte al, kazıda vakit kaybetme.", discountType: "FIXED", discountValue: 1500, sortOrder: 1 },
      ])
      .returning({ id: t.bundles.id });
    await db.insert(t.bundleItems).values([
      { bundleId: b1.id, productId: manticore, sortOrder: 0 },
      { bundleId: b1.id, productId: pointer, sortOrder: 1 },
      { bundleId: b2.id, productId: vanquish, sortOrder: 0 },
      { bundleId: b2.id, productId: pointer, sortOrder: 1 },
    ]);
  }
  return 2;
}
