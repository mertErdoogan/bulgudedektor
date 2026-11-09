import { cn } from "@/lib/utils";

export function Logo({ size = 30, inverted = false, withSub = true, className }: { size?: number; inverted?: boolean; withSub?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex flex-col leading-none", className)} style={{ gap: Math.round(size * 0.14) }}>
      <span className="font-display font-extrabold whitespace-nowrap" style={{ fontSize: size, letterSpacing: "-0.035em", color: inverted ? "#fff" : "var(--color-deep)" }}>
        bulgu
        <span
          aria-hidden
          className="inline-block rounded-full"
          style={{ width: "0.17em", height: "0.17em", marginLeft: "0.07em", background: inverted ? "#E3B341" : "var(--color-gold)" }}
        />
      </span>
      {withSub ? (
        <span
          className="font-bold"
          style={{ fontSize: Math.max(8, Math.round(size * 0.26)), letterSpacing: "0.55em", paddingLeft: "0.1em", color: inverted ? "rgba(255,255,255,.65)" : "var(--color-link)" }}
        >
          DEDEKTÖR
        </span>
      ) : null}
    </span>
  );
}
