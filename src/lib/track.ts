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

export function emit(event: "view_item" | "add_to_cart" | "begin_checkout" | "purchase" | "add_to_wishlist", data: { value?: number; items: GaItem[]; transaction_id?: string }) {
  if (typeof window === "undefined") return;
  const w = window as W;
  safe(() => w.gtag?.("event", event, { currency: "TRY", ...data }), undefined);
  const fbMap = { view_item: "ViewContent", add_to_cart: "AddToCart", begin_checkout: "InitiateCheckout", purchase: "Purchase", add_to_wishlist: "AddToWishlist" } as const;
  safe(
    () =>
      w.fbq?.("track", fbMap[event], {
        currency: "TRY",
        value: data.value,
        content_ids: data.items.map((i) => i.item_id),
        content_type: "product",
        ...(data.transaction_id ? { order_id: data.transaction_id } : {}),
      }),
    undefined,
  );
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
