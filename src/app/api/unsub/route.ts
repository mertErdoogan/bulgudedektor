import { revokeMarketing, unsubKey } from "@/lib/store";

/**
 * RFC 8058 tek tıkla abonelikten çıkma (Gmail/Outlook "Aboneliği iptal et" düğmesi POST eder).
 * GET isteği onay sayfasına yönlendirir; bağlantı önizleyicileri yanlışlıkla çıkış yaptırmaz.
 */
export async function POST(req: Request) {
  const u = new URL(req.url);
  const e = (u.searchParams.get("e") ?? "").toLowerCase();
  if (!e || u.searchParams.get("k") !== unsubKey(e)) return new Response("Geçersiz bağlantı", { status: 400 });
  await revokeMarketing(e);
  return new Response("Listeden çıkarıldınız.", { status: 200 });
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  return Response.redirect(new URL(`/bulten/cikis${u.search}`, process.env.APP_URL || u.origin), 303);
}
