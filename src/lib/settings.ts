import "server-only";
import { cache } from "react";
import { db } from "@/db";
import { settings } from "@/db/schema";

export type StoreSettings = {
  name: string;
  legalName: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  taxOffice: string;
  taxNumber: string;
  mersis: string;
  etbis: string;
  workingHours: string;
  announcement: string;
  logoText: string;
  /** Yapılandırılmış veri ve Google İşletme Profili ile birebir aynı olmalı (NAP tutarlılığı) */
  city: string;
  district: string;
  postalCode: string;
  latitude: string;
  longitude: string;
  openingHours: string;
  foundingYear: string;
  priceRange: string;
  instagram: string;
  youtube: string;
  facebook: string;
  tiktok: string;
  x: string;
  linkedin: string;
  googleBusinessUrl: string;
  googleReviewUrl: string;
  sikayetvarUrl: string;
  /** Ürün kartlarında "24 saatte X kişi inceledi" gibi gerçek etkileşim bilgileri */
  socialProof: boolean;
};

export type ShippingSettings = {
  freeThreshold: number;
  flatRate: number;
  carriers: string[];
  defaultCarrier: string;
  sameDayCutoff: string;
  deliveryEstimate: string;
  /** Kargoya verildikten sonra teslim için iş günü aralığı (ürün kartındaki tahmini teslim tarihi) */
  transitMinDays: number;
  transitMaxDays: number;
  shipOnSaturday: boolean;
  pickupEnabled: boolean;
  pickupAddress: string;
  trackingUrlTemplate: Record<string, string>;
};

export type PaymentSettings = {
  cardEnabled: boolean;
  /** Kartla ödemeyi hangi kuruluş alır. Değiştirilince yeni siparişler o kuruluşa gider; eski siparişlerin iadesi kendi kuruluşundan yapılır. */
  provider: "iyzico" | "paytr";
  paytrMerchantId: string;
  paytrMerchantKey: string;
  paytrMerchantSalt: string;
  /** PayTR mağazası canlıdayken deneme işlemi (gerçek para çekilmez) */
  paytrTestMode: boolean;
  iyzicoApiKey: string;
  iyzicoSecretKey: string;
  iyzicoSandbox: boolean;
  maxInstallment: number;
  noInterestInstallments: number;
  /** iyzico'ya bağlanılamadığında gösterilecek taksit farkları (%): {"4": 7.34} = 4 taksitte toplam %7,34 fazla */
  installmentRates: Record<string, number>;
  transferEnabled: boolean;
  transferDiscountPct: number;
  bankAccounts: { bank: string; holder: string; iban: string }[];
};

export type IntegrationSettings = {
  gaMeasurementId: string;
  metaPixelId: string;
  whatsappApiToken: string;
  smtpHost: string;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
  notifyEmail: string;
  eInvoiceProvider: string;
  eInvoiceApiKey: string;
  cargoApiKey: string;
  /** SMS (Netgsm) */
  smsProvider: "" | "netgsm";
  netgsmUser: string;
  netgsmPass: string;
  netgsmHeader: string;
  smsOnPlaced: boolean;
  smsOnShipped: boolean;
  smsOnDelivered: boolean;
  /** Trendyol pazaryeri: fiyat/stok senkronu ve sipariş aktarımı */
  trendyolEnabled: boolean;
  trendyolSupplierId: string;
  trendyolApiKey: string;
  trendyolApiSecret: string;
  /** Trendyol'da fiyat site fiyatından % kaç farklı olsun (komisyon için, örn. 8) */
  trendyolPriceMarkupPct: number;
  /** Hepsiburada pazaryeri */
  hbEnabled: boolean;
  hbMerchantId: string;
  hbUser: string;
  hbPass: string;
  hbPriceMarkupPct: number;
};

export type SeoSettings = {
  title: string;
  description: string;
  ogImage: string;
  googleVerification: string;
  bingVerification: string;
  yandexVerification: string;
  indexNowKey: string;
  aboutForAi: string;
};
export type SetupSettings = { completed: boolean; completedSteps: string[] };

export type AllSettings = {
  store: StoreSettings;
  shipping: ShippingSettings;
  payment: PaymentSettings;
  integrations: IntegrationSettings;
  seo: SeoSettings;
  setup: SetupSettings;
};

export const DEFAULT_SETTINGS: AllSettings = {
  store: {
    name: "Arena Dedektör",
    legalName: "Arena Dedektör Teknolojileri Elektronik San. ve Tic. Ltd. Şti.",
    phone: "0212 275 94 94",
    whatsapp: "905436796968",
    email: "admin@arenadedektor.com",
    address: "Fulya Mah. Büyükdere Cad. Altınova Apt. No: 54 Kat: 3 D: 3, Şişli / İstanbul",
    taxOffice: "",
    taxNumber: "",
    mersis: "",
    etbis: "",
    workingHours: "Hafta içi 09:00–19:00, Cumartesi 10:00–17:00",
    announcement: "Ücretsiz kargo · 3 aya kadar vade farksız taksit · Orijinal ürün, faturalı, 2 yıl garanti · 14 gün kolay iade",
    logoText: "Arena Dedektör",
    city: "İstanbul",
    district: "Şişli",
    postalCode: "",
    latitude: "",
    longitude: "",
    openingHours: "Mo-Fr 09:00-20:00, Sa 10:00-18:00",
    foundingYear: "",
    priceRange: "₺₺₺",
    instagram: "https://www.instagram.com/arenadedectors/",
    youtube: "https://www.youtube.com/channel/UCA0_2xS4jKaVlEZ8ObQg3tA",
    facebook: "https://www.facebook.com/arenadedektor/",
    tiktok: "",
    x: "https://twitter.com/arenadedektr",
    linkedin: "",
    googleBusinessUrl: "",
    googleReviewUrl: "",
    sikayetvarUrl: "",
    socialProof: true,
  },
  shipping: {
    freeThreshold: 0,
    flatRate: 0,
    carriers: ["Yurtiçi Kargo", "Aras Kargo", "MNG Kargo", "Sürat Kargo"],
    defaultCarrier: "Yurtiçi Kargo",
    sameDayCutoff: "15:00",
    deliveryEstimate: "1–3 iş günü",
    transitMinDays: 1,
    transitMaxDays: 2,
    shipOnSaturday: false,
    pickupEnabled: true,
    pickupAddress: "",
    trackingUrlTemplate: {
      "Yurtiçi Kargo": "https://www.yurticikargo.com/tr/online-servisler/gonderi-sorgula?code={code}",
      "Aras Kargo": "https://kargotakip.araskargo.com.tr/mainpage.aspx?code={code}",
      "MNG Kargo": "https://www.mngkargo.com.tr/gonderi-takip/?code={code}",
      "Sürat Kargo": "https://www.suratkargo.com.tr/KargoTakip/?kargotakipno={code}",
    },
  },
  payment: {
    cardEnabled: true,
    provider: "iyzico",
    paytrMerchantId: "",
    paytrMerchantKey: "",
    paytrMerchantSalt: "",
    paytrTestMode: false,
    iyzicoApiKey: "",
    iyzicoSecretKey: "",
    iyzicoSandbox: true,
    maxInstallment: 6,
    noInterestInstallments: 3,
    installmentRates: { "4": 7.34, "5": 9.21, "6": 11.08 },
    transferEnabled: true,
    transferDiscountPct: 2,
    bankAccounts: [
      { bank: "Garanti BBVA", holder: "Arena Dedektör Teknolojileri Elektronik San. ve Tic. Ltd. Şti.", iban: "TR18 0006 2000 3570 0006 2929 42" },
      { bank: "Ziraat Bankası", holder: "Arena Dedektör Teknolojileri Elektronik San. ve Tic. Ltd. Şti.", iban: "TR32 0001 0007 5775 8307 7550 01" },
    ],
  },
  integrations: {
    gaMeasurementId: "",
    metaPixelId: "",
    whatsappApiToken: "",
    smtpHost: "",
    smtpUser: "",
    smtpPass: "",
    smtpFrom: "",
    notifyEmail: "",
    eInvoiceProvider: "",
    eInvoiceApiKey: "",
    cargoApiKey: "",
    smsProvider: "",
    netgsmUser: "",
    netgsmPass: "",
    netgsmHeader: "",
    smsOnPlaced: true,
    smsOnShipped: true,
    smsOnDelivered: false,
    trendyolEnabled: false,
    trendyolSupplierId: "",
    trendyolApiKey: "",
    trendyolApiSecret: "",
    trendyolPriceMarkupPct: 0,
    hbEnabled: false,
    hbMerchantId: "",
    hbUser: "",
    hbPass: "",
    hbPriceMarkupPct: 0,
  },
  seo: {
    title: "Arena Dedektör | Minelab, XP, Nokta Dedektör Modelleri ve Fiyatları",
    description: "Türkiye'nin güvenilir dedektör mağazası Arena Dedektör: Minelab, XP, Nokta, Garrett dedektörleri. Orijinal, faturalı, garantili; uzman desteğiyle doğru cihazı seç.",
    ogImage: "/demo/banner-gpz8000-clean.jpg",
    googleVerification: "",
    bingVerification: "",
    yandexVerification: "",
    indexNowKey: "",
    aboutForAi:
      "Arena Dedektör, İstanbul Şişli'de bulunan ve Türkiye geneline Minelab, XP, Nokta ve Garrett marka metal dedektörleri, dedektör başlıkları, pointer ve aksesuarlar satan bir dedektör mağazasıdır. Tüm cihazlar faturalı ve 2 yıl garantilidir; seri numarasıyla orijinallik sorgulanabilir. Satıştan önce uzman danışmanlık (WhatsApp ve görüntülü görüşme), 'Bana hangisi?' seçim sihirbazı ve showroomda deneme; satıştan sonra kurulum eğitimi ve teknik servis sunar.",
  },
  setup: { completed: false, completedSteps: [] },
};

export const getSettings = cache(async (): Promise<AllSettings> => {
  const rows = await db.select().from(settings);
  const out = structuredClone(DEFAULT_SETTINGS) as AllSettings;
  for (const r of rows) {
    const k = r.key as keyof AllSettings;
    if (k in out) (out as Record<string, unknown>)[k] = { ...(out[k] as object), ...(r.value as object) };
  }
  return out;
});

export async function saveSettings<K extends keyof AllSettings>(key: K, value: Partial<AllSettings[K]>) {
  const current = (await getSettings())[key];
  const merged = { ...current, ...value };
  await db
    .insert(settings)
    .values({ key, value: merged })
    .onConflictDoUpdate({ target: settings.key, set: { value: merged, updatedAt: new Date() } });
  return merged;
}

/** Herkese açık sayfalarda gizli anahtarları sızdırmamak için */
export function publicSettings(s: AllSettings) {
  return {
    store: s.store,
    shipping: {
      freeThreshold: s.shipping.freeThreshold,
      flatRate: s.shipping.flatRate,
      sameDayCutoff: s.shipping.sameDayCutoff,
      deliveryEstimate: s.shipping.deliveryEstimate,
      pickupEnabled: s.shipping.pickupEnabled,
      pickupAddress: s.shipping.pickupAddress,
    },
    payment: {
      cardEnabled: s.payment.cardEnabled,
      maxInstallment: s.payment.maxInstallment,
      noInterestInstallments: s.payment.noInterestInstallments,
      transferEnabled: s.payment.transferEnabled,
      transferDiscountPct: s.payment.transferDiscountPct,
    },
    integrations: { gaMeasurementId: s.integrations.gaMeasurementId, metaPixelId: s.integrations.metaPixelId },
    seo: s.seo,
  };
}
