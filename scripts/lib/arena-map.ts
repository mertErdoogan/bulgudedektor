/**
 * Eski arenadedektor.com (Efortek) adreslerinin yeni siteye karşılıkları.
 * Ürün ve blog adresleri aynı kaldığı için yönlendirme gerektirmez; burada kategori, marka ve sayfalar var.
 */

/** Yeni kategori ağacı (içe aktarma sırasında yoksa oluşturulur). */
export const CATEGORY_TREE: { slug: string; name: string; parent?: string; shortText?: string; sortOrder: number }[] = [
  { slug: "define-ve-sikke", name: "Define ve sikke", shortText: "Tarla, bağ, harabe", sortOrder: 1 },
  { slug: "dogal-altin", name: "Doğal altın", shortText: "Nugget, maden sahası", sortOrder: 2 },
  { slug: "sahil-ve-su-alti", name: "Sahil ve su altı", shortText: "Kayıp takı, dalış", sortOrder: 3 },
  { slug: "derin-arama", name: "Derin arama", shortText: "Büyük ve derin hedefler", sortOrder: 4 },
  { slug: "pointer", name: "Pointer", shortText: "Nokta tespiti", sortOrder: 5 },
  { slug: "baslik-ve-aksesuar", name: "Başlık ve aksesuar", shortText: "Bobin, kulaklık, batarya", sortOrder: 6 },
  { slug: "dedektor-basliklari", name: "Dedektör başlıkları", parent: "baslik-ve-aksesuar", shortText: "Arama bobinleri", sortOrder: 1 },
  { slug: "baslik-kapaklari", name: "Başlık kapakları", parent: "baslik-ve-aksesuar", shortText: "Bobin koruyucular", sortOrder: 2 },
  { slug: "dedektor-kulakliklari", name: "Kulaklıklar", parent: "baslik-ve-aksesuar", shortText: "Kablosuz ve su geçirmez", sortOrder: 3 },
  { slug: "batarya-ve-sarj", name: "Batarya, şarj ve kablolar", parent: "baslik-ve-aksesuar", shortText: "Pil, şarj, data kablosu", sortOrder: 4 },
  { slug: "guvenlik-dedektoru", name: "Güvenlik dedektörü", shortText: "El ve kapı tipi", sortOrder: 7 },
];

/** Eski kategori → yeni kategori (ürün eşlemesi için) */
export const OLD_CATEGORY_TO_NEW: Record<string, string> = {
  "define-dedektoru": "define-ve-sikke",
  "altin-dedektorleri": "dogal-altin",
  "su-alti-dedektorleri": "sahil-ve-su-alti",
  "derin-dedektorler": "derin-arama",
  "pointer-dedektorler": "pointer",
  "dedektor-basliklari": "dedektor-basliklari",
  "minelab-basliklar": "dedektor-basliklari",
  "coiltek-basliklar": "dedektor-basliklari",
  "nokta-basliklar": "dedektor-basliklari",
  "minelab-baslik-kapaklari": "baslik-kapaklari",
  "dedektor-kulakliklari": "dedektor-kulakliklari",
  "dedektor-bataryalari": "batarya-ve-sarj",
  "dedektor-sarj-kablosu": "batarya-ve-sarj",
  "dedektor-data-kablosu": "batarya-ve-sarj",
  "dedektor-aksesuarlari": "baslik-ve-aksesuar",
  "guvenlik-dedektoru": "guvenlik-dedektoru",
};

/** Eski marka kategorileri → marka */
export const OLD_BRAND_CATEGORY: Record<string, string> = {
  "minelab-dedektor": "minelab",
  "nokta-dedektor": "nokta",
  "garrett-dedektor": "garrett",
  "xp-dedektor": "xp",
};

/** Ürünün birincil kategorisi seçilirken öncelik (en özgül olan kazanır) */
export const CATEGORY_PRIORITY = ["pointer", "baslik-kapaklari", "dedektor-kulakliklari", "batarya-ve-sarj", "dedektor-basliklari", "baslik-ve-aksesuar", "guvenlik-dedektoru", "dogal-altin", "sahil-ve-su-alti", "derin-arama", "define-ve-sikke"];

/** Kullanım amacı filtreleri (ürün birden fazla kategoride olabilir) */
export const CATEGORY_USE_CASE: Record<string, string> = {
  "define-ve-sikke": "define",
  "dogal-altin": "altin",
  "sahil-ve-su-alti": "sahil",
  "derin-arama": "derin",
  pointer: "pointer",
};

/** Kalıcı (301) yönlendirmeler: eski adres → yeni adres */
export const LEGACY_REDIRECTS: [string, string][] = [
  ...Object.entries(OLD_BRAND_CATEGORY).map(([o, b]) => [`/kategori/${o}`, `/marka/${b}`] as [string, string]),
  ["/kategori/define-dedektoru", "/kategori/define-ve-sikke"],
  ["/kategori/altin-dedektorleri", "/kategori/dogal-altin"],
  ["/kategori/su-alti-dedektorleri", "/kategori/sahil-ve-su-alti"],
  ["/kategori/derin-dedektorler", "/kategori/derin-arama"],
  ["/kategori/pointer-dedektorler", "/kategori/pointer"],
  ["/kategori/minelab-basliklar", "/marka/minelab?kategori=dedektor-basliklari"],
  ["/kategori/coiltek-basliklar", "/marka/coiltek"],
  ["/kategori/nokta-basliklar", "/marka/nokta?kategori=dedektor-basliklari"],
  ["/kategori/minelab-baslik-kapaklari", "/kategori/baslik-kapaklari"],
  ["/kategori/dedektor-aksesuarlari", "/kategori/baslik-ve-aksesuar"],
  ["/kategori/dedektor-bataryalari", "/kategori/batarya-ve-sarj"],
  ["/kategori/dedektor-sarj-kablosu", "/kategori/batarya-ve-sarj"],
  ["/kategori/dedektor-data-kablosu", "/kategori/batarya-ve-sarj"],
  ["/kategori/2-el-dedektor-arama-basliklari-aksesuar", "/urunler"],
  ["/kategori/metal-dedektoru-modelleri-ve-fiyatlari-100-orij", "/urunler"],
  ["/kategori", "/urunler"],
  ["/sayfa/satis-sozlesmesi", "/sayfa/mesafeli-satis-sozlesmesi"],
  ["/sayfa/satis-sozlesmesi/sasoz", "/sayfa/mesafeli-satis-sozlesmesi"],
  ["/sayfa/uyelik-sozlesmesi/uysoz", "/sayfa/uyelik-sozlesmesi"],
  ["/sayfa/garanti-ve-iade-kosullari", "/sayfa/iade-ve-degisim"],
  ["/sayfa/garanti-ve-iade-kosullari/gaiad", "/sayfa/iade-ve-degisim"],
  ["/sayfa/kisisel-verilerin-korunmasi-hakkinda-bilgilendirme", "/sayfa/kvkk-aydinlatma-metni"],
  ["/sayfa/misyon-ve-vizyonumuz", "/sayfa/hakkimizda"],
  ["/sayfa/ek-iletisim-bilgileri", "/iletisim"],
  ["/sayfa/minelab-dokumanlar", "/marka/minelab"],
  ["/sayfa/sayfa-bulunamadi", "/"],
  ["/iletisim/bankahesap", "/sayfa/odeme-ve-teslimat"],
  ["/musterihizmetleri", "/iletisim"],
  ["/uye/giris", "/giris"],
  ["/uye/kayit", "/kayit"],
  ["/uye", "/hesabim"],
  ["/listeler/favori", "/favoriler"],
  ["/blog/kategori/dedektor", "/blog"],
  ["/blog/kategori/dedektor-kullanim-kilavuzlari", "/blog"],
  ["/blog/kategori/dedektor-alirken-nelere-dikkat-edilmeli-detayli", "/blog"],
];
