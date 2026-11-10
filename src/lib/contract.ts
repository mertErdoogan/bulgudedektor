import "server-only";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { orders, pages } from "@/db/schema";
import { renderContent } from "./markdown";
import { getSettings } from "./settings";
import { fillLegal, legalTokens } from "./legal-tokens";
import { siteUrl } from "./seo";
import { formatDate, formatTL, orderNo } from "./utils";

const esc = (s: string | null | undefined) => (s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/**
 * Siparişe özel ön bilgilendirme + mesafeli satış sözleşmesi (kalıcı veri saklayıcısı olarak e-postayla gönderilir).
 * Başta taraflar, ürünler ve tutar; ardından panelde düzenlenen sözleşme metinleri yer alır.
 */
export async function contractHtml(orderId: string) {
  const [o, s, docs] = await Promise.all([
    db.query.orders.findFirst({ where: eq(orders.id, orderId), with: { items: true } }),
    getSettings(),
    db.select().from(pages).where(inArray(pages.slug, ["on-bilgilendirme-formu", "mesafeli-satis-sozlesmesi", "satis-sozlesmesi"])),
  ]);
  if (!o) return "";
  const st = s.store;
  const a = o.shippingAddress;
  const rows = o.items.map((i) => `<tr><td style="padding:4px 8px 4px 0">${esc(i.name)}</td><td style="padding:4px 8px">${i.quantity}</td><td style="padding:4px 0;text-align:right">${formatTL(i.total)}</td></tr>`).join("");
  const head = `
<h3 style="margin:24px 0 6px">Sipariş özeti ve taraflar</h3>
<p style="margin:0"><b>Satıcı:</b> ${esc(st.legalName || st.name)} · ${esc(st.address)} · ${esc(st.phone)} · ${esc(st.email)}${st.mersis ? ` · MERSİS: ${esc(st.mersis)}` : ""}</p>
<p style="margin:6px 0 0"><b>Alıcı:</b> ${esc(a?.fullName)} · ${esc(a?.line)} ${esc(a?.district)}/${esc(a?.city)} · ${esc(o.phone)} · ${esc(o.email)}</p>
<p style="margin:6px 0 0"><b>Sipariş:</b> ${orderNo(o.number)} · ${formatDate(o.createdAt, true)} · Ödeme: ${o.paymentMethod === "TRANSFER" ? "Havale/EFT" : "Kredi/banka kartı"}</p>
<table style="border-collapse:collapse;margin-top:8px;font-size:13px"><thead><tr><th align="left">Ürün</th><th>Adet</th><th align="right">Tutar (KDV dahil)</th></tr></thead><tbody>${rows}</tbody></table>
<p style="margin:6px 0 0">Kargo: ${formatTL(o.shippingTotal)} · İndirim: ${formatTL(o.discountTotal)} · <b>Toplam: ${formatTL(o.total)}</b></p>
<p style="margin:6px 0 0">Cayma hakkı: teslimattan itibaren 14 gün. Tahmini teslim: ${esc(s.shipping.deliveryEstimate)}.</p>`;
  const tokens = legalTokens(st, s.payment, siteUrl());
  const order = ["on-bilgilendirme-formu", "mesafeli-satis-sozlesmesi", "satis-sozlesmesi"];
  const body = docs
    .sort((x, y) => order.indexOf(x.slug) - order.indexOf(y.slug))
    .map((d) => `<h3 style="margin:24px 0 6px">${esc(d.title)}</h3><div style="font-size:12.5px;color:#444">${fillLegal(renderContent(d.content), tokens)}</div>`)
    .join("");
  return `<hr style="margin:28px 0;border:0;border-top:1px solid #ddd">${head}${body}`;
}
