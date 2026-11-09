"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { conversations, customers, messages } from "@/db/schema";
import { fail, ok, safe, type ActionResult } from "@/lib/action";
import { audit } from "@/lib/audit";
import { assertStaff } from "@/lib/auth";
import { normalizePhone, str, strOrNull } from "@/lib/utils";

export async function reply(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("inbox.manage");
    const conversationId = str(fd.get("conversationId"));
    const body = str(fd.get("body"));
    if (!body) return fail("Mesaj boş olamaz.");
    const close = fd.get("close") === "1";
    await db.insert(messages).values({ conversationId, body, fromStaff: true, userId: staff.id });
    await db.update(conversations).set({ status: close ? "CLOSED" : "PENDING", assigneeId: staff.id, updatedAt: new Date() }).where(eq(conversations.id, conversationId));
    revalidatePath("/admin", "layout");
    return ok(close ? "Yanıt kaydedildi, konuşma kapatıldı." : "Yanıt kaydedildi.");
  });
}

export async function setConversation(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    await assertStaff("inbox.manage");
    const id = str(fd.get("id"));
    const status = strOrNull(fd.get("status")) as "OPEN" | "PENDING" | "CLOSED" | null;
    const assigneeId = fd.has("assigneeId") ? strOrNull(fd.get("assigneeId")) : undefined;
    await db
      .update(conversations)
      .set({ ...(status ? { status } : {}), ...(assigneeId !== undefined ? { assigneeId } : {}) })
      .where(eq(conversations.id, id));
    revalidatePath("/admin", "layout");
    return ok("Güncellendi.");
  });
}

/** Telefonla gelen soruyu / WhatsApp konuşmasını kayda geçir */
export async function logConversation(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("inbox.manage");
    const contactName = str(fd.get("contactName"));
    const contactRaw = str(fd.get("contact"));
    const subject = str(fd.get("subject"));
    const body = str(fd.get("body"));
    if (!contactName || !contactRaw || !subject || !body) return fail("Tüm alanları doldurun.");
    const isMail = contactRaw.includes("@");
    const contact = isMail ? contactRaw.toLowerCase() : normalizePhone(contactRaw);
    const cust = await db.query.customers.findFirst({ where: isMail ? eq(customers.email, contact) : eq(customers.phone, contact) });
    const [c] = await db
      .insert(conversations)
      .values({ contactName, contact, subject, channel: str(fd.get("channel")) as "PHONE", customerId: cust?.id ?? null, assigneeId: staff.id, status: "OPEN" })
      .returning();
    await db.insert(messages).values({ conversationId: c.id, body });
    await audit(staff.id, "create", "conversation", c.id, `Konuşma kaydı: ${subject}`);
    revalidatePath("/admin", "layout");
    return ok("Konuşma kaydedildi.", { redirect: `/admin/mesajlar?id=${c.id}` });
  });
}
