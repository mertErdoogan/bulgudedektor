import { cardReady } from "./card-ready";
import type { AllSettings } from "./settings";

/** Ürün kartlarının ihtiyaç duyduğu ayar özeti (istemci bileşenlerine de güvenle geçirilebilir; gizli anahtar içermez). */
export type CardCtx = {
  installments: number;
  social: boolean;
  ship: { sameDayCutoff: string; transitMinDays: number; transitMaxDays: number; shipOnSaturday: boolean };
  /** Kartlardaki hazır metinlerin (teslim tarihi vb.) dili */
  locale: "tr" | "en";
  /** Sayfanın sunucuda oluşturulduğu an (ms). Teslim tarihi hem sunucuda hem tarayıcıda bu anla hesaplanır;
   *  kesim saati ya da gece yarısı tam sayfa yüklenirken geçerse iki taraf farklı metin üretmez. */
  now: number;
};

export const cardCtx = (s: AllSettings, locale: "tr" | "en" = "tr"): CardCtx => ({
  locale,
  now: Date.now(),
  // Kart ödemesi çalışmıyorsa kartlarda "x taksit" vaadi gösterilmez
  installments: cardReady(s) ? s.payment.noInterestInstallments : 1,
  social: s.store.socialProof !== false,
  ship: {
    sameDayCutoff: s.shipping.sameDayCutoff,
    transitMinDays: s.shipping.transitMinDays,
    transitMaxDays: s.shipping.transitMaxDays,
    shipOnSaturday: s.shipping.shipOnSaturday,
  },
});

/** Sosyal kanıt eşikleri: düşük sayılar güven vermez, gösterilmez. */
export const SOCIAL_MIN_VIEWS = 8;
export const SOCIAL_MIN_CARTS = 3;
