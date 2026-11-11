"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { conversations, orders, serviceRecords } from "@/db/schema";
import { fail, ok, safe, type ActionResult } from "@/lib/action";
import { audit } from "@/lib/audit";
import { assertStaff } from "@/lib/auth";

const PERM = { order: "orders.manage", conversation: "inbox.manage", service: "service.manage" } as const;

/** İş listesindeki kaydı bir ekip üyesine atar (userId boşsa atamayı kaldırır). */
export async function assignWork(type: keyof typeof PERM, id: string, userId: string | null): Promise<ActionResult> {
  return safe(async () => {
    if (!(type in PERM)) return fail("Geçersiz kayıt.");
    const staff = await assertStaff(PERM[type]);
    const to = userId === "me" ? staff.id : userId;
    const table = type === "order" ? orders : type === "conversation" ? conversations : serviceRecords;
    await db.update(table).set({ assigneeId: to }).where(eq(table.id, id));
    await audit(staff.id, "update", type, id, to ? `Atandı: ${to === staff.id ? staff.name : to}` : "Atama kaldırıldı");
    if (to && to !== staff.id) {
      const { notifyStaff } = await import("@/lib/notify");
      await notifyStaff({ userId: to, kind: "assigned", title: `${staff.name} sana bir iş atadı`, href: type === "order" ? `/admin/siparisler/${id}` : type === "conversation" ? `/admin/mesajlar?id=${id}` : `/admin/servis?id=${id}` });
    }
    revalidatePath("/admin");
    revalidatePath("/admin/isler");
    return ok(to ? (to === staff.id ? "Üstlendin." : "Atandı.") : "Atama kaldırıldı.");
  });
}
