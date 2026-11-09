import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { products } from "@/db/schema";
import { cardCtx } from "@/lib/card-ctx";
import { getSettings } from "@/lib/settings";
import { cardQuery } from "@/lib/store";

/** Son gezilenler ve favoriler için kart verisi (istemci listesindeki sırayla). */
export async function GET(req: Request) {
  const ids = (new URL(req.url).searchParams.get("ids") ?? "").split(",").filter((x) => /^[0-9a-f-]{36}$/.test(x)).slice(0, 40);
  if (!ids.length) return NextResponse.json({ items: [], ctx: null });
  const [rows, s] = await Promise.all([cardQuery().where(and(eq(products.status, "ACTIVE"), inArray(products.id, ids))), getSettings()]);
  const byId = new Map(rows.map((r) => [r.id, r]));
  return NextResponse.json({ items: ids.map((i) => byId.get(i)).filter(Boolean), ctx: cardCtx(s) }, { headers: { "Cache-Control": "no-store" } });
}
