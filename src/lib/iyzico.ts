import "server-only";
// iyzipay paketi CommonJS; tip tanımları @types/iyzipay ile gelir.
import Iyzipay from "iyzipay";
import { getSettings } from "./settings";

export type IyzicoConfig = { apiKey: string; secretKey: string; uri: string };

export async function getIyzicoConfig(): Promise<IyzicoConfig | null> {
  const s = await getSettings();
  const apiKey = s.payment.iyzicoApiKey || process.env.IYZICO_API_KEY || "";
  const secretKey = s.payment.iyzicoSecretKey || process.env.IYZICO_SECRET_KEY || "";
  if (!apiKey || !secretKey) return null;
  const uri = s.payment.iyzicoSandbox ? "https://sandbox-api.iyzipay.com" : "https://api.iyzipay.com";
  return { apiKey, secretKey, uri: process.env.IYZICO_BASE_URL && s.payment.iyzicoSandbox ? process.env.IYZICO_BASE_URL : uri };
}

/** Anahtar yoksa ve PAYMENT_SIMULATION=1 ise ödeme simülasyonu ile uçtan uca test yapılabilir (sadece geliştirme). */
export function simulationAllowed() {
  const v = process.env.PAYMENT_SIMULATION;
  return (v === "1" && process.env.NODE_ENV !== "production") || v === "force-test-only";
}

function client(cfg: IyzicoConfig) {
  return new Iyzipay({ apiKey: cfg.apiKey, secretKey: cfg.secretKey, uri: cfg.uri });
}

function call<T>(fn: (cb: (err: unknown, res: T) => void) => void): Promise<T> {
  return new Promise((resolve, reject) => fn((err, res) => (err ? reject(err) : resolve(res))));
}

type Buyer = { id: string; name: string; email: string; phone: string; city: string; address: string; ip: string; identityNumber?: string };
type Item = { id: string; name: string; category: string; price: number };

const p2 = (n: number) => (Math.round(n * 100) / 100).toFixed(2);

export async function initCheckoutForm(args: {
  conversationId: string;
  basketId: string;
  price: number; // indirim öncesi kalem toplamı
  paidPrice: number; // kargo ve indirim sonrası
  callbackUrl: string;
  buyer: Buyer;
  items: Item[];
  enabledInstallments: number[];
  /** Giriş yapmış müşterinin iyzico'daki kayıtlı kart anahtarı: formda kayıtlı kartları gösterir */
  cardUserKey?: string | null;
}) {
  const cfg = await getIyzicoConfig();
  if (!cfg) throw new Error("iyzico anahtarları ayarlanmamış. Admin › Ayarlar › Ödeme'den girin.");
  const [first, ...rest] = args.buyer.name.trim().split(/\s+/);
  const surname = rest.join(" ") || first;
  // iyzico: basket item fiyatlarının toplamı "price" alanına eşit olmalı.
  const itemsTotal = args.items.reduce((s, i) => s + i.price, 0);
  const req = {
    locale: Iyzipay.LOCALE.TR,
    conversationId: args.conversationId,
    price: p2(itemsTotal),
    paidPrice: p2(args.paidPrice),
    currency: Iyzipay.CURRENCY.TRY,
    basketId: args.basketId,
    paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
    callbackUrl: args.callbackUrl,
    enabledInstallments: args.enabledInstallments,
    ...(args.cardUserKey ? { cardUserKey: args.cardUserKey } : {}),
    buyer: {
      id: args.buyer.id,
      name: first,
      surname,
      gsmNumber: args.buyer.phone,
      email: args.buyer.email,
      // TC kimlik no müşteri girerse o gönderilir ve saklanmaz; girilmezse iyzico'nun kabul ettiği varsayılan değer.
      identityNumber: args.buyer.identityNumber || "11111111111",
      registrationAddress: args.buyer.address,
      ip: args.buyer.ip,
      city: args.buyer.city,
      country: "Turkey",
    },
    shippingAddress: { contactName: args.buyer.name, city: args.buyer.city, country: "Turkey", address: args.buyer.address },
    billingAddress: { contactName: args.buyer.name, city: args.buyer.city, country: "Turkey", address: args.buyer.address },
    basketItems: args.items.map((i) => ({
      id: i.id,
      name: i.name.slice(0, 100),
      category1: i.category || "Dedektör",
      itemType: Iyzipay.BASKET_ITEM_TYPE.PHYSICAL,
      price: p2(i.price),
    })),
  };
  const res = await call<Record<string, unknown>>((cb) => client(cfg).checkoutFormInitialize.create(req as never, cb as never));
  if (res.status !== "success") throw new Error(String(res.errorMessage || "iyzico ödeme formu başlatılamadı."));
  return { token: String(res.token), paymentPageUrl: String(res.paymentPageUrl), content: String(res.checkoutFormContent ?? "") };
}

export async function retrieveCheckoutForm(token: string) {
  const cfg = await getIyzicoConfig();
  if (!cfg) throw new Error("iyzico anahtarları ayarlanmamış.");
  const res = await call<Record<string, unknown>>((cb) =>
    client(cfg).checkoutForm.retrieve({ locale: Iyzipay.LOCALE.TR, token } as never, cb as never),
  );
  return res as {
    status: string;
    paymentStatus?: string;
    paymentId?: string;
    basketId?: string;
    paidPrice?: number | string;
    installment?: number;
    errorMessage?: string;
    /** Müşteri formda "kartımı kaydet" dediyse iyzico'nun verdiği anahtar */
    cardUserKey?: string;
    itemTransactions?: { itemId: string; paymentTransactionId: string; paidPrice: number | string }[];
  };
}

/** Tam iade: aynı gün ise iptal, değilse kalem bazında iade */
export async function refundPayment(meta: { paymentId?: string; transactions?: { transactionId: string; price: number }[] }, amount: number, ip: string) {
  const cfg = await getIyzicoConfig();
  if (!cfg) throw new Error("iyzico anahtarları ayarlanmamış.");
  const c = client(cfg);
  if (meta.paymentId) {
    const cancel = await call<Record<string, unknown>>((cb) => c.cancel.create({ locale: Iyzipay.LOCALE.TR, paymentId: meta.paymentId, ip } as never, cb as never));
    if (cancel.status === "success") return { mode: "cancel" as const };
  }
  let remaining = Math.round(amount * 100) / 100;
  for (const t of meta.transactions ?? []) {
    if (remaining <= 0) break;
    const part = Math.min(remaining, t.price);
    const res = await call<Record<string, unknown>>((cb) =>
      c.refund.create(
        { locale: Iyzipay.LOCALE.TR, paymentTransactionId: t.transactionId, price: p2(part), currency: Iyzipay.CURRENCY.TRY, ip } as never,
        cb as never,
      ),
    );
    if (res.status !== "success") throw new Error(String(res.errorMessage || "iyzico iadesi başarısız."));
    remaining -= part;
  }
  if (remaining > 0.009) throw new Error("İade tutarı ödeme kalemlerini aşıyor.");
  return { mode: "refund" as const };
}

export async function testConnection() {
  const cfg = await getIyzicoConfig();
  if (!cfg) return { ok: false, message: "Anahtar girilmemiş." };
  try {
    const res = await call<Record<string, unknown>>((cb) =>
      client(cfg).installmentInfo.retrieve({ locale: Iyzipay.LOCALE.TR, binNumber: "554960", price: "100" } as never, cb as never),
    );
    return res.status === "success" ? { ok: true, message: "Bağlantı başarılı." } : { ok: false, message: String(res.errorMessage) };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Bağlantı kurulamadı." };
  }
}

export type InstallmentBank = { bank: string; family: string; rows: { n: number; total: number; monthly: number }[] };
const instCache = new Map<number, { at: number; data: InstallmentBank[] }>();

/**
 * Banka/kart ailesine göre taksit tablosu (iyzico'dan, 1 saat önbellekli).
 * Anahtar yoksa veya iyzico yanıt vermezse null döner; sayfa genel taksit bilgisini gösterir.
 */
export async function installmentTable(price: number, maxInstallment: number): Promise<InstallmentBank[] | null> {
  const cfg = await getIyzicoConfig();
  if (!cfg) return null;
  const key = Math.round(price);
  const hit = instCache.get(key);
  if (hit && Date.now() - hit.at < 3600_000) return hit.data;
  try {
    const res = await call<{ status: string; installmentDetails?: { bankName: string; cardFamilyName: string; installmentPrices: { installmentNumber: number; totalPrice: number | string; installmentPrice: number | string }[] }[] }>((cb) =>
      client(cfg).installmentInfo.retrieve({ locale: Iyzipay.LOCALE.TR, conversationId: `inst-${key}`, price: p2(price) } as never, cb as never),
    );
    if (res.status !== "success" || !res.installmentDetails) return null;
    const data = res.installmentDetails
      .map((d) => ({
        bank: d.bankName,
        family: d.cardFamilyName,
        rows: d.installmentPrices.filter((r) => r.installmentNumber > 1 && r.installmentNumber <= maxInstallment).map((r) => ({ n: r.installmentNumber, total: Number(r.totalPrice), monthly: Number(r.installmentPrice) })),
      }))
      .filter((d) => d.rows.length);
    if (instCache.size > 500) instCache.clear();
    instCache.set(key, { at: Date.now(), data });
    return data;
  } catch {
    return null;
  }
}
