"use client";

import { useEffect } from "react";
import { toast } from "sonner";

const MESSAGES: Record<string, string> = {
  "hesap=silindi": "Hesabın silindi. Kişisel bilgilerin anonimleştirildi.",
};

/** Yönlendirme sonrası adres çubuğundaki ?hesap=silindi gibi işaretleri bir kez bildirim olarak gösterir ve adresten temizler. */
export function QueryToast() {
  useEffect(() => {
    const u = new URL(window.location.href);
    for (const [k, msg] of Object.entries(MESSAGES)) {
      const [key, val] = k.split("=");
      if (u.searchParams.get(key) === val) {
        toast.success(msg);
        u.searchParams.delete(key);
        window.history.replaceState(null, "", u.pathname + (u.search || "") + u.hash);
      }
    }
  }, []);
  return null;
}
