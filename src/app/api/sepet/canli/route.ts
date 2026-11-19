import { NextResponse } from "next/server";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { liveCarts, products } from "@/db/schema";
import { getCustomer } from "@/lib/auth";
import { allowIp } from "@/lib/guard";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Canlı sepet: tarayıcı sepeti değişince ve sekme açıkken dakikada bir çağrılır.
 * Tarayıcı yalnızca analiz izni ya da üye girişi varsa gönderir. Tutar sunucuda güncel fiyatla hesaplanır.
 */
export async function POST(req: Request) {
  const ok = new NextResponse(null, { status: 204 });
  if (!(await allowIp("live-cart", 300, 60 * 60 * 1000))) return ok;
  const b = await req.json().catch(() => null);
  const vid = String(b?.vid ?? "");
  if (!UUID.test(vid)) return ok;
  const raw: unknown[] = Array.isArray(b?.items) ? b.items.slice(0, 30) : [];
  const wanted = new Map<string, number>();
  for (const x of raw) {
    const i = x as { productId?: unknown; quantity?: unknown };
    const pid = String(i?.productId ?? "");
    if (UUID.test(pid)) wanted.set(pid, Math.min(99, Math.max(1, Math.floor(Number(i?.quantity) || 1))));
  }
  const rows = wanted.size ? await db.select({ id: products.id, price: products.price }).from(products).where(inArray(products.id, [...wanted.keys()])) : [];
  const items = rows.map((r) => ({ productId: r.id, qty: wanted.get(r.id)! }));
  const existing = await db.query.liveCarts.findFirst({ where: eq(liveCarts.id, vid), columns: { orderedAt: true } });

  if (!items.length) {
    // Boşaltılan sepet listeden düşer; siparişe dönüşmüş sepet kayıt olarak kalır
    if (existing && !existing.orderedAt) await db.delete(liveCarts).where(and(eq(liveCarts.id, vid), isNull(liveCarts.orderedAt)));
    return ok;
  }
  const value = Math.round(rows.reduce((s, r) => s + r.price * wanted.get(r.id)!, 0) * 100) / 100;
  const c = await getCustomer();
  const path = typeof b?.path === "string" ? b.path.slice(0, 200) : null;
  const locale = path?.startsWith("/en") ? "en" : "tr";
  const base = { items, value, itemCount: items.reduce((s, i) => s + i.qty, 0), path, locale, updatedAt: new Date() };
  const who = c ? { customerId: c.id, email: c.email, name: c.name } : {};
  if (!existing) {
    await db.insert(liveCarts).values({ id: vid, ...base, ...who }).onConflictDoNothing();
  } else if (existing.orderedAt) {
    // Sipariş sonrası yeni alışveriş: yeni sepet olarak başlar
    await db.update(liveCarts).set({ ...base, ...who, createdAt: new Date(), orderedAt: null, orderId: null }).where(eq(liveCarts.id, vid));
  } else {
    await db.update(liveCarts).set({ ...base, ...who }).where(eq(liveCarts.id, vid));
  }
  return ok;
}
