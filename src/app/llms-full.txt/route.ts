import { buildLlms } from "@/lib/llms";

export const dynamic = "force-dynamic";

export async function GET() {
  return new Response(await buildLlms(true), { headers: { "Content-Type": "text/markdown; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
