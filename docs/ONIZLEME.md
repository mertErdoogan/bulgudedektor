# Ön izleme (preprod) ortamı — Render

`main` dalına gelen her commit birkaç dakika içinde ön izleme adresine otomatik yayınlanır.
Kurulum tek seferliktir ve telefondan yapılabilir.

## Ne kuruluyor (render.yaml)

| Servis | Ne işe yarar | Aylık (yaklaşık) |
|---|---|---|
| `arena-onizleme` (web, Docker, Frankfurt) | Site + panel. Açılışta veritabanı göçlerini uygular. | 7 $ |
| 1 GB kalıcı disk (`/data`) | Panelden yüklenen görseller | 0,25 $ |
| `arena-db` (PostgreSQL 17, Basic-256mb) | Veritabanı | 6 $ |
| `arena-onizleme-cron` | 15 dakikada bir zamanlanmış işler | ~1 $ |

Toplam yaklaşık **14–15 $/ay**. Fiyatlar değişebilir; güncelini render.com/pricing'den kontrol edin.

## Ön izleme modunun farkları (`PREPROD=1`)

- **Şifreli:** siteyi açınca tarayıcı kullanıcı adı/şifre sorar (kullanıcı adı `arena`, şifre kurulumda girdiğiniz `PREVIEW_PASSWORD`).
  `/api` altı açıktır (ödeme dönüşleri, cron, sağlık kontrolü kendi anahtarlarıyla korunur).
- **Google'a kapalı:** robots.txt her şeyi kapatır, her sayfada `X-Robots-Tag: noindex`. Asıl siteyle yarışmaz.
- **Sol altta "ÖN İZLEME" etiketi:** canlı siteyle karıştırılmasın.
- **Demo veri:** ilk açılışta veritabanı boşsa demo ürünler, bannerlar, yorumlar yüklenir. Sonraki güncellemelerde
  veriye dokunulmaz (panelde yaptığınız değişiklikler kalır).
- **Panel girişi:** `admin@arenadedektor.local`, şifre kurulumda girdiğiniz `ADMIN_PASSWORD` (en az 10 karakter).
- **Ödeme test modunda:** kart ödemesi simülasyonla çalışır, gerçek para çekilmez (`PAYMENT_SIMULATION=force-test-only`).
  **Canlı sitede bu değişken asla olmamalı.**

## Kurulum (telefondan, ~10 dakika)

1. **render.com** → *Get Started* → **GitHub ile giriş yapın**.
2. Sağ üst menü → **Billing** → kart ekleyin (disk ve kalıcı servis ücretli plan ister).
3. **New +** → **Blueprint** → GitHub erişimine izin verin → `mertErdoogan/bulgudedektor` deposunu seçin.
4. Render `render.yaml` dosyasını okur ve 3 servisi listeler. İki değer sorar:
   - `PREVIEW_PASSWORD`: siteyi açarken istenecek şifre (ör. uzun ve tahmin edilmesi zor bir kelime grubu)
   - `ADMIN_PASSWORD`: panel şifresi (en az 10 karakter)
5. **Apply / Deploy Blueprint**. İlk derleme 8–12 dakika sürer.
6. Bittiğinde `arena-onizleme` servisine girin; üstte adres görünür (ör. `https://arena-onizleme.onrender.com`,
   isim alınmışsa sonuna ek gelir). Açın → `arena` / `PREVIEW_PASSWORD` ile girin.

## Sonrası: telefondan geliştirme

- Claude'a telefondan istediğiniz değişikliği yazın; Claude testleri çalıştırıp `main`'e commit/push eder.
- Render push'u görür, yeni sürümü derler ve yayına alır (genelde 5–8 dakika).
  **Derleme hata verirse eski sürüm yayında kalır**, site bozulmaz.
- Durumu Render uygulamasından ya da e-posta bildirimlerinden takip edebilirsiniz (*Settings → Notifications*).

## Sık sorulanlar

- **Demo veriyi baştan yüklemek:** Render → `arena-db` → *Shell* yerine en kolayı: veritabanını silip yeniden
  oluşturmak değil, panelden ürünleri düzenlemektir. Gerçekten sıfırlamak gerekirse Claude'dan isteyin.
- **Görseller kayboldu mu?** Panelden yüklenen görseller kalıcı diskte (`/data/uploads`) durur, güncellemede silinmez.
- **Gerçek siteye geçiş:** ön izleme denemeleri bitince `docs/KURULUM.md`'deki canlı kurulum yapılır;
  `PREPROD`, `SEED_DEMO` ve `PAYMENT_SIMULATION` değişkenleri canlıda **olmaz**.
