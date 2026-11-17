import type { AllSettings } from "./settings";

/**
 * Kart seçeneği gerçekten çalışır mı? Ayarda açık + seçili sağlayıcının anahtarları (panelden ya da ortam
 * değişkeninden) girilmiş olmalı; test simülasyonu açıksa anahtar aranmaz. Saf fonksiyon: ağ/DB çağrısı yok.
 * Kural iyzico.ts → getIyzicoConfig/simulationAllowed ve paytr.ts → getPaytrConfig ile aynı.
 */
export function cardReady(s: AllSettings): boolean {
  if (!s.payment.cardEnabled) return false;
  const sim = process.env.PAYMENT_SIMULATION;
  if ((sim === "1" && process.env.NODE_ENV !== "production") || sim === "force-test-only") return true;
  const p = s.payment;
  const e = process.env;
  if (p.provider === "paytr") return !!((p.paytrMerchantId || e.PAYTR_MERCHANT_ID) && (p.paytrMerchantKey || e.PAYTR_MERCHANT_KEY) && (p.paytrMerchantSalt || e.PAYTR_MERCHANT_SALT));
  return !!((p.iyzicoApiKey || e.IYZICO_API_KEY) && (p.iyzicoSecretKey || e.IYZICO_SECRET_KEY));
}
