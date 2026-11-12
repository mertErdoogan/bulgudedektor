import { q } from "@/db/q";
import "server-only";
import { and, desc, eq, inArray, notInArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, orderItems, orders, products } from "@/db/schema";
import { bestSellers, cardColumns, cardQuery, type ProductCard } from "./store";
import { brands } from "@/db/schema";

/**
 * Öneri motoru (harici servis yok; kendi sipariş ve gezinme verimizden):
 *  - boughtTogether: "bunu alanlar şunu da aldı" — gerçek siparişlerdeki birliktelik
 *  - similarTo: aynı kategoride, fiyatı en yakın modeller
 *  - forVisitor: ziyaretçinin son gezdiklerine göre kişisel öneriler
 * Veri azken (yeni mağaza) mantıklı varsayılanlara düşer: aksesuar/pointer, çok satanlar.
 */
const active = eq(products.status, "ACTIVE");
const inStock = sql`(${products.stock} > 0 or ${products.allowBackorder})`;
const ACCESSORY_SLUGS = ["pointer", "baslik-ve-aksesuar"];

export async function boughtTogether(ids: string[], limit = 4): Promise<ProductCard[]> {
  if (!ids.length) return [];
  const co = db
    .select({ pid: orderItems.productId, n: sql<number>`count(distinct ${orderItems.orderId})`.as("n") })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(
      and(
        sql`${orders.status} not in ('CANCELLED','REFUNDED','PENDING_PAYMENT')`,
        sql`${q(orderItems.orderId)} in (select oi.order_id from order_items oi where oi.product_id in (${sql.join(ids.map((i) => sql`${i}`), sql`, `)}))`,
        notInArray(orderItems.productId, ids),
      ),
    )
    .groupBy(orderItems.productId)
    .as("co");
  const top = await db
    .select(cardColumns)
    .from(products)
    .leftJoin(brands, eq(brands.id, products.brandId))
    .innerJoin(co, eq(co.pid, products.id))
    .where(and(active, inStock))
    .orderBy(desc(co.n))
    .limit(limit);
  if (top.length >= limit) return top;
  // Yedek: sepetteki cihazların markasına uygun aksesuar ve pointer'lar
  const base = await db.select({ brandId: products.brandId, categoryId: products.categoryId }).from(products).where(inArray(products.id, ids));
  const brandIds = [...new Set(base.map((b) => b.brandId).filter(Boolean))] as string[];
  const accCats = await db.select({ id: categories.id }).from(categories).where(inArray(categories.slug, ACCESSORY_SLUGS));
  if (!accCats.length) return top;
  const seen = [...ids, ...top.map((t) => t.id)];
  const more = await cardQuery()
    .where(and(active, inStock, inArray(products.categoryId, accCats.map((c) => c.id)), notInArray(products.id, seen)))
    .orderBy(brandIds.length ? sql`(${products.brandId} in (${sql.join(brandIds.map((b) => sql`${b}`), sql`, `)})) desc` : sql`1`, desc(products.isFeatured), products.price)
    .limit(limit - top.length);
  return [...top, ...more];
}

export async function similarTo(p: { id: string; categoryId: string | null; price: number }, limit = 4): Promise<ProductCard[]> {
  if (!p.categoryId) return [];
  return cardQuery()
    .where(and(active, eq(products.categoryId, p.categoryId), sql`${products.id} <> ${p.id}`))
    .orderBy(sql`(${products.stock} > 0) desc`, sql`abs(${products.price} - ${p.price})`)
    .limit(limit);
}

export async function forVisitor(viewedIds: string[], limit = 8): Promise<ProductCard[]> {
  const ids = viewedIds.slice(0, 12);
  if (!ids.length) return [];
  const viewed = await db.select({ categoryId: products.categoryId, brandId: products.brandId, price: products.price }).from(products).where(inArray(products.id, ids));
  if (!viewed.length) return [];
  const cats = [...new Set(viewed.map((v) => v.categoryId).filter(Boolean))] as string[];
  const brandIds = [...new Set(viewed.map((v) => v.brandId).filter(Boolean))] as string[];
  const avg = viewed.reduce((a, v) => a + v.price, 0) / viewed.length;
  const rows = cats.length
    ? await cardQuery()
        .where(and(active, inStock, inArray(products.categoryId, cats), notInArray(products.id, ids), sql`${products.price} between ${avg * 0.4} and ${avg * 2.2}`))
        .orderBy(brandIds.length ? sql`(${products.brandId} in (${sql.join(brandIds.map((b) => sql`${b}`), sql`, `)})) desc` : sql`1`, sql`abs(${products.price} - ${avg})`)
        .limit(limit)
    : [];
  if (rows.length >= Math.min(4, limit)) return rows;
  const seen = new Set([...ids, ...rows.map((r) => r.id)]);
  const fill = (await bestSellers(limit + ids.length)).filter((b) => !seen.has(b.id));
  return [...rows, ...fill].slice(0, limit);
}
