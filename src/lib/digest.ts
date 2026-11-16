import "server-only";
import { and, desc, eq, gt, gte, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, orders, users } from "@/db/schema";
import { sendMail, wrap } from "./mail";
import { getSettings } from "./settings";
import { formatTL, orderNo } from "./utils";

type Line = { at: Date; who: string; text: string };
export type Digest = { since: Date; sections: { title: string; why: string; lines: Line[] }[]; total: number };

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Sahibin haftada bir bakması gereken işlemler: malın stoktan iz bırakarak çıktığı, paranın geri döndüğü,
 * müşteri verisinin dışarı alındığı ve fiyatın büyük düştüğü anlar. Hepsi işlem kayıtlarından ve siparişlerden okunur.
 */
export async function buildDigest(days = 7): Promise<Digest> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const logs = await db
    .select({ at: auditLogs.createdAt, who: users.name, action: auditLogs.action, entity: auditLogs.entity, summary: auditLogs.summary, data: auditLogs.data })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.userId))
    .where(
      and(
        gt(auditLogs.createdAt, since),
        or(
          eq(auditLogs.entity, "serial"),
          eq(auditLogs.action, "export"),
          eq(auditLogs.action, "refund"),
          and(eq(auditLogs.entity, "order"), sql`${auditLogs.summary} ~ '(İptal|İade)'`),
          and(eq(auditLogs.entity, "product"), sql`${auditLogs.data} ? 'priceFrom'`),
          eq(auditLogs.entity, "count"),
          and(eq(auditLogs.entity, "user"), sql`${auditLogs.summary} ~ '(şifre|Şifre|doğrulama)'`),
        ),
      ),
    )
    .orderBy(desc(auditLogs.createdAt))
    .limit(300);
  const L = (r: (typeof logs)[number]): Line => ({ at: r.at, who: r.who ?? "Sistem", text: r.summary });
  const drops = logs.filter((r) => {
    const d = r.data as { priceFrom?: number; priceTo?: number } | null;
    return r.entity === "product" && d?.priceFrom && d.priceTo !== undefined && d.priceTo < d.priceFrom;
  });
  const discounts = await db
    .select({ at: orders.createdAt, who: users.name, number: orders.number, d: orders.manualDiscount, sub: orders.subtotal })
    .from(orders)
    .leftJoin(users, eq(users.id, orders.salesUserId))
    .where(and(gte(orders.createdAt, since), gt(orders.manualDiscount, 0), inArray(orders.paymentStatus, ["PAID", "PENDING", "PARTIALLY_REFUNDED"])))
    .orderBy(desc(orders.manualDiscount))
    .limit(30);
  const sections = [
    { title: "Stoktan iz bırakarak çıkan cihazlar", why: "Silinen, arızalıya çekilen ya da kayıp işaretlenen seri numaraları ve sayımlar. Her birinin sebebini sor.", lines: logs.filter((r) => r.entity === "serial" || r.entity === "count").map(L) },
    { title: "İptal ve iadeler", why: "Ödenmiş siparişin iptali ve para iadeleri.", lines: logs.filter((r) => r.action === "refund" || (r.entity === "order" && /İptal|İade/.test(r.summary))).map(L) },
    { title: "Fiyat düşüşleri", why: "Kim, hangi ürünün fiyatını ne kadar düşürdü.", lines: drops.map(L) },
    { title: "Personel indirimleri", why: "Showroom/telefon satışında verilen satış indirimleri (en yüksekten).", lines: discounts.map((o) => ({ at: o.at, who: o.who ?? "—", text: `${orderNo(o.number)} · ${formatTL(o.d)} indirim (%${o.sub ? ((o.d / o.sub) * 100).toFixed(1) : "?"})` })) },
    { title: "Dışa aktarmalar", why: "Müşteri, sipariş ve ürün listesi indirmeleri. İşten ayrılacak birinin toplu indirmesine dikkat.", lines: logs.filter((r) => r.action === "export").map(L) },
    { title: "Hesap güvenliği", why: "Şifre ve iki adımlı doğrulama değişiklikleri.", lines: logs.filter((r) => r.entity === "user").map(L) },
  ].filter((s) => s.lines.length);
  return { since, sections, total: sections.reduce((n, s) => n + s.lines.length, 0) };
}

export function digestHtml(d: Digest, storeName: string, appUrl: string) {
  const fmt = (x: Date) => new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(x);
  const body = d.sections.length
    ? d.sections
        .map(
          (s) =>
            `<h3 style="margin:22px 0 4px;font-size:16px">${esc(s.title)} (${s.lines.length})</h3><p style="margin:0 0 8px;color:#646e78;font-size:12px">${esc(s.why)}</p><table style="width:100%;border-collapse:collapse;font-size:13px">${s.lines
              .slice(0, 40)
              .map((l) => `<tr><td style="padding:4px 8px 4px 0;color:#646e78;white-space:nowrap;vertical-align:top">${fmt(l.at)}</td><td style="padding:4px 8px 4px 0;white-space:nowrap;vertical-align:top"><b>${esc(l.who)}</b></td><td style="padding:4px 0">${esc(l.text)}</td></tr>`)
              .join("")}</table>`,
        )
        .join("")
    : `<p>Geçen hafta dikkat isteyen bir işlem olmadı.</p>`;
  return wrap(
    `<p style="font-size:15px">Son 7 günde dikkat isteyen <b>${d.total}</b> işlem.</p>${body}<p style="margin-top:22px"><a href="${appUrl}/admin/kayitlar">Tüm işlem kayıtları →</a></p>`,
    esc(storeName),
  ).replace("Bu e-posta sipariş işlemin nedeniyle gönderildi.", "Bu özet Ayarlar → Güvenlik'teki adrese her pazartesi gönderilir.");
}

/** Özeti hazırlayıp gönderir. Dönen: gönderildi mi, kaç işlem */
export async function sendDigest() {
  const s = await getSettings();
  const to = s.security.digestEmail || s.store.email;
  const d = await buildDigest();
  const sent = await sendMail(to, `${s.store.name}: haftalık dikkat özeti (${d.total} işlem)`, digestHtml(d, s.store.name, process.env.APP_URL || ""));
  return { sent, to, total: d.total };
}
