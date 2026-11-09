import "server-only";
import nodemailer from "nodemailer";
import { getSettings } from "./settings";
import { formatTL, orderNo } from "./utils";

/** SMTP ayarlanmışsa e-posta gönderir; ayarlı değilse veya hata olursa sessizce loglar (sipariş akışını asla bozmaz). */
export async function sendMail(to: string, subject: string, html: string) {
  const s = await getSettings();
  const i = s.integrations;
  if (!i.smtpHost || !i.smtpUser || !i.smtpPass || !to) return false;
  try {
    const [host, portStr] = i.smtpHost.split(":");
    const port = Number(portStr) || 465;
    const t = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user: i.smtpUser, pass: i.smtpPass } });
    await t.sendMail({ from: i.smtpFrom || i.smtpUser, to, subject, html });
    return true;
  } catch (e) {
    console.error("mail gönderilemedi", e);
    return false;
  }
}

const wrap = (body: string, store: string) =>
  `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1f2421"><p style="font-size:22px;font-weight:800">${store}</p>${body}<p style="color:#5a5f66;font-size:12px;margin-top:24px">Bu e-posta sipariş işlemin nedeniyle gönderildi.</p></div>`;

export async function mailOrderPlaced(o: { id: string; number: number; email: string; total: number; paymentMethod: string; items: { name: string; quantity: number }[] }, link: string) {
  const s = await getSettings();
  const list = o.items.map((i) => `<li>${i.quantity} × ${i.name}</li>`).join("");
  const bank =
    o.paymentMethod === "TRANSFER"
      ? `<p><b>Havale bilgileri</b> (açıklamaya ${orderNo(o.number)} yazın):</p><ul>${s.payment.bankAccounts.map((b) => `<li>${b.bank} · ${b.holder} · ${b.iban}</li>`).join("")}</ul>`
      : "";
  await sendMail(o.email, `Siparişin alındı · ${orderNo(o.number)}`, wrap(`<p>Teşekkürler! Siparişin alındı.</p><ul>${list}</ul><p><b>Toplam: ${formatTL(o.total)}</b></p>${bank}<p><a href="${link}">Siparişini takip et</a></p>`, s.store.name));
  if (s.integrations.notifyEmail) await sendMail(s.integrations.notifyEmail, `Yeni sipariş ${orderNo(o.number)} · ${formatTL(o.total)}`, wrap(`<ul>${list}</ul><p>${o.paymentMethod === "TRANSFER" ? "Havale bekleniyor" : "Kartla ödendi"}</p>`, s.store.name));
}

export async function mailStatus(email: string, number: number, message: string, link: string) {
  const s = await getSettings();
  await sendMail(email, `Siparişin güncellendi · ${orderNo(number)}`, wrap(`<p>${message}</p><p><a href="${link}">Siparişini gör</a></p>`, s.store.name));
}

/** Ürün tekrar stoğa girdiğinde "gelince haber ver" diyenlere e-posta (telefonla bırakanlar panelde listelenir) */
export async function notifyStockAlerts(productId: string) {
  const { db } = await import("@/db");
  const { products, stockAlerts } = await import("@/db/schema");
  const { and, eq } = await import("drizzle-orm");
  const p = await db.query.products.findFirst({ where: eq(products.id, productId) });
  if (!p || p.stock <= 0 || p.status !== "ACTIVE") return 0;
  const list = await db.select().from(stockAlerts).where(and(eq(stockAlerts.productId, productId), eq(stockAlerts.notified, false)));
  const s = await getSettings();
  let n = 0;
  for (const a of list) {
    if (a.contact.includes("@") && (await sendMail(a.contact, `${p.name} tekrar stokta`, wrap(`<p>Beklediğin <b>${p.name}</b> tekrar stokta.</p><p><a href="${process.env.APP_URL || ""}/urun/${p.slug}">Ürünü gör</a></p>`, s.store.name)))) {
      await db.update(stockAlerts).set({ notified: true }).where(eq(stockAlerts.id, a.id));
      n++;
    }
  }
  return n;
}
