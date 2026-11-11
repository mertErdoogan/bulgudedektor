"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/** Ödeme onayı beklenirken sayfayı birkaç saniyede bir sunucudan tazeler (en fazla ~1 dakika). */
export function AutoRefresh({ every = 3000, max = 20 }: { every?: number; max?: number }) {
  const router = useRouter();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (n >= max) return;
    const t = setTimeout(() => {
      router.refresh();
      setN((x) => x + 1);
    }, every);
    return () => clearTimeout(t);
  }, [n, every, max, router]);
  return n >= max ? <p className="mt-1 text-xs">Onay beklenenden uzun sürdü. Birkaç dakika sonra sayfayı yenile; kartından çekim olduysa siparişin otomatik onaylanır.</p> : null;
}
