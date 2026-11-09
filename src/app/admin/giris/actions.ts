"use server";

import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { fail, type ActionResult } from "@/lib/action";
import { audit } from "@/lib/audit";
import { ADMIN_COOKIE, clearSessionCookie, setSessionCookie, signToken } from "@/lib/session";

const attempts = new Map<string, { n: number; until: number }>();

export async function loginAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const next = String(fd.get("next") ?? "/admin");
  const a = attempts.get(email);
  if (a && a.until > Date.now()) return fail("Çok fazla hatalı deneme. 5 dakika sonra tekrar deneyin.");
  const user = await db.query.users.findFirst({ where: eq(sql`lower(${users.email})`, email) });
  if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) {
    const n = (a?.n ?? 0) + 1;
    attempts.set(email, { n, until: n >= 5 ? Date.now() + 5 * 60 * 1000 : 0 });
    return fail("E-posta veya şifre hatalı.");
  }
  attempts.delete(email);
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  await setSessionCookie(ADMIN_COOKIE, await signToken({ sub: user.id, kind: "staff" }, 7), 7);
  await audit(user.id, "login", "user", user.id, `${user.name} giriş yaptı`);
  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function logoutAction() {
  await clearSessionCookie(ADMIN_COOKIE);
  redirect("/admin/giris");
}
