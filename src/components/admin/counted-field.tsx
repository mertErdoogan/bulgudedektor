"use client";

import { useState } from "react";
import { Input, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils";

/** Karakter/kelime sayaçlı alan: SEO başlığı, meta açıklaması ve "kısa cevap" için hedef aralığı gösterir. */
export function CountedField({ name, defaultValue, min, max, unit = "char", multiline, placeholder, className }: { name: string; defaultValue?: string | null; min: number; max: number; unit?: "char" | "word"; multiline?: boolean; placeholder?: string; className?: string }) {
  const [v, setV] = useState(defaultValue ?? "");
  const n = unit === "word" ? v.split(/\s+/).filter(Boolean).length : v.length;
  const tone = !n ? "text-mute" : n < min || n > max ? "text-warn" : "text-ok";
  const C = multiline ? Textarea : Input;
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <C name={name} value={v} placeholder={placeholder} onChange={(e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => setV(e.target.value)} />
      <span className={cn("text-right text-[11px] font-bold", tone)}>
        {n} {unit === "word" ? "kelime" : "karakter"} · hedef {min}–{max}
      </span>
    </div>
  );
}
