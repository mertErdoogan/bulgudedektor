"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { users } from "@/db/schema";
import { fail, ok, safe, type ActionResult } from "@/lib/action";
import { audit } from "@/lib/audit";
import { assertStaff } from "@/lib/auth";
import { newTotpSecret, openSecret, sealSecret, verifyTotp } from "@/lib/totp";
import { str } from "@/lib/utils";

export async function changeMyPassword(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff();
    const u = await db.query.users.findFirst({ where: eq(users.id, staff.id) });
    if (!u || !(await bcrypt.compare(str(fd.get("current")), u.passwordHash))) return fail("Mevcut şifre hatalı.");
    const next = str(fd.get("password"));
    if (next.length < 10) return fail("Yeni şifre en az 10 karakter olmalı.");
    if (next !== str(fd.get("password2"))) return fail("Şifreler aynı değil.");
    await db.update(users).set({ passwordHash: await bcrypt.hash(next, 10) }).where(eq(users.id, staff.id));
    await audit(staff.id, "update", "user", staff.id, "Şifresini değiştirdi");
    return ok("Şifren güncellendi.");
  });
}

/** Kurulum 1: yeni gizli anahtar üretir (henüz etkin değil). */
export async function start2fa(): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff();
    await db.update(users).set({ totpSecret: sealSecret(newTotpSecret()), totpEnabled: false, totpLastStep: null }).where(eq(users.id, staff.id));
    revalidatePath("/admin/hesap");
    return ok("Kare kodu doğrulama uygulamanla okut.");
  });
}

/** Kurulum 2: uygulamadaki kod doğruysa etkinleştirir. */
export async function confirm2fa(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff();
    const u = await db.query.users.findFirst({ where: eq(users.id, staff.id) });
    const secret = openSecret(u?.totpSecret);
    if (!secret) return fail("Önce kurulumu başlat.");
    const step = verifyTotp(secret, str(fd.get("code")));
    if (step === null) return fail("Kod hatalı. Telefonunun saatinin otomatik ayarlı olduğundan emin ol.");
    await db.update(users).set({ totpEnabled: true, totpLastStep: step }).where(eq(users.id, staff.id));
    await audit(staff.id, "update", "user", staff.id, "İki adımlı doğrulamayı açtı");
    revalidatePath("/admin/hesap");
    return ok("İki adımlı doğrulama açıldı. Bir sonraki girişte kod istenecek.");
  });
}

export async function disable2fa(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff();
    const u = await db.query.users.findFirst({ where: eq(users.id, staff.id) });
    if (!u || !(await bcrypt.compare(str(fd.get("current")), u.passwordHash))) return fail("Şifre hatalı.");
    await db.update(users).set({ totpEnabled: false, totpSecret: null, totpLastStep: null }).where(eq(users.id, staff.id));
    await audit(staff.id, "update", "user", staff.id, "İki adımlı doğrulamayı kapattı");
    revalidatePath("/admin/hesap");
    return ok("İki adımlı doğrulama kapatıldı.");
  });
}
