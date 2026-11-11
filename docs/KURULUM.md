# Canlıya alma ve eski siteden geçiş

Bu belge, sitenin bir sunucuda yayına alınmasını ve arenadedektor.com (Efortek) üzerindeki ürünlerin, blog yazılarının ve müşterilerin yeni siteye taşınmasını adım adım anlatır.

## 1. Sunucu seçimi

| Seçenek | Uygun olduğu durum | Aylık maliyet (yaklaşık) |
|---|---|---|
| **Tek VPS + Docker (önerilen)** | Tüm kontrol sizde; görseller sunucu diskinde | Hetzner CX22 / DigitalOcean 2 GB: 5–12 € |
| Vercel + yönetilen PostgreSQL + Cloudflare R2 | Sunucu bakımı istemiyorsanız | Vercel Pro 20 $ + Neon/Supabase 0–25 $ + R2 ~0–5 $ |

Türkiye'den erişim hızı için İstanbul/Frankfurt bölgesi seçin. KVKK açısından yurt dışı sunucu kullanıyorsanız aydınlatma metnindeki "yurt dışına aktarım" maddesi zaten bu durumu kapsar; yine de hukukçunuza teyit ettirin.

## 2. Docker ile kurulum (VPS)

Gereken: Ubuntu 24.04, alan adının A kaydı sunucunun IP'sine yönlendirilmiş olmalı.

```bash
# Sunucuda
curl -fsSL https://get.docker.com | sh
git clone https://github.com/mertErdoogan/bulgudedektor.git arena && cd arena
cp .env.example .env
nano .env
```

`.env` içinde en az şunları doldurun:

| Değişken | Açıklama |
|---|---|
| `DOMAIN` | `www.arenadedektor.com` |
| `APP_URL` | `https://www.arenadedektor.com` |
| `POSTGRES_PASSWORD` | `openssl rand -hex 24` çıktısı |
| `AUTH_SECRET` | `openssl rand -base64 48` çıktısı (değiştirirseniz herkesin oturumu kapanır, 2FA anahtarları geçersizleşir) |
| `CRON_SECRET` | `openssl rand -hex 24` çıktısı |

```bash
docker compose up -d --build
# İlk yönetici + roller + yasal sayfalar + eski adres yönlendirmeleri
docker compose exec -e ADMIN_EMAIL=siz@arenadedektor.com -e ADMIN_PASSWORD='EnAz10Karakter!' app npm run db:init
```

Caddy, Let's Encrypt sertifikasını kendiliğinden alır. `https://www.arenadedektor.com/admin/giris` ile girip **Kurulum** sayfasındaki adımları izleyin.

Servisler:
- `app`: site ve panel (açılışta veritabanı göçlerini otomatik uygular)
- `db`: PostgreSQL 17 (veriler `pgdata` biriminde)
- `caddy`: HTTPS ve `arenadedektor.com → www` yönlendirmesi
- `cron`: 15 dakikada bir zamanlanmış işler (ödeme zaman aşımı, sepet hatırlatma, yorum daveti, Trendyol senkronu)
- `backup`: her gece 03:30 veritabanı yedeği, `./backups` klasörüne, 14 gün saklanır. Bu klasörü haftada bir sunucu dışına (ör. Google Drive, R2) kopyalayın.

Güncelleme: `git pull && docker compose up -d --build`

## 3. Eski siteden (Efortek) veri aktarımı

### 3.1 Ürünler, görseller, blog yazıları

İçe aktarma betiği eski sitenin herkese açık sayfalarını okur: site haritası → kategori sayfaları → ürün sayfaları. Ürün adresleri (`/urun/...`) ve blog adresleri **aynen korunur**, böylece Google'daki sıralamalar ve dış bağlantılar kaybolmaz. Kategori ve sayfa adresleri değiştiği için 301 yönlendirmeleri otomatik eklenir.

```bash
# Önce deneme: sadece okur, data/arena-snapshot.json dosyasına yazar
docker compose exec app npm run import:arena -- --dry

# Gerçek aktarım (görselleri indirip kendi sunucumuza alır)
docker compose exec app npm run import:arena

# Demo ürünleri arşive almak için (yalnızca ilk kurulumda, demo veri yüklediyseniz)
docker compose exec app npm run import:arena -- --from data/arena-snapshot.json --archive-demo
```

Diğer seçenekler: `--limit 5` (deneme), `--hotlink` (görselleri indirmeden eski adresten göster; geçici), `--update-stock`, `--refresh-images`, `--publish-posts`.

Aktarım sonrası yapılması gerekenler:
1. **Stoklar:** Efortek yalnızca "var/yok" gösterdiği için stokta olan ürünlere geçici olarak **5 adet** yazılır. Panel → Stok sayfasından gerçek adetleri girin.
2. **Blog yazıları** taslak olarak gelir; Panel → Blog'dan gözden geçirip yayınlayın.
3. **Kampanyalı ürünler** (ör. "Pro Find 15 hediye") açıklamanın başına not olarak ve "Hediyeli" rozetiyle gelir. Hediyeyi otomatik sepete eklemek isterseniz Panel → Kampanyalar'dan kural tanımlayın.
4. **Teknik özellikler** (teknoloji, su geçirmezlik) ürün adı ve açıklamadan tahmin edilir; kontrol edin.
5. **Varyantlar:** Aynı modelin farklı paketlerini ürün formundaki "Varyant grubu" alanına aynı kodu yazarak birbirine bağlayın.

### 3.2 Müşteriler

Efortek yönetim panelinden üye listesini Excel olarak indirin, **Farklı kaydet → CSV UTF-8** ile kaydedin. Panel → Müşteriler → **İçe aktar**. Şifreler taşınamaz; müşteriler ilk girişte "Şifremi unuttum" ile yeni şifre belirler. Ticari ileti izinlerini yalnızca eski sitede açıkça alındığından eminseniz aktarın.

### 3.3 Alan adını taşıma günü

1. Yeni siteyi geçici bir alt alan adında (ör. `yeni.arenadedektor.com`) kurup aktarımı yapın, kontrol edin.
2. `.env`'de `DOMAIN` ve `APP_URL`'i asıl adrese çevirin, `docker compose up -d`.
3. DNS'te `www` ve `@` kayıtlarını yeni sunucuya yönlendirin (TTL'i bir gün önceden 300'e düşürün).
4. Google Search Console'da site haritasını (`/sitemap.xml`) yeniden gönderin; Panel → SEO → Yönlendirmeler'de 404 alan eski adresleri takip edin.
5. Aynı gün son bir `npm run import:arena -- --dry` alın; fiyat değişiklikleri için `npm run import:arena -- --from data/arena-snapshot.json` (stoklara dokunmaz).

## 4. Dış servisler (hesap açılması gerekenler)

Bu servislerin entegrasyon kodu hazırdır; hesapları firma adına açıp anahtarları **Panel → Ayarlar** sayfasına girmeniz yeterlidir.

| Servis | Nerede | Not |
|---|---|---|
| iyzico | Ayarlar → Ödeme | Önce "Test modu" açıkken iyzico test kartlarıyla (ör. 5528 7900 0000 0008, son kullanma ileri tarih, CVC 123) sipariş verin, iadeyi deneyin; sonra canlı anahtarlarla test modunu kapatın. Kayıtlı kart özelliği için iyzico'dan "kart saklama" yetkisi isteyin. |
| PayTR (iyzico yerine) | Ayarlar → Ödeme | Eski site PayTR kullanıyor. Kartla ödeme kuruluşu olarak PayTR seçilip mağaza no / parola / gizli anahtar girilir. PayTR panelinde **Bildirim URL** = `https://ALAN-ADI/api/odeme/paytr` olmalı. Sağlayıcı değişse de eski siparişlerin iadesi ödendiği kuruluştan yapılır. |
| E-posta (SMTP) | Ayarlar → Entegrasyonlar | Yandex/Google Workspace/Zoho. SPF, DKIM ve DMARC kayıtlarını DNS'e ekleyin, yoksa e-postalar gereksiz klasörüne düşer. |
| Netgsm SMS | Ayarlar → Entegrasyonlar | Netgsm panelinde API yetkili alt kullanıcı açın, gönderici başlığını onaylatın. Test SMS'i düğmesiyle deneyin. |
| İYS | — | Ticari SMS/e-posta göndermeden önce İYS'ye kayıt olun. Panel → Müşteriler → "İYS listesi" ile izinleri toplu yükleyebileceğiniz dosyayı alın. |
| e-Arşiv fatura | Sipariş detayı → Fatura ekle | Faturayı entegratörünüzde (Paraşüt, Uyumsoft, Logo vb.) kesip PDF'ini siparişe yükleyin; müşteriye otomatik e-posta gider. |
| Trendyol | Ayarlar → Entegrasyonlar | Satıcı panelinden API bilgilerini alın. Ürünler barkodla eşleşir; ürün kartlarını önce Trendyol panelinde açın. Siparişler her 15 dakikada siteye düşer ve stoktan düşülür. |
| Hepsiburada | Ayarlar → Entegrasyonlar | Satıcı panelinden (HMS) API kullanıcı adı/şifresi ve Merchant ID alın. Ürünler **satıcı stok kodu = sitedeki SKU** ile eşleşir. Test ortamı için `.env`'e `HB_SANDBOX=1` yazın. |
| Google Analytics / Meta Pixel | Ayarlar → Entegrasyonlar | Çerez onayı verildikten sonra çalışır. Meta katalog akışı: `/feed/meta.xml`, Google Merchant: `/feed/google.xml`. |

## 5. Güvenlik kontrol listesi

- Yönetici hesaplarında **iki adımlı doğrulamayı** açın (sağ üstte adınıza tıklayın → Hesabım).
- `AUTH_SECRET`, `CRON_SECRET`, `POSTGRES_PASSWORD` değerlerini kimseyle paylaşmayın; `.env` git'e girmez.
- Sunucuda yalnızca 22, 80, 443 portlarını açın (`ufw allow OpenSSH && ufw allow 80,443/tcp && ufw enable`).
- Yasal metinleri (Sayfalar) bir hukukçuya kontrol ettirin; Ayarlar → Mağaza'da vergi dairesi/no, MERSİS ve ETBİS numarasını girin, metinlerde otomatik görünür.
