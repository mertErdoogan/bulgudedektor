/**
 * İstemci tarafı izleme yardımcıları:
 * - Ürün etkileşim sayacı (/api/etkilesim) — sosyal kanıt için, kişisel veri yok
 * - GA4 ve Meta Pixel e-ticaret olayları (yalnızca çerez onayı verildiyse betikler yüklüdür)
 * - Son gezilen ürünler (yalnızca bu tarayıcıda)
 */
type W = Window & { gtag?: (...a: unknown[]) => void; fbq?: (...a: unknown[]) => void };

const safe = <T,>(fn: () => T, fb: T): T => {
  try {
    return fn();
  } catch {
    return fb;
  }
};

export function countActivity(id: string, t: "v" | "c") {
  if (typeof window === "undefined") return;
  if (t === "v") {
    const key = `arena_seen_${new Date().toISOString().slice(0, 10)}`;
    const seen = safe(() => JSON.parse(localStorage.getItem(key) ?? "[]") as string[], []);
    if (seen.includes(id)) return;
    safe(() => {
      for (const k of Object.keys(localStorage)) if (k.startsWith("arena_seen_") && k !== key) localStorage.removeItem(k);
      localStorage.setItem(key, JSON.stringify([...seen, id].slice(-200)));
    }, undefined);
  }
  const body = JSON.stringify({ id, t });
  if (navigator.sendBeacon) navigator.sendBeacon("/api/etkilesim", new Blob([body], { type: "application/json" }));
  else void fetch("/api/etkilesim", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
}

export type GaItem = { item_id: string; item_name: string; price?: number; quantity?: number; item_brand?: string | null };

/*
 * Olay kuyruğu: gtag/fbq betikleri çerez onayından sonra "afterInteractive" yüklenir. Ürün ve sipariş
 * sayfaları olayı ilk render'da gönderdiği için betik henüz yoksa olay kaybolurdu (özellikle "purchase").
 * Betik yoksa olay kuyruğa alınır; consent.tsx betikleri kurunca "arena-tags" yayınlar ve kuyruk boşalır.
 * Onay hiç verilmezse kuyruk sayfa kapanınca kaybolur — hiçbir şey gönderilmez.
 */
type Win = W & { __arenaQ?: { g: unknown[][]; f: unknown[][] }; __arenaAds?: string[] };
const queue = (w: Win) => (w.__arenaQ ??= { g: [], f: [] });
/** "__ads_purchase" yer tutucusu → her Google Ads satın alma etiketi için bir conversion olayı */
const adsExpand = (w: Win, a: unknown[]): unknown[][] =>
  a[0] === "__ads_purchase" ? (w.__arenaAds ?? []).map((l) => ["event", "conversion", { send_to: l, ...(a[1] as object) }]) : [a];
function gcall(...a: unknown[]) {
  const w = window as Win;
  if (w.gtag) for (const x of adsExpand(w, a)) safe(() => w.gtag!(...x), undefined);
  else queue(w).g.push(a);
}
function fcall(...a: unknown[]) {
  const w = window as Win;
  if (w.fbq) safe(() => w.fbq!(...a), undefined);
  else queue(w).f.push(a);
}
export function flushTags() {
  const w = window as Win;
  const q = queue(w);
  if (w.gtag) for (const a of q.g.splice(0).flatMap((a) => adsExpand(w, a))) safe(() => w.gtag!(...a), undefined);
  if (w.fbq) for (const a of q.f.splice(0)) safe(() => w.fbq!(...a), undefined);
}
if (typeof window !== "undefined") window.addEventListener("arena-tags", flushTags);

type EventName = "view_item" | "add_to_cart" | "begin_checkout" | "purchase" | "add_to_wishlist";
const fbMap = { view_item: "ViewContent", add_to_cart: "AddToCart", begin_checkout: "InitiateCheckout", purchase: "Purchase", add_to_wishlist: "AddToWishlist" } as const;

export function emit(event: EventName, data: { value?: number; items: GaItem[]; transaction_id?: string }) {
  if (typeof window === "undefined") return;
  gcall("event", event, { currency: "TRY", ...data });
  const fbData = {
    currency: "TRY",
    value: data.value,
    content_ids: data.items.map((i) => i.item_id),
    contents: data.items.map((i) => ({ id: i.item_id, quantity: i.quantity ?? 1, item_price: i.price })),
    content_type: "product",
    num_items: data.items.reduce((s, i) => s + (i.quantity ?? 1), 0),
    ...(data.transaction_id ? { order_id: data.transaction_id } : {}),
  };
  // Satın almada eventID, sunucudan (Conversions API) giden olayla aynıdır; Meta ikisini tek sayar.
  if (event === "purchase" && data.transaction_id) fcall("track", fbMap[event], fbData, { eventID: `purchase-${data.transaction_id}` });
  else fcall("track", fbMap[event], fbData);
  if (event === "purchase") {
    // Google Ads satın alma dönüşümü: etiketleri consent.tsx window.__arenaAds'e yazar (pazarlama onayı varsa)
    gcall("__ads_purchase", { value: data.value, currency: "TRY", transaction_id: data.transaction_id });
  }
}

/** SPA sayfa geçişi (ilk yüklemede betik gelmeden çağrılırsa kuyruğa girer) */
export function pageView(path: string, opts: { ga: boolean; px: boolean }) {
  if (typeof window === "undefined") return;
  if (opts.ga) gcall("event", "page_view", { page_path: path, page_location: window.location.href, page_title: document.title });
  if (opts.px) fcall("track", "PageView");
}

/** Arama, iletişim gibi basit olaylar */
export function track(event: "search" | "contact" | "generate_lead" | "sign_up" | "newsletter", params: Record<string, string | number | undefined> = {}) {
  if (typeof window === "undefined") return;
  gcall("event", event, params);
  const fb = { search: "Search", contact: "Contact", generate_lead: "Lead", sign_up: "CompleteRegistration", newsletter: "Subscribe" } as const;
  fcall("track", fb[event], event === "search" ? { search_string: params.search_term } : params);
}
const RECENT = "arena_recent_v1";
export const getRecent = () => safe(() => JSON.parse(localStorage.getItem(RECENT) ?? "[]") as string[], []);
export function pushRecent(id: string) {
  const list = [id, ...getRecent().filter((x) => x !== id)].slice(0, 16);
  safe(() => localStorage.setItem(RECENT, JSON.stringify(list)), undefined);
  window.dispatchEvent(new Event("arena-recent"));
}
export function clearRecent() {
  safe(() => localStorage.removeItem(RECENT), undefined);
  window.dispatchEvent(new Event("arena-recent"));
}
