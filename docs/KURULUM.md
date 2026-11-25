# Canlıya alma ve eski siteden geçiş

Bu belge, sitenin bir müşteri için sunucuda yayına alınmasını ve (varsa) eski sistemdeki müşterilerin yeni siteye taşınmasını adım adım anlatır. Müşteri başına iş akışı ve teslim adımları: [teslim/KURULUM-MUSTERI.md](teslim/KURULUM-MUSTERI.md).

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
git clone <MUSTERI-REPO-ADRESI> magaza && cd magaza   # müşteri için açılan kopya (bkz. teslim/KURULUM-MUSTERI.md)
cp .env.example .env
nano .env
```

`.env` içinde en az şunları doldurun:

| Değişken | Açıklama |
|---|---|
| `DOMAIN` | `www.magazam.com` |
| `APEX_DOMAIN` | (isteğe bağlı) `magazam.com`: www'ya yönlendirilir |
| `APP_URL` | `https://www.magazam.com` |
| `POSTGRES_PASSWORD` | `openssl rand -hex 24` çıktısı |
| `AUTH_SECRET` | `openssl rand -base64 48` çıktısı. **Bir kez belirleyip değiştirmeyin:** değişirse herkesin oturumu kapanır, 2FA anahtarları geçersizleşir ve panelde şifreli saklanan ödeme/SMS/pazaryeri parolalarının yeniden girilmesi gerekir. |
| `CRON_SECRET` | `openssl rand -hex 24` çıktısı |
| `S3_PUBLIC_URL` | Yalnızca görselleri S3/R2'de tutacaksanız. Derleme anında da gerekir (görsel küçültme izni), `docker compose` bunu otomatik geçirir. |

Saat dilimi imajda `TZ=Europe/Istanbul` olarak ayarlıdır; "bugünkü satış", günlük rapor ve kargo kesim saati İstanbul saatine göre hesaplanır. Docker dışında kurarsanız sunucuda da `TZ=Europe/Istanbul` tanımlayın.

```bash
docker compose up -d --build
# İlk yönetici + roller + yasal sayfalar + eski adres yönlendirmeleri
docker compose exec -e ADMIN_EMAIL=sahip@magazam.com -e ADMIN_PASSWORD='EnAz10Karakter!' app npm run db:init
```

Caddy, Let's Encrypt sertifikasını kendiliğinden alır. `https://www.magazam.com/admin/giris` ile girip **Kurulum** sayfasındaki adımları izleyin (Marka, Katalog/sektör, mağaza bilgileri, ödeme, kargo, sözleşmeler, ekip).

Servisler:
- `app`: site ve panel (açılışta veritabanı göçlerini otomatik uygular)
- `db`: PostgreSQL 17 (veriler `pgdata` biriminde)
- `caddy`: HTTPS ve `APEX_DOMAIN → DOMAIN` yönlendirmesi
- `cron`: 15 dakikada bir zamanlanmış işler (ödeme zaman aşımı, sepet hatırlatma, yorum daveti, Trendyol senkronu)
- `backup`: her gece 03:30 veritabanı yedeği (`deploy/backup.sh`), pazar günleri yüklenen görseller de. `./backups` klasöründe 14 gün saklanır.
  `.env` içinde `BACKUP_S3_BUCKET` (+ uç nokta ve anahtarlar) tanımlıysa **her gece kendiliğinden sunucu dışına** (Cloudflare R2 / S3) kopyalanır ve orada 30 gün saklanır.
  Tanımlı değilse yedek yalnızca sunucuda durur: sunucu bozulursa yedek de gider. Canlıya geçmeden mutlaka tanımlayın.

### Yedekten geri dönüş (ayda bir deneyin)

Yedeğin işe yaradığını ancak geri yükleyerek anlarsınız. Ayda bir, canlıya dokunmadan deneyin:

```sh
# 1) Son yedeği seç
ls -lh backups/
# 2) Geçici bir veritabanına yükle (canlı veritabanı "magaza", deneme "magaza_test")
docker compose exec db createdb -U magaza magaza_test
docker compose exec -T db pg_restore -U magaza -d magaza_test --no-owner < backups/magaza-YYYY-AA-GG.dump
# 3) Kontrol et: sipariş ve seri no sayıları canlıyla aynı mı?
docker compose exec db psql -U magaza -d magaza_test -c "select count(*) from orders; select count(*) from serial_numbers;"
# 4) Denemeyi sil
docker compose exec db dropdb -U magaza magaza_test
```

Gerçek bir felakette (veritabanı bozuldu): siteyi bakıma al, `magaza` veritabanını silip aynı `pg_restore` komutuyla son yedeği yükle, `docker compose up -d` ile aç.

### "Site çöktü" uyarısı

`/api/health` adresi sunucu ve veritabanı ayaktaysa 200 döner. Ücretsiz bir izleme servisinde (ör. UptimeRobot, Better Stack) bu adresi
5 dakikada bir kontrol eden bir izleme açın ve uyarıyı sahibin telefonuna (SMS/e-posta) yönlendirin.

Güncelleme: `git pull && docker compose up -d --build`

## 3. Veri aktarımı

### 3.1 Müşteriler

Eski sistemden üye listesini Excel olarak indirin, **Farklı kaydet → CSV UTF-8** ile kaydedin. Panel → Müşteriler → **İçe aktar**. Şifreler taşınamaz; müşteriler ilk girişte "Şifremi unuttum" ile yeni şifre belirler. Ticari ileti izinlerini yalnızca eski sitede açıkça alındığından eminseniz aktarın.

### 3.2 Alan adını taşıma günü

1. Yeni siteyi geçici bir alt alan adında (ör. `yeni.magazam.com`) kurup kontrol edin.
2. `.env`'de `DOMAIN` ve `APP_URL`'i asıl adrese çevirin, `docker compose up -d`.
3. DNS'te `www` ve `@` kayıtlarını yeni sunucuya yönlendirin (TTL'i bir gün önceden 300'e düşürün).
4. Google Search Console'da site haritasını (`/sitemap.xml`) yeniden gönderin; Panel → Yönlendirmeler sayfasının üstündeki **Bulunamayan adresler (404)** listesini ilk iki hafta her gün kontrol edin; çok denenenlere yeni adres yazıp kaydedin.

## 4. Dış servisler (hesap açılması gerekenler)

Bu servislerin entegrasyon kodu hazırdır; hesapları **mağaza sahibinin firması adına** açıp anahtarları **Panel → Ayarlar** sayfasına girmeniz yeterlidir. Geliştirici kendi adına hesap açmaz (ödeme, fatura ve KVKK sorumluluğu mağazadadır).

| Servis | Nerede | Not |
|---|---|---|
| iyzico | Ayarlar → Ödeme | Önce "Test modu" açıkken iyzico test kartlarıyla (ör. 5528 7900 0000 0008, son kullanma ileri tarih, CVC 123) sipariş verin, iadeyi deneyin; sonra canlı anahtarlarla test modunu kapatın. Kayıtlı kart özelliği için iyzico'dan "kart saklama" yetkisi isteyin. |
| PayTR (iyzico yerine) | Ayarlar → Ödeme | Kartla ödeme kuruluşu olarak PayTR seçilip mağaza no / parola / gizli anahtar girilir. PayTR panelinde **Bildirim URL** = `https://ALAN-ADI/api/odeme/paytr` olmalı. Sağlayıcı değişse de eski siparişlerin iadesi ödendiği kuruluştan yapılır. |
| E-posta (SMTP) | Ayarlar → Entegrasyonlar | Yandex/Google Workspace/Zoho. SPF, DKIM ve DMARC kayıtlarını DNS'e ekleyin, yoksa e-postalar gereksiz klasörüne düşer. |
| Netgsm SMS | Ayarlar → Entegrasyonlar | Netgsm panelinde API yetkili alt kullanıcı açın, gönderici başlığını onaylatın. Test SMS'i düğmesiyle deneyin. |
| İYS | — | Ticari SMS/e-posta göndermeden önce İYS'ye kayıt olun. Panel → Müşteriler → "İYS listesi" ile izinleri toplu yükleyebileceğiniz dosyayı alın. |
| e-Arşiv fatura | Sipariş detayı → Fatura ekle | Faturayı entegratörünüzde (Paraşüt, Uyumsoft, Logo vb.) kesip PDF'ini siparişe yükleyin; müşteriye otomatik e-posta gider. |
| Trendyol | Ayarlar → Entegrasyonlar | Satıcı panelinden API bilgilerini alın. Ürünler barkodla eşleşir; ürün kartlarını önce Trendyol panelinde açın. Siparişler her 15 dakikada siteye düşer ve stoktan düşülür. |
| Hepsiburada | Ayarlar → Entegrasyonlar | Satıcı panelinden (HMS) API kullanıcı adı/şifresi ve Merchant ID alın. Ürünler **satıcı stok kodu = sitedeki SKU** ile eşleşir. Test ortamı için `.env`'e `HB_SANDBOX=1` yazın. |
| Google Analytics 4 | Ayarlar → Entegrasyonlar | Eski sitenin ölçüm kimliği (`G-…`) varsa aynısını girin; aynı mülk kullanılırsa geçmiş veriler korunur. E-ticaret olayları otomatik gider: `view_item`, `add_to_cart`, `begin_checkout`, `purchase`, `search`, `contact` (WhatsApp/telefon tıklaması). GA4 → Yönetici → Etkinlikler'de `purchase` ve `contact` olaylarını **anahtar etkinlik** yapın. |
| Google Ads | Ayarlar → Entegrasyonlar | Hesap kimliklerini (`AW-…`) ve Google Ads → Hedefler → Dönüşümler'deki satın alma dönüşümünün **etiketini** (`AW-…/…`) girin; satış değeri ve sipariş no ile gider (mükerrer sayılmaz). WhatsApp tıklamasını da dönüşüm saymak için GA4'teki `contact` anahtar etkinliğini Google Ads'e içe aktarın. Consent Mode v2 sinyalleri çerez tercihine göre otomatik gönderilir. |
| Meta Pixel + Conversions API | Ayarlar → Entegrasyonlar | Pixel ID ve (önerilir) Conversions API anahtarı: Events Manager → Veri kaynakları → Ayarlar → "Erişim anahtarı oluştur". Satın alma hem tarayıcıdan hem sunucudan aynı olay kimliğiyle gider; Meta tek sayar. Test için `.env`'e `META_TEST_EVENT_CODE=TEST…` yazıp Events Manager → Test olayları'nda izleyin. |
| Google Merchant Center / Meta katalog | — | Ürün akışları: `/feed/google.xml`, `/feed/meta.xml`. Merchant Center'da "Planlanmış getirme" ile günlük çekin. |
| Google Search Console | Ayarlar → SEO | Doğrulama kodunu girin; site haritası `/sitemap.xml` (ürün görselleri dahil). |

## 5. Güvenlik kontrol listesi

- Yönetici hesaplarında **iki adımlı doğrulamayı** açın (sağ üstte adınıza tıklayın → Hesabım).
- `AUTH_SECRET`, `CRON_SECRET`, `POSTGRES_PASSWORD` değerlerini kimseyle paylaşmayın; `.env` git'e girmez.
- Sunucuda yalnızca 22, 80, 443 portlarını açın (`ufw allow OpenSSH && ufw allow 80,443/tcp && ufw enable`).
- Yasal metinleri (Sayfalar) bir hukukçuya kontrol ettirin; Ayarlar → Mağaza'da vergi dairesi/no, MERSİS ve ETBİS numarasını girin, metinlerde otomatik görünür.
