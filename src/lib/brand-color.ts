/* Tek bir ana renkten sitenin bütün vurgu tonlarını türetir (Ayarlar > Marka > Ana renk).
   globals.css'teki --color-brand* değişkenleri bu değerlerle ezilir; böylece hiçbir bileşende renk sabit kalmaz. */

type RGB = [number, number, number];

const hex = (h: string): RGB => {
  const m = /^#?([0-9a-f]{6})$/i.exec(h.trim());
  const n = parseInt(m ? m[1] : "d42e1e", 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = (c: RGB) => "#" + c.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("");
/** a ile b arasında t oranında karışım (0 = a, 1 = b) */
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const WHITE: RGB = [255, 255, 255];
const BLACK: RGB = [0, 0, 0];

function luminance([r, g, b]: RGB) {
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
/** WCAG kontrast oranı */
export function contrast(a: string, b: string) {
  const [x, y] = [luminance(hex(a)), luminance(hex(b))].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** Beyaz zemin üzerinde en az `min` kontrast verene kadar koyulaştırır (yazı ve bağlantılar okunur kalsın) */
function readableOnWhite(c: RGB, min = 4.5): RGB {
  let out = c;
  for (let i = 0; i < 20 && contrast(toHex(out), "#ffffff") < min; i++) out = mix(out, BLACK, 0.08);
  return out;
}

export type BrandPalette = {
  brand: string;
  brandDark: string;
  pop: string;
  onPop: string;
  tint: string;
  link: string;
  accent: string;
  accentDark: string;
  /** Ana renk üzerindeki yazı rengi (açık renk seçilirse koyu yazı) */
  onBrand: string;
};

export function brandPalette(color: string): BrandPalette {
  const c = hex(color);
  const accent = readableOnWhite(c);
  return {
    brand: toHex(c),
    brandDark: toHex(mix(c, BLACK, 0.17)),
    pop: toHex(mix(c, WHITE, 0.88)),
    onPop: toHex(readableOnWhite(mix(c, BLACK, 0.25), 6)),
    tint: toHex(mix(c, WHITE, 0.93)),
    link: toHex(readableOnWhite(mix(c, BLACK, 0.08))),
    accent: toHex(accent),
    accentDark: toHex(mix(accent, BLACK, 0.08)),
    onBrand: contrast(toHex(c), "#ffffff") >= 3 ? "#ffffff" : "#1d1d1f",
  };
}

/** :root üzerine yazılacak CSS (layout'ta <style> olarak basılır) */
export function brandCss(color: string) {
  // Varsayılan kırmızı için globals.css'teki elle ayarlanmış tonlar kullanılır
  if (color.toLowerCase() === "#d42e1e") return "";
  const p = brandPalette(color);
  return `:root{--color-brand:${p.brand};--color-brand-dark:${p.brandDark};--color-pop:${p.pop};--color-on-pop:${p.onPop};--color-tint:${p.tint};--color-link:${p.link};--color-accent:${p.accent};--color-accent-dark:${p.accentDark};--color-on-brand:${p.onBrand}}`;
}
