import "server-only";
import type { EInvoiceSettings } from "../settings";
import { net, type InvoiceDraft } from "./common";

/**
 * Paraşüt API v4 istemcisi (https://apidocs.parasut.com).
 * Akış: müşteri (contact) bul/oluştur → ürünleri SKU ile bul/oluştur → satış faturası → alıcı e-fatura mükellefiyse
 * e-Fatura, değilse e-Arşiv → arka plan işinin (trackable_job) bitmesini bekle → belge numarası ve PDF.
 */
export class ParasutError extends Error {}

const base = () => (process.env.PARASUT_BASE_URL || "https://api.parasut.com").replace(/\/$/, "");
const tokens = new Map<string, { token: string; until: number }>();

type Cfg = Pick<EInvoiceSettings, "parasutCompanyId" | "parasutClientId" | "parasutClientSecret" | "parasutUsername" | "parasutPassword">;

export function parasutReady(c: Cfg) {
  return !!(c.parasutCompanyId && c.parasutClientId && c.parasutClientSecret && c.parasutUsername && c.parasutPassword);
}

async function token(c: Cfg) {
  const key = `${c.parasutClientId}:${c.parasutUsername}`;
  const hit = tokens.get(key);
  if (hit && hit.until > Date.now()) return hit.token;
  const res = await fetch(`${base()}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      grant_type: "password",
      client_id: c.parasutClientId,
      client_secret: c.parasutClientSecret,
      username: c.parasutUsername,
      password: c.parasutPassword,
      redirect_uri: "urn:ietf:wg:oauth:2.0:oob",
    }),
    signal: AbortSignal.timeout(20_000),
  }).catch(() => null);
  if (!res) throw new ParasutError("Paraşüt'e ulaşılamadı.");
  if (!res.ok) throw new ParasutError(res.status === 401 || res.status === 400 ? "Paraşüt girişi başarısız: kullanıcı adı, şifre ya da API (client) bilgileri hatalı." : `Paraşüt girişi başarısız (${res.status}).`);
  const j = (await res.json()) as { access_token: string; expires_in?: number };
  tokens.set(key, { token: j.access_token, until: Date.now() + Math.max(60, (j.expires_in ?? 7200) - 120) * 1000 });
  return j.access_token;
}

type JsonApi<T = Record<string, unknown>> = { data: { id: string; type: string; attributes: T; relationships?: Record<string, { data: { id: string; type: string } | null }> } };
type JsonApiList<T = Record<string, unknown>> = { data: { id: string; type: string; attributes: T }[] };

async function call<T>(c: Cfg, method: string, path: string, body?: unknown): Promise<T> {
  const t = await token(c);
  const res = await fetch(`${base()}/v4/${c.parasutCompanyId}${path}`, {
    method,
    headers: { authorization: `Bearer ${t}`, "content-type": "application/json", accept: "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30_000),
  }).catch(() => null);
  if (!res) throw new ParasutError("Paraşüt'e ulaşılamadı (zaman aşımı).");
  if (res.status === 401) {
    tokens.clear();
    throw new ParasutError("Paraşüt oturumu reddetti. Ayarlardaki bilgileri kontrol et.");
  }
  if (!res.ok) {
    const j = (await res.json().catch(() => null)) as { errors?: { title?: string; detail?: string }[] } | null;
    const msg = j?.errors?.map((e) => e.detail || e.title).filter(Boolean).join(" · ");
    throw new ParasutError(`Paraşüt ${res.status}: ${msg || "istek reddedildi"}`);
  }
  return (res.status === 204 ? null : await res.json()) as T;
}

const enc = encodeURIComponent;

async function findOrCreateContact(c: Cfg, d: InvoiceDraft) {
  const b = d.buyer;
  const filter = b.corporate ? `filter[tax_number]=${enc(b.taxNumber)}` : `filter[email]=${enc(b.email)}`;
  const found = await call<JsonApiList>(c, "GET", `/contacts?${filter}&page[size]=1`);
  if (found.data?.[0]) return found.data[0].id;
  const r = await call<JsonApi>(c, "POST", "/contacts", {
    data: {
      type: "contacts",
      attributes: {
        name: b.name,
        email: b.email,
        phone: b.phone,
        contact_type: b.corporate ? "company" : "person",
        tax_number: b.taxNumber,
        tax_office: b.taxOffice || undefined,
        city: b.city,
        district: b.district,
        address: b.address,
        account_type: "customer",
      },
    },
  });
  return r.data.id;
}

async function findOrCreateProduct(c: Cfg, code: string, name: string, vatRate: number, listPrice: number) {
  const found = await call<JsonApiList>(c, "GET", `/products?filter[code]=${enc(code)}&page[size]=1`);
  if (found.data?.[0]) return found.data[0].id;
  const r = await call<JsonApi>(c, "POST", "/products", {
    data: { type: "products", attributes: { code, name, vat_rate: vatRate, unit: "Adet", currency: "TRL", list_price: listPrice, inventory_tracking: false } },
  });
  return r.data.id;
}

const ymd = (d: Date) => new Date(d.getTime() + 3 * 3600_000).toISOString().slice(0, 10); // İstanbul günü

export type ParasutIssue = { salesInvoiceId: string; jobId: string | null; docType: "e_archives" | "e_invoices" };

/** Satış faturasını oluşturur ve e-belgeye dönüştürmeyi başlatır (iş arka planda biter) */
export async function parasutIssue(c: Cfg, d: InvoiceDraft, siteUrl: string, existingSalesInvoiceId: string | null, onCreated: (id: string) => Promise<void>): Promise<ParasutIssue> {
  const salesInvoiceId = existingSalesInvoiceId ?? (await createSalesInvoice(c, d));
  if (!existingSalesInvoiceId) await onCreated(salesInvoiceId);
  return convertToEDocument(c, d, salesInvoiceId, siteUrl);
}

async function createSalesInvoice(c: Cfg, d: InvoiceDraft) {
  const contactId = await findOrCreateContact(c, d);
  const details = [];
  for (const l of d.lines) {
    const pid = await findOrCreateProduct(c, l.sku, l.name, l.vatRate, net(l.unitGross, l.vatRate));
    details.push({
      type: "sales_invoice_details",
      attributes: {
        quantity: l.quantity,
        unit_price: net(l.unitGross, l.vatRate),
        vat_rate: l.vatRate,
        discount_type: "amount",
        discount_value: net(l.discountGross, l.vatRate),
        description: l.name,
      },
      relationships: { product: { data: { id: pid, type: "products" } } },
    });
  }
  if (d.shipping) {
    const pid = await findOrCreateProduct(c, "KARGO", "Kargo bedeli", d.shipping.vatRate, net(d.shipping.gross, d.shipping.vatRate));
    details.push({
      type: "sales_invoice_details",
      attributes: { quantity: 1, unit_price: net(d.shipping.gross, d.shipping.vatRate), vat_rate: d.shipping.vatRate, description: "Kargo bedeli" },
      relationships: { product: { data: { id: pid, type: "products" } } },
    });
  }
  const day = ymd(new Date());
  const inv = await call<JsonApi>(c, "POST", "/sales_invoices", {
    data: {
      type: "sales_invoices",
      attributes: { item_type: "invoice", description: `Web sipariş ${d.orderNo}`, issue_date: day, due_date: day, currency: "TRL", order_no: d.orderNo, order_date: ymd(d.date) },
      relationships: { details: { data: details }, contact: { data: { id: contactId, type: "contacts" } } },
    },
  });
  return inv.data.id;
}

async function convertToEDocument(c: Cfg, d: InvoiceDraft, salesInvoiceId: string, siteUrl: string): Promise<ParasutIssue> {
  const internetSale = {
    url: siteUrl,
    payment_type: d.paymentMethod === "CARD" ? "KREDIKARTI/BANKAKARTI" : d.paymentMethod === "TRANSFER" ? "EFT/HAVALE" : "DIGER",
    payment_platform: d.paymentMethod === "CARD" ? (d.paymentProvider === "paytr" ? "PayTR" : "iyzico") : d.paymentMethod === "TRANSFER" ? "Havale/EFT" : "Mağaza",
    payment_date: ymd(d.paidAt ?? d.date),
  };
  // Alıcı e-fatura mükellefiyse e-Fatura, değilse e-Arşiv
  let inbox: string | null = null;
  if (d.buyer.corporate && /^\d{10,11}$/.test(d.buyer.taxNumber)) {
    const r = await call<JsonApiList<{ e_invoice_address?: string }>>(c, "GET", `/e_invoice_inboxes?filter[vkn]=${enc(d.buyer.taxNumber)}`);
    inbox = r.data?.[0]?.attributes.e_invoice_address ?? null;
  }
  const job = inbox
    ? await call<JsonApi>(c, "POST", "/e_invoices", {
        data: { type: "e_invoices", attributes: { scenario: "basic", to: inbox, internet_sale: internetSale }, relationships: { invoice: { data: { id: salesInvoiceId, type: "sales_invoices" } } } },
      })
    : await call<JsonApi>(c, "POST", "/e_archives", {
        data: { type: "e_archives", attributes: { internet_sale: internetSale }, relationships: { sales_invoice: { data: { id: salesInvoiceId, type: "sales_invoices" } } } },
      });
  return { salesInvoiceId, jobId: job?.data?.type === "trackable_jobs" ? job.data.id : null, docType: inbox ? "e_invoices" : "e_archives" };
}

export type ParasutState = { status: "running" | "done" | "error"; error?: string; docId?: string; docType?: string; number?: string };

/** E-belge durumu: iş bitti mi, belge numarası ne */
export async function parasutStatus(c: Cfg, salesInvoiceId: string, jobId: string | null): Promise<ParasutState> {
  if (jobId) {
    const j = await call<JsonApi<{ status: string; errors?: string[] }>>(c, "GET", `/trackable_jobs/${jobId}`);
    if (j.data.attributes.status === "error") return { status: "error", error: (j.data.attributes.errors ?? []).join(" · ") || "Paraşüt e-belgeyi oluşturamadı." };
    if (j.data.attributes.status !== "done") return { status: "running" };
  }
  const inv = await call<JsonApi<{ invoice_no?: string; invoice_id?: number; invoice_series?: string }>>(c, "GET", `/sales_invoices/${salesInvoiceId}?include=active_e_document`);
  const doc = inv.data.relationships?.active_e_document?.data;
  if (!doc) return { status: "running" };
  const d = await call<JsonApi<{ invoice_number?: string; uuid?: string }>>(c, "GET", `/${doc.type}/${doc.id}`);
  const a = inv.data.attributes;
  const number = d.data.attributes.invoice_number || a.invoice_no || [a.invoice_series, a.invoice_id].filter(Boolean).join("") || "";
  return { status: "done", docId: doc.id, docType: doc.type, number };
}

/** PDF bağlantısı Paraşüt'te kısa süreli üretilir; her indirmede yenisi alınır */
export async function parasutPdfUrl(c: Cfg, docType: string, docId: string) {
  const r = await call<JsonApi<{ url?: string }>>(c, "GET", `/${docType === "e_invoices" ? "e_invoices" : "e_archives"}/${docId}/pdf`);
  return r.data?.attributes?.url ?? null;
}

/** Ayarlardaki "Bağlantıyı test et" */
export async function parasutTest(c: Cfg) {
  if (!parasutReady(c)) throw new ParasutError("Tüm Paraşüt alanlarını doldur.");
  await call<JsonApiList>(c, "GET", "/contacts?page[size]=1");
  return true;
}
