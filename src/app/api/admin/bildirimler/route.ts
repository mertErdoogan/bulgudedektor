import { NextResponse } from "next/server";
import { getStaff } from "@/lib/auth";
import { markSeen, notificationsFor, unreadCount } from "@/lib/notify";

export const dynamic = "force-dynamic";

/** Panel zili: okunmamış sayısı ve son bildirimler (30 sn'de bir sorgulanır). */
export async function GET(req: Request) {
  const staff = await getStaff();
  if (!staff) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  const full = new URL(req.url).searchParams.get("liste") === "1";
  const { count, latest, seen } = await unreadCount(staff);
  const items = full ? await notificationsFor(staff, 25) : [];
  return NextResponse.json(
    {
      count,
      seen: seen.toISOString(),
      latest: latest ? { id: latest.id, title: latest.title, body: latest.body, href: latest.href, at: latest.createdAt.toISOString() } : null,
      items: items.map((n) => ({ id: n.id, kind: n.kind, title: n.title, body: n.body, href: n.href, at: n.createdAt.toISOString(), unread: n.createdAt > seen })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** Zil açılınca hepsini okundu say. */
export async function POST() {
  const staff = await getStaff();
  if (!staff) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  await markSeen(staff.id);
  return NextResponse.json({ ok: true });
}
