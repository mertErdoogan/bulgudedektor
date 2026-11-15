import { imgUrl } from "@/lib/img";
import { cn } from "@/lib/utils";

const TONES = ["#c0392b", "#1d4ed8", "#0f766e", "#7c3aed", "#b45309", "#be185d", "#334155"];

/**
 * Marka işareti: panelde logo yüklüyse logo, yoksa marka adının baş harfleriyle renkli rozet.
 * Logolar admin > Markalar'dan yüklenir.
 */
export function BrandMark({ name, logoUrl, size = 36, className }: { name: string; logoUrl?: string | null; size?: number; className?: string }) {
  if (logoUrl)
    return (
      <span className={cn("grid shrink-0 place-items-center overflow-hidden rounded-xl bg-white ring-1 ring-line", className)} style={{ width: size, height: size }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imgUrl(logoUrl, 128)} alt="" className="h-full w-full object-contain p-1" />
      </span>
    );
  const initials = name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toLocaleUpperCase("tr-TR");
  const tone = TONES[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % TONES.length];
  return (
    <span aria-hidden className={cn("grid shrink-0 place-items-center rounded-xl font-extrabold text-white", className)} style={{ width: size, height: size, background: `linear-gradient(135deg, ${tone}, ${tone}cc)`, fontSize: size * 0.36 }}>
      {initials}
    </span>
  );
}
