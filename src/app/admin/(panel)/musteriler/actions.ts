"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { customerNotes, customers } from "@/db/schema";
import { fail, ok, safe, type ActionResult } from "@/lib/action";
import { audit } from "@/lib/audit";
import { assertStaff } from "@/lib/auth";
import { normalizePhone, str, strOrNull } from "@/lib/utils";

export async function saveCustomer(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("customers.manage");
    const id = strOrNull(fd.get("id"));
    const name = str(fd.get("name"));
    const email = strOrNull(fd.get("email"))?.toLowerCase() ?? null;
    const phoneRaw = strOrNull(fd.get("phone"));
    const phone = phoneRaw ? normalizePhone(phoneRaw) : null;
    if (!name) return fail("Ad zorunlu.");
    if (!email && !phone) return fail("E-posta veya telefondan en az biri gerekli.");
    if (email) {
      const d = await db.query.customers.findFirst({ where: id ? and(eq(customers.email, email), ne(customers.id, id)) : eq(customers.email, email) });
      if (d) return fail("Bu e-posta başka bir müşteride kayıtlı.");
    }
    if (phone) {
      const d = await db.query.customers.findFirst({ where: id ? and(eq(customers.phone, phone), ne(customers.id, id)) : eq(customers.phone, phone) });
      if (d) return fail("Bu telefon başka bir müşteride kayıtlı.");
    }
    const consent = fd.get("marketingConsent") === "on";
    const tags = str(fd.get("tags")).split(",").map((t) => t.trim()).filter(Boolean);
    const existing = id ? await db.query.customers.findFirst({ where: eq(customers.id, id) }) : null;
    const values = {
      name,
      email,
      phone,
      tags,
      isBlocked: fd.get("isBlocked") === "on",
      marketingConsent: consent,
      consentAt: consent && !existing?.marketingConsent ? new Date() : (existing?.consentAt ?? null),
    };
    let cid = id;
    if (id) await db.update(customers).set(values).where(eq(customers.id, id));
    else cid = (await db.insert(customers).values(values).returning())[0].id;
    await audit(staff.id, id ? "update" : "create", "customer", cid, `Müşteri ${name}`);
    revalidatePath("/admin/musteriler");
    return ok("Müşteri kaydedildi.", id ? {} : { redirect: `/admin/musteriler/${cid}` });
  });
}

export async function addNote(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("customers.manage");
    const customerId = str(fd.get("customerId"));
    const body = str(fd.get("body"));
    if (!body) return fail("Not boş olamaz.");
    await db.insert(customerNotes).values({ customerId, body, userId: staff.id });
    revalidatePath(`/admin/musteriler/${customerId}`);
    return ok("Not eklendi.");
  });
}

export async function deleteNote(id: string): Promise<ActionResult> {
  return safe(async () => {
    await assertStaff("customers.manage");
    await db.delete(customerNotes).where(eq(customerNotes.id, id));
    revalidatePath("/admin/musteriler");
    return ok("Not silindi.");
  });
}

/** KVKK: kişisel verileri anonimleştirir (sipariş kayıtları yasal saklama için kalır). */
export async function anonymizeCustomer(id: string): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("users.manage");
    await db
      .update(customers)
      .set({ name: "Silinmiş müşteri", email: null, phone: null, passwordHash: null, tags: [], marketingConsent: false, isBlocked: true })
      .where(eq(customers.id, id));
    await db.delete(customerNotes).where(eq(customerNotes.customerId, id));
    await audit(staff.id, "delete", "customer", id, "Müşteri verileri KVKK talebiyle anonimleştirildi");
    return ok("Müşteri verileri anonimleştirildi.", { redirect: "/admin/musteriler" });
  });
}
