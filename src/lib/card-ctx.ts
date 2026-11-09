import type { AllSettings } from "./settings";

/** Ürün kartlarının ihtiyaç duyduğu ayar özeti (istemci bileşenlerine de güvenle geçirilebilir; gizli anahtar içermez). */
export type CardCtx = {
  installments: number;
  social: boolean;
  ship: { sameDayCutoff: string; transitMinDays: number; transitMaxDays: number; shipOnSaturday: boolean };
};

export const cardCtx = (s: AllSettings): CardCtx => ({
  installments: s.payment.noInterestInstallments,
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
