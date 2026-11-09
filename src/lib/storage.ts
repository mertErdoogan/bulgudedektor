import "server-only";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

// Yerel disk sürücüsü. Sunucusuz ortama (Vercel vb.) taşınırken bu dosya S3/R2 sürücüsüyle değiştirilir.
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

export async function saveUpload(file: File) {
  const ext = ALLOWED[file.type];
  if (!ext) throw new Error("Desteklenmeyen dosya türü. JPG, PNG, WEBP, AVIF, GIF, SVG veya PDF yükleyin.");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("Dosya 8 MB'tan büyük olamaz.");
  const now = new Date();
  const dir = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;
  const name = `${randomUUID().slice(0, 12)}.${ext}`;
  await mkdir(path.join(UPLOAD_DIR, dir), { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, dir, name), Buffer.from(await file.arrayBuffer()));
  return { url: `/media/${dir}/${name}`, filename: file.name, mime: file.type, size: file.size };
}

export async function readUpload(rel: string) {
  const full = path.resolve(UPLOAD_DIR, rel);
  if (!full.startsWith(UPLOAD_DIR + path.sep)) throw new Error("invalid path");
  return readFile(full);
}

export async function deleteUpload(url: string) {
  if (!url.startsWith("/media/")) return;
  const full = path.resolve(UPLOAD_DIR, url.slice("/media/".length));
  if (!full.startsWith(UPLOAD_DIR + path.sep)) return;
  await unlink(full).catch(() => undefined);
}
