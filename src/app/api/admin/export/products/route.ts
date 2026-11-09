import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { brands, categories, products } from "@/db/schema";
import { audit } from "@/lib/audit";
import { getStaff } from "@/lib/auth";
import { csvResponse } from "@/lib/csv";
import { can } from "@/lib/permissions";

export async function GET() {
  const staff = await getStaff();
  if (!staff || !can(staff.permissions, "products.view")) return new Response("Yetkisiz", { status: 403 });
  const cost = can(staff.permissions, "products.cost");
  const rows = await db
    .select({ p: products, brand: brands.name, category: categories.name })
    .from(products)
    .leftJoin(brands, eq(brands.id, products.brandId))
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .orderBy(asc(products.name));
  await audit(staff.id, "export", "product", null, "Ürün listesi CSV indirildi");
  return csvResponse(`urunler-${new Date().toISOString().slice(0, 10)}.csv`, [
    ["sku", "name", "brand", "category", "price", "compare_at_price", ...(cost ? ["cost_price"] : []), "stock", "status", "barcode"],
    ...rows.map((r) => [r.p.sku, r.p.name, r.brand, r.category, r.p.price, r.p.compareAtPrice, ...(cost ? [r.p.costPrice] : []), r.p.stock, r.p.status, r.p.barcode]),
  ]);
}
