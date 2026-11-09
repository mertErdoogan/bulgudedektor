import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const k = (await getSettings()).seo.indexNowKey;
  return k ? new Response(k, { headers: { "Content-Type": "text/plain; charset=utf-8" } }) : new Response("Not found", { status: 404 });
}
