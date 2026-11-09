import "server-only";

import { and, desc, gte, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { brands, categories, orderItems, orders, products } from "@/db/schema";

export const PAID_STATUSES = ["PAID", "PREPARING", "SHIPPED", "DELIVERED"] as const;

export function rangeFromParam(r?: string, from?: string, to?: string) {
  const end = to ? new Date(`${to}T23:59:59`) : new Date();
  let start: Date;
  if (from) start = new Date(`${from}T00:00:00`);
  else {
    const days = r === "7" ? 7 : r === "90" ? 90 : r === "365" ? 365 : r === "1" ? 1 : 30;
    start = new Date(end.getTime() - (days - 1) * 86400000);
    start.setHours(0, 0, 0, 0);
  }
  return { start, end };
}

export async function salesSummary(start: Date, end: Date) {
  const where = and(gte(orders.createdAt, start), lt(orders.createdAt, end), inArray(orders.status, [...PAID_STATUSES]));
  const [s] = await db
    .select({
      revenue: sql<number>`coalesce(sum(${orders.total}),0)::float`,
      count: sql<number>`count(*)::int`,
      discount: sql<number>`coalesce(sum(${orders.discountTotal}),0)::float`,
    })
    .from(orders)
    .where(where);
  const [c] = await db
    .select({ cost: sql<number>`coalesce(sum(coalesce(${orderItems.unitCost},0) * ${orderItems.quantity}),0)::float`, units: sql<number>`coalesce(sum(${orderItems.quantity}),0)::int` })
    .from(orderItems)
    .innerJoin(orders, sql`${orders.id} = ${orderItems.orderId}`)
    .where(where);
  const [ref] = await db
    .select({ n: sql<number>`count(*)::int`, amount: sql<number>`coalesce(sum(${orders.total}),0)::float` })
    .from(orders)
    .where(and(gte(orders.createdAt, start), lt(orders.createdAt, end), inArray(orders.status, ["REFUNDED", "CANCELLED"])));
  return {
    revenue: s.revenue,
    orders: s.count,
    aov: s.count ? s.revenue / s.count : 0,
    discount: s.discount,
    cost: c.cost,
    units: c.units,
    grossProfit: s.revenue - c.cost,
    cancelled: ref.n,
    cancelledAmount: ref.amount,
  };
}

export async function dailySeries(start: Date, end: Date) {
  const rows = await db
    .select({
      d: sql<string>`to_char(date_trunc('day', ${orders.createdAt} at time zone 'Europe/Istanbul'), 'YYYY-MM-DD')`,
      value: sql<number>`coalesce(sum(${orders.total}),0)::float`,
      orders: sql<number>`count(*)::int`,
    })
    .from(orders)
    .where(and(gte(orders.createdAt, start), lt(orders.createdAt, end), inArray(orders.status, [...PAID_STATUSES])))
    .groupBy(sql.raw("1"));
  const map = new Map(rows.map((r) => [r.d, r]));
  const out: { label: string; date: string; value: number; orders: number }[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    const key = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(cur);
    const r = map.get(key);
    out.push({ date: key, label: new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" }).format(cur), value: r?.value ?? 0, orders: r?.orders ?? 0 });
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export async function topProducts(start: Date, end: Date, limit = 10) {
  return db
    .select({
      productId: orderItems.productId,
      name: orderItems.name,
      units: sql<number>`sum(${orderItems.quantity})::int`,
      revenue: sql<number>`sum(${orderItems.total})::float`,
      cost: sql<number>`sum(coalesce(${orderItems.unitCost},0) * ${orderItems.quantity})::float`,
    })
    .from(orderItems)
    .innerJoin(orders, sql`${orders.id} = ${orderItems.orderId}`)
    .where(and(gte(orders.createdAt, start), lt(orders.createdAt, end), inArray(orders.status, [...PAID_STATUSES])))
    .groupBy(orderItems.productId, orderItems.name)
    .orderBy(desc(sql`sum(${orderItems.total})`))
    .limit(limit);
}

export async function salesByGroup(start: Date, end: Date, by: "brand" | "category") {
  const nameCol = by === "brand" ? brands.name : categories.name;
  const joinTable = by === "brand" ? brands : categories;
  const fk = by === "brand" ? products.brandId : products.categoryId;
  return db
    .select({
      label: sql<string>`coalesce(${nameCol}, 'Diğer')`,
      units: sql<number>`sum(${orderItems.quantity})::int`,
      value: sql<number>`sum(${orderItems.total})::float`,
    })
    .from(orderItems)
    .innerJoin(orders, sql`${orders.id} = ${orderItems.orderId}`)
    .leftJoin(products, sql`${products.id} = ${orderItems.productId}`)
    .leftJoin(joinTable, sql`${joinTable.id} = ${fk}`)
    .where(and(gte(orders.createdAt, start), lt(orders.createdAt, end), inArray(orders.status, [...PAID_STATUSES])))
    .groupBy(sql.raw("1"))
    .orderBy(desc(sql.raw("3")));
}

export async function paymentBreakdown(start: Date, end: Date) {
  return db
    .select({
      method: orders.paymentMethod,
      installments: orders.installments,
      n: sql<number>`count(*)::int`,
      value: sql<number>`sum(${orders.total})::float`,
    })
    .from(orders)
    .where(and(gte(orders.createdAt, start), lt(orders.createdAt, end), inArray(orders.status, [...PAID_STATUSES])))
    .groupBy(orders.paymentMethod, orders.installments)
    .orderBy(orders.paymentMethod, orders.installments);
}

export async function cityBreakdown(start: Date, end: Date) {
  return db
    .select({ label: sql<string>`${orders.shippingAddress}->>'city'`, n: sql<number>`count(*)::int`, value: sql<number>`sum(${orders.total})::float` })
    .from(orders)
    .where(and(gte(orders.createdAt, start), lt(orders.createdAt, end), inArray(orders.status, [...PAID_STATUSES])))
    .groupBy(sql.raw("1"))
    .orderBy(desc(sql.raw("3")))
    .limit(10);
}
