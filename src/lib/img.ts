/**
 * Görsel boyutlandırma: Next görsel optimizasyonu (/_next/image) ile ekran genişliğine uygun boyut + WebP.
 * Yüklenen fotoğraflar 1600 px saklanır; mobil ürün kartı ~200 px gösterir. srcset sayesinde tarayıcı küçük
 * sürümü indirir (Lighthouse "uygun boyutlu görseller"). Yalnızca kendi sunucumuzdaki (/media, /demo) ve
 * ayarlı S3/R2 adresindeki görseller dönüştürülür; SVG ve dış adresler olduğu gibi kalır.
 * Genişlikler next.config'deki deviceSizes/imageSizes listesinde olmalı.
 */
const REMOTE = (process.env.NEXT_PUBLIC_IMG_REMOTE || "").replace(/\/$/, "");

export function optimizable(src?: string | null): src is string {
  if (!src || /\.svg(\?|$)/i.test(src) || src.startsWith("data:")) return false;
  if (src.startsWith("/") && !src.startsWith("//")) return true;
  return !!REMOTE && src.startsWith(`${REMOTE}/`);
}

export function imgUrl(src: string, w: number, q = 75) {
  return optimizable(src) ? `/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=${q}` : src;
}

/** <img {...imgProps(src, [256, 384, 640], "(min-width: 768px) 25vw, 50vw")} /> */
export function imgProps(src: string, widths: number[], sizes: string, q = 75) {
  if (!optimizable(src)) return { src };
  return {
    src: imgUrl(src, widths[widths.length - 1], q),
    srcSet: widths.map((w) => `${imgUrl(src, w, q)} ${w}w`).join(", "),
    sizes,
  };
}
