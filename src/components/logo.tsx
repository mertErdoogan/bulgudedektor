/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/utils";

/**
 * Arena Dedektör logosu (vektör, /public/brand). `size` eski API ile uyumlu: yaklaşık yazı yüksekliği.
 * Logo oranı ~2.97:1. `withSub={false}` dar alanlarda (admin menü) biraz daha küçük çizer.
 */
export function Logo({ size = 30, inverted = false, withSub = true, className }: { size?: number; inverted?: boolean; withSub?: boolean; className?: string }) {
  const h = Math.round(size * (withSub ? 1.75 : 1.45));
  return (
    <img
      src={inverted ? "/brand/arena-logo-white.svg" : "/brand/arena-logo.svg"}
      alt="Arena Dedektör"
      width={Math.round(h * 2.97)}
      height={h}
      className={cn("block h-auto max-w-none select-none", className)}
      style={{ height: h, width: "auto" }}
      draggable={false}
    />
  );
}
