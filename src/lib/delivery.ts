import type { ShippingSettings } from "./settings";

/**
 * Ürün kartı ve ürün sayfasındaki kargo/teslim bilgisi.
 * Türkiye saati (UTC+3, yaz saati yok) üzerinden hesaplanır; Pazar (ve ayara göre Cumartesi) kargo çıkmaz.
 * Tahmindir, garanti değildir — metinler buna göre yazıldı.
 */
type Item = { stock: number; allowBackorder: boolean; sameDayShipping: boolean };
export type DeliveryInfo = { tone: "fast" | "normal" | "slow" | "none"; ship: string; eta: string | null };

const TR_OFFSET = 3 * 60 * 60 * 1000;
const DAY = 86400000;
const DAYS = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
const FULL = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const MONTHS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

/** UTC ms'yi "Türkiye duvar saati" olarak yorumlanan bir Date'e çevir (getUTC* ile okunur). */
const trNow = (now: Date) => new Date(now.getTime() + TR_OFFSET);
const fmt = (d: Date) => `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;

function isShipDay(d: Date, saturday: boolean) {
  const w = d.getUTCDay();
  return w !== 0 && (saturday || w !== 6);
}
function addBusinessDays(d: Date, n: number, saturday: boolean) {
  let x = new Date(d);
  let left = n;
  while (left > 0) {
    x = new Date(x.getTime() + DAY);
    if (isShipDay(x, saturday)) left--;
  }
  return x;
}

export function deliveryInfo(p: Item, s: Pick<ShippingSettings, "sameDayCutoff" | "transitMinDays" | "transitMaxDays" | "shipOnSaturday">, now = new Date()): DeliveryInfo {
  if (p.stock <= 0 && !p.allowBackorder) return { tone: "none", ship: "Stokta yok", eta: null };
  const t = trNow(now);
  const sat = !!s.shipOnSaturday;
  const [ch, cm] = (s.sameDayCutoff || "15:00").split(":").map(Number);
  const beforeCutoff = t.getUTCHours() * 60 + t.getUTCMinutes() < ch * 60 + (cm || 0);
  const minT = Math.max(1, Number(s.transitMinDays) || 1);
  const maxT = Math.max(minT, Number(s.transitMaxDays) || minT);

  let shipDay: Date;
  let ship: string;
  let tone: DeliveryInfo["tone"];
  if (p.stock <= 0) {
    shipDay = addBusinessDays(t, 5, sat);
    ship = "Siparişle temin · 5–7 iş günü";
    tone = "slow";
  } else if (p.sameDayShipping && isShipDay(t, sat) && beforeCutoff) {
    shipDay = t;
    ship = "Bugün kargoda";
    tone = "fast";
  } else if (p.sameDayShipping) {
    shipDay = addBusinessDays(t, 1, sat);
    const tomorrow = Math.round((Date.UTC(shipDay.getUTCFullYear(), shipDay.getUTCMonth(), shipDay.getUTCDate()) - Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate())) / DAY) === 1;
    ship = tomorrow ? "Yarın kargoda" : `${FULL[shipDay.getUTCDay()]} kargoda`;
    tone = "fast";
  } else {
    shipDay = addBusinessDays(t, 2, sat);
    ship = "1–2 iş gününde kargoda";
    tone = "normal";
  }
  if (tone === "slow") return { tone, ship, eta: null };
  const a = addBusinessDays(shipDay, minT, sat);
  const b = addBusinessDays(shipDay, maxT, sat);
  const eta = minT === maxT ? `${fmt(a)} kapında` : a.getUTCMonth() === b.getUTCMonth() ? `${DAYS[a.getUTCDay()]}–${DAYS[b.getUTCDay()]}, ${a.getUTCDate()}–${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]} kapında` : `${fmt(a)} – ${fmt(b)} kapında`;
  return { tone, ship, eta };
}

/** Bugünkü kesim saatine kalan süre (ms). Kesim geçtiyse veya kargo günü değilse null. */
export function msToCutoff(s: Pick<ShippingSettings, "sameDayCutoff" | "shipOnSaturday">, now = new Date()) {
  const t = trNow(now);
  if (!isShipDay(t, !!s.shipOnSaturday)) return null;
  const [ch, cm] = (s.sameDayCutoff || "15:00").split(":").map(Number);
  const cut = Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate(), ch, cm || 0);
  const diff = cut - t.getTime();
  return diff > 0 ? diff : null;
}
