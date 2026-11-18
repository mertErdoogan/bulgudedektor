# Ön izleme (preprod) ortamı — Render

`main` dalına gelen her commit birkaç dakika içinde ön izleme adresine otomatik yayınlanır.
Kurulum tek seferliktir, telefondan yapılabilir ve ücretsizdir.

## Ne kuruluyor (render.yaml) — ücretsiz

| Servis | Ne işe yarar | Ücret |
|---|---|---|
| `arena-onizleme` (web, Docker, Frankfurt, free) | Site + panel. Açılışta veritabanı göçlerini uygular. | 0 |
| `arena-db` (PostgreSQL 17, free) | Veritabanı | 0 |

Kart istemez. Ücretsiz planın sınırları:

- **Uyku:** 15 dakika kimse açmazsa site uyur; sonraki ilk açılış ~1 dakika sürer (sonra normal hızda).
- **Veritabanı 30 gün:** Render ücretsiz veritabanını 30 gün sonra siler (öncesinde e-postayla uyarır). O gün Render'da
  `arena-db`'yi silip Blueprint'i yeniden senkronlamak yeter; site açılışta boş veritabanına demo veriyi yeniden yükler.
- **Kalıcı disk yok:** panelden yüklenen görseller güncellemede/uykuda silinir (demo görseller etkilenmez).
- **Zamanlanmış işler yok:** cron ücretli olduğu için kurulmadı (ödeme zaman aşımı, sepet hatırlatma çalışmaz; ön izlemede sorun değil).
- **Derleme süresi:** aylık ücretsiz derleme dakikası sınırlıdır; her güncelleme ~8–10 dakika sürer.

Canlıya yakın bir ortam gerektiğinde `plan: starter`, `disk` ve cron eklenerek ücretli plana geçilir (~14–15 $/ay).

## Ön izleme modunun farkları (`PREPROD=1`)

- **Şifreli:** siteyi açınca tarayıcı kullanıcı adı/şifre sorar (kullanıcı adı `onizleme`, şifre kurulumda girdiğiniz `PREVIEW_PASSWORD`).
  `/api` altı açıktır (ödeme dönüşleri, cron, sağlık kontrolü kendi anahtarlarıyla korunur).
- **Google'a kapalı:** robots.txt her şeyi kapatır, her sayfada `X-Robots-Tag: noindex`. Asıl siteyle yarışmaz.
- **Sol altta "ÖN İZLEME" etiketi:** canlı siteyle karıştırılmasın.
- **Demo veri:** ilk açılışta veritabanı boşsa demo ürünler, bannerlar, yorumlar yüklenir. Sonraki güncellemelerde
  veriye dokunulmaz (panelde yaptığınız değişiklikler kalır).
- **Panel girişi:** `admin@derinova.local`, şifre kurulumda girdiğiniz `ADMIN_PASSWORD` (en az 10 karakter).
- **Ödeme test modunda:** kart ödemesi simülasyonla çalışır, gerçek para çekilmez (`PAYMENT_SIMULATION=force-test-only`).
  **Canlı sitede bu değişken asla olmamalı.**

## Kurulum (telefondan, ~10 dakika)

1. **render.com** → *Get Started* → **GitHub ile giriş yapın**.
2. **New +** → **Blueprint** → GitHub erişimine izin verin → `mertErdoogan/bulgudedektor` deposunu seçin.
3. Render `render.yaml` dosyasını okur ve site ile veritabanını listeler. İki değer sorar:
   - `PREVIEW_PASSWORD`: siteyi açarken istenecek şifre (ör. uzun ve tahmin edilmesi zor bir kelime grubu)
   - `ADMIN_PASSWORD`: panel şifresi (en az 10 karakter)
4. **Apply / Deploy Blueprint**. İlk derleme 8–12 dakika sürer.
5. Bittiğinde `arena-onizleme` servisine girin; üstte adres görünür (ör. `https://arena-onizleme.onrender.com`,
   isim alınmışsa sonuna ek gelir). Açın → `onizleme` / `PREVIEW_PASSWORD` ile girin.

## Sonrası: telefondan geliştirme

- Claude'a telefondan istediğiniz değişikliği yazın; Claude testleri çalıştırıp `main`'e commit/push eder.
- Render push'u görür, yeni sürümü derler ve yayına alır (genelde 5–8 dakika).
  **Derleme hata verirse eski sürüm yayında kalır**, site bozulmaz.
- Durumu Render uygulamasından ya da e-posta bildirimlerinden takip edebilirsiniz (*Settings → Notifications*).

## Sık sorulanlar

- **Demo veriyi baştan yüklemek:** Render → `arena-db` → *Shell* yerine en kolayı: veritabanını silip yeniden
  oluşturmak değil, panelden ürünleri düzenlemektir. Gerçekten sıfırlamak gerekirse Claude'dan isteyin.
- **Görseller kayboldu mu?** Ücretsiz planda disk kalıcı değil; panelden yüklenen görseller güncellemede silinir. Demo görseller kodla birlikte gelir, onlar kalır.
- **Gerçek siteye geçiş:** ön izleme denemeleri bitince `docs/KURULUM.md`'deki canlı kurulum yapılır;
  `PREPROD`, `SEED_DEMO` ve `PAYMENT_SIMULATION` değişkenleri canlıda **olmaz**.
