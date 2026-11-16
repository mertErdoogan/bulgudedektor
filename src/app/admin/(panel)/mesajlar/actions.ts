"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { conversations, customers, messages } from "@/db/schema";
import { fail, ok, safe, type ActionResult } from "@/lib/action";
import { audit } from "@/lib/audit";
import { assertStaff } from "@/lib/auth";
import { normalizePhone, str, strOrNull } from "@/lib/utils";
import { sendMail, wrap } from "@/lib/mail";
import { getSettings } from "@/lib/settings";

const escHtml = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function reply(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("inbox.manage");
    const conversationId = str(fd.get("conversationId"));
    const body = str(fd.get("body"));
    if (!body) return fail("Mesaj boş olamaz.");
    const close = fd.get("close") === "1";
    const conv = await db.query.conversations.findFirst({ where: eq(conversations.id, conversationId) });
    if (!conv) return fail("Konuşma bulunamadı.");
    // E-posta adresi olan konuşmada yanıt müşteriye e-postayla gider; WhatsApp/telefon/Instagram'da yalnızca kayda geçer.
    let emailed = false;
    let mailFailed = false;
    if (conv.contact.includes("@")) {
      const st = await getSettings();
      const html = wrap(`<p>Merhaba ${escHtml(conv.contactName.split(" ")[0])},</p><div style="white-space:pre-wrap;font-size:15px;line-height:1.55">${escHtml(body)}</div><p style="margin-top:18px">${escHtml(staff.name)}<br>${escHtml(st.store.name)}${st.store.phone ? ` · ${escHtml(st.store.phone)}` : ""}</p>`, escHtml(st.store.name)).replace("Bu e-posta sipariş işlemin nedeniyle gönderildi.", "Bu e-postayı yanıtlayarak bize yazmaya devam edebilirsin.");
      emailed = await sendMail(conv.contact, `Re: ${conv.subject}`, html, st.store.email ? { headers: { "Reply-To": st.store.email } } : {});
      mailFailed = !emailed;
    }
    await db.insert(messages).values({ conversationId, body, fromStaff: true, userId: staff.id });
    await db.update(conversations).set({ status: close ? "CLOSED" : "PENDING", assigneeId: conv.assigneeId ?? staff.id, updatedAt: new Date() }).where(eq(conversations.id, conversationId));
    await audit(staff.id, "update", "conversation", conversationId, emailed ? "Yanıt e-postayla gönderildi" : mailFailed ? "Yanıt kaydedildi, e-posta gönderilemedi" : "Yanıt not olarak kaydedildi");
    revalidatePath("/admin", "layout");
    if (mailFailed) return fail("Yanıt kaydedildi ama e-posta GİTMEDİ. Ayarlar → Entegrasyonlar'daki e-posta (SMTP) bilgilerini kontrol et ya da müşteriye telefonla dön.");
    const tail = close ? " Konuşma kapatıldı." : "";
    return ok(emailed ? `Yanıt müşteriye e-postayla gönderildi.${tail}` : `Not kaydedildi. Bu kanal otomatik gönderilmez; cevabı WhatsApp/telefondan sen ilet.${tail}`);
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
