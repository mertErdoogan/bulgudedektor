import "server-only";
import { headers } from "next/headers";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { rateHits } from "@/db/schema";

/**
 * Kötüye kullanım koruması (deneme sınırları ve bot doğrulaması).
 */
export async function clientIp() {
  const h = await headers();
  return (h.get("cf-connecting-ip") ?? h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0] ?? "local").trim();
}

/**
 * windowMs içinde en fazla `max` istek. Aşılırsa false.
 * Sayaçlar veritabanında sabit pencerelerle tutulur; böylece birden fazla sunucu aynı sınırı paylaşır.
 * Veritabanı hatasında müşteriyi engellemez (true döner).
 */
export async function allow(key: string, max: number, windowMs: number) {
  const win = new Date(Math.floor(Date.now() / windowMs) * windowMs);
  try {
    const [r] = await db
      .insert(rateHits)
      .values({ key, windowStart: win })
      .onConflictDoUpdate({ target: [rateHits.key, rateHits.windowStart], set: { count: sql`${rateHits.count} + 1` } })
      .returning({ n: rateHits.count });
    return (r?.n ?? 1) <= max;
  } catch {
    return true;
  }
}

/** Sayacı artırmadan okur (yalnızca hatalı denemeleri sayan sınırlar için). */
export async function peek(key: string, windowMs: number) {
  const win = new Date(Math.floor(Date.now() / windowMs) * windowMs);
  try {
    const r = await db.query.rateHits.findFirst({ where: (t, { and, eq }) => and(eq(t.key, key), eq(t.windowStart, win)) });
    return r?.count ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Yalnızca HATALI denemeleri sayan IP sınırı. Mağazada herkes aynı Wi-Fi'dan (aynı IP) girdiği için
 * başarılı girişler sayılmaz; aksi halde doğru şifreyle giren ekip birbirini kilitler.
 */
export async function ipFailures(scope: string, windowMs: number) {
  return peek(`${scope}:${await clientIp()}`, windowMs);
}
export async function recordIpFailure(scope: string, windowMs: number) {
  await allow(`${scope}:${await clientIp()}`, Number.MAX_SAFE_INTEGER, windowMs);
}

/** IP bazlı sınır: aynı IP'den çok fazla deneme. */
export async function allowIp(scope: string, max: number, windowMs: number) {
  return allow(`${scope}:${await clientIp()}`, max, windowMs);
}

/**
 * Cloudflare Turnstile doğrulaması (görünmez bot koruması).
 * TURNSTILE_SECRET_KEY tanımlı değilse doğrulama atlanır (geliştirme ortamı).
 */
export async function verifyHuman(fd: FormData) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  const token = String(fd.get("cf-turnstile-response") ?? "");
  if (!token) return false;
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret, response: token, remoteip: await clientIp() }),
      signal: AbortSignal.timeout(5000),
    });
    const d = (await r.json()) as { success?: boolean };
    return !!d.success;
  } catch {
    return true; // Cloudflare'e ulaşılamazsa müşteriyi engelleme
  }
}
