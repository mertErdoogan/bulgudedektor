import "server-only";
import { formatTL } from "./utils";

/**
 * Fiyat yazım hatasına karşı fren: 49.990 yerine 4.999 yazılırsa (ya da fiyat alışın altına inerse) kaydetmeden önce onay ister.
 * Pazaryeri senkronu açıksa yanlış fiyat 15 dakika içinde Trendyol/Hepsiburada'ya da gittiği için önemli.
 * Döner: onay gerekiyorsa kullanıcıya gösterilecek açıklama, gerekmiyorsa null.
 */
export function priceWarning(prev: { price: number; costPrice?: number | null } | null | undefined, next: number, dropPct: number, nextCost?: number | null) {
  if (!prev || !Number.isFinite(next)) return null;
  const cost = nextCost ?? prev.costPrice ?? null;
  if (cost && next < cost) return `Yeni fiyat (${formatTL(next)}) alış fiyatının (${formatTL(cost)}) altında: her satışta zarar edilir.`;
  if (prev.price > 0 && next < prev.price) {
    const drop = Math.round(((prev.price - next) / prev.price) * 100);
    if (drop >= dropPct) return `Fiyat %${drop} düşüyor (${formatTL(prev.price)} → ${formatTL(next)}). Yazım hatası olabilir.`;
  }
  return null;
}

/** İşlem kaydı için kısa fiyat değişim metni */
export function priceChangeNote(prev: number | null | undefined, next: number | null | undefined, label = "fiyat") {
  if (prev === next || next === undefined) return "";
  return ` · ${label} ${prev != null ? formatTL(prev) : "—"} → ${next != null ? formatTL(next) : "—"}`;
}
