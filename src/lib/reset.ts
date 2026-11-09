import "server-only";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { customers, passwordResets, users } from "@/db/schema";
import { sendMail, wrap } from "./mail";
import { getSettings } from "./settings";

const TTL = 60 * 60 * 1000; // 1 saat
const hash = (t: string) => createHash("sha256").update(t).digest("hex");
const base = () => (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");

/** Şifre sıfırlama bağlantısı üretir ve e-postayla yollar. Kullanıcı yoksa sessizce geçer (hesap varlığı sızdırılmaz). */
export async function requestReset(kind: "customer" | "staff", email: string) {
  const e = email.trim().toLowerCase();
  const subject =
    kind === "customer"
      ? await db.query.customers.findFirst({ where: eq(customers.email, e), columns: { id: true, name: true, email: true, isBlocked: true } })
      : await db.query.users.findFirst({ where: eq(users.email, e), columns: { id: true, name: true, email: true, isActive: true } });
  if (!subject || ("isBlocked" in subject && subject.isBlocked) || ("isActive" in subject && !subject.isActive)) return { sent: false, devLink: null as string | null };
  const raw = randomBytes(32).toString("base64url");
  // Önceki kullanılmamış bağlantıları geçersiz kıl
  await db.update(passwordResets).set({ usedAt: new Date() }).where(and(eq(passwordResets.kind, kind), eq(passwordResets.subjectId, subject.id), isNull(passwordResets.usedAt)));
  await db.insert(passwordResets).values({ kind, subjectId: subject.id, tokenHash: hash(raw), expiresAt: new Date(Date.now() + TTL) });
  const link = `${base()}${kind === "customer" ? "/sifre-yenile" : "/admin/giris/sifre-yenile"}?t=${raw}`;
  const s = await getSettings();
  const sent = await sendMail(
    subject.email!,
    `${s.store.name} · Şifre yenileme`,
    wrap(
      `<p>Merhaba ${subject.name.split(" ")[0]},</p><p>Şifreni yenilemek için aşağıdaki bağlantıya tıkla. Bağlantı <b>1 saat</b> geçerlidir ve yalnızca bir kez kullanılabilir.</p><p><a href="${link}" style="display:inline-block;background:#d42e1e;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:700">Şifremi yenile</a></p><p style="color:#66666b;font-size:13px">Bu isteği sen yapmadıysan bu e-postayı yok sayabilirsin; şifren değişmez.</p>`,
      s.store.name,
    ),
  );
  // E-posta ayarı yoksa geliştirme ortamında bağlantıyı göster
  const devLink = !sent && process.env.NODE_ENV !== "production" ? link : null;
  if (devLink) console.info(`[şifre sıfırlama] ${link}`);
  return { sent, devLink };
}

export async function checkReset(kind: "customer" | "staff", raw: string) {
  if (!raw) return null;
  return db.query.passwordResets.findFirst({ where: and(eq(passwordResets.kind, kind), eq(passwordResets.tokenHash, hash(raw)), isNull(passwordResets.usedAt), gt(passwordResets.expiresAt, new Date())) });
}

export async function consumeReset(kind: "customer" | "staff", raw: string, password: string) {
  const r = await checkReset(kind, raw);
  if (!r) return null;
  const pw = await bcrypt.hash(password, 10);
  await db.transaction(async (tx) => {
    await tx.update(passwordResets).set({ usedAt: new Date() }).where(eq(passwordResets.id, r.id));
    if (kind === "customer") await tx.update(customers).set({ passwordHash: pw }).where(eq(customers.id, r.subjectId));
    else await tx.update(users).set({ passwordHash: pw }).where(eq(users.id, r.subjectId));
  });
  return r.subjectId;
}
