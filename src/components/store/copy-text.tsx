"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** Kargo/iade kodu gibi müşterinin bir yere yazacağı değerler için tek dokunuşla kopyalama */
export function CopyText({ value, className = "", label }: { value: string; className?: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        } catch {
          /* pano izni yoksa sessiz geç; değer zaten ekranda seçilebilir */
        }
      }}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${className}`}
      aria-label={`${label ?? value} kopyala`}
    >
      {done ? <Check size={14} /> : <Copy size={14} />}
      {done ? "Kopyalandı" : "Kopyala"}
    </button>
  );
}
