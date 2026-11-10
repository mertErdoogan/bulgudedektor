"use server";

import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { fail, type ActionResult } from "@/lib/action";
import { audit } from "@/lib/audit";
import { ADMIN_COOKIE, TWOFA_COOKIE, clearSessionCookie, setSessionCookie, signToken, verifyToken } from "@/lib/session";

const attempts = new Map<string, { n: number; until: number }>();

export async function loginAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const next = String(fd.get("next") ?? "/admin");
  const a = attempts.get(email);
  if (a && a.until > Date.now()) return fail("Çok fazla hatalı deneme. 5 dakika sonra tekrar deneyin.");
  const { allowIp } = await import("@/lib/guard");
  if (!(await allowIp("admin-login", 15, 15 * 60 * 1000))) return fail("Çok fazla deneme. 15 dakika sonra tekrar deneyin.");
  const user = await db.query.users.findFirst({ where: eq(sql`lower(${users.email})`, email) });
  if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) {
    const n = (a?.n ?? 0) + 1;
    attempts.set(email, { n, until: n >= 5 ? Date.now() + 5 * 60 * 1000 : 0 });
    return fail("E-posta veya şifre hatalı.");
  }
  attempts.delete(email);
  const dest = next.startsWith("/admin") ? next : "/admin";
  if (user.totpEnabled) {
    // Şifre doğru; 10 dakika içinde doğrulama uygulamasındaki kod istenir
    await setSessionCookie(TWOFA_COOKIE, await signToken({ sub: user.id, kind: "staff-2fa" }, 0, "10m"), 0, 600);
    redirect(`/admin/giris/dogrula?next=${encodeURIComponent(dest)}`);
  }
  await finishLogin(user.id, user.name);
  redirect(dest);
}

async function finishLogin(id: string, name: string) {
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, id));
  await setSessionCookie(ADMIN_COOKIE, await signToken({ sub: id, kind: "staff" }, 7), 7);
  await audit(id, "login", "user", id, `${name} giriş yaptı`);
}

/** İki adımlı doğrulamanın ikinci adımı: 6 haneli kod. */
export async function verify2faAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { cookies } = await import("next/headers");
  const { allowIp } = await import("@/lib/guard");
  const { openSecret, verifyTotp } = await import("@/lib/totp");
  const jar = await cookies();
  const p = await verifyToken(jar.get(TWOFA_COOKIE)?.value);
  if (!p || p.kind !== "staff-2fa") return fail("Süre doldu. Lütfen e-posta ve şifrenle tekrar giriş yap.");
  if (!(await allowIp("admin-2fa", 10, 15 * 60 * 1000)) || !(await allowIp(`admin-2fa:${p.sub}`, 8, 15 * 60 * 1000))) return fail("Çok fazla deneme. 15 dakika sonra tekrar deneyin.");
  const user = await db.query.users.findFirst({ where: eq(users.id, p.sub) });
  if (!user || !user.isActive || !user.totpEnabled) return fail("Hesap bulunamadı.");
  const secret = openSecret(user.totpSecret);
  const step = secret ? verifyTotp(secret, String(fd.get("code") ?? "")) : null;
  if (step === null || (user.totpLastStep !== null && step <= user.totpLastStep)) return fail("Kod hatalı veya süresi geçmiş.");
  await db.update(users).set({ totpLastStep: step }).where(eq(users.id, user.id));
  await clearSessionCookie(TWOFA_COOKIE);
  await finishLogin(user.id, user.name);
  const next = String(fd.get("next") ?? "/admin");
  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function logoutAction() {
  await clearSessionCookie(ADMIN_COOKIE);
  redirect("/admin/giris");
}

export async function staffForgot(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { allowIp } = await import("@/lib/guard");
  const { requestReset } = await import("@/lib/reset");
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return fail("Geçerli bir e-posta girin.");
  if (!(await allowIp("staff-forgot", 5, 15 * 60 * 1000))) return fail("Çok fazla deneme. 15 dakika sonra tekrar deneyin.");
  const r = await requestReset("staff", email);
  return { ok: true, message: r.devLink ? `Geliştirme modu (e-posta ayarı yok): ${r.devLink}` : "Bu e-posta bir ekip üyesine aitse şifre yenileme bağlantısı gönderildi." };
}

export async function staffResetPassword(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { consumeReset } = await import("@/lib/reset");
  const password = String(fd.get("password") ?? "");
  if (password.length < 10) return fail("Yönetici şifresi en az 10 karakter olmalı.");
  if (password !== String(fd.get("password2") ?? "")) return fail("Şifreler aynı değil.");
  const id = await consumeReset("staff", String(fd.get("t") ?? ""), password);
  if (!id) return fail("Bağlantının süresi dolmuş veya daha önce kullanılmış.");
  await audit(id, "update", "user", id, "Şifre e-posta bağlantısıyla yenilendi");
  return { ok: true, message: "Şifreniz güncellendi. Yeni şifrenizle giriş yapın.", redirect: "/admin/giris" };
}
