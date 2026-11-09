"use client";

import { useEffect } from "react";
import { emit, type GaItem } from "@/lib/track";
import { useCart } from "./cart";

/** Başarılı sipariş sayfasında sepeti ve kuponu temizler; satın alma olayını bir kez gönderir. */
export function ClearCart({ purchase }: { purchase?: { id: string; value: number; items: GaItem[] } }) {
  const { clear, ready } = useCart();
  useEffect(() => {
    if (!ready) return;
    clear();
    try {
      sessionStorage.removeItem("bulgu_coupon");
      if (purchase && !localStorage.getItem(`arena_px_${purchase.id}`)) {
        localStorage.setItem(`arena_px_${purchase.id}`, "1");
        emit("purchase", { transaction_id: purchase.id, value: purchase.value, items: purchase.items });
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);
  return null;
}
