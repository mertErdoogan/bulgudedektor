import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

/**
 * Sunucu dışı betiklerin de (içe aktarma, seed) kullanabildiği yazma çekirdeği.
 * Fotoğrafı küçültüp WebP'ye çevirir ve yerel diske veya S3/R2'ye yazar; erişim adresini döndürür.
 */
const MAX_SIDE = 1600;

export async function optimizeImage(buf: Buffer, mime: string) {
  if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(mime)) return { buf, mime, ext: mime.split("/")[1]?.replace("svg+xml", "svg") || "bin" };
  try {
    const sharp = (await import("sharp")).default;
    const out = await sharp(buf, { failOn: "none" })
      .rotate()
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82, effort: 4 })
      .toBuffer();
    if (out.length >= buf.length && mime === "image/webp") return { buf, mime, ext: "webp" };
    return { buf: out, mime: "image/webp", ext: "webp" };
  } catch {
    return { buf, mime, ext: mime.split("/")[1] || "bin" };
  }
}

export async function putObject(buf: Buffer, mime: string, opts: { optimize?: boolean } = {}) {
  const o = opts.optimize === false ? { buf, mime, ext: mime.split("/")[1] || "bin" } : await optimizeImage(buf, mime);
  const now = new Date();
  const key = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${randomUUID().slice(0, 12)}.${o.ext}`;
  if (process.env.STORAGE_DRIVER === "s3") {
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const s3 = new S3Client({
      region: process.env.S3_REGION || "auto",
      endpoint: process.env.S3_ENDPOINT || undefined,
      credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID || "", secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "" },
    });
    await s3.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, Body: o.buf, ContentType: o.mime, CacheControl: "public, max-age=31536000, immutable" }));
    return { url: `${(process.env.S3_PUBLIC_URL || "").replace(/\/$/, "")}/${key}`, size: o.buf.length, mime: o.mime };
  }
  const dir = path.resolve(process.env.UPLOAD_DIR || "./uploads");
  await mkdir(path.join(dir, path.dirname(key)), { recursive: true });
  await writeFile(path.join(dir, key), o.buf);
  return { url: `/media/${key}`, size: o.buf.length, mime: o.mime };
}
