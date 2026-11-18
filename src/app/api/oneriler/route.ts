import { NextResponse } from "next/server";
import { cardCtx } from "@/lib/card-ctx";
import { localize } from "@/lib/i18n/content";
import { boughtTogether, forVisitor } from "@/lib/recommend";
import { getSettings } from "@/lib/settings";

/** Kişisel öneriler (son gezilenlere göre) ve sepet için "birlikte alınanlar". */
export async function GET(req: Request) {
  const lang = new URL(req.url).searchParams.get("lang") === "en" ? "en" : "tr";
  const sp = new URL(req.url).searchParams;
  const ids = (sp.get("ids") ?? "").split(",").filter((x) => /^[0-9a-f-]{36}$/.test(x)).slice(0, 20);
  if (!ids.length) return NextResponse.json({ items: [], ctx: null });
  const [items, s] = await Promise.all([sp.get("tip") === "birlikte" ? boughtTogether(ids, 6) : forVisitor(ids, 8), getSettings()]);
  return NextResponse.json({ items: await localize(items, "product", lang), ctx: cardCtx(s, lang) }, { headers: { "Cache-Control": "no-store" } });
}
