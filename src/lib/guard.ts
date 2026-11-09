import "server-only";
import { headers } from "next/headers";

/**
 * Basit kötüye kullanım koruması.
 * Not: Sayaç sunucu belleğinde tutulur; tek sunuculu kurulum için yeterli.
 * Birden fazla sunucuya ölçeklenirse Redis/Upstash gibi paylaşılan bir depoya taşınmalı.
 */
const buckets = new Map<string, number[]>();

export async function clientIp() {
  const h = await headers();
  return (h.get("cf-connecting-ip") ?? h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0] ?? "local").trim();
}

/** windowMs içinde en fazla `max` istek. Aşılırsa false. */
export function allow(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const arr = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) {
    buckets.set(key, arr);
    return false;
  }
  arr.push(now);
  buckets.set(key, arr);
  if (buckets.size > 20000) buckets.clear();
  return true;
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
