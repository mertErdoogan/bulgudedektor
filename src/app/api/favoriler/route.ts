import { NextResponse } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { favorites, products } from "@/db/schema";
import { getCustomer } from "@/lib/auth";

const uuid = (x: unknown) => typeof x === "string" && /^[0-9a-f-]{36}$/.test(x);

export async function GET() {
  const c = await getCustomer();
  if (!c) return NextResponse.json({ loggedIn: false, ids: [] });
  const rows = await db.select({ id: favorites.productId }).from(favorites).where(eq(favorites.customerId, c.id)).orderBy(desc(favorites.createdAt));
  return NextResponse.json({ loggedIn: true, ids: rows.map((r) => r.id) });
}

/** Tek ürün ekle/çıkar */
export async function POST(req: Request) {
  const c = await getCustomer();
  if (!c) return NextResponse.json({ ok: false }, { status: 401 });
  const { id, on } = await req.json().catch(() => ({}));
  if (!uuid(id)) return NextResponse.json({ ok: false }, { status: 400 });
  if (on) {
    const exists = await db.query.products.findFirst({ where: eq(products.id, id), columns: { id: true } });
    if (exists) await db.insert(favorites).values({ customerId: c.id, productId: id }).onConflictDoNothing();
  } else await db.delete(favorites).where(and(eq(favorites.customerId, c.id), eq(favorites.productId, id)));
  return NextResponse.json({ ok: true });
}

/** Cihazdaki listeyle birleştir */
export async function PUT(req: Request) {
  const c = await getCustomer();
  if (!c) return NextResponse.json({ ok: false }, { status: 401 });
  const { ids } = await req.json().catch(() => ({ ids: [] }));
  const list = (Array.isArray(ids) ? ids : []).filter(uuid).slice(0, 100) as string[];
  if (list.length) {
    const valid = await db.select({ id: products.id }).from(products).where(inArray(products.id, list));
    if (valid.length) await db.insert(favorites).values(valid.map((v) => ({ customerId: c.id, productId: v.id }))).onConflictDoNothing();
  }
  return NextResponse.json({ ok: true });
}
