import { NextResponse } from "next/server";
import { cardCtx } from "@/lib/card-ctx";
import { boughtTogether, forVisitor } from "@/lib/recommend";
import { getSettings } from "@/lib/settings";

/** Kişisel öneriler (son gezilenlere göre) ve sepet için "birlikte alınanlar". */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const ids = (sp.get("ids") ?? "").split(",").filter((x) => /^[0-9a-f-]{36}$/.test(x)).slice(0, 20);
  if (!ids.length) return NextResponse.json({ items: [], ctx: null });
  const [items, s] = await Promise.all([sp.get("tip") === "birlikte" ? boughtTogether(ids, 6) : forVisitor(ids, 8), getSettings()]);
  return NextResponse.json({ items, ctx: cardCtx(s) }, { headers: { "Cache-Control": "no-store" } });
}
