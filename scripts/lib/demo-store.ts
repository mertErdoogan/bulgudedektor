/* Demo mağazanın kimliği (uydurma; gerçek bir şirkete ait değildir). Yalnızca demo seed ve ön izleme yükseltmesi yazar.
   Gerçek kurulumda (db:init) bunlar yüklenmez; mağaza sahibi kendi bilgilerini panelden girer. */
import type { BrandSettings, CatalogSettings, NavSettings, SeoSettings, StoreSettings, TickerSettings } from "../../src/lib/settings";

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

/** Dedektör sektör profili: ürün türü adı ve dedektöre özel modüller açık */
export const DEMO_CATALOG: CatalogSettings = { nounOne: "dedektör", nounAcc: "dedektörü", nounMany: "dedektörleri", nounOneEn: "detector", nounManyEn: "detectors", wizard: true, glossary: true, serial: true, service: true, detectorSpecs: true };

export const DEMO_TICKER: TickerSettings = {
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
};

export const DEMO_NAV_SHORTCUTS: NavSettings["shortcuts"] = [
    { label: "En Çok Satılan", href: "/urunler?sirala=cok-satan", image: "", icon: "trend", featured: true },
    { label: "Pointer", href: "/kategori/pointer", image: "", icon: "", featured: false },
    { label: "Altın Dedektörü", href: "/kategori/dogal-altin", image: "", icon: "", featured: false },
    { label: "Define ve Sikke", href: "/kategori/define-ve-sikke", image: "", icon: "", featured: false },
    { label: "Sualtı Dedektörü", href: "/kategori/sahil-ve-su-alti", image: "", icon: "", featured: false },
    { label: "Derin Arama", href: "/kategori/derin-arama", image: "", icon: "", featured: false },
    { label: "Başlık ve Aksesuar", href: "/kategori/baslik-ve-aksesuar", image: "", icon: "", featured: false },
    { label: "Yeni Gelenler", href: "/urunler?sirala=yeni", image: "", icon: "sparkles", featured: false },
    { label: "Tüm Markalar", href: "/markalar", image: "", icon: "", featured: false },
];

/** Demo Hakkımızda metni (genel şablonun yerine demo seed yazar) */
export const DEMO_ABOUT = {
  seoDescription: "Derinova Dedektör: metal dedektöründe uzman mağaza. İstanbul'da showroom, uzman danışmanlık ve teknik servis.",
  content: `<p><strong>Derinova Dedektör</strong>, metal dedektörü ve aksesuarlarında uzmanlaşmış bir mağazadır. Garrett, Minelab, Nokta, XP ve CoilTek ürünlerini orijinal, faturalı ve garantili olarak sunuyoruz.</p>
<h2>Neden Derinova?</h2>
<ul>
<li><strong>Orijinallik güvencesi:</strong> tüm cihazlar faturalı ve garantilidir, seri numarasıyla orijinallik sorgulanabilir.</li>
<li><strong>Uzman danışmanlık:</strong> aradığınız şeye ve arazinize göre doğru cihazı birlikte seçiyoruz; telefon, WhatsApp veya showroomda.</li>
<li><strong>Satış sonrası destek:</strong> kurulum ve kullanım eğitimi, yedek parça ve teknik servis.</li>
</ul>
<h2>Showroom</h2>
<p>{{adres}}<br>Telefon: {{telefon}} · WhatsApp: {{whatsapp}} · {{eposta}}</p>`,
};

/** Demo ödeme/teslimat farkları: örnek banka hesabı (gerçek IBAN değil) ve showroomdan teslim */
export const DEMO_BANK_ACCOUNTS = [{ bank: "Örnek Bank", holder: "Derinova Elektronik Ticaret Ltd. Şti. (örnek)", iban: "TR00 0000 0000 0000 0000 0000 00" }];
export const DEMO_PICKUP = { pickupEnabled: true, pickupAddress: "Örnek Mah. Deneme Cad. No: 1, Kadıköy / İstanbul (showroom)" };
