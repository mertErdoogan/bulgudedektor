"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { orders, replyTemplates } from "@/db/schema";
import { fail, ok, safe, type ActionResult } from "@/lib/action";
import { audit } from "@/lib/audit";
import { assertStaff } from "@/lib/auth";
import { addOrderEvent } from "@/lib/orders";
import { TEMPLATE_CATEGORIES, missingVars } from "@/lib/templates";
import { orderNo, str, strOrNull, toNum } from "@/lib/utils";

export async function saveTemplate(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("inbox.manage");
    const id = strOrNull(fd.get("id"));
    const title = str(fd.get("title"));
    const body = str(fd.get("body"));
    const category = str(fd.get("category"));
    if (!title || !body) return fail("Başlık ve metin zorunlu.");
    const values = { title, body, category: category in TEMPLATE_CATEGORIES ? category : "genel", subject: strOrNull(fd.get("subject")), sortOrder: toNum(fd.get("sortOrder"), 0), updatedAt: new Date() };
    if (id) await db.update(replyTemplates).set(values).where(eq(replyTemplates.id, id));
    else await db.insert(replyTemplates).values(values);
    await audit(staff.id, id ? "update" : "create", "template", id, title);
    revalidatePath("/admin/sablonlar");
    return ok("Şablon kaydedildi.", { redirect: "/admin/sablonlar" });
  });
}

export async function deleteTemplate(id: string): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("inbox.manage");
    await db.delete(replyTemplates).where(eq(replyTemplates.id, id));
    await audit(staff.id, "delete", "template", id, "Şablon silindi");
    revalidatePath("/admin/sablonlar");
    return ok("Silindi.");
  });
}

/** Sipariş sayfasından doldurulmuş şablonu müşteriye e-postayla gönderir ve sipariş geçmişine yazar. */
export async function sendOrderMessage(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("orders.manage");
    const o = await db.query.orders.findFirst({ where: eq(orders.id, str(fd.get("orderId"))) });
    if (!o) return fail("Sipariş bulunamadı.");
    const body = str(fd.get("body"));
    const subject = str(fd.get("subject")) || `${orderNo(o.number)} hakkında`;
    const via = str(fd.get("via"));
    if (!body) return fail("Mesaj boş.");
    const left = missingVars(body);
    if (left.length) return fail(`Doldurulmamış alan var: {${left.join("}, {")}}. Metni düzeltin.`);
    if (via === "email") {
      if (o.email.endsWith(".local")) return fail("Bu siparişin gerçek bir e-posta adresi yok (pazaryeri siparişi).");
      const { sendMail, wrap } = await import("@/lib/mail");
      const { getSettings } = await import("@/lib/settings");
      const s = await getSettings();
      const esc = body.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!).replace(/\n/g, "<br>");
      const sent = await sendMail(o.email, subject, wrap(`<p>${esc}</p>`, s.store.name));
      if (!sent) return fail("E-posta gönderilemedi. Ayarlar → Entegrasyonlar'da SMTP bilgilerini kontrol edin.");
    }
    // Müşterinin takip sayfasında da görünsün (müşteriye görünür olay), kanal bilgisiyle
    await addOrderEvent(db, o.id, "message", body, staff.id, fd.get("public") === "on" || via === "email");
    await audit(staff.id, "update", "order", o.id, `Mesaj gönderildi (${via === "email" ? "e-posta" : via === "whatsapp" ? "WhatsApp" : "not"})`);
    revalidatePath(`/admin/siparisler/${o.id}`);
    return ok(via === "email" ? "E-posta gönderildi ve sipariş geçmişine eklendi." : "Sipariş geçmişine eklendi.");
  });
}
