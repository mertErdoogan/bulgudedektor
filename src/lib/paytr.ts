import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getSettings } from "./settings";

/**
 * PayTR iFrame API (https://dev.paytr.com/iframe-api).
 * 1) Sunucu get-token ile iframe jetonu alır, kart formu PayTR'ın iframe'inde açılır (kart bilgisi sitemize hiç gelmez).
 * 2) Ödeme sonucu PayTR'dan "Bildirim URL"ine (/api/odeme/paytr) sunucudan sunucuya gelir; sipariş ancak orada onaylanır.
 *    merchant_ok_url yalnızca müşteriyi geri getirir, ödemenin kanıtı değildir.
 */
export type PaytrConfig = { merchantId: string; merchantKey: string; merchantSalt: string; testMode: boolean };

const BASE = process.env.PAYTR_BASE_URL || "https://www.paytr.com";

export async function getPaytrConfig(): Promise<PaytrConfig | null> {
  const p = (await getSettings()).payment;
  const merchantId = p.paytrMerchantId || process.env.PAYTR_MERCHANT_ID || "";
  const merchantKey = p.paytrMerchantKey || process.env.PAYTR_MERCHANT_KEY || "";
  const merchantSalt = p.paytrMerchantSalt || process.env.PAYTR_MERCHANT_SALT || "";
  if (!merchantId || !merchantKey || !merchantSalt) return null;
  return { merchantId, merchantKey, merchantSalt, testMode: p.paytrTestMode };
}

const sign = (data: string, key: string) => createHmac("sha256", key).update(data).digest("base64");

/** PayTR sipariş numarası yalnızca harf ve rakam olabilir (en fazla 64). Her ödeme denemesi için benzersiz üretilir. */
export function merchantOid(orderNumber: number) {
  return `ARN${orderNumber}T${Date.now().toString(36).toUpperCase()}`;
}

const kurus = (n: number) => Math.round(n * 100);
/** E-posta alanında Türkçe karakter kabul edilmez */
const asciiEmail = (e: string) => e.normalize("NFKD").replace(/[^\x20-\x7e]/g, "");
const cut = (s: string, n: number) => (s.length > n ? s.slice(0, n) : s);

export function basketOf(lines: { name: string; unitPrice: number; quantity: number }[]) {
  const arr = lines.map((l) => [cut(l.name, 100), (Math.round(l.unitPrice * 100) / 100).toFixed(2), l.quantity]);
  return Buffer.from(JSON.stringify(arr)).toString("base64");
}

/** iframe jetonunu alır. Başarısızsa PayTR'ın hata mesajıyla hata fırlatır. */
export async function createIframeToken(
  cfg: PaytrConfig,
  a: {
    oid: string;
    ip: string;
    email: string;
    amount: number;
    lines: { name: string; unitPrice: number; quantity: number }[];
    maxInstallment: number;
    name: string;
    address: string;
    phone: string;
    okUrl: string;
    failUrl: string;
  },
) {
  const user_basket = basketOf(a.lines);
  const payment_amount = String(kurus(a.amount));
  const no_installment = a.maxInstallment <= 1 ? "1" : "0";
  const max_installment = a.maxInstallment <= 1 ? "0" : String(Math.min(12, a.maxInstallment));
  const currency = "TL";
  const test_mode = cfg.testMode ? "1" : "0";
  const email = asciiEmail(a.email);
  const user_ip = cut(a.ip, 39);
  // Sıra PayTR belgesindekiyle birebir aynı olmalı
  const hashStr = cfg.merchantId + user_ip + a.oid + email + payment_amount + user_basket + no_installment + max_installment + currency + test_mode;
  const body = new URLSearchParams({
    merchant_id: cfg.merchantId,
    user_ip,
    merchant_oid: a.oid,
    email,
    payment_amount,
    paytr_token: sign(hashStr + cfg.merchantSalt, cfg.merchantKey),
    user_basket,
    debug_on: process.env.NODE_ENV === "production" ? "0" : "1",
    no_installment,
    max_installment,
    user_name: cut(a.name, 60),
    user_address: cut(a.address, 400),
    user_phone: cut(a.phone, 20),
    merchant_ok_url: a.okUrl,
    merchant_fail_url: a.failUrl,
    timeout_limit: "30",
    currency,
    test_mode,
    lang: "tr",
  });
  const res = await fetch(`${BASE}/odeme/api/get-token`, { method: "POST", body, signal: AbortSignal.timeout(20000) });
  const j = (await res.json().catch(() => null)) as { status?: string; token?: string; reason?: string } | null;
  if (j?.status !== "success" || !j.token) throw new Error(`PayTR: ${j?.reason ?? `yanıt alınamadı (${res.status})`}`);
  return j.token;
}

export type PaytrCallback = { merchantOid: string; status: "success" | "failed"; totalAmount: number; paymentAmount: number; paymentType: string; testMode: boolean; failedReason: string | null };

/** Bildirim isteğinin PayTR'dan geldiğini imzayla doğrular. İmza tutmazsa null döner. */
export function verifyCallback(cfg: PaytrConfig, fd: FormData): PaytrCallback | null {
  const g = (k: string) => String(fd.get(k) ?? "");
  const oid = g("merchant_oid");
  const status = g("status");
  const total = g("total_amount");
  const expected = Buffer.from(sign(oid + cfg.merchantSalt + status + total, cfg.merchantKey));
  const got = Buffer.from(g("hash"));
  if (!oid || expected.length !== got.length || !timingSafeEqual(expected, got)) return null;
  return {
    merchantOid: oid,
    status: status === "success" ? "success" : "failed",
    totalAmount: Number(total) / 100,
    paymentAmount: Number(g("payment_amount")) / 100,
    paymentType: g("payment_type"),
    testMode: g("test_mode") === "1",
    failedReason: g("failed_reason_msg") || g("failed_reason_code") || null,
  };
}

/** Kısmi ya da tam iade. */
export async function refund(cfg: PaytrConfig, oid: string, amount: number) {
  const return_amount = (Math.round(amount * 100) / 100).toFixed(2);
  const body = new URLSearchParams({
    merchant_id: cfg.merchantId,
    merchant_oid: oid,
    return_amount,
    paytr_token: sign(cfg.merchantId + oid + return_amount + cfg.merchantSalt, cfg.merchantKey),
  });
  const res = await fetch(`${BASE}/odeme/iade`, { method: "POST", body, signal: AbortSignal.timeout(20000) });
  const j = (await res.json().catch(() => null)) as { status?: string; err_msg?: string; err_no?: string } | null;
  if (j?.status !== "success") throw new Error(`PayTR iade: ${j?.err_msg ?? `yanıt alınamadı (${res.status})`}`);
  return j;
}

/**
 * Bağlantı testi: var olmayan bir sipariş için durum sorgusu yapar. Anahtarlar doğruysa PayTR "sipariş bulunamadı" der,
 * yanlışsa kimlik/token hatası döner.
 */
export async function testConnection() {
  const cfg = await getPaytrConfig();
  if (!cfg) return { ok: false, message: "Mağaza no, mağaza parolası ve gizli anahtar girilmemiş." };
  const oid = `ARNTEST${Date.now()}`;
  try {
    const body = new URLSearchParams({ merchant_id: cfg.merchantId, merchant_oid: oid, paytr_token: sign(cfg.merchantId + oid + cfg.merchantSalt, cfg.merchantKey) });
    const res = await fetch(`${BASE}/odeme/durum-sorgu`, { method: "POST", body, signal: AbortSignal.timeout(15000) });
    const j = (await res.json().catch(() => null)) as { status?: string; err_msg?: string; err_no?: string } | null;
    const msg = (j?.err_msg ?? "").toLocaleLowerCase("tr");
    if (/bulunamad|not found|kayıt yok|siparis/.test(msg)) return { ok: true, message: "PayTR bağlantısı çalışıyor (anahtarlar doğru)." };
    if (j?.status === "success") return { ok: true, message: "PayTR bağlantısı çalışıyor." };
    return { ok: false, message: j?.err_msg ? `PayTR: ${j.err_msg}` : `PayTR yanıt vermedi (${res.status}).` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "PayTR'a bağlanılamadı." };
  }
}
