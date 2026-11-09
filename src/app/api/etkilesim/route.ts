import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { productActivity, products } from "@/db/schema";

/**
 * Ürün görüntüleme / sepete ekleme sayacı (saatlik kova).
 * Kişisel veri tutulmaz; botlar ve aynı IP'den aşırı istekler sayılmaz.
 */
const BOT = /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse|curl|wget|python|axios/i;
const hits = new Map<string, { n: number; until: number }>();

export async function POST(req: Request) {
  const ua = req.headers.get("user-agent") ?? "";
  if (!ua || BOT.test(ua)) return new NextResponse(null, { status: 204 });
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  const now = Date.now();
  const h = hits.get(ip);
  if (h && h.until > now) {
    if (++h.n > 120) return new NextResponse(null, { status: 204 });
  } else hits.set(ip, { n: 1, until: now + 3600_000 });
  if (hits.size > 5000) hits.clear();

  let body: { id?: string; t?: string };
  try {
    body = await req.json();
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const id = String(body.id ?? "");
  const type = body.t === "c" ? "c" : "v";
  if (!/^[0-9a-f-]{36}$/.test(id)) return new NextResponse(null, { status: 400 });
  const hour = new Date(Math.floor(now / 3600_000) * 3600_000);
  await db
    .insert(productActivity)
    .select(
      db
        .select({ productId: products.id, hour: sql`${hour.toISOString()}::timestamptz`.as("hour"), views: sql`${type === "v" ? 1 : 0}`.as("views"), carts: sql`${type === "c" ? 1 : 0}`.as("carts") })
        .from(products)
        .where(sql`${products.id} = ${id}`),
    )
    .onConflictDoUpdate({
      target: [productActivity.productId, productActivity.hour],
      set: type === "v" ? { views: sql`${productActivity.views} + 1` } : { carts: sql`${productActivity.carts} + 1` },
    });
  return new NextResponse(null, { status: 204 });
}
