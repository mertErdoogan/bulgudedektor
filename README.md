# Bulgu Dedektör — e-ticaret mağazası + yönetim paneli

Next.js 15 (App Router) · TypeScript · PostgreSQL + Drizzle ORM · Tailwind CSS · iyzico

Tek projede: müşteri mağazası (`/`), yönetim paneli (`/admin`), ödeme ve API'ler.

## Hızlı başlangıç (yerel)

```bash
cp .env.example .env            # DATABASE_URL ve AUTH_SECRET'ı doldur
npm install
npm run db:migrate              # tabloları oluşturur
npm run db:seed                 # DEMO veri (mevcut veriyi SİLER)
PAYMENT_SIMULATION=1 npm run dev
```

- Mağaza: http://localhost:3000
- Panel: http://localhost:3000/admin — `admin@bulgu.local` / `Bulgu123!`
  - Diğer roller (aynı şifre): `satis@`, `depo@`, `servis@bulgu.local`
- `PAYMENT_SIMULATION=1` iken iyzico anahtarı yoksa kart ödemesi test ekranıyla simüle edilir (sadece geliştirmede çalışır).

## Canlıya alma

1. PostgreSQL oluştur (Neon, Supabase, RDS, kendi sunucun…), `.env` değerlerini gir. `APP_URL` gerçek alan adı olmalı.
2. `npm ci && npm run db:migrate`
3. İlk yönetici: `ADMIN_EMAIL=sen@firma.com ADMIN_PASSWORD='en-az-10-karakter' npm run db:init` (demo veri yüklemez, tekrar çalıştırılabilir)
4. `npm run build && npm start` (Node 20+). Bir ters vekil (Nginx/Caddy) ile HTTPS ver.
5. Panelde **Kurulumu tamamla** listesini izle: mağaza bilgileri (ETBİS/MERSİS), iyzico, kargo, sözleşmeler, ekip.

**Görseller:** Yüklenen dosyalar `UPLOAD_DIR` klasörüne yazılır ve `/media/...` adresinden sunulur. Sunucusuz ortama (Vercel vb.) taşınacaksa `src/lib/storage.ts` S3/R2 sürücüsüyle değiştirilmeli; VPS/Docker'da kalıcı bir disk bağlamak yeterli.

### iyzico canlıya geçiş
1. iyzico üye işyeri panelinden **canlı** API ve gizli anahtarı al.
2. Admin › Ayarlar › Ödeme: anahtarları yapıştır, **Test modu**nu kapat, **Bağlantıyı test et**.
3. Vade farksız taksit kampanyasını iyzico panelinde de tanımla (sitedeki "3 ay vade farksız" yazısı ayarlardan gelir).
4. Ödeme akışı: sipariş `Ödeme bekliyor` olarak açılır → iyzico güvenli ödeme sayfası → `/api/odeme/iyzico` dönüşü ödemeyi iyzico'dan **sunucu tarafında doğrular** (tutar + sepet no) → sipariş `Yeni sipariş` olur. Tamamlanmayan kart ödemeleri 45 dk sonra otomatik iptal edilip stok geri eklenir.
5. İade/iptal: aynı gün ise iyzico iptali, sonra ise kalem bazında iade otomatik yapılır. Havale siparişlerinde para iadesi EFT ile manuel gönderilir (panel hatırlatır).

## Panel modülleri

| Modül | Ne yapar |
|---|---|
| Pano | Bekleyen işler (hazırlanacak, kargolanacak, mesaj, iade, servis, yorum), ciro/kâr, 30 günlük grafik, en çok satanlar, stok uyarısı |
| Siparişler | Durum sekmeleri, filtre, toplu işlem, paket fişi yazdırma, CSV; detayda sıradaki adım, seri no atama, kargo/takip no, iptal-iade (iyzico), adres düzenleme, müşteriye not, iç not; telefon/showroom siparişi oluşturma (satıcı indirim limitiyle) |
| İadeler | 14 gün kontrolü, onay + kargo kodu, ürün geldi, para iadesi, red |
| Kampanyalar | Kuponlu / otomatik; %, sabit tutar, kargo bedava; marka/kategori/ürün kapsamı; min sepet, üst limit, tarih, toplam ve kişi başı limit; ciro takibi |
| Ürünler | Liste + filtre + toplu işlem (yayınla, arşivle, vitrine al, % fiyat değiştir, sil); CSV indir / CSV ile toplu güncelle; ürün formu: görsel yükleme-sıralama, fiyat + canlı kâr marjı, stok, seri takibi, filtre/sihirbaz alanları, özellik tablosu, satış içeriği, video, SEO; kopyala; siparişi olan ürün silinmez, arşivlenir |
| Markalar / Kategoriler | Logo/görsel, açıklama, alt kategori, menüde göster, SEO |
| Stok ve seri no | Mal girişi, sayım, fire; seri no toplu giriş (barkod okuyucu uyumlu), durum değiştirme, hareket geçmişi, "gelince haber ver" listesi |
| Müşteriler (CRM) | Segmentler (alanlar, tekrar alanlar, uyuyanlar, VIP, izinliler), harcama/LTV, notlar, mesajlar, servis, adres; İYS izinli liste CSV; KVKK anonimleştirme |
| Mesajlar | Web formu + ürün soruları + kayda geçirilen WhatsApp/telefon; atama, durum, hazır yanıtlar |
| Servis | Kayıt → cihaz bekleniyor → tamirde → hazır → kargoda; garanti seri no'dan otomatik; müşteri adım adım görür |
| Yorum ve sorular | Onay, mağaza yanıtı, doğrulanmış alıcı işareti |
| Vitrin | Duyuru şeridi, banner (zamanlı, mobil görsel), ana sayfa bölümleri sırala/aç-kapa/başlık; sayfalar (Markdown/HTML); menüler; medya kütüphanesi |
| Raporlar | Dönem karşılaştırmalı ciro, sipariş, sepet, brüt kâr, indirim, iptal; marka/kategori, ürün kârlılığı, taksit dağılımı, iller, stok değeri, tekrar alma oranı; CSV |
| Ayarlar | Mağaza (ETBİS, MERSİS), kargo (ücret kuralı, firmalar, takip linkleri, showroom), ödeme (iyzico, taksit, havale + IBAN), entegrasyonlar (GA4, Meta Pixel, SMTP, e-fatura/kargo anahtarları), SEO |
| Ekip ve yetkiler | Kişi ekle/pasifleştir/şifre sıfırla, satış indirim limiti; rol bazlı 22 yetki, özel rol oluşturma; en az bir yönetici koruması |
| İşlem kayıtları | Kim, ne zaman, neyi değiştirdi (silinemez) |
| Kurulum | İlk girişte 7 adımlı kontrol listesi |

Yetkiler hem menüde gizlenir hem **sunucuda** zorunlu tutulur (sayfa, server action ve API ayrı ayrı kontrol eder). Maliyet/kâr sadece `products.cost`, ciro sadece `reports.finance` yetkisiyle görünür.

## Mağaza

Ana sayfa (panelden yönetilen bölümler), kategori/marka/arama (filtre: deneyim, marka, teknoloji, su geçirmezlik, bütçe, stok, ağırlık), ürün sayfası (galeri, taksit, havale indirimi, stok/kargo saati, WhatsApp ve görüntülü görüşme, deneme kiralaması, kimler için/bunu bekleme, özellikler, video, yorum, soru-cevap, gelince haber ver, JSON-LD), karşılaştırma, **Bana hangisi?** sihirbazı (6 soru → 3 gerekçeli öneri), sepet + kupon, tek sayfa ödeme (misafir veya üye, bireysel/kurumsal fatura, kargo/showroom, kart/havale), sipariş takip, hesabım (cihazlarım + garanti süresi, siparişler, iade talebi, servis kaydı, adresler, bilgiler), seri no orijinallik sorgusu, servis sorgusu, iletişim, kampanyalar, sözleşme sayfaları, sitemap/robots, mobil alt menü.

## E-posta

Admin › Ayarlar › Entegrasyonlar'da SMTP girilirse: sipariş onayı (havale bilgisiyle), yeni sipariş bildirimi, kargo/teslim/iptal bildirimleri ve "tekrar stokta" e-postaları gönderilir. SMTP yoksa uygulama normal çalışır, sadece e-posta gitmez.

## SEO ve AI arama görünürlüğü

Google, Google AI Overviews, ChatGPT Search, Perplexity ve Claude için hazır gelenler:

- **Doğrudan yanıt yapısı:** Ürün, kategori, marka ve blog sayfalarının üstünde 40–60 kelimelik "Kısa cevap" kutusu; soru biçiminde alt başlıklar; içindekiler; tablolar.
- **Yapılandırılmış veri (JSON-LD, tek @graph):** Organization (+sameAs), WebSite (+site içi arama), Store (yerel işletme, açılış saatleri, koordinat), Product (+Offer, kargo, 14 gün iade politikası, garanti, puan ve yorumlar), BreadcrumbList, ItemList, FAQPage, BlogPosting (yazar, tarih), DefinedTermSet (sözlük), Brand.
- **İçerik:** `/blog` rehberler, `/sss`, `/sozluk`, kategori rehber metinleri, ürün/kategori SSS'leri, ürün verisinden otomatik SSS.
- **Teknik:** canonical, Open Graph/Twitter, filtreli sayfalarda `noindex`, görselli sitemap, robots.txt (GPTBot, OAI-SearchBot, PerplexityBot, ClaudeBot, Google-Extended… açıkça izinli), `/llms.txt` ve `/llms-full.txt`, Google Merchant feed (`/feed/google.xml`), RSS (`/blog/rss.xml`), IndexNow, adres değişince otomatik 301 (`/admin/yonlendirmeler`).
- **Sosyal kanıt:** teslimattan sonra ürün yorumu + Google yorum daveti e-postası, footer'da sosyal profiller, `/admin/seo` sağlık skoru.

Canlıya aldıktan sonra yapılacaklar (panelden):

1. `APP_URL`'i gerçek alan adına ayarla ve **build'i bu değerle al** (canonical ve şema linkleri buna bağlı).
2. Ayarlar › SEO: Google Search Console, Bing Webmaster ve Yandex doğrulama kodları; IndexNow anahtarı üret. Search Console ve Bing'e `/sitemap.xml` gönder.
3. Ayarlar › Mağaza: adres, ilçe, koordinat, açılış saatleri, Google İşletme Profili ve yorum linki, sosyal profiller (Google İşletme Profili'ndeki ad-adres-telefonla birebir aynı).
4. Google Merchant Center'a `/feed/google.xml` ekle (ücretsiz Alışveriş listelemesi).
5. `/admin/seo`'daki eksikleri kapat; haftada 1–2 rehber yaz.

Var olan bir veritabanına örnek rehber/SSS/sözlük eklemek için (mevcut kayıtlara dokunmaz): `npm run db:seed-content`

## Henüz bağlanmayan dış servisler

Ayar alanları hazır ama entegrasyon kodu yazılmadı (her biri sağlayıcı seçimine bağlı):
- **SMS** (sipariş/kargo SMS'i) ve **İYS** bildirimi
- **e-Fatura / e-Arşiv** (Paraşüt, Logo vb.) — şu an fatura panel dışında kesilir
- **Kargo API** (otomatik barkod/takip no) — şu an takip no elle girilir
- **WhatsApp Business API** — şu an WhatsApp bağlantıları `wa.me` ile açılır, konuşmalar panele elle kaydedilir

## Proje yapısı

```
src/app/(store)/      mağaza sayfaları + server action'lar
src/app/admin/        panel (giriş, (panel)/… modüller, yazdır)
src/app/api/          iyzico dönüşü, dosya yükleme, CSV dışa aktarma
src/db/schema.ts      tüm tablolar (Drizzle)
src/lib/              auth, yetkiler, fiyat/kampanya motoru, sipariş akışı, iyzico, raporlar, ayarlar, e-posta
scripts/seed.ts       demo veri   ·   scripts/init.ts  canlı kurulum
drizzle/              migration dosyaları
```

Şema değişikliği: `src/db/schema.ts` düzenle → `npm run db:generate` → `npm run db:migrate`.
