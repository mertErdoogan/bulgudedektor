/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/utils";

/**
 * Derinova Dedektör logosu (vektör, /public/brand). `size` eski API ile uyumlu: yaklaşık yazı yüksekliği.
 * Logo oranı ~3.27:1. `withSub={false}` dar alanlarda (admin menü) biraz daha küçük çizer.
 */
export function Logo({ size = 30, inverted = false, withSub = true, className }: { size?: number; inverted?: boolean; withSub?: boolean; className?: string }) {
  const h = Math.round(size * (withSub ? 1.75 : 1.45));
  return (
    <img
      src={inverted ? "/brand/logo-white.svg" : "/brand/logo.svg"}
      alt="Derinova Dedektör"
      width={Math.round(h * 3.27)}
      height={h}
      className={cn("block h-auto max-w-none select-none", className)}
      style={{ height: h, width: "auto" }}
      draggable={false}
    />
  );
}
