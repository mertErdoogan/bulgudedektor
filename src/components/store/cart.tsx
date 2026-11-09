"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { countActivity, emit } from "@/lib/track";

export type CartItem = { productId: string; quantity: number };
type Ctx = {
  items: CartItem[];
  count: number;
  ready: boolean;
  add: (productId: string, qty?: number, name?: string, meta?: { price?: number; brand?: string | null }) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  compare: string[];
  toggleCompare: (productId: string) => void;
  favorites: string[];
  toggleFavorite: (productId: string, name?: string) => void;
};

const CartContext = createContext<Ctx | null>(null);
const KEY = "bulgu_cart_v1";
const CKEY = "bulgu_compare_v1";
const FKEY = "arena_fav_v1";

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
        toast.success(name ? `${name} sepete eklendi` : "Sepete eklendi", { action: { label: "Sepete git", onClick: () => (window.location.href = "/sepet") } });
      },
      setQty: (productId, qty) => persist(qty <= 0 ? items.filter((i) => i.productId !== productId) : items.map((i) => (i.productId === productId ? { ...i, quantity: Math.min(99, qty) } : i))),
      remove: (productId) => persist(items.filter((i) => i.productId !== productId)),
      clear: () => persist([]),
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
          toast.success(name ? `${name} favorilere eklendi` : "Favorilere eklendi", { action: { label: "Favorilerim", onClick: () => (window.location.href = "/favoriler") } });
        }
        if (loggedIn) void fetch("/api/favoriler", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: productId, on }) });
      },
    }),
    [items, ready, compare, persist, favorites, loggedIn],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const c = useContext(CartContext);
  if (!c) throw new Error("CartProvider eksik");
  return c;
}
