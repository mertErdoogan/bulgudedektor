import "server-only";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";

export async function audit(
  userId: string | null,
  action: "create" | "update" | "delete" | "status" | "login" | "refund" | "settings" | "stock" | "export",
  entity: string,
  entityId: string | null,
  summary: string,
  data?: unknown,
) {
  try {
    await db.insert(auditLogs).values({ userId, action, entity, entityId, summary, data: data ?? null });
  } catch (e) {
    console.error("audit log failed", e);
  }
}
