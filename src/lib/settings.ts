import "server-only";
import { cache } from "react";
import { db } from "@/db";
import { and, asc, eq, sql } from "drizzle-orm";
import { brands, products, settings, translations } from "@/db/schema";

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
  /** Google Ads hesap kimlikleri, virgülle: AW-111,AW-222 */
  googleAdsIds: string;
  /** Satın alma dönüşüm hedefleri, virgülle: AW-111/AbCdEf */
  adsPurchaseLabels: string;
  /** İsteğe bağlı Google Tag Manager kapsayıcısı: GTM-XXXX */
  gtmId: string;
  metaPixelId: string;
  /** Meta Conversions API erişim anahtarı (sunucu tarafı satın alma bildirimi) */
  metaCapiToken: string;
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
  /** Pazaryerine stoktan bu kadar eksik gönderilir: senkron 15 dakikada bir olduğu için son cihaz iki kanalda birden satılmasın */
  marketplaceStockBuffer: number;
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

/** Vitrin önceliği: dağıtıcısı olunan markanın raflarda ağırlıklı görünmesi ve dönemsel sabit ürünler */
export type MerchWeight = "off" | "light" | "balanced" | "high";
export type MerchSettings = {
  /** Öncelikli markanın slug'ı (boş = kapalı) */
  focusBrand: string;
  weight: MerchWeight;
  /** Rafların başına sabitlenen ürünler; until (YYYY-MM-DD) geçince kendiliğinden düşer */
  pinned: { productId: string; until: string | null }[];
  /** Öncelikli marka ürünlerinde "Distribütör garantili" rozeti */
  badge: boolean;
  /** Marka kartındaki kısa not (ör. "Türkiye distribütörü"); boşsa gösterilmez. Sözleşmedeki ifadeyle aynı olmalı. */
  focusNote: string;
  /** Banner altındaki 3 kart: öncelikli markanın en yeni cihazları (otomatik) ya da paneldeki kampanya kartları */
  heroCards: "latest" | "banners";
  /** "Rafa yeni giren" büyük mavi kartında elle seçilen ürün; boşsa en son eklenen gösterilir */
  newSpotlight?: string | null;
  /**
   * "Bana hangisi?" sihirbazında öncelikli marka: priority = uyan öncelikli marka ürünleri hep üstte, diğerleri yalnızca
   * boşluk doldurur; only = yalnız öncelikli marka (uyan yoksa uzmana yönlendir); all = tarafsız.
   */
  wizard?: "priority" | "only" | "all";
};

/** Ana sayfada menü ile banner arasındaki kayan şerit */
export type TickerItem = { text: string; href: string; highlight: boolean };
export type TickerSettings = {
  enabled: boolean;
  items: TickerItem[];
  /** ltr: soldan sağa, rtl: sağdan sola */
  direction: "ltr" | "rtl";
  speed: "slow" | "normal" | "fast";
  theme: "soft" | "brand" | "dark" | "gold";
};

/** Ana sayfadaki "Ne arıyorsun?" yuvarlak kısayolları */
export type ShortcutIcon = "" | "star" | "trend" | "flame" | "tag" | "sparkles";
export type Shortcut = { label: string; href: string; image: string; icon: ShortcutIcon; featured: boolean };
/** Header / menü ayarları */
export type NavSettings = {
  shortcuts: Shortcut[];
  /** Marka menüsünün sağındaki kampanya kartı: auto = yayındaki ilk kampanya, custom = aşağıdaki alanlar, off = gizli */
  promo: { mode: "auto" | "custom" | "off"; eyebrow: string; title: string; href: string; image: string };
};

/** Diller: Türkçe her zaman açık; diğerleri admin > Ayarlar > Diller'den açılır */
export type I18nSettings = { locales: string[]; switcher: boolean };

/** Yapay zekâ (ürün içeriği oluşturucu): Anthropic Claude API */
export type AiSettings = { apiKey: string; model: string };

/** E-fatura / e-arşiv entegrasyonu */
export type EInvoiceSettings = {
  /** parasut: site faturayı Paraşüt'e gönderir; birfatura: BirFatura siparişleri siteden çeker */
  provider: "" | "parasut" | "birfatura";
  /** Otomatik kesim: ödeme alınınca ya da kargoya verilince (yalnızca Paraşüt; BirFatura kendi panelinden keser) */
  autoIssue: "off" | "paid" | "shipped";
  /** Ürün fiyatlarına dahil KDV oranı (ürün bazında oran girilmemişse) */
  vatRate: number;
  parasutCompanyId: string;
  parasutClientId: string;
  parasutClientSecret: string;
  parasutUsername: string;
  parasutPassword: string;
  /** BirFatura'nın her istekte "token" başlığında gönderdiği gizli anahtar (sitede üretilir) */
  birfaturaToken: string;
  birfaturaLastPullAt: string;
  birfaturaLastPullCount: number;
};

/** Güvenlik ve iç kontrol (Ayarlar > Güvenlik, yalnızca ekip yöneticisi) */
export type SecuritySettings = {
  /** Yönetici, para iadesi veya havale onayı yetkisi olanlar iki adımlı doğrulama açmadan panele giremez */
  require2fa: boolean;
  /** Haftalık "dikkat isteyen işlemler" e-postasının gideceği adres (boşsa mağaza e-postası) */
  digestEmail: string;
  /** Fiyat bu oranın üstünde düşürülürse onay istenir (%) */
  priceDropConfirmPct: number;
};

export type AllSettings = {
  store: StoreSettings;
  shipping: ShippingSettings;
  payment: PaymentSettings;
  integrations: IntegrationSettings;
  seo: SeoSettings;
  setup: SetupSettings;
  merch: MerchSettings;
  ticker: TickerSettings;
  nav: NavSettings;
  i18n: I18nSettings;
  security: SecuritySettings;
  ai: AiSettings;
  einvoice: EInvoiceSettings;
};

export const DEFAULT_SETTINGS: AllSettings = {
  store: {
    // Geçici, uydurma mağaza bilgileri (gerçek bir şirkete ait değildir); canlıya almadan panelden değiştirilmeli
    name: "Derinova Dedektör",
    legalName: "Derinova Elektronik Ticaret Ltd. Şti. (örnek)",
    phone: "0216 000 00 00",
    whatsapp: "905000000000",
    email: "info@derinova.example",
    address: "Örnek Mah. Deneme Cad. No: 1, Kadıköy / İstanbul",
    taxOffice: "",
    taxNumber: "",
    mersis: "",
    etbis: "",
    workingHours: "Hafta içi 09:00–19:00, Cumartesi 10:00–17:00",
    announcement: "Ücretsiz kargo · 3 aya kadar vade farksız taksit · Orijinal ürün, faturalı, 2 yıl garanti · 14 gün kolay iade",
    logoText: "Derinova Dedektör",
    city: "İstanbul",
    district: "Kadıköy",
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
      // Örnek hesap: gerçek IBAN değildir, canlıya almadan panelden değiştirilmeli
      { bank: "Örnek Bank", holder: "Derinova Elektronik Ticaret Ltd. Şti. (örnek)", iban: "TR00 0000 0000 0000 0000 0000 00" },
    ],
  },
  integrations: {
    gaMeasurementId: "",
    googleAdsIds: "",
    adsPurchaseLabels: "",
    gtmId: "",
    metaPixelId: "",
    metaCapiToken: "",
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
    marketplaceStockBuffer: 1,
    hbEnabled: false,
    hbMerchantId: "",
    hbUser: "",
    hbPass: "",
    hbPriceMarkupPct: 0,
  },
  seo: {
    // {markalar}: satıştaki markalar otomatik yazılır (katalogda olmayan marka vaat edilmesin)
    title: "Derinova Dedektör | {markalar} Dedektör Modelleri ve Fiyatları",
    description: "Türkiye'nin güvenilir dedektör mağazası Derinova Dedektör: {markalar} metal dedektörleri. Orijinal, faturalı, garantili; uzman desteğiyle doğru cihazı seç.",
    ogImage: "/demo/hero-equinox-900.jpg",
    googleVerification: "",
    bingVerification: "",
    yandexVerification: "",
    indexNowKey: "",
    aboutForAi:
      "Derinova Dedektör, İstanbul'da bulunan ve Türkiye geneline {markalar} metal dedektörleri, dedektör başlıkları, pointer ve aksesuarlar satan bir dedektör mağazasıdır. Tüm cihazlar faturalı ve 2 yıl garantilidir; seri numarasıyla orijinallik sorgulanabilir. Satıştan önce uzman danışmanlık (WhatsApp ve telefon), 'Bana hangisi?' seçim sihirbazı ve showroomda deneme; satıştan sonra kurulum eğitimi ve teknik servis sunar.",
  },
  setup: { completed: false, completedSteps: [] },
  // Markalar eşit: öncelikli marka kapalı, raflar satış ve yeniliğe göre doğal sırada (panelden açılabilir)
  merch: { focusBrand: "", weight: "off", pinned: [], badge: false, focusNote: "", heroCards: "latest", wizard: "all" },
  i18n: { locales: ["tr"], switcher: true },
  ai: { apiKey: "", model: "claude-sonnet-5-5" },
  einvoice: {
    provider: "",
    autoIssue: "off",
    vatRate: 20,
    parasutCompanyId: "",
    parasutClientId: "",
    parasutClientSecret: "",
    parasutUsername: "",
    parasutPassword: "",
    birfaturaToken: "",
    birfaturaLastPullAt: "",
    birfaturaLastPullCount: 0,
  },
  security: { require2fa: false, digestEmail: "", priceDropConfirmPct: 30 },
  ticker: {
    enabled: true,
    items: [
      { text: "Tüm markaların en yeni modelleri stoklarda", href: "/urunler?sirala=yeni", highlight: true },
      { text: "3 aya kadar vade farksız taksit", href: "", highlight: false },
      { text: "Seri numaranla orijinallik sorgula", href: "/seri-no", highlight: false },
      { text: "Hangi dedektör? Uzmanımıza WhatsApp'tan sor", href: "/iletisim", highlight: false },
    ],
    direction: "ltr",
    speed: "normal",
    theme: "soft",
  },
  nav: {
    shortcuts: [
      { label: "En Çok Satılan", href: "/urunler?sirala=cok-satan", image: "", icon: "trend", featured: true },
      { label: "Pointer", href: "/kategori/pointer", image: "", icon: "", featured: false },
      { label: "Altın Dedektörü", href: "/kategori/dogal-altin", image: "", icon: "", featured: false },
      { label: "Define ve Sikke", href: "/kategori/define-ve-sikke", image: "", icon: "", featured: false },
      { label: "Sualtı Dedektörü", href: "/kategori/sahil-ve-su-alti", image: "", icon: "", featured: false },
      { label: "Derin Arama", href: "/kategori/derin-arama", image: "", icon: "", featured: false },
      { label: "Başlık ve Aksesuar", href: "/kategori/baslik-ve-aksesuar", image: "", icon: "", featured: false },
      { label: "Yeni Gelenler", href: "/urunler?sirala=yeni", image: "", icon: "sparkles", featured: false },
      { label: "Tüm Markalar", href: "/markalar", image: "", icon: "", featured: false },
    ],
    promo: { mode: "auto", eyebrow: "", title: "", href: "", image: "" },
  },
};

/**
 * Gizli alanlar veritabanında AES-256-GCM ile şifreli tutulur (anahtar AUTH_SECRET'tan türetilir).
 * Veritabanı yedeği sızsa bile ödeme/SMS/pazaryeri parolaları okunamaz. Eski düz metin kayıtlar okunmaya devam eder,
 * ilk kaydetmede şifrelenir.
 */
const SECRET_FIELDS: Partial<Record<keyof AllSettings, string[]>> = {
  payment: ["iyzicoSecretKey", "paytrMerchantKey", "paytrMerchantSalt"],
  integrations: ["metaCapiToken", "smtpPass", "netgsmPass", "trendyolApiSecret", "hbPass", "eInvoiceApiKey", "cargoApiKey"],
  ai: ["apiKey"],
  einvoice: ["parasutClientSecret", "parasutPassword", "birfaturaToken"],
};

function mapSecrets(key: string, value: Record<string, unknown>, fn: (v: string) => string) {
  const fields = SECRET_FIELDS[key as keyof AllSettings];
  if (!fields) return value;
  const out = { ...value };
  for (const f of fields) if (typeof out[f] === "string" && out[f]) out[f] = fn(out[f] as string);
  return out;
}

export const getSettings = cache(async (): Promise<AllSettings> => {
  const { openSecret } = await import("./totp");
  const rows = (await db.select().from(settings)).map((r) => ({ ...r, value: mapSecrets(r.key, r.value as Record<string, unknown>, (v) => (v.startsWith("v1.") ? (openSecret(v) ?? "") : v)) }));
  const out = structuredClone(DEFAULT_SETTINGS) as AllSettings;
  for (const r of rows) {
    const k = r.key as keyof AllSettings;
    if (k in out) (out as Record<string, unknown>)[k] = { ...(out[k] as object), ...(r.value as object) };
  }
  // İngilizce sayfalar: panelde serbest yazılan mağaza metinlerinin çevirisi (translations, entity "text")
  const en = (await requestLocale()) === "en";
  if (en) await applyTextTranslations(out);
  const seo = out.seo;
  if ([seo.title, seo.description, seo.aboutForAi].some((x) => x?.includes(BRAND_TOKEN))) {
    const names = await activeBrandNames();
    const fill = (x: string, max: number) => fillBrands(x, names, max, en ? "and" : "ve");
    seo.title = fill(seo.title, 3);
    seo.description = fill(seo.description, 4);
    seo.aboutForAi = fill(seo.aboutForAi, 6);
  }
  return out;
});

export const BRAND_TOKEN = "{markalar}";

async function requestLocale() {
  const { getLocale } = await import("./i18n/server");
  return getLocale();
}

/** Çevrilebilen mağaza metinleri: anahtar → ayar alanı. Kayan duyurular "ticker:<metin>", kısayollar "nav:<etiket>" ile. */
async function applyTextTranslations(out: AllSettings) {
  const rows = await db
    .select({ k: translations.entityId, v: translations.value })
    .from(translations)
    .where(and(eq(translations.entity, "text"), eq(translations.locale, "en"), eq(translations.field, "value")));
  if (!rows.length) return;
  const m = new Map(rows.map((r) => [r.k, r.v]));
  const pick = (k: string, cur: string) => m.get(k) || cur;
  out.store.announcement = pick("store.announcement", out.store.announcement);
  out.store.workingHours = pick("store.workingHours", out.store.workingHours);
  out.seo.title = pick("seo.title", out.seo.title);
  out.seo.description = pick("seo.description", out.seo.description);
  out.seo.aboutForAi = pick("seo.aboutForAi", out.seo.aboutForAi);
  out.merch.focusNote = pick("merch.focusNote", out.merch.focusNote);
  out.ticker = { ...out.ticker, items: out.ticker.items.map((i) => ({ ...i, text: pick(`ticker:${i.text}`, i.text) })) };
  out.nav = { ...out.nav, shortcuts: out.nav.shortcuts.map((x) => ({ ...x, label: pick(`nav:${x.label}`, x.label) })) };
}

/** Panelde düzenlemek için SEO metinlerinin ham hali ({markalar} yer tutucusu korunur). */
export async function rawSeoTexts() {
  const [row] = await db.select().from(settings).where(eq(settings.key, "seo"));
  const v = { ...DEFAULT_SETTINGS.seo, ...((row?.value as Partial<AllSettings["seo"]>) ?? {}) };
  return { title: v.title, description: v.description, aboutForAi: v.aboutForAi };
}

/** Yayında ürünü olan markalar, panel sırasıyla (odak marka önde). */
export const activeBrandNames = cache(async (): Promise<string[]> => {
  const rows = await db
    .select({ name: brands.name })
    .from(brands)
    .innerJoin(products, and(eq(products.brandId, brands.id), eq(products.status, "ACTIVE")))
    .where(eq(brands.isActive, true))
    .groupBy(brands.id, brands.name, brands.sortOrder)
    .orderBy(asc(brands.sortOrder), sql`count(*) desc`);
  return rows.map((r) => r.name);
});

/** "{markalar}" yerine "A, B ve C" yazar; marka yoksa ifade boşluk bırakmadan düşer. */
export function fillBrands(text: string, names: string[], max = 4, and = "ve") {
  const n = names.slice(0, max);
  const list = n.length <= 1 ? (n[0] ?? "") : `${n.slice(0, -1).join(", ")} ${and} ${n[n.length - 1]}`;
  return text.split(BRAND_TOKEN).join(list).replace(/ {2,}/g, " ").replace(/ ([,.:])/g, "$1").trim();
}

export async function saveSettings<K extends keyof AllSettings>(key: K, value: Partial<AllSettings[K]>) {
  const current = (await getSettings())[key];
  const merged = { ...current, ...value };
  const { sealSecret } = await import("./totp");
  const stored = mapSecrets(key, merged as Record<string, unknown>, (v) => sealSecret(v));
  await db
    .insert(settings)
    .values({ key, value: stored })
    .onConflictDoUpdate({ target: settings.key, set: { value: stored, updatedAt: new Date() } });
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
    integrations: {
      gaMeasurementId: s.integrations.gaMeasurementId,
      googleAdsIds: s.integrations.googleAdsIds,
      adsPurchaseLabels: s.integrations.adsPurchaseLabels,
      gtmId: s.integrations.gtmId,
      metaPixelId: s.integrations.metaPixelId,
    },
    seo: s.seo,
  };
}
