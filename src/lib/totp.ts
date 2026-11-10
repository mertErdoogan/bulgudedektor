import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * RFC 6238 TOTP (Google Authenticator, Microsoft Authenticator, 1Password, Authy uyumlu): 6 hane, 30 sn, SHA-1.
 * Gizli anahtar veritabanında AUTH_SECRET'tan türetilen anahtarla AES-256-GCM şifreli saklanır.
 */
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buf: Buffer) {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(s: string) {
  const clean = s.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    value = (value << 5) | B32.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export const newTotpSecret = () => base32Encode(randomBytes(20));

export function totpAt(secretB32: string, step: number) {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(step));
  const h = createHmac("sha1", base32Decode(secretB32)).update(msg).digest();
  const off = h[h.length - 1] & 15;
  const code = ((h.readUInt32BE(off) & 0x7fffffff) % 1_000_000).toString().padStart(6, "0");
  return code;
}

/** ±1 adım (±30 sn) saat kaymasını tolere eder. Eşleşen adımı döndürür (tekrar kullanımı önlemek için), yoksa null. */
export function verifyTotp(secretB32: string, code: string, now = Date.now()): number | null {
  const c = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(c)) return null;
  const step = Math.floor(now / 30000);
  for (const d of [0, -1, 1]) {
    const expected = Buffer.from(totpAt(secretB32, step + d));
    if (timingSafeEqual(expected, Buffer.from(c))) return step + d;
  }
  return null;
}

export function otpauthUri(secretB32: string, account: string, issuer: string) {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secretB32}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

const key = () => createHash("sha256").update(`totp:${process.env.AUTH_SECRET || "dev-secret"}`).digest();

export function sealSecret(plain: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return `v1.${iv.toString("base64url")}.${c.getAuthTag().toString("base64url")}.${enc.toString("base64url")}`;
}

export function openSecret(sealed: string | null | undefined): string | null {
  if (!sealed?.startsWith("v1.")) return null;
  try {
    const [, iv, tag, enc] = sealed.split(".");
    const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
    d.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([d.update(Buffer.from(enc, "base64url")), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}
