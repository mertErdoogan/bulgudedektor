"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { customers, serialNumbers, serviceRecords } from "@/db/schema";
import { fail, ok, safe, type ActionResult } from "@/lib/action";
import { audit } from "@/lib/audit";
import { assertStaff } from "@/lib/auth";
import { SERVICE_STATUS_LABEL, normalizePhone, serviceNo, str, strOrNull, toNumOrNull } from "@/lib/utils";

type S = (typeof serviceRecords.$inferSelect)["status"];

export async function createService(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("service.manage");
    const contactName = str(fd.get("contactName"));
    const contactRaw = str(fd.get("contact"));
    const productName = str(fd.get("productName"));
    const issue = str(fd.get("issue"));
    if (!contactName || !contactRaw || !productName || !issue) return fail("Kişi, iletişim, ürün ve arıza zorunlu.");
    const contact = contactRaw.includes("@") ? contactRaw.toLowerCase() : normalizePhone(contactRaw);
    const serial = strOrNull(fd.get("serial"))?.toUpperCase() ?? null;
    let underWarranty = fd.get("underWarranty") === "on";
    if (serial) {
      const sn = await db.query.serialNumbers.findFirst({ where: eq(serialNumbers.serial, serial) });
      if (sn?.warrantyUntil) underWarranty = sn.warrantyUntil > new Date();
    }
    const cust = await db.query.customers.findFirst({ where: contact.includes("@") ? eq(customers.email, contact) : eq(customers.phone, contact) });
    const [r] = await db
      .insert(serviceRecords)
      .values({ contactName, contact, productName, serial, issue, underWarranty, customerId: cust?.id ?? null, assigneeId: staff.id, history: [{ status: "RECEIVED", at: new Date().toISOString(), by: staff.name }] })
      .returning();
    await audit(staff.id, "create", "service", r.id, `Servis kaydı ${serviceNo(r.number)}`);
    revalidatePath("/admin", "layout");
    return ok(`Servis kaydı açıldı: ${serviceNo(r.number)}`, { redirect: `/admin/servis?id=${r.id}` });
  });
}

export async function updateService(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("service.manage");
    const id = str(fd.get("id"));
    const r = await db.query.serviceRecords.findFirst({ where: eq(serviceRecords.id, id) });
    if (!r) return fail("Kayıt bulunamadı.");
    const status = str(fd.get("status")) as S;
    const note = strOrNull(fd.get("note"));
    const history = [...r.history];
    if (status !== r.status || note) history.push({ status, note: note ?? undefined, at: new Date().toISOString(), by: staff.name });
    await db
      .update(serviceRecords)
      .set({ status, history, assigneeId: strOrNull(fd.get("assigneeId")), cost: toNumOrNull(fd.get("cost")), underWarranty: fd.get("underWarranty") === "on" })
      .where(eq(serviceRecords.id, id));
    if (r.serial && status !== r.status) {
      const inService = ["AWAITING_DEVICE", "IN_REPAIR", "WAITING_PART", "READY"].includes(status);
      const sn = await db.query.serialNumbers.findFirst({ where: eq(serialNumbers.serial, r.serial) });
      if (sn && (sn.status === "SOLD" || sn.status === "IN_SERVICE")) await db.update(serialNumbers).set({ status: inService ? "IN_SERVICE" : "SOLD" }).where(eq(serialNumbers.id, sn.id));
    }
    await audit(staff.id, "status", "service", id, `${serviceNo(r.number)} → ${SERVICE_STATUS_LABEL[status]}`);
    revalidatePath("/admin", "layout");
    return ok("Servis kaydı güncellendi.");
  });
}
