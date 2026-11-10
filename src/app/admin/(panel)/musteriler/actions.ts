"use server";

import { and, eq, ne, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { addresses, customerNotes, customers } from "@/db/schema";
import { parseCsv, pickCol } from "@/lib/csv";
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
    const { anonymizeCustomer: anon } = await import("@/lib/account");
    await anon(id);
    await audit(staff.id, "delete", "customer", id, "Müşteri verileri KVKK talebiyle anonimleştirildi");
    return ok("Müşteri verileri anonimleştirildi.", { redirect: "/admin/musteriler" });
  });
}

/**
 * Eski siteden (Efortek "Üyeler" dışa aktarımı) ya da Excel'den müşteri aktarımı.
 * Sütun adları esnek: ad/adı/ad soyad/name, soyad, e-posta/email, telefon/gsm/cep, il/şehir, ilçe, adres, izin/bülten/ticari ileti.
 * Var olan e-posta/telefon atlanır (üzerine yazılmaz). Şifre aktarılmaz: müşteri "Şifremi unuttum" ile yeni şifre belirler.
 */
export async function importCustomersCsv(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("customers.manage");
    const file = fd.get("file");
    if (!(file instanceof File) || !file.size) return fail("CSV dosyası seçin.");
    if (file.size > 10 * 1024 * 1024) return fail("Dosya 10 MB'tan büyük olamaz.");
    const { head, rows } = parseCsv(await file.text());
    if (!rows.length) return fail("Dosyada veri satırı yok.");
    const yes = (v: string) => /^(1|evet|e|true|x|var|onaylı|onayli|izinli|yes)$/i.test(v.trim());
    const importConsent = fd.get("consent") === "on";
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];
    for (const [n, r] of rows.entries()) {
      const first = pickCol(head, r, "ad", "adı", "adi", "isim", "ad soyad", "adı soyadı", "adi soyadi", "name", "üye adı", "uye adi");
      const last = pickCol(head, r, "soyad", "soyadı", "soyadi", "surname");
      const name = [first, last].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
      const email = pickCol(head, r, "e-posta", "eposta", "email", "e-mail", "mail").toLowerCase() || null;
      const phoneRaw = pickCol(head, r, "telefon", "gsm", "cep", "cep telefonu", "phone", "tel");
      const phone = phoneRaw ? normalizePhone(phoneRaw) : null;
      if (!name || (!email && !phone)) {
        if (errors.length < 15) errors.push(`Satır ${n + 2}: ad ve e-posta/telefon gerekli`);
        continue;
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        if (errors.length < 15) errors.push(`Satır ${n + 2}: geçersiz e-posta (${email})`);
        continue;
      }
      const dup = await db.query.customers.findFirst({ where: or(email ? eq(customers.email, email) : undefined, phone ? eq(customers.phone, phone) : undefined) });
      if (dup) {
        skipped++;
        continue;
      }
      const consent = importConsent && yes(pickCol(head, r, "izin", "bülten", "bulten", "ticari ileti", "ticari ileti izni", "e-bülten", "kampanya", "marketing"));
      const [c] = await db
        .insert(customers)
        .values({ name, email, phone, marketingConsent: consent, consentAt: consent ? new Date() : null, tags: ["Eski site"] })
        .returning({ id: customers.id });
      const city = pickCol(head, r, "il", "şehir", "sehir", "city");
      const line = pickCol(head, r, "adres", "address", "açık adres", "acik adres");
      if (city && line && phone)
        await db.insert(addresses).values({ customerId: c.id, fullName: name, phone, city, district: pickCol(head, r, "ilçe", "ilce", "district") || "-", line, isDefault: true });
      created++;
    }
    await audit(staff.id, "create", "customer", null, `CSV içe aktarım: ${created} eklendi, ${skipped} atlandı`);
    revalidatePath("/admin/musteriler");
    const msg = `${created} müşteri eklendi, ${skipped} kayıt zaten vardı.`;
    return errors.length ? ok(`${msg} Atlanan satırlar: ${errors.join("; ")}`) : ok(msg);
  });
}
