import "server-only";
import { getSettings } from "./settings";

/**
 * Netgsm SMS (REST v2: https://api.netgsm.com.tr/sms/rest/v2/send, Basic auth).
 * Ayarlar → Entegrasyonlar'da kullanıcı kodu, API şifresi ve onaylı başlık girilince çalışır;
 * girilmemişse sessizce atlar (sipariş akışını asla bozmaz).
 * Not: sipariş/kargo bilgilendirme SMS'leri ticari ileti değildir, İYS izni gerekmez ("iysfilter": "0").
 */
export async function sendSms(phone: string, text: string): Promise<boolean> {
  const s = await getSettings();
  const i = s.integrations;
  if (i.smsProvider !== "netgsm" || !i.netgsmUser || !i.netgsmPass || !i.netgsmHeader) return false;
  const no = phone.replace(/\D/g, "").replace(/^90/, "").replace(/^0/, "");
  if (!/^5\d{9}$/.test(no)) return false;
  try {
    const r = await fetch("https://api.netgsm.com.tr/sms/rest/v2/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Basic " + Buffer.from(`${i.netgsmUser}:${i.netgsmPass}`).toString("base64") },
      body: JSON.stringify({ msgheader: i.netgsmHeader, encoding: "TR", iysfilter: "0", messages: [{ msg: text.slice(0, 900), no }] }),
      signal: AbortSignal.timeout(10000),
    });
    const j = (await r.json().catch(() => null)) as { code?: string; jobid?: string; description?: string } | null;
    if (j?.code === "00") return true;
    console.error("SMS gönderilemedi", r.status, j);
    return false;
  } catch (e) {
    console.error("SMS gönderilemedi", e);
    return false;
  }
}

/** Sipariş olaylarında (alındı, kargoda, teslim) ayarlarda açık olan SMS'leri gönderir. */
export async function smsOrderEvent(kind: "placed" | "shipped" | "delivered", o: { phone: string; number: number; link: string; carrier?: string | null; tracking?: string | null }) {
  const s = await getSettings();
  const i = s.integrations;
  const on = kind === "placed" ? i.smsOnPlaced : kind === "shipped" ? i.smsOnShipped : i.smsOnDelivered;
  if (!on) return false;
  const no = `#${o.number}`;
  const text =
    kind === "placed"
      ? `${s.store.name}: ${no} numarali siparisin alindi, tesekkurler. Takip: ${o.link}`
      : kind === "shipped"
        ? `${s.store.name}: ${no} siparisin kargoya verildi${o.carrier ? ` (${o.carrier}${o.tracking ? ` ${o.tracking}` : ""})` : ""}. Takip: ${o.link}`
        : `${s.store.name}: ${no} siparisin teslim edildi. Kurulumda yardim icin bize yazabilirsin: ${s.store.phone}`;
  return sendSms(o.phone, text);
}
