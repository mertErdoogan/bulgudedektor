import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const tl = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
export function formatTL(v: number | string | null | undefined) {
  const n = typeof v === "string" ? Number(v) : v ?? 0;
  return `${tl.format(Math.round(n * 100) / 100)} TL`;
}

export function formatDate(d: Date | string | null | undefined, withTime = false) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    timeZone: "Europe/Istanbul",
  }).format(date);
}

const trMap: Record<string, string> = { ç: "c", ğ: "g", ı: "i", İ: "i", ö: "o", ş: "s", ü: "u", Ç: "c", Ğ: "g", Ö: "o", Ş: "s", Ü: "u", â: "a", î: "i", û: "u" };
export function slugify(s: string) {
  return s
    .split("")
    .map((c) => trMap[c] ?? c)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function orderNo(n: number) {
  return `BD-${String(n).padStart(6, "0")}`;
}

export function serviceNo(n: number) {
  return `SRV-${String(n).padStart(5, "0")}`;
}

/** "49.588", "49588,50", "49.588,50" ve "48003.85" biçimlerini doğru okur */
export function parseAmount(raw: string) {
  let s = raw.trim().replace(/\s|TL|₺/gi, "");
  if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "").replace(",", ".");
  else if (s.includes(",")) s = s.replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  return Number(s);
}

export function toNum(v: FormDataEntryValue | null | undefined, fallback = 0) {
  if (v === null || v === undefined || v === "") return fallback;
  const n = parseAmount(String(v));
  return Number.isFinite(n) ? n : fallback;
}

export function toNumOrNull(v: FormDataEntryValue | null | undefined) {
  if (v === null || v === undefined || String(v).trim() === "") return null;
  const n = toNum(v, NaN);
  return Number.isFinite(n) ? n : null;
}

export function str(v: FormDataEntryValue | null | undefined) {
  const s = v === null || v === undefined ? "" : String(v).trim();
  return s;
}

export function strOrNull(v: FormDataEntryValue | null | undefined) {
  const s = str(v);
  return s === "" ? null : s;
}

export function lines(v: FormDataEntryValue | null | undefined) {
  return str(v)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

export function normalizePhone(p: string) {
  const d = p.replace(/\D/g, "");
  if (d.startsWith("90")) return `+${d}`;
  if (d.startsWith("0")) return `+9${d}`;
  if (d.length === 10) return `+90${d}`;
  return d ? `+${d}` : "";
}

export const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "Ödeme bekliyor",
  PAID: "Yeni sipariş",
  PREPARING: "Hazırlanıyor",
  SHIPPED: "Kargoda",
  DELIVERED: "Teslim edildi",
  CANCELLED: "İptal",
  REFUNDED: "İade edildi",
};
export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  PENDING: "Bekliyor",
  PAID: "Ödendi",
  FAILED: "Başarısız",
  REFUNDED: "İade edildi",
  PARTIALLY_REFUNDED: "Kısmi iade",
};
export const RETURN_STATUS_LABEL: Record<string, string> = {
  REQUESTED: "Talep edildi",
  APPROVED: "Onaylandı, ürün bekleniyor",
  RECEIVED: "Ürün ulaştı",
  REFUNDED: "Para iadesi yapıldı",
  REJECTED: "Reddedildi",
};
export const SERVICE_STATUS_LABEL: Record<string, string> = {
  RECEIVED: "Kayıt alındı",
  AWAITING_DEVICE: "Cihaz bekleniyor",
  IN_REPAIR: "Tamirde",
  WAITING_PART: "Parça bekleniyor",
  READY: "Hazır",
  SHIPPED_BACK: "Kargoda, size dönüyor",
  CLOSED: "Kapandı",
};
export const PRODUCT_STATUS_LABEL: Record<string, string> = { DRAFT: "Taslak", ACTIVE: "Yayında", ARCHIVED: "Arşiv" };
export const TECH_LABEL: Record<string, string> = { MULTI: "Çok frekanslı", VLF: "VLF tek frekans", PI: "PI (Pulse)", IMAGING: "Görüntüleme / 3D", OTHER: "Diğer" };
export const WATERPROOF_LABEL: Record<string, string> = { NONE: "Su geçirmez değil", COIL_ONLY: "Sadece başlık", FULL: "Tamamen (dalış)" };
export const EXPERIENCE_LABEL: Record<string, string> = { BEGINNER: "İlk cihaz", INTERMEDIATE: "Deneyimli", PRO: "Profesyonel" };
export const USE_CASES: { key: string; label: string }[] = [
  { key: "define", label: "Define ve sikke" },
  { key: "altin", label: "Doğal altın" },
  { key: "sahil", label: "Sahil ve su altı" },
  { key: "derin", label: "Derin arama" },
  { key: "pointer", label: "Nokta tespiti" },
];
export const CHANNEL_LABEL: Record<string, string> = { WHATSAPP: "WhatsApp", WEB: "Web", PHONE: "Telefon", EMAIL: "E-posta", INSTAGRAM: "Instagram" };
