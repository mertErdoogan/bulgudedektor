import { NextResponse } from "next/server";
import { allowIp } from "@/lib/guard";
import { popularSearches, suggest } from "@/lib/search";

/** Arama kutusu anlık önerileri. */
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").slice(0, 80);
  if (!(await allowIp("suggest", 240, 5 * 60 * 1000))) return NextResponse.json({ products: [], categories: [], brands: [], posts: [], popular: [] });
  if (q.trim().length < 2) return NextResponse.json({ products: [], categories: [], brands: [], posts: [], popular: (await popularSearches()).map((p) => p.term) });
  return NextResponse.json({ ...(await suggest(q)), popular: [] }, { headers: { "Cache-Control": "private, max-age=30" } });
}
