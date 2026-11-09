import { NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { cartSnapshots, products } from "@/db/schema";
import { getCustomer } from "@/lib/auth";
import { allowIp } from "@/lib/guard";

/** Ödeme formunda e-posta yazılınca sepetin son hali kaydedilir (terk edilen sepet hatırlatması için). */
export async function POST(req: Request) {
  if (!(await allowIp("cart-snap", 30, 60 * 60 * 1000))) return new NextResponse(null, { status: 204 });
  const b = await req.json().catch(() => null);
  const email = String(b?.email ?? "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 200) return new NextResponse(null, { status: 204 });
  const raw = Array.isArray(b?.items) ? b.items : [];
  const items = raw
    .map((i: { productId?: unknown; quantity?: unknown }) => ({ productId: String(i?.productId ?? ""), qty: Math.min(99, Math.max(1, Number(i?.quantity) || 1)) }))
    .filter((i: { productId: string }) => /^[0-9a-f-]{36}$/.test(i.productId))
    .slice(0, 30);
  if (!items.length) return new NextResponse(null, { status: 204 });
  const valid = new Set((await db.select({ id: products.id }).from(products).where(inArray(products.id, items.map((i: { productId: string }) => i.productId)))).map((r) => r.id));
  const clean = items.filter((i: { productId: string }) => valid.has(i.productId));
  if (!clean.length) return new NextResponse(null, { status: 204 });
  const c = await getCustomer();
  const values = { email, name: String(b?.name ?? "").slice(0, 120) || null, customerId: c?.id ?? null, items: clean, consent: !!b?.consent, updatedAt: new Date(), remindedAt: null, recoveredAt: null };
  await db.insert(cartSnapshots).values(values).onConflictDoUpdate({ target: cartSnapshots.email, set: values });
  return new NextResponse(null, { status: 204 });
}
