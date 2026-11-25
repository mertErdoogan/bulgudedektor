/* Demo mağazanın kimliği (uydurma; gerçek bir şirkete ait değildir). Yalnızca demo seed ve ön izleme yükseltmesi yazar.
   Gerçek kurulumda (db:init) bunlar yüklenmez; mağaza sahibi kendi bilgilerini panelden girer. */
import type { BrandSettings, SeoSettings, StoreSettings } from "../../src/lib/settings";

export const DEMO_STORE: StoreSettings = {
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
};

export const DEMO_SEO: SeoSettings = {
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
};

export const DEMO_BRAND: BrandSettings = {
  logoUrl: "/brand/logo.svg",
  logoWhiteUrl: "/brand/logo-white.svg",
  iconUrl: "/brand/icon.svg",
  color: "#d42e1e",
};
