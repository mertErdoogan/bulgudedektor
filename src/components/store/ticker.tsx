import Link from "next/link";
import { cn } from "@/lib/utils";
import type { TickerSettings } from "@/lib/settings";

const THEME = {
  soft: { bar: "border-b border-line bg-[#fbf8f7] text-deep", hl: "bg-brand text-white", sep: "text-brand/50" },
  brand: { bar: "bg-brand text-white", hl: "bg-white text-brand", sep: "text-white/60" },
  dark: { bar: "bg-deep text-white", hl: "bg-brand text-white", sep: "text-brand" },
  gold: { bar: "bg-[#ffcf3d] text-deep", hl: "bg-deep text-white", sep: "text-deep/50" },
} as const;
// Saniyede kat edilen yol (px): animasyon süresi içerik uzunluğuna göre hesaplanır, hız sabit kalır
const PX_PER_SEC = { slow: 40, normal: 70, fast: 110 } as const;

/**
 * Kayan şerit (menü ile banner arası). Panelden yönetilir: maddeler, yön, hız, renk.
 * Saf CSS animasyonu: içerik iki kez yazılır, şerit yarısı kadar kayınca başa sarar (dikişsiz döngü).
 * Fare üstündeyken durur; "hareketi azalt" tercihinde kaymaz, elle kaydırılır.
 */
export function Ticker({ t }: { t: TickerSettings }) {
  const items = t.items.filter((i) => i.text.trim());
  if (!t.enabled || !items.length) return null;
  const th = THEME[t.theme] ?? THEME.brand;
  // Geniş ekranı doldurmak için maddeleri çoğalt (yarım iz en az ~160 karakter)
  const len = items.reduce((n, i) => n + i.text.length + 6, 0);
  const reps = Math.max(1, Math.ceil(160 / len));
  const half = Array.from({ length: reps }, () => items).flat();
  const dur = Math.round((len * reps * 8.5) / PX_PER_SEC[t.speed] || 30);

  const row = (hidden: boolean) =>
    half.map((i, k) => {
      const body = (
        <span className={cn("inline-flex items-center gap-2 whitespace-nowrap", i.highlight && cn("rounded-full px-3 py-1 font-extrabold", th.hl))}>
          {i.text}
          {i.href ? <span aria-hidden>→</span> : null}
        </span>
      );
      return (
        <span key={`${hidden}-${k}`} className="inline-flex items-center">
          {i.href ? (
            <Link href={i.href} tabIndex={hidden ? -1 : undefined} className="rounded-full outline-offset-2 hover:underline hover:underline-offset-4">
              {body}
            </Link>
          ) : (
            body
          )}
          <span aria-hidden className={cn("mx-5 text-[10px] md:mx-7", th.sep)}>✦</span>
        </span>
      );
    });

  return (
    <div className={cn("ticker group relative overflow-hidden text-[13px] font-bold md:text-sm", th.bar)} data-dir={t.direction} data-testid="ticker" aria-label="Duyurular" role="region">
      <div className="ticker-track flex w-max items-center py-2 md:py-2.5" style={{ ["--ticker-dur" as string]: `${dur}s` }}>
        <div className="flex items-center pr-0">{row(false)}</div>
        <div className="flex items-center" aria-hidden>{row(true)}</div>
      </div>
    </div>
  );
}
