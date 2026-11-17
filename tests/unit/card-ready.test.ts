/** npx tsx tests/unit/card-ready.test.ts — kart seçeneği yalnız sağlayıcı anahtarı varken (ya da test simülasyonunda) açılır */
import assert from "node:assert/strict";
import { cardReady } from "../../src/lib/card-ready";
import type { AllSettings } from "../../src/lib/settings";

const base = { cardEnabled: true, provider: "iyzico", iyzicoApiKey: "", iyzicoSecretKey: "", paytrMerchantId: "", paytrMerchantKey: "", paytrMerchantSalt: "" };
const s = (p: Partial<typeof base>) => ({ payment: { ...base, ...p } }) as unknown as AllSettings;
const env = process.env as Record<string, string | undefined>;
for (const k of ["PAYMENT_SIMULATION", "IYZICO_API_KEY", "IYZICO_SECRET_KEY", "PAYTR_MERCHANT_ID", "PAYTR_MERCHANT_KEY", "PAYTR_MERCHANT_SALT"]) delete env[k];

assert.equal(cardReady(s({})), false, "anahtarsız iyzico: kart gösterilmez");
assert.equal(cardReady(s({ iyzicoApiKey: "a" })), false, "yalnız API key yetmez");
assert.equal(cardReady(s({ iyzicoApiKey: "a", iyzicoSecretKey: "b" })), true);
assert.equal(cardReady(s({ cardEnabled: false, iyzicoApiKey: "a", iyzicoSecretKey: "b" })), false, "kapalıysa kapalı");
assert.equal(cardReady(s({ provider: "paytr", iyzicoApiKey: "a", iyzicoSecretKey: "b" })), false, "seçili sağlayıcının anahtarı aranır");
assert.equal(cardReady(s({ provider: "paytr", paytrMerchantId: "1", paytrMerchantKey: "k", paytrMerchantSalt: "s" })), true);
env.IYZICO_API_KEY = "x";
env.IYZICO_SECRET_KEY = "y";
assert.equal(cardReady(s({})), true, "ortam değişkeninden anahtar da sayılır");
delete env.IYZICO_API_KEY;
delete env.IYZICO_SECRET_KEY;
env.PAYMENT_SIMULATION = "force-test-only";
assert.equal(cardReady(s({})), true, "test simülasyonu");
env.PAYMENT_SIMULATION = "1";
env.NODE_ENV = "production";
assert.equal(cardReady(s({})), false, "canlıda PAYMENT_SIMULATION=1 kartı açmaz");
console.log("card-ready OK");
