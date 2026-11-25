"use client";
/* eslint-disable @next/next/no-img-element */
import { useBrand } from "@/components/brand";
import { cn } from "@/lib/utils";

/**
 * Mağaza logosu (Ayarlar > Marka). Logo yüklenmemişse mağaza adı yazı olarak çizilir.
 * `size` yaklaşık yazı yüksekliği; `withSub={false}` dar alanlarda (admin menü) biraz daha küçük çizer.
 * `inverted`: koyu zemin (footer). Beyaz logo yoksa açık logo beyaza çevrilir.
 */
export function Logo({ size = 30, inverted = false, withSub = true, className }: { size?: number; inverted?: boolean; withSub?: boolean; className?: string }) {
  const b = useBrand();
  const h = Math.round(size * (withSub ? 1.75 : 1.45));
  const src = inverted ? b.logoWhiteUrl || b.logoUrl : b.logoUrl;
  const name = b.name || "Mağaza";
  if (src)
    return (
      <img
        src={src}
        alt={name}
        height={h}
        className={cn("block h-auto max-w-none select-none", inverted && !b.logoWhiteUrl && "brightness-0 invert", className)}
        style={{ height: h, width: "auto", maxWidth: Math.round(h * 5) }}
        draggable={false}
      />
    );
  return (
    <span
      className={cn("block font-display leading-none font-extrabold tracking-[-0.02em] whitespace-nowrap select-none", inverted ? "text-white" : "text-deep", className)}
      style={{ fontSize: Math.round(size * (withSub ? 1.05 : 0.95)) }}
    >
      {name}
    </span>
  );
}
