import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { BannerPalette } from "@/db/schema";

/**
 * Banner paleti: görseldeki en baskın iki CANLI renk (gri/siyah/beyaz yok sayılır) ve ortalama parlaklık.
 * Ana sayfada banner'ın arkasındaki aurora ışıması ve dönen kenar bu renklerle boyanır; koyu banner'larda
 * bulanık kopyanın yaptığı gri leke oluşmaz. Script'lerden de kullanılır (server-only değil).
 */
const FALLBACK_A: [number, number, number] = [212, 46, 30]; // marka kırmızısı
const FALLBACK_B: [number, number, number] = [47, 86, 200]; // Minelab mavisi

export async function paletteFromBuffer(buf: Buffer): Promise<BannerPalette | null> {
  try {
    const W = 64;
    const H = 24;
    const { data } = await sharp(buf).resize(W, H, { fit: "fill" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    let lum = 0;
    const bins = new Map<number, { w: number; r: number; g: number; b: number }>();
    for (let i = 0; i < data.length; i += 3) {
      const [R, G, B] = [data[i], data[i + 1], data[i + 2]];
      const r = R / 255;
      const g = G / 255;
      const b = B / 255;
      lum += 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const mx = Math.max(r, g, b);
      const mn = Math.min(r, g, b);
      const l = (mx + mn) / 2;
      const s = mx === mn ? 0 : l > 0.5 ? (mx - mn) / (2 - mx - mn) : (mx - mn) / (mx + mn);
      if (s < 0.35 || l < 0.18 || l > 0.85) continue; // gri, çok koyu, çok açık: ışıma için kullanılmaz
      let h = mx === r ? ((g - b) / (mx - mn)) % 6 : mx === g ? (b - r) / (mx - mn) + 2 : (r - g) / (mx - mn) + 4;
      h = (h * 60 + 360) % 360;
      const k = Math.round(h / 30) % 12;
      const e = bins.get(k) ?? { w: 0, r: 0, g: 0, b: 0 };
      e.w += s;
      e.r += R * s;
      e.g += G * s;
      e.b += B * s;
      bins.set(k, e);
    }
    const top = [...bins.values()]
      .filter((v) => v.w > 3) // birkaç pikselden oluşan rastlantısal renkler sayılmaz
      .sort((x, y) => y.w - x.w)
      .slice(0, 2)
      .map((v) => [Math.round(v.r / v.w), Math.round(v.g / v.w), Math.round(v.b / v.w)] as [number, number, number]);
    const a = top[0] ?? FALLBACK_A;
    const b = top[1] ?? (top[0] ? FALLBACK_B : FALLBACK_B);
    return { a, b, lum: Math.round((lum / (W * H)) * 1000) / 1000 };
  } catch {
    return null;
  }
}

/** /demo/… ve /brand/… public klasöründen, /media/… yükleme klasöründen, http(s) ağdan okunur */
export async function paletteFromUrl(url: string): Promise<BannerPalette | null> {
  try {
    let buf: Buffer;
    if (/^https?:\/\//i.test(url)) {
      const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!r.ok) return null;
      buf = Buffer.from(await r.arrayBuffer());
    } else if (url.startsWith("/media/") && !url.startsWith("/media/private/")) {
      const dir = path.resolve(process.env.UPLOAD_DIR || "./uploads");
      const rel = decodeURIComponent(url.slice("/media/".length));
      const full = path.resolve(dir, rel);
      if (!full.startsWith(dir + path.sep)) return null;
      buf = await readFile(full);
    } else if (url.startsWith("/")) {
      const pub = path.resolve(process.cwd(), "public");
      const full = path.resolve(pub, "." + decodeURIComponent(url.split("?")[0]));
      if (!full.startsWith(pub + path.sep)) return null;
      buf = await readFile(full);
    } else return null;
    return paletteFromBuffer(buf);
  } catch {
    return null;
  }
}
