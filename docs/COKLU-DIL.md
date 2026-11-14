# Çoklu dil

## Nasıl çalışır
- Türkçe varsayılan dildir, adresleri ön eksizdir: `/urun/manticore`.
- Diğer diller ön ekle yayınlanır: `/en/urun/manticore`. Middleware ön eki kaldırıp aynı sayfayı `x-locale` başlığıyla çalıştırır; ayrı sayfa kopyası yoktur.
- Her sayfada `hreflang` (tr-TR, en, x-default) ve dilin kendi `canonical` adresi bulunur; site haritası iki dilin adreslerini içerir. `/tr/...` gelirse ön eksiz adrese kalıcı yönlendirilir.
- Dil admin'de kapalıysa `/en/...` adresleri Türkçe karşılığına yönlenir.

## Panel
- **Ayarlar > Diller:** hangi dillerin yayında olduğu ve dil seçicinin görünürlüğü.
- **Ürün** ve **kategori** düzenleme ekranlarında **Çeviriler** bölümü: ad, açıklamalar, SEO alanları. Boş alan sitede Türkçe görünür.

## Kod
- Arayüz metinleri: `src/lib/i18n/dict.ts` (`tr` asıl, `en` çeviri; eksik anahtar Türkçeye düşer).
  - Sunucu bileşeni: `const t = await getT(); t("card.addToCart")`
  - İstemci bileşeni: `const t = useT();`
  - Her ikisinde de kullanılan bileşen: `<T k="card.addToCart" />`
- Bağlantılar: mağaza tarafında `import Link from "@/components/locale-link"` (dil ön eki otomatik). Yönlendirme için `useLocaleRouter()`.
- İçerik çevirisi: `translations` tablosu; `localize(rows, "product")` / `localizeOne(row, "category")`.
- Yeni dil: `src/lib/i18n/config.ts` içindeki `LOCALES`e kodu ekle, `dict.ts`'e sözlüğünü ekle, paneldeki Diller'den aç.

## Henüz çevrilmeyenler (sırayla yapılacak)
- Ana sayfa bölümleri (banner metinleri, raflar, sihirbaz bandı, yorumlar), blog ve kurumsal sayfalar.
- Sepet sayfası ve ödeme formunun alan etiketleri, hesap/sipariş sayfaları, e-posta ve SMS şablonları.
- Marka, menü ve sayfa içeriklerinin panel çeviri alanları (tablo hazır: `brand`, `menu`, `page`).
- Teslimat tarihleri ("Pazartesi kargoda") ve sihirbaz soruları.
