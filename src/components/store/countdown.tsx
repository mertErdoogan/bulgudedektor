"use client";

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";

/** Aynı gün kargo kesim saatine geri sayım (sunucunun hesapladığı gerçek süre). */
export function CutoffCountdown({ ms }: { ms: number }) {
  const [end] = useState(() => Date.now() + ms);
  const [left, setLeft] = useState(ms);
  useEffect(() => {
    const t = setInterval(() => setLeft(Math.max(0, end - Date.now())), 1000);
    return () => clearInterval(t);
  }, [end]);
  if (left <= 0) return null;
  const h = Math.floor(left / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  const s = Math.floor((left % 60000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <span className="flex items-center gap-2 rounded-full bg-ok-bg px-3 py-2 text-sm font-bold text-ok" suppressHydrationWarning>
      <Timer size={16} /> Bugün kargoda için <span className="font-mono tabular-nums">{pad(h)}:{pad(m)}:{pad(s)}</span>
    </span>
  );
}
