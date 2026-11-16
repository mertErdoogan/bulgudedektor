"use client";

import { useRef, useState } from "react";
import { Paperclip } from "lucide-react";

/**
 * Türkçe dosya seçici. Tarayıcının kendi düğmesi işletim sistemi diline göre "Choose File / No file chosen" yazar;
 * bu bileşen gerçek <input type="file"> alanını gizleyip yerine Türkçe düğme ve seçilen dosyanın adını gösterir.
 */
export function FileInput({ label = "Dosya seç", className = "", ...props }: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & { label?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [names, setNames] = useState<string>("");
  return (
    <span className={`inline-flex min-w-0 items-center gap-2 text-sm ${className}`}>
      <button type="button" onClick={() => ref.current?.click()} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 font-semibold hover:bg-soft">
        <Paperclip size={14} /> {label}
      </button>
      <span className="truncate text-mute">{names || "Dosya seçilmedi"}</span>
      <input
        ref={ref}
        type="file"
        className="sr-only"
        {...props}
        onChange={(e) => {
          setNames([...(e.currentTarget.files ?? [])].map((f) => f.name).join(", "));
          props.onChange?.(e);
        }}
      />
    </span>
  );
}
