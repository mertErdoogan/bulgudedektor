import "server-only";
import { createHash } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { getSettings } from "./settings";
import { orderNo } from "./utils";

/**
 * Meta Conversions API: satın almayı sunucudan bildirir. Reklam engelleyici / iOS takip kısıtı yüzünden
 * tarayıcı pikseli kaybolsa da dönüşüm Meta'ya ulaşır. event_id tarayıcıdaki eventID ile aynıdır
 * ("purchase-<sipariş no>"), Meta ikisini tek satış sayar.
 * Yalnızca müşteri sipariş anında pazarlama çerezlerine onay verdiyse gönderilir.
 */
const sha = (v: string) => createHash("sha256").update(v.trim().toLowerCase()).digest("hex");
const GRAPH = process.env.META_GRAPH_URL || "https://graph.facebook.com/v21.0";

export function phoneE164(p: string) {
  const d = p.replace(/\D/g, "");
  if (d.startsWith("90") && d.length === 12) return d;
  if (d.startsWith("0") && d.length === 11) return `9${d}`;
  if (d.length === 10) return `90${d}`;
  return d;
}

export async function sendMetaPurchase(orderId: string) {
  const s = await getSettings();
  const pixel = s.integrations.metaPixelId.replace(/\D/g, "");
  const token = s.integrations.metaCapiToken;
  if (!pixel || !token) return { skipped: "ayar yok" };
  const o = await db.query.orders.findFirst({ where: eq(orders.id, orderId), with: { items: true } });
  if (!o) return { skipped: "sipariş yok" };
  const a = o.attribution;
  if (!a?.marketing) return { skipped: "onay yok" };
  if (a.capiSent) return { skipped: "zaten gönderildi" };
  const no = orderNo(o.number);
  const [first, ...rest] = (o.shippingAddress?.fullName ?? "").split(/\s+/).filter(Boolean);
  const user_data: Record<string, unknown> = {
    em: [sha(o.email)],
    ph: [sha(phoneE164(o.phone))],
    country: [sha("tr")],
    ...(first ? { fn: [sha(first)] } : {}),
    ...(rest.length ? { ln: [sha(rest.join(" "))] } : {}),
    ...(o.shippingAddress?.city ? { ct: [sha(o.shippingAddress.city.replace(/\s+/g, ""))] } : {}),
    ...(o.customerId ? { external_id: [sha(o.customerId)] } : {}),
    ...(a.fbp ? { fbp: a.fbp } : {}),
    ...(a.fbc ? { fbc: a.fbc } : {}),
    ...(a.ip ? { client_ip_address: a.ip } : {}),
    ...(a.ua ? { client_user_agent: a.ua } : {}),
  };
  const body = {
    data: [
      {
        event_name: "Purchase",
        event_time: Math.floor((o.paidAt ?? o.createdAt).getTime() / 1000),
        event_id: `purchase-${no}`,
        action_source: "website",
        event_source_url: `${process.env.APP_URL || ""}/odeme`,
        user_data,
        custom_data: {
          currency: "TRY",
          value: o.total,
          order_id: no,
          content_type: "product",
          content_ids: o.items.map((i) => i.productId ?? i.sku ?? i.name),
          contents: o.items.map((i) => ({ id: i.productId ?? i.sku ?? i.name, quantity: i.quantity, item_price: i.unitPrice })),
          num_items: o.items.reduce((n, i) => n + i.quantity, 0),
        },
      },
    ],
    ...(process.env.META_TEST_EVENT_CODE ? { test_event_code: process.env.META_TEST_EVENT_CODE } : {}),
  };
  const res = await fetch(`${GRAPH}/${pixel}/events?access_token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    console.error("[meta-capi]", res.status, t.slice(0, 300));
    return { error: res.status };
  }
  await db
    .update(orders)
    .set({ attribution: sql`coalesce(${orders.attribution}, '{}'::jsonb) || '{"capiSent":true}'::jsonb` })
    .where(eq(orders.id, orderId));
  return { sent: true };
}
