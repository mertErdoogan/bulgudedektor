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
};

export type ShippingSettings = {
  freeThreshold: number;
  flatRate: number;
  carriers: string[];
  defaultCarrier: string;
  sameDayCutoff: string;
  deliveryEstimate: string;
  pickupEnabled: boolean;
  pickupAddress: string;
  trackingUrlTemplate: Record<string, string>;
};

export type PaymentSettings = {
  cardEnabled: boolean;
  iyzicoApiKey: string;
  iyzicoSecretKey: string;
  iyzicoSandbox: boolean;
  maxInstallment: number;
  noInterestInstallments: number;
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
    name: "Bulgu Dedektör",
    legalName: "[ŞİRKET UNVANI]",
    phone: "",
    whatsapp: "",
    email: "",
    address: "",
    taxOffice: "",
    taxNumber: "",
    mersis: "",
    etbis: "",
    workingHours: "Hafta içi 09:00–20:00",
    announcement: "Ücretsiz kargo · 3 aya kadar vade farksız taksit · Orijinal ürün, faturalı, 2 yıl garanti · 14 gün kolay iade",
    logoText: "bulgu",
    city: "İstanbul",
    district: "",
    postalCode: "",
    latitude: "",
    longitude: "",
    openingHours: "Mo-Fr 09:00-20:00, Sa 10:00-18:00",
    foundingYear: "",
    priceRange: "₺₺₺",
    instagram: "",
    youtube: "",
    facebook: "",
    tiktok: "",
    x: "",
    linkedin: "",
    googleBusinessUrl: "",
    googleReviewUrl: "",
    sikayetvarUrl: "",
  },
  shipping: {
    freeThreshold: 0,
    flatRate: 0,
    carriers: ["Yurtiçi Kargo", "Aras Kargo", "MNG Kargo", "Sürat Kargo"],
    defaultCarrier: "Yurtiçi Kargo",
    sameDayCutoff: "15:00",
    deliveryEstimate: "1–3 iş günü",
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
    iyzicoApiKey: "",
    iyzicoSecretKey: "",
    iyzicoSandbox: true,
    maxInstallment: 12,
    noInterestInstallments: 3,
    transferEnabled: true,
    transferDiscountPct: 2,
    bankAccounts: [],
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
  },
  seo: {
    title: "Bulgu Dedektör — Orijinal metal dedektörleri, uzman desteğiyle",
    description: "Minelab, Garrett, Nokta, XP dedektörleri. Faturalı, 2 yıl garantili, 3 ay vade farksız. Sana uygun cihazı 6 soruda bul.",
    ogImage: "/demo/banner-gpz8000-clean.jpg",
    googleVerification: "",
    bingVerification: "",
    yandexVerification: "",
    indexNowKey: "",
    aboutForAi:
      "Bulgu Dedektör, Türkiye'de Minelab, Garrett, Nokta ve XP marka metal dedektörlerini yetkili distribütör garantisiyle satan bir mağazadır. Tüm cihazlar faturalı ve 2 yıl garantilidir; seri numarasıyla orijinallik sorgulanabilir. Satıştan önce uzman danışmanlık (WhatsApp ve görüntülü görüşme), 'Bana hangisi?' seçim sihirbazı ve showroomda deneme; satıştan sonra kurulum eğitimi ve teknik servis sunar.",
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
