import "server-only";
import { and, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { addOrderEvent } from "../orders";
import { getSettings } from "../settings";
import { invoiceDraft } from "./common";
import { parasutIssue, parasutPdfUrl, parasutReady, parasutStatus, ParasutError } from "./parasut";

export { EINVOICE_PROVIDERS } from "./common";

/** invoiceRef alanında Paraşüt kayıt kimlikleri */
type Ref = { s: string; j?: string | null; t?: string; d?: string };
const readRef = (v: string | null): Ref | null => {
  try {
    return v ? (JSON.parse(v) as Ref) : null;
  } catch {
    return null;
  }
};

/** Otomatik kesimin en fazla deneme sayısı (sonra panelde "tekrar dene" beklenir) */
const MAX_AUTO_ATTEMPTS = 4;
/** Fatura kesilebilecek siparişler: ödemesi alınmış, iptal/iade olmamış, pazaryeri siparişi değil */
const INVOICEABLE_CHANNELS = ["WEB", "MANUAL"];

export function invoiceLink(orderId: string) {
  return `/api/fatura/${orderId}`;
}

async function fail(orderId: string, msg: string) {
  await db.update(orders).set({ invoiceStatus: "FAILED", invoiceError: msg.slice(0, 500) }).where(eq(orders.id, orderId));
  await addOrderEvent(db, orderId, "invoice", `E-fatura kesilemedi: ${msg}`, null, false);
}

async function finalize(orderId: string, number: string, ref: Ref) {
  const o = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (!o) return;
  const url = invoiceLink(orderId);
  await db
    .update(orders)
    .set({ invoiceStatus: "ISSUED", invoiceError: null, invoiceNo: number || o.invoiceNo, invoiceUrl: url, invoicedAt: o.invoicedAt ?? new Date(), invoiceRef: JSON.stringify(ref) })
    .where(eq(orders.id, orderId));
  await addOrderEvent(db, orderId, "invoice", `Fatura düzenlendi${number ? ` (${number})` : ""}.`, null, true);
  const { mailInvoice, mailReady } = await import("../mail");
  if ((await mailReady()) && !o.email.endsWith("@telefon.siparis")) {
    const { orderKey } = await import("../store");
    void mailInvoice({ id: o.id, number: o.number, email: o.email, invoiceNo: number || null, invoiceUrl: `${url}?k=${orderKey(o.id)}` });
  }
}

/**
 * Siparişin faturasını entegratörde keser (şu an Paraşüt). Aynı sipariş iki kez faturalanmaz:
 * kesim başlarken kayıt kilitlenir, satış faturası oluşunca kimliği hemen saklanır (tekrar denemede yeniden oluşturulmaz).
 */
export async function issueInvoice(orderId: string): Promise<{ ok: boolean; message: string }> {
  const s = (await getSettings()).einvoice;
  if (s.provider !== "parasut") return { ok: false, message: s.provider === "birfatura" ? "BirFatura'da fatura BirFatura panelinden kesilir; numara ve PDF siteye kendiliğinden gelir." : "E-fatura entegrasyonu kapalı. Ayarlar → E-fatura." };
  if (!parasutReady(s)) return { ok: false, message: "Paraşüt bilgileri eksik. Ayarlar → E-fatura." };
  const o = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (!o) return { ok: false, message: "Sipariş bulunamadı." };
  if (o.paymentStatus !== "PAID") return { ok: false, message: "Ödemesi alınmamış siparişe fatura kesilmez." };
  if (["CANCELLED", "REFUNDED"].includes(o.status)) return { ok: false, message: "İptal/iade edilmiş siparişe fatura kesilmez." };
  if (o.invoiceStatus === "ISSUED" || (o.invoiceUrl && !o.invoiceStatus)) return { ok: false, message: "Bu siparişin faturası zaten var." };

  // Kilit: aynı anda iki kesim başlamasın
  const [claimed] = await db
    .update(orders)
    .set({ invoiceStatus: "PENDING", invoiceProvider: "parasut", invoiceError: null, invoiceAttempts: sql`${orders.invoiceAttempts} + 1` })
    .where(and(eq(orders.id, orderId), or(isNull(orders.invoiceStatus), eq(orders.invoiceStatus, "FAILED"))))
    .returning({ id: orders.id });
  if (!claimed) return refreshInvoice(orderId);

  let ref = readRef(o.invoiceRef);
  try {
    if (!ref?.j) {
      const d = await invoiceDraft(orderId);
      const site = process.env.APP_URL || "https://www.example.com";
      // Satış faturası daha önce oluşmuşsa (e-belgeye çevirme hatası) yeniden oluşturulmaz
      const r = await parasutIssue(s, d, site, ref?.s ?? null, async (sid) => {
        ref = { s: sid };
        await db.update(orders).set({ invoiceRef: JSON.stringify(ref) }).where(eq(orders.id, orderId));
      });
      ref = { s: r.salesInvoiceId, j: r.jobId, t: r.docType };
      await db.update(orders).set({ invoiceRef: JSON.stringify(ref) }).where(eq(orders.id, orderId));
      await addOrderEvent(db, orderId, "invoice", "E-fatura Paraşüt'te oluşturuluyor.", null, false);
    }
    // E-belge birkaç saniyede hazır olur; olmazsa zamanlanmış görev kontrol eder
    for (let i = 0; i < 3; i++) {
      await new Promise((r) => setTimeout(r, i === 0 ? 1500 : 2500));
      const st = await parasutStatus(s, ref!.s, ref!.j ?? null);
      if (st.status === "done") {
        await finalize(orderId, st.number ?? "", { ...ref!, d: st.docId, t: st.docType });
        return { ok: true, message: `Fatura kesildi${st.number ? ` (${st.number})` : ""}. Müşteriye e-postayla gönderildi.` };
      }
      if (st.status === "error") {
        // E-belge hatası: satış faturası kalır, tekrar denemede yalnızca dönüştürme yapılır
        await db.update(orders).set({ invoiceRef: JSON.stringify({ s: ref!.s }) }).where(eq(orders.id, orderId));
        await fail(orderId, st.error ?? "E-belge oluşturulamadı.");
        return { ok: false, message: `Paraşüt: ${st.error}` };
      }
    }
    return { ok: true, message: "Fatura Paraşüt'e gönderildi; e-belge hazırlanıyor. Birkaç dakika içinde siparişe eklenir." };
  } catch (e) {
    const msg = e instanceof ParasutError ? e.message : `Beklenmeyen hata: ${(e as Error).message}`;
    await fail(orderId, msg);
    return { ok: false, message: msg };
  }
}

/** Hazırlanmakta olan e-belgenin durumunu kontrol eder (zamanlanmış görev ve panel) */
export async function refreshInvoice(orderId: string): Promise<{ ok: boolean; message: string }> {
  const s = (await getSettings()).einvoice;
  const o = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  const ref = readRef(o?.invoiceRef ?? null);
  if (!o || o.invoiceStatus !== "PENDING" || !ref?.s) return { ok: false, message: "Hazırlanan fatura yok." };
  try {
    const st = await parasutStatus(s, ref.s, ref.j ?? null);
    if (st.status === "done") {
      await finalize(orderId, st.number ?? "", { ...ref, d: st.docId, t: st.docType });
      return { ok: true, message: "Fatura hazır." };
    }
    if (st.status === "error") {
      await db.update(orders).set({ invoiceRef: JSON.stringify({ s: ref.s }) }).where(eq(orders.id, orderId));
      await fail(orderId, st.error ?? "E-belge oluşturulamadı.");
      return { ok: false, message: st.error ?? "E-belge oluşturulamadı." };
    }
    return { ok: true, message: "E-belge hâlâ hazırlanıyor." };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

/** Ödeme alınınca / kargoya verilince otomatik kesim (ayara göre). Hata siparişe yazılır, işlemi durdurmaz. */
export async function maybeAutoInvoice(orderId: string, event: "paid" | "shipped") {
  try {
    const s = (await getSettings()).einvoice;
    if (s.provider !== "parasut" || s.autoIssue !== event) return;
    const o = await db.query.orders.findFirst({ where: eq(orders.id, orderId), columns: { channel: true, invoiceStatus: true, invoiceUrl: true } });
    if (!o || !INVOICEABLE_CHANNELS.includes(o.channel) || o.invoiceStatus || o.invoiceUrl) return;
    await issueInvoice(orderId);
  } catch (e) {
    console.error("auto invoice", e);
  }
}

/** Zamanlanmış görev: bekleyen e-belgeleri tamamla, otomatik kesimde kaçanları yeniden dene */
export async function invoiceCron() {
  const s = (await getSettings()).einvoice;
  if (s.provider !== "parasut" || !parasutReady(s)) return 0;
  let n = 0;
  const pending = await db.select({ id: orders.id }).from(orders).where(and(eq(orders.invoiceStatus, "PENDING"), lt(orders.updatedAt, new Date(Date.now() - 60_000)))).limit(20);
  for (const p of pending) if ((await refreshInvoice(p.id)).ok) n++;
  if (s.autoIssue === "off") return n;
  const due = await db
    .select({ id: orders.id })
    .from(orders)
    .where(
      and(
        eq(orders.paymentStatus, "PAID"),
        inArray(orders.channel, INVOICEABLE_CHANNELS),
        inArray(orders.status, s.autoIssue === "paid" ? ["PAID", "PREPARING", "SHIPPED", "DELIVERED"] : ["SHIPPED", "DELIVERED"]),
        isNull(orders.invoiceUrl),
        or(isNull(orders.invoiceStatus), and(eq(orders.invoiceStatus, "FAILED"), lt(orders.invoiceAttempts, MAX_AUTO_ATTEMPTS))),
        // Entegrasyon açılmadan önceki eski siparişlere dokunma: son 7 gün
        sql`${orders.paidAt} > now() - interval '7 days'`,
      ),
    )
    .limit(10);
  for (const d of due) if ((await issueInvoice(d.id)).ok) n++;
  return n;
}

/** Müşterinin "Faturam" bağlantısı: Paraşüt PDF adresi kısa ömürlü olduğu için her seferinde yenisi alınır */
export async function freshInvoicePdf(orderId: string) {
  const o = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (!o) return null;
  const ref = readRef(o.invoiceRef);
  if (o.invoiceProvider === "parasut" && ref?.d) {
    const s = (await getSettings()).einvoice;
    return parasutPdfUrl(s, ref.t ?? "e_archives", ref.d);
  }
  return o.invoiceUrl && o.invoiceUrl.startsWith("http") ? o.invoiceUrl : null;
}
