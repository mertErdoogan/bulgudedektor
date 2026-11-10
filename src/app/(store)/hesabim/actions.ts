"use server";

import bcrypt from "bcryptjs";
import { and, eq, inArray, ne, or } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { addresses, customers, orders, returnRequests, serviceRecords } from "@/db/schema";
import { fail, ok, safe, type ActionResult } from "@/lib/action";
import { getCustomer } from "@/lib/auth";
import { addOrderEvent } from "@/lib/orders";
import { CUSTOMER_COOKIE, clearSessionCookie, setSessionCookie, signToken } from "@/lib/session";
import { normalizePhone, str, strOrNull } from "@/lib/utils";

const tries = new Map<string, { n: number; until: number }>();

export async function customerLogin(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const id = str(fd.get("id")).toLowerCase();
    const password = str(fd.get("password"));
    const t = tries.get(id);
    if (t && t.until > Date.now()) return fail("Çok fazla hatalı deneme. 5 dakika sonra tekrar dene.");
    const { allowIp } = await import("@/lib/guard");
    if (!(await allowIp("login", 20, 15 * 60 * 1000))) return fail("Çok fazla deneme. 15 dakika sonra tekrar dene.");
    const c = await db.query.customers.findFirst({ where: id.includes("@") ? eq(customers.email, id) : eq(customers.phone, normalizePhone(id)) });
    if (!c?.passwordHash || c.isBlocked || !(await bcrypt.compare(password, c.passwordHash))) {
      const n = (t?.n ?? 0) + 1;
      tries.set(id, { n, until: n >= 5 ? Date.now() + 300000 : 0 });
      return fail(c && !c.passwordHash ? "Bu hesap için henüz şifre belirlenmemiş. 'Şifremi unuttum' ile e-postana gelen bağlantıdan şifre oluştur." : "E-posta/telefon veya şifre hatalı.");
    }
    tries.delete(id);
    await db.update(customers).set({ lastSeenAt: new Date() }).where(eq(customers.id, c.id));
    await setSessionCookie(CUSTOMER_COOKIE, await signToken({ sub: c.id, kind: "customer" }, 30), 30);
    const next = str(fd.get("next"));
    return ok(`Hoş geldin ${c.name.split(" ")[0]}!`, { redirect: next.startsWith("/") && !next.startsWith("//") ? next : "/hesabim" });
  });
}

export async function customerRegister(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const { allowIp, verifyHuman } = await import("@/lib/guard");
    if (fd.get("website")) return fail("Kayıt alınamadı.");
    if (!(await allowIp("register", 5, 60 * 60 * 1000))) return fail("Çok fazla kayıt denemesi. Biraz sonra tekrar dene.");
    if (!(await verifyHuman(fd))) return fail("Robot doğrulaması başarısız, sayfayı yenileyip tekrar dene.");
    const name = str(fd.get("name"));
    const email = str(fd.get("email")).toLowerCase();
    const phone = normalizePhone(str(fd.get("phone")));
    const password = str(fd.get("password"));
    if (name.split(" ").length < 2) return fail("Ad ve soyadını yaz.");
    if (!/^\S+@\S+\.\S+$/.test(email)) return fail("Geçerli bir e-posta gir.");
    if (phone.replace(/\D/g, "").length < 12) return fail("Geçerli bir cep telefonu gir.");
    if (password.length < 8) return fail("Şifre en az 8 karakter olmalı.");
    if (!fd.get("kvkk")) return fail("Aydınlatma metnini onayla.");
    const marketing = fd.get("marketing") === "on";
    const existing = await db.query.customers.findFirst({ where: or(eq(customers.email, email), eq(customers.phone, phone)) });
    let id: string;
    if (existing) {
      // Misafir siparişle oluşmuş, şifresiz kayıt ise hesabı sahiplenmesine izin ver.
      if (existing.passwordHash) return fail("Bu e-posta veya telefon ile zaten hesap var. Giriş yap.");
      if (existing.email && existing.email !== email) return fail("Bu telefon başka bir e-posta ile kayıtlı. Giriş yap veya bize yaz.");
      await db.update(customers).set({ name, email, phone, passwordHash: await bcrypt.hash(password, 10), ...(marketing ? { marketingConsent: true, consentAt: new Date() } : {}) }).where(eq(customers.id, existing.id));
      id = existing.id;
    } else {
      [{ id }] = await db.insert(customers).values({ name, email, phone, passwordHash: await bcrypt.hash(password, 10), marketingConsent: marketing, consentAt: marketing ? new Date() : null }).returning({ id: customers.id });
    }
    await setSessionCookie(CUSTOMER_COOKIE, await signToken({ sub: id, kind: "customer" }, 30), 30);
    const { sendVerification } = await import("@/lib/account");
    void sendVerification({ name, email });
    return ok("Hesabın oluşturuldu. E-posta adresine doğrulama bağlantısı gönderdik.", { redirect: "/hesabim" });
  });
}

export async function customerLogout() {
  await clearSessionCookie(CUSTOMER_COOKIE);
  redirect("/");
}

async function me() {
  const c = await getCustomer();
  if (!c) throw new Error("Oturumun kapanmış, lütfen tekrar giriş yap.");
  return c;
}

export async function updateProfile(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const c = await me();
    const name = str(fd.get("name"));
    const email = str(fd.get("email")).toLowerCase();
    const phone = normalizePhone(str(fd.get("phone")));
    if (!name || !email) return fail("Ad ve e-posta zorunlu.");
    const dupe = await db.query.customers.findFirst({ where: and(or(eq(customers.email, email), eq(customers.phone, phone)), ne(customers.id, c.id)) });
    if (dupe) return fail("Bu e-posta veya telefon başka bir hesapta kayıtlı.");
    const marketing = fd.get("marketing") === "on";
    const pw = str(fd.get("newPassword"));
    if (pw) {
      if (pw.length < 8) return fail("Yeni şifre en az 8 karakter olmalı.");
      if (c.passwordHash && !(await bcrypt.compare(str(fd.get("currentPassword")), c.passwordHash))) return fail("Mevcut şifre hatalı.");
    }
    await db
      .update(customers)
      .set({
        name,
        email,
        phone,
        marketingConsent: marketing,
        consentAt: marketing && !c.marketingConsent ? new Date() : c.consentAt,
        ...(pw ? { passwordHash: await bcrypt.hash(pw, 10) } : {}),
        ...(email !== c.email ? { emailVerifiedAt: null } : {}),
      })
      .where(eq(customers.id, c.id));
    if (!marketing && c.marketingConsent && c.email) {
      const { revokeMarketing } = await import("@/lib/store");
      await revokeMarketing(c.email);
    }
    revalidatePath("/hesabim");
    if (email !== c.email) {
      const { sendVerification } = await import("@/lib/account");
      await sendVerification({ name, email });
      return ok("Bilgilerin güncellendi. Yeni e-posta adresine doğrulama bağlantısı gönderdik.");
    }
    return ok("Bilgilerin güncellendi.");
  });
}

export async function saveAddress(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const c = await me();
    const v = { title: str(fd.get("title")) || "Ev", fullName: str(fd.get("fullName")), phone: normalizePhone(str(fd.get("phone"))), city: str(fd.get("city")), district: str(fd.get("district")), line: str(fd.get("line")), zip: strOrNull(fd.get("zip")) };
    if (!v.fullName || !v.city || !v.district || !v.line) return fail("Adres alanlarını doldur.");
    await db.insert(addresses).values({ ...v, customerId: c.id });
    revalidatePath("/hesabim");
    return ok("Adres eklendi.");
  });
}

export async function deleteAddress(id: string): Promise<ActionResult> {
  return safe(async () => {
    const c = await me();
    await db.delete(addresses).where(and(eq(addresses.id, id), eq(addresses.customerId, c.id)));
    revalidatePath("/hesabim");
    return ok("Adres silindi.");
  });
}

export async function requestReturn(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const c = await me();
    const orderId = str(fd.get("orderId"));
    const o = await db.query.orders.findFirst({ where: and(eq(orders.id, orderId), eq(orders.customerId, c.id)), with: { returns: true } });
    if (!o) return fail("Sipariş bulunamadı.");
    if (!["DELIVERED", "SHIPPED"].includes(o.status)) return fail("Bu sipariş için iade talebi açılamaz. Kargoya verilmemiş siparişi iptal için bize yaz.");
    if (o.deliveredAt && Date.now() - o.deliveredAt.getTime() > 14 * 86400000) return fail("14 günlük iade süresi dolmuş. Arıza varsa servis kaydı açabilirsin.");
    if (o.returns.some((r) => !["REJECTED"].includes(r.status))) return fail("Bu sipariş için zaten açık bir iade talebin var.");
    const reason = str(fd.get("reason"));
    if (!reason) return fail("İade sebebini seç.");
    await db.insert(returnRequests).values({ orderId, customerId: c.id, reason, details: strOrNull(fd.get("details")) });
    await addOrderEvent(db, orderId, "return", "İade talebin alındı. Onaylanınca ücretsiz kargo kodu göndereceğiz.");
    revalidatePath("/hesabim");
    return ok("İade talebin alındı. 1 iş günü içinde ücretsiz kargo kodunu ileteceğiz.", { redirect: "/hesabim?t=siparisler" });
  });
}

export async function requestService(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const c = await me();
    const productName = str(fd.get("productName"));
    const issue = str(fd.get("issue"));
    if (!productName || issue.length < 10) return fail("Ürünü seç ve arızayı biraz detaylı anlat.");
    const serial = strOrNull(fd.get("serial"));
    const [r] = await db
      .insert(serviceRecords)
      .values({ customerId: c.id, contactName: c.name, contact: c.phone ?? c.email ?? "", productName, serial, issue, status: "AWAITING_DEVICE", history: [{ status: "RECEIVED", at: new Date().toISOString() }, { status: "AWAITING_DEVICE", at: new Date().toISOString(), note: "Ücretsiz kargo kodun hazırlanıyor." }] })
      .returning();
    revalidatePath("/hesabim");
    return ok(`Servis kaydın açıldı (#${r.number}). Ücretsiz kargo kodunu SMS ile göndereceğiz.`, { redirect: "/hesabim?t=servis" });
  });
}

/* ── Şifre sıfırlama ── */
export async function customerForgot(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const { allowIp, verifyHuman } = await import("@/lib/guard");
    const { requestReset } = await import("@/lib/reset");
    const email = str(fd.get("email")).toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return fail("Geçerli bir e-posta gir.");
    if (!(await allowIp("forgot", 5, 15 * 60 * 1000))) return fail("Çok fazla deneme. 15 dakika sonra tekrar dene.");
    if (!(await verifyHuman(fd))) return fail("Robot doğrulaması başarısız, sayfayı yenileyip tekrar dene.");
    const r = await requestReset("customer", email);
    return ok(r.devLink ? `Geliştirme modu (e-posta ayarı yok): ${r.devLink}` : "Bu e-postaya kayıtlı bir hesap varsa şifre yenileme bağlantısı gönderdik. Gelen kutunu (ve gereksiz klasörünü) kontrol et.");
  });
}

export async function customerResetPassword(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const { consumeReset } = await import("@/lib/reset");
    const token = str(fd.get("t"));
    const password = str(fd.get("password"));
    if (password.length < 8) return fail("Şifre en az 8 karakter olmalı.");
    if (password !== str(fd.get("password2"))) return fail("Şifreler aynı değil.");
    const id = await consumeReset("customer", token, password);
    if (!id) return fail("Bağlantının süresi dolmuş veya daha önce kullanılmış. Yeniden şifre yenileme iste.");
    await setSessionCookie(CUSTOMER_COOKIE, await signToken({ sub: id, kind: "customer" }, 30), 30);
    return ok("Şifren güncellendi, giriş yaptın.", { redirect: "/hesabim" });
  });
}

export async function resendVerification(): Promise<ActionResult> {
  return safe(async () => {
    const c = await me();
    if (c.emailVerifiedAt) return ok("E-posta adresin zaten doğrulanmış.");
    const { allow } = await import("@/lib/guard");
    if (!(await allow(`verify:${c.id}`, 3, 60 * 60 * 1000))) return fail("Çok fazla istek. Bir saat sonra tekrar dene.");
    const { sendVerification } = await import("@/lib/account");
    const r = await sendVerification(c);
    if (r.devLink) return ok(`Geliştirme modu (e-posta ayarı yok): ${r.devLink}`);
    return r.sent ? ok("Doğrulama e-postası gönderildi. Gelen kutunu (ve gereksiz klasörünü) kontrol et.") : fail("E-posta gönderilemedi, lütfen bize yaz.");
  });
}

/** KVKK: müşteri hesabını kendisi siler (şifre onayıyla). Sipariş kayıtları yasal süre boyunca anonim olarak kalır. */
export async function deleteMyAccount(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const res = await safe(async () => {
    const c = await me();
    if (c.passwordHash && !(await bcrypt.compare(str(fd.get("password")), c.passwordHash))) return fail("Şifre hatalı.");
    if (str(fd.get("confirm")).toLocaleUpperCase("tr") !== "SİL") return fail('Onay için kutuya "SİL" yaz.');
    const open = await db.query.orders.findFirst({ where: and(eq(orders.customerId, c.id), inArray(orders.status, ["PAID", "PREPARING", "SHIPPED"])) });
    if (open) return fail("Devam eden siparişin var. Teslim edildikten sonra hesabını silebilirsin.");
    const { anonymizeCustomer } = await import("@/lib/account");
    await anonymizeCustomer(c.id);
    await clearSessionCookie(CUSTOMER_COOKIE);
    return ok("Hesabın silindi.");
  });
  // Oturum kapandığı için Hesabım sayfası yeniden çizilemez; doğrudan ana sayfaya yönlendir
  if (res.ok) redirect("/?hesap=silindi");
  return res;
}
