import { and, eq, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { conversations, orders, products, returnRequests, reviews, productQuestions, serviceRecords } from "@/db/schema";
import { AdminShell } from "@/components/admin/shell";
import { requireStaff } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { logoutAction } from "../giris/actions";

export const dynamic = "force-dynamic";

async function count(q: Promise<{ n: number }[]>) {
  return (await q)[0]?.n ?? 0;
}

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();
  const n = sql<number>`count(*)::int`;
  const [toPrepare, ret, openMessages, openService, pendingReviews, pendingQ, lowStock, settings, myOrders, myConv, mySvc] = await Promise.all([
    count(db.select({ n }).from(orders).where(inArray(orders.status, ["PAID", "PREPARING"]))),
    count(db.select({ n }).from(returnRequests).where(eq(returnRequests.status, "REQUESTED"))),
    count(db.select({ n }).from(conversations).where(eq(conversations.status, "OPEN"))),
    count(db.select({ n }).from(serviceRecords).where(sql`${serviceRecords.status} <> 'CLOSED'`)),
    count(db.select({ n }).from(reviews).where(eq(reviews.isApproved, false))),
    count(db.select({ n }).from(productQuestions).where(sql`${productQuestions.answer} is null`)),
    count(db.select({ n }).from(products).where(and(eq(products.status, "ACTIVE"), lte(products.stock, products.lowStockThreshold)))),
    getSettings(),
    // Bana atanmış açık işler (menüde "İş listesi" rozeti)
    count(db.select({ n }).from(orders).where(and(eq(orders.assigneeId, staff.id), inArray(orders.status, ["PENDING_PAYMENT", "PAID", "PREPARING"])))),
    count(db.select({ n }).from(conversations).where(and(eq(conversations.assigneeId, staff.id), eq(conversations.status, "OPEN")))),
    count(db.select({ n }).from(serviceRecords).where(and(eq(serviceRecords.assigneeId, staff.id), inArray(serviceRecords.status, ["RECEIVED", "READY"])))),
  ]);
  return (
    <AdminShell
      user={{ name: staff.name, roleName: staff.roleName, permissions: staff.permissions }}
      badges={{ myWork: myOrders + myConv + mySvc, toPrepare, returns: ret, openMessages, openService, pendingReviews: pendingReviews + pendingQ, lowStock }}
      setupPending={!settings.setup.completed}
      logout={logoutAction}
    >
      {children}
    </AdminShell>
  );
}
