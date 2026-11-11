import "server-only";
import { and, asc, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { conversations, orders, products, productQuestions, returnRequests, reviews, serviceRecords, stockAlerts, users } from "@/db/schema";
import { can } from "./permissions";
import { formatTL, orderNo } from "./utils";

/**
 * "Bugün yapılacaklar": ekibin bekleyen işleri tek listede.
 * Her iş bir kayda (sipariş, mesaj, servis…) bağlıdır; iş bitince (durum değişince) listeden kendiliğinden düşer.
 */
export type WorkKind =
  | "transfer_notice"
  | "transfer_waiting"
  | "serial_missing"
  | "to_prepare"
  | "to_ship"
  | "invoice_missing"
  | "message"
  | "return"
  | "service"
  | "stock_alert"
  | "moderation";

export type WorkItem = {
  key: string;
  kind: WorkKind;
  title: string;
  detail: string;
  href: string;
  at: Date;
  /** Hedef süreyi aştı */
  late: boolean;
  assignee: { id: string; name: string } | null;
  /** Atanabilir kayıt */
  target: { type: "order" | "conversation" | "service"; id: string } | null;
};

export const WORK_GROUPS: { id: string; label: string; kinds: WorkKind[] }[] = [
  { id: "odeme", label: "Ödeme", kinds: ["transfer_notice", "transfer_waiting"] },
  { id: "depo", label: "Hazırlık ve kargo", kinds: ["serial_missing", "to_prepare", "to_ship"] },
  { id: "musteri", label: "Müşteri", kinds: ["message", "return", "service"] },
  { id: "diger", label: "Fatura, stok ve onaylar", kinds: ["invoice_missing", "stock_alert", "moderation"] },
];

const H = 3600_000;
const ago = (d: Date) => Date.now() - d.getTime();
const name = (o: { shippingAddress: { fullName?: string } | null; email: string }) => o.shippingAddress?.fullName || o.email;

export async function getWorklist(perms: string[]): Promise<WorkItem[]> {
  const staffNames = new Map((await db.select({ id: users.id, name: users.name }).from(users)).map((u) => [u.id, u.name]));
  const who = (id: string | null) => (id && staffNames.has(id) ? { id, name: staffNames.get(id)! } : null);
  const items: WorkItem[] = [];
  const ord = can(perms, "orders.manage");

  if (ord) {
    // Havale: müşteri bildirim gönderdi → hemen kontrol; bildirim yoksa 24 saati geçen bekleyenler → hatırlat
    const transfers = await db.query.orders.findMany({
      where: and(eq(orders.status, "PENDING_PAYMENT"), eq(orders.paymentMethod, "TRANSFER")),
      orderBy: asc(orders.createdAt),
      limit: 100,
    });
    for (const o of transfers) {
      const n = o.paymentMeta?.transferNotice;
      if (n) {
        items.push({
          key: `tn-${o.id}`,
          kind: "transfer_notice",
          title: `${orderNo(o.number)} havale bildirimi geldi`,
          detail: `${n.sender} · ${formatTL(o.total)}${n.receiptUrl ? " · dekont var" : ""} — hesaba geçtiyse onayla`,
          href: `/admin/siparisler/${o.id}`,
          at: new Date(n.at),
          late: ago(new Date(n.at)) > 4 * H,
          assignee: who(o.assigneeId),
          target: { type: "order", id: o.id },
        });
      } else if (ago(o.createdAt) > 24 * H) {
        items.push({
          key: `tw-${o.id}`,
          kind: "transfer_waiting",
          title: `${orderNo(o.number)} havale bekleniyor`,
          detail: `${name(o)} · ${formatTL(o.total)} — müşteriye hatırlatma gönder`,
          href: `/admin/siparisler/${o.id}`,
          at: o.createdAt,
          late: ago(o.createdAt) > 72 * H,
          assignee: who(o.assigneeId),
          target: { type: "order", id: o.id },
        });
      }
    }

    // Seri numarası eksik siparişler (seri takipli ürünlerde adet kadar seri atanmalı)
    const missing = await db.execute<{ id: string; missing: number }>(sql`
      select o.id, sum(oi.quantity - coalesce(sn.n, 0))::int as missing
      from orders o
      join order_items oi on oi.order_id = o.id
      join products p on p.id = oi.product_id and p.track_serial
      left join (select order_item_id, count(*)::int n from serial_numbers group by order_item_id) sn on sn.order_item_id = oi.id
      where o.status in ('PAID', 'PREPARING')
      group by o.id
      having sum(oi.quantity - coalesce(sn.n, 0)) > 0`);
    const missingBy = new Map(missing.map((r) => [r.id, r.missing]));

    const active = await db.query.orders.findMany({ where: inArray(orders.status, ["PAID", "PREPARING"]), orderBy: asc(orders.createdAt), limit: 200 });
    for (const o of active) {
      const since = o.paidAt ?? o.createdAt;
      const m = missingBy.get(o.id);
      if (m)
        items.push({
          key: `sn-${o.id}`,
          kind: "serial_missing",
          title: `${orderNo(o.number)} seri numarası gir`,
          detail: `${m} cihaz için seri no eksik · ${name(o)}`,
          href: `/admin/siparisler/${o.id}#seri`,
          at: since,
          late: ago(since) > 24 * H,
          assignee: who(o.assigneeId),
          target: { type: "order", id: o.id },
        });
      else
        items.push({
          key: `${o.status === "PAID" ? "pr" : "sh"}-${o.id}`,
          kind: o.status === "PAID" ? "to_prepare" : "to_ship",
          title: `${orderNo(o.number)} ${o.status === "PAID" ? "hazırla" : "kargoya ver"}`,
          detail: `${name(o)} · ${formatTL(o.total)}${o.deliveryMethod === "PICKUP" ? " · mağazadan teslim" : ""}${o.channel !== "WEB" ? ` · ${o.channel === "TRENDYOL" ? "Trendyol" : o.channel === "HEPSIBURADA" ? "Hepsiburada" : "panel"}` : ""}`,
          href: `/admin/siparisler/${o.id}`,
          at: since,
          // Taahhüt: ödeme onayından sonra en geç 1 iş günü içinde kargo
          late: ago(since) > (o.status === "PAID" ? 24 : 36) * H,
          assignee: who(o.assigneeId),
          target: { type: "order", id: o.id },
        });
    }

    // Kargolanmış/teslim edilmiş ama faturası eklenmemiş site siparişleri (pazaryerleri kendi faturasını keser)
    const noInvoice = await db.query.orders.findMany({
      where: and(inArray(orders.status, ["SHIPPED", "DELIVERED"]), isNull(orders.invoiceUrl), inArray(orders.channel, ["WEB", "MANUAL"]), gt(orders.createdAt, new Date(Date.now() - 60 * 24 * H))),
      orderBy: asc(orders.createdAt),
      limit: 50,
    });
    for (const o of noInvoice)
      items.push({
        key: `iv-${o.id}`,
        kind: "invoice_missing",
        title: `${orderNo(o.number)} faturayı ekle`,
        detail: `${name(o)} · ${formatTL(o.total)}`,
        href: `/admin/siparisler/${o.id}`,
        at: o.shippedAt ?? o.createdAt,
        late: ago(o.shippedAt ?? o.createdAt) > 72 * H,
        assignee: who(o.assigneeId),
        target: { type: "order", id: o.id },
      });
  }

  if (can(perms, "inbox.manage")) {
    const conv = await db.query.conversations.findMany({ where: eq(conversations.status, "OPEN"), orderBy: asc(conversations.updatedAt), limit: 50 });
    for (const c of conv)
      items.push({
        key: `cv-${c.id}`,
        kind: "message",
        title: `${c.contactName}: ${c.subject}`,
        detail: `${c.channel === "WHATSAPP" ? "WhatsApp" : c.channel === "PHONE" ? "Telefon" : c.channel === "EMAIL" ? "E-posta" : "Site"} · ${c.contact}`,
        href: `/admin/mesajlar?id=${c.id}&durum=OPEN`,
        at: c.updatedAt,
        late: ago(c.updatedAt) > 4 * H,
        assignee: who(c.assigneeId),
        target: { type: "conversation", id: c.id },
      });
  }

  if (can(perms, "orders.view")) {
    const rets = await db.query.returnRequests.findMany({ where: eq(returnRequests.status, "REQUESTED"), with: { order: true }, orderBy: asc(returnRequests.createdAt), limit: 30 });
    for (const r of rets)
      items.push({
        key: `rt-${r.id}`,
        kind: "return",
        title: `${orderNo(r.order.number)} iade talebi`,
        detail: `${r.reason} · ${name(r.order)}`,
        href: `/admin/iadeler`,
        at: r.createdAt,
        late: ago(r.createdAt) > 24 * H,
        assignee: who(r.order.assigneeId),
        target: { type: "order", id: r.orderId },
      });
  }

  if (can(perms, "service.manage")) {
    // Ekipten aksiyon bekleyen servis durumları: cihaz geldi (incelenecek) ve hazır (müşteriye gönderilecek)
    const svc = await db.query.serviceRecords.findMany({ where: inArray(serviceRecords.status, ["RECEIVED", "READY"]), orderBy: asc(serviceRecords.updatedAt), limit: 30 });
    for (const s of svc)
      items.push({
        key: `sv-${s.id}`,
        kind: "service",
        title: `Servis #${s.number} ${s.status === "READY" ? "hazır — müşteriye gönder" : "incelemeye al"}`,
        detail: `${s.contactName} · ${s.productName}${s.serial ? ` · ${s.serial}` : ""}`,
        href: `/admin/servis?id=${s.id}`,
        at: s.updatedAt,
        late: ago(s.updatedAt) > 48 * H,
        assignee: who(s.assigneeId),
        target: { type: "service", id: s.id },
      });
  }

  if (can(perms, "inventory.manage")) {
    // Stoğa giren ama "gelince haber ver" bekleyenleri olan ürünler
    const waiting = await db
      .select({ id: products.id, name: products.name, stock: products.stock, n: sql<number>`count(${stockAlerts.id})::int`, first: sql<Date>`min(${stockAlerts.createdAt})` })
      .from(stockAlerts)
      .innerJoin(products, eq(products.id, stockAlerts.productId))
      .where(and(eq(stockAlerts.notified, false), gt(products.stock, 0)))
      .groupBy(products.id);
    for (const w of waiting)
      items.push({
        key: `sa-${w.id}`,
        kind: "stock_alert",
        title: `${w.name} stokta — ${w.n} kişi haber bekliyor`,
        detail: `Stok ${w.stock} · bildirimleri gönder`,
        href: `/admin/stok?ara=${encodeURIComponent(w.name)}`,
        at: new Date(w.first),
        late: false,
        assignee: null,
        target: null,
      });
  }

  if (can(perms, "reviews.manage")) {
    const [[r], [q]] = await Promise.all([
      db.select({ n: sql<number>`count(*)::int`, first: sql<Date | null>`min(${reviews.createdAt})` }).from(reviews).where(eq(reviews.isApproved, false)),
      db.select({ n: sql<number>`count(*)::int`, first: sql<Date | null>`min(${productQuestions.createdAt})` }).from(productQuestions).where(isNull(productQuestions.answer)),
    ]);
    if (r.n + q.n) {
      const first = [r.first, q.first].filter(Boolean).map((d) => new Date(d!)).sort((a, b) => +a - +b)[0] ?? new Date();
      items.push({
        key: "moderation",
        kind: "moderation",
        title: `${r.n} yorum onayı, ${q.n} cevapsız ürün sorusu`,
        detail: "Cevapsız sorular satışı kaçırır",
        href: "/admin/yorumlar",
        at: first,
        late: q.n > 0 && ago(first) > 24 * H,
        assignee: null,
        target: null,
      });
    }
  }

  // Gecikenler önce, sonra en eski
  return items.sort((a, b) => Number(b.late) - Number(a.late) || +a.at - +b.at);
}

/** Bildirim zili ve menü rozetleri için sadece sayılar. */
export async function worklistCounts(perms: string[], userId: string) {
  const list = await getWorklist(perms);
  return { total: list.length, late: list.filter((i) => i.late).length, mine: list.filter((i) => i.assignee?.id === userId).length };
}

