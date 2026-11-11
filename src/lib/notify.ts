import "server-only";
import { and, desc, eq, gt, isNull, lt, or } from "drizzle-orm";
import { db } from "@/db";
import { staffNotifications, users } from "@/db/schema";
import { can, type Permission } from "./permissions";

/**
 * Panel bildirimleri: yeni sipariş, havale bildirimi, mesaj, servis, iade, atama.
 * userId verilirse yalnızca o kişiye; perm verilirse o yetkiye sahip herkese gider.
 * Hiçbir zaman ana akışı bozmaz (hata yutulur).
 */
export async function notifyStaff(n: { userId?: string; perm?: Permission; kind: string; title: string; body?: string; href?: string }) {
  try {
    await db.insert(staffNotifications).values({ userId: n.userId ?? null, perm: n.userId ? null : (n.perm ?? null), kind: n.kind, title: n.title, body: n.body ?? null, href: n.href ?? null });
  } catch (e) {
    console.error("Bildirim yazılamadı", e);
  }
}

type Staff = { id: string; permissions: string[] };

/** Kişinin görebileceği bildirimler (kendisine özel + yetkisine uygun genel olanlar), yeniden eskiye. */
export async function notificationsFor(staff: Staff, limit = 30) {
  const since = new Date(Date.now() - 30 * 86400000);
  const rows = await db
    .select()
    .from(staffNotifications)
    .where(and(gt(staffNotifications.createdAt, since), or(eq(staffNotifications.userId, staff.id), isNull(staffNotifications.userId))))
    .orderBy(desc(staffNotifications.createdAt))
    .limit(limit * 3);
  return rows.filter((r) => r.userId === staff.id || !r.perm || can(staff.permissions, r.perm as Permission)).slice(0, limit);
}

export async function unreadCount(staff: Staff) {
  const me = await db.query.users.findFirst({ where: eq(users.id, staff.id), columns: { notificationsSeenAt: true } });
  const seen = me?.notificationsSeenAt ?? new Date(0);
  const list = await notificationsFor(staff, 100);
  return { count: list.filter((r) => r.createdAt > seen).length, latest: list[0] ?? null, seen };
}

export async function markSeen(userId: string) {
  await db.update(users).set({ notificationsSeenAt: new Date() }).where(eq(users.id, userId));
}

/** 30 günden eski bildirimleri siler (cron). */
export async function pruneNotifications() {
  const r = await db.delete(staffNotifications).where(lt(staffNotifications.createdAt, new Date(Date.now() - 30 * 86400000))).returning({ id: staffNotifications.id });
  return r.length;
}

