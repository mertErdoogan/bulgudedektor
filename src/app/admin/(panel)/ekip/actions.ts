"use server";

import bcrypt from "bcryptjs";
import { and, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { roles, users } from "@/db/schema";
import { fail, ok, safe, type ActionResult } from "@/lib/action";
import { audit } from "@/lib/audit";
import { assertStaff } from "@/lib/auth";
import { ALL_PERMISSIONS } from "@/lib/permissions";
import { slugify, str, strOrNull, toNum } from "@/lib/utils";

async function adminCount(excludeUserId?: string) {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(users)
    .innerJoin(roles, eq(roles.id, users.roleId))
    .where(and(eq(users.isActive, true), sql`'users.manage' = any(${roles.permissions})`, excludeUserId ? ne(users.id, excludeUserId) : undefined));
  return n;
}

export async function saveUser(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("users.manage");
    const id = strOrNull(fd.get("id"));
    const name = str(fd.get("name"));
    const email = str(fd.get("email")).toLowerCase();
    const roleId = str(fd.get("roleId"));
    const password = str(fd.get("password"));
    const isActive = fd.get("isActive") === "on";
    if (!name || !email || !roleId) return fail("Ad, e-posta ve rol zorunlu.");
    if (!id && password.length < 8) return fail("Şifre en az 8 karakter olmalı.");
    if (password && password.length < 8) return fail("Yeni şifre en az 8 karakter olmalı.");
    const dupe = await db.query.users.findFirst({ where: id ? and(eq(users.email, email), ne(users.id, id)) : eq(users.email, email) });
    if (dupe) return fail("Bu e-posta ile bir ekip üyesi zaten var.");
    if (id) {
      const role = await db.query.roles.findFirst({ where: eq(roles.id, roleId) });
      const stillAdmin = isActive && role?.permissions.includes("users.manage");
      if (!stillAdmin && (await adminCount(id)) === 0) return fail("Sistemde en az bir aktif yönetici kalmalı.");
      if (id === staff.id && !isActive) return fail("Kendi hesabını pasifleştiremezsin.");
    }
    const values = { name, email, roleId, isActive, maxDiscountPct: Math.max(0, Math.min(100, toNum(fd.get("maxDiscountPct"), 0))), ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}) };
    if (id) await db.update(users).set(values).where(eq(users.id, id));
    else await db.insert(users).values({ ...values, passwordHash: await bcrypt.hash(password, 10) });
    await audit(staff.id, id ? "update" : "create", "user", id, `Ekip üyesi ${name}${password && id ? " (şifre sıfırlandı)" : ""}`);
    revalidatePath("/admin/ekip");
    return ok(id ? "Ekip üyesi güncellendi." : "Ekip üyesi eklendi. Giriş bilgilerini kendisiyle paylaş.", { redirect: "/admin/ekip" });
  });
}

export async function saveRole(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("users.manage");
    const id = strOrNull(fd.get("id"));
    const name = str(fd.get("name"));
    if (!name) return fail("Rol adı zorunlu.");
    const permissions = fd.getAll("permissions").map(String).filter((p) => (ALL_PERMISSIONS as string[]).includes(p));
    if (id) {
      const r = await db.query.roles.findFirst({ where: eq(roles.id, id) });
      if (r?.isSystem) return fail("Yönetici rolü değiştirilemez; her zaman tüm yetkilere sahiptir.");
      if (r?.permissions.includes("users.manage") && !permissions.includes("users.manage")) {
        const holders = await db.select({ id: users.id }).from(users).where(and(eq(users.roleId, id), eq(users.isActive, true)));
        if ((await adminCount()) - holders.length <= 0) return fail("Bu değişiklikle hiç yönetici kalmayacak.");
      }
      await db.update(roles).set({ name, description: strOrNull(fd.get("description")), permissions }).where(eq(roles.id, id));
    } else {
      await db.insert(roles).values({ name, key: `${slugify(name)}-${Date.now().toString(36)}`, description: strOrNull(fd.get("description")), permissions });
    }
    await audit(staff.id, id ? "update" : "create", "role", id, `Rol ${name}: ${permissions.length} yetki`, { permissions });
    revalidatePath("/admin", "layout");
    return ok("Rol kaydedildi. Değişiklik ekip üyelerinin bir sonraki sayfa açılışında geçerli olur.");
  });
}

export async function deleteRole(id: string): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("users.manage");
    const r = await db.query.roles.findFirst({ where: eq(roles.id, id) });
    if (!r) return fail("Rol yok.");
    if (r.isSystem) return fail("Sistem rolü silinemez.");
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(users).where(eq(users.roleId, id));
    if (n) return fail(`Bu rolde ${n} kişi var; önce başka role taşıyın.`);
    await db.delete(roles).where(eq(roles.id, id));
    await audit(staff.id, "delete", "role", id, `Rol silindi: ${r.name}`);
    return ok("Rol silindi.", { redirect: "/admin/ekip" });
  });
}

/** Telefonunu kaybeden ekip üyesinin iki adımlı doğrulamasını kapatır (yeniden kurması gerekir). */
export async function reset2fa(userId: string): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("users.manage");
    await db.update(users).set({ totpEnabled: false, totpSecret: null, totpLastStep: null }).where(eq(users.id, userId));
    await audit(staff.id, "update", "user", userId, "İki adımlı doğrulama sıfırlandı");
    revalidatePath("/admin/ekip");
    return ok("İki adımlı doğrulama kapatıldı. Kullanıcı Hesabım sayfasından yeniden kurabilir.");
  });
}
