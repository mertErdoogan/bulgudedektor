"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useT } from "@/components/i18n";
import { localePath } from "@/lib/i18n/config";
import { countActivity, emit } from "@/lib/track";

export type CartItem = { productId: string; quantity: number };
type Ctx = {
  items: CartItem[];
  count: number;
  ready: boolean;
  add: (productId: string, qty?: number, name?: string, meta?: { price?: number; brand?: string | null }) => void;
  /** Birden çok ürünü tek seferde ekler (paket satış); tek bildirim gösterir */
  addMany: (list: { productId: string; quantity: number }[], label: string) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  /** Sunucunun bildirdiği satılamayan ürünleri sepetten çıkarır / adedi düşürür ve bir kez bildirir */
  applyFixes: (fixes: { productId: string; quantity: number; message: string }[]) => void;
  compare: string[];
  toggleCompare: (productId: string) => void;
  favorites: string[];
  toggleFavorite: (productId: string, name?: string) => void;
};

const CartContext = createContext<Ctx | null>(null);
const KEY = "bulgu_cart_v1";
const CKEY = "bulgu_compare_v1";
const FKEY = "site_fav_v1";

const VID = "site_vid";

/** Canlı sepet senkronu için izin: analiz çerezi onayı ya da üye girişi */
function analyticsAllowed() {
  return /(?:^|;\s*)site_consent=n?[^;]*a/.test(document.cookie);
}

/** Tarayıcıya özel rastgele kimlik (yalnızca izin varsa oluşturulur) */
export function visitorId(create = false): string | null {
  try {
    let v = localStorage.getItem(VID);
    if (!v && create) {
      v = crypto.randomUUID();
      localStorage.setItem(VID, v);
    }
    return v;
  } catch {
    return null;
  }
}

/** Sepetin son halini panelin "Canlı sepetler" ekranına bildirir. Boş sepet daha önce bildirilmediyse istek atılmaz. */
function syncLive(items: CartItem[], loggedIn: boolean) {
  if (!loggedIn && !analyticsAllowed()) return;
  const vid = visitorId(items.length > 0);
  if (!vid) return;
  void fetch("/api/sepet/canli", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vid, items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })), path: location.pathname }),
    keepalive: true,
  }).catch(() => {});
}

function read<T>(k: string, fb: T): T {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : fb;
  } catch {
    return fb;
  }
}
function write(k: string, v: unknown) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* gizli sekme vb. */
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const t = useT();
  const [items, setItems] = useState<CartItem[]>([]);
  const [compare, setCompare] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  useEffect(() => {
    setItems(read<CartItem[]>(KEY, []).filter((i) => i && typeof i.productId === "string" && i.quantity > 0));
    setCompare(read<string[]>(CKEY, []));
    const localFav = read<string[]>(FKEY, []);
    setFavorites(localFav);
    setReady(true);
    // Üye girişi varsa favorileri sunucuyla birleştir (farklı cihazlarda aynı liste)
    fetch("/api/favoriler", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(async (d: { loggedIn: boolean; ids: string[] } | null) => {
        if (!d?.loggedIn) return;
        setLoggedIn(true);
        const merged = [...new Set([...d.ids, ...localFav])];
        setFavorites(merged);
        write(FKEY, merged);
        if (merged.length !== d.ids.length) await fetch("/api/favoriler", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: merged }) });
      })
      .catch(() => {});
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setItems(read<CartItem[]>(KEY, []));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  // Canlı sepet: sepet değişince (1,5 sn sonra) ve sekme açıkken dakikada bir bildirilir
  const itemsRef = useRef(items);
  itemsRef.current = items;
  useEffect(() => {
    if (!ready) return;
    const id = setTimeout(() => syncLive(items, loggedIn), 1500);
    return () => clearTimeout(id);
  }, [items, ready, loggedIn]);
  useEffect(() => {
    if (!ready) return;
    const iv = setInterval(() => {
      if (document.visibilityState === "visible" && itemsRef.current.length) syncLive(itemsRef.current, loggedIn);
    }, 60_000);
    return () => clearInterval(iv);
  }, [ready, loggedIn]);
  const persist = useCallback((next: CartItem[]) => {
    setItems(next);
    write(KEY, next);
  }, []);
  const value = useMemo<Ctx>(
    () => ({
      items,
      ready,
      count: items.reduce((s, i) => s + i.quantity, 0),
      add: (productId, qty = 1, name, meta) => {
        countActivity(productId, "c");
        emit("add_to_cart", { value: meta?.price ? meta.price * qty : undefined, items: [{ item_id: productId, item_name: name ?? productId, price: meta?.price, quantity: qty, item_brand: meta?.brand }] });
        const cur = read<CartItem[]>(KEY, items);
        const ex = cur.find((i) => i.productId === productId);
        persist(ex ? cur.map((i) => (i.productId === productId ? { ...i, quantity: Math.min(99, i.quantity + qty) } : i)) : [...cur, { productId, quantity: qty }]);
        toast.success(name ? t("cartp.added_n", { name }) : t("cartp.added"), { action: { label: t("cartp.go"), onClick: () => (window.location.href = localePath("/sepet", t.locale)) } });
      },
      addMany: (list, label) => {
        const cur = read<CartItem[]>(KEY, items);
        const next = [...cur];
        for (const x of list) {
          const ex = next.find((i) => i.productId === x.productId);
          if (ex) ex.quantity = Math.min(99, Math.max(ex.quantity, x.quantity));
          else next.push({ productId: x.productId, quantity: x.quantity });
          countActivity(x.productId, "c");
        }
        persist(next.map((i) => ({ ...i })));
        emit("add_to_cart", { items: list.map((x) => ({ item_id: x.productId, item_name: x.productId, quantity: x.quantity })) });
        toast.success(t("cartp.added_n", { name: label }), { action: { label: t("cartp.go"), onClick: () => (window.location.href = localePath("/sepet", t.locale)) } });
      },
      setQty: (productId, qty) => persist(qty <= 0 ? items.filter((i) => i.productId !== productId) : items.map((i) => (i.productId === productId ? { ...i, quantity: Math.min(99, qty) } : i))),
      remove: (productId) => persist(items.filter((i) => i.productId !== productId)),
      clear: () => persist([]),
      applyFixes: (fixes) => {
        if (!fixes.length) return;
        const cur = read<CartItem[]>(KEY, items);
        const next = cur
          .map((i) => {
            const f = fixes.find((x) => x.productId === i.productId);
            return f ? { ...i, quantity: f.quantity } : i;
          })
          .filter((i) => i.quantity > 0);
        persist(next);
        for (const m of new Set(fixes.map((f) => f.message))) toast.info(m, { duration: 6000 });
      },
      compare,
      toggleCompare: (productId) => {
        const next = compare.includes(productId) ? compare.filter((x) => x !== productId) : [...compare, productId].slice(-4);
        setCompare(next);
        write(CKEY, next);
      },
      favorites,
      toggleFavorite: (productId, name) => {
        const on = !favorites.includes(productId);
        const next = on ? [productId, ...favorites].slice(0, 100) : favorites.filter((x) => x !== productId);
        setFavorites(next);
        write(FKEY, next);
        if (on) {
          emit("add_to_wishlist", { items: [{ item_id: productId, item_name: name ?? productId }] });
          toast.success(name ? t("cartp.fav_n", { name }) : t("cartp.fav"), { action: { label: t("meta.favoriler"), onClick: () => (window.location.href = localePath("/favoriler", t.locale)) } });
        }
        if (loggedIn) void fetch("/api/favoriler", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: productId, on }) });
      },
    }),
    [items, ready, compare, persist, favorites, loggedIn, t],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const c = useContext(CartContext);
  if (!c) throw new Error("CartProvider eksik");
  return c;
}
