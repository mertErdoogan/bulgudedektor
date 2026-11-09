import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";

/** Uptime izleme için (UptimeRobot, Better Stack vb.): veritabanına da dokunur. */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({ ok: true, db: "ok", at: new Date().toISOString() });
  } catch {
    return NextResponse.json({ ok: false, db: "down" }, { status: 503 });
  }
}
