"use client";

import { useEffect } from "react";
import { useCart } from "./cart";

/** Başarılı sipariş sayfasında sepeti ve kuponu temizler */
export function ClearCart() {
  const { clear, ready } = useCart();
  useEffect(() => {
    if (!ready) return;
    clear();
    try {
      sessionStorage.removeItem("bulgu_coupon");
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);
  return null;
}
