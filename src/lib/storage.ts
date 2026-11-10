import "server-only";
export { putObject } from "./storage-core";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

/**
 * Dosya depolama.
 * - Varsayılan: yerel disk (UPLOAD_DIR), /media/... adresinden sunulur. Tek sunuculu (VPS) kurulum için.
 * - STORAGE_DRIVER=s3: Cloudflare R2 / AWS S3 / uyumlu servis. Sunucusuz ortam (Vercel) ve CDN için önerilir.
 *   Gerekli: S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_PUBLIC_URL; R2 için S3_ENDPOINT, S3_REGION=auto.
 *
 * Yüklenen fotoğraflar otomatik olarak en fazla 1600 px'e küçültülür ve WebP'ye çevrilir (SVG, GIF, PDF hariç).
 */
export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || "./uploads");
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/avif": "avif",
  "application/pdf": "pdf",
};
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const MAX_SIDE = 1600;

const isS3 = () => process.env.STORAGE_DRIVER === "s3";
const publicBase = () => (process.env.S3_PUBLIC_URL || "").replace(/\/$/, "");

let _s3: import("@aws-sdk/client-s3").S3Client | null = null;
async function s3() {
  if (_s3) return _s3;
  const { S3Client } = await import("@aws-sdk/client-s3");
  _s3 = new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT || undefined,
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID || "", secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "" },
  });
  return _s3;
}

/** Fotoğrafı küçült + WebP'ye çevir. Başarısız olursa orijinali kullan. */
async function optimize(buf: Buffer, mime: string): Promise<{ buf: Buffer; mime: string; ext: string; width?: number; height?: number }> {
  const ext = ALLOWED[mime];
  if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(mime)) return { buf, mime, ext };
  try {
    const sharp = (await import("sharp")).default;
    const out = await sharp(buf, { failOn: "none" })
      .rotate() // EXIF yönünü uygula
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82, effort: 4 })
      .toBuffer({ resolveWithObject: true });
    // Şeffaf PNG logolar vb. küçülmüyorsa orijinal kalsın
    if (out.data.length >= buf.length && mime !== "image/jpeg") return { buf, mime, ext };
    return { buf: out.data, mime: "image/webp", ext: "webp", width: out.info.width, height: out.info.height };
  } catch {
    return { buf, mime, ext };
  }
}

export async function saveUpload(file: File) {
  if (!ALLOWED[file.type]) throw new Error("Desteklenmeyen dosya türü. JPG, PNG, WEBP, AVIF, GIF, SVG veya PDF yükleyin.");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("Dosya 8 MB'tan büyük olamaz.");
  const o = await optimize(Buffer.from(await file.arrayBuffer()), file.type);
  const now = new Date();
  const dir = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;
  const name = `${randomUUID().slice(0, 12)}.${o.ext}`;
  const key = `${dir}/${name}`;
  if (isS3()) {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    await (await s3()).send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, Body: o.buf, ContentType: o.mime, CacheControl: "public, max-age=31536000, immutable" }));
    return { url: `${publicBase()}/${key}`, filename: file.name, mime: o.mime, size: o.buf.length };
  }
  await mkdir(path.join(UPLOAD_DIR, dir), { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, key), o.buf);
  return { url: `/media/${key}`, filename: file.name, mime: o.mime, size: o.buf.length };
}

export async function readUpload(rel: string) {
  const full = path.resolve(UPLOAD_DIR, rel);
  if (!full.startsWith(UPLOAD_DIR + path.sep)) throw new Error("invalid path");
  return readFile(full);
}

export async function deleteUpload(url: string) {
  if (url.startsWith("/media/")) {
    const full = path.resolve(UPLOAD_DIR, url.slice("/media/".length));
    if (!full.startsWith(UPLOAD_DIR + path.sep)) return;
    await unlink(full).catch(() => undefined);
    return;
  }
  const base = publicBase();
  if (isS3() && base && url.startsWith(base + "/")) {
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    await (await s3()).send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: url.slice(base.length + 1) })).catch(() => undefined);
  }
}
