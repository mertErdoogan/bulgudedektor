# Yeni müşteri için kurulum (geliştirici)

Bu belge, siteyi **bir mağaza sahibine** kurup teslim etmenin adımlarını anlatır. Model: **her müşteriye ayrı kurulum** (ayrı sunucu, ayrı veritabanı, ayrı alan adı). Sunucu kurulumunun teknik ayrıntıları: [../KURULUM.md](../KURULUM.md).

> İlke: Mağazanın parasını, verisini ve yasal yükümlülüğünü taşıyan **her hesap mağaza sahibinin adına açılır.** Geliştirici bu hesaplara yalnızca sahibin verdiği yetkiyle ve kendi ayrı kullanıcısıyla girer. Bu hem sizi korur (ödeme/KVKK sorumluluğu sizde kalmaz) hem de sahibin sizden bağımsız olarak devam edebilmesini sağlar.

## 0. Sözleşme ve ön bilgi (kurulumdan önce)

- [ ] Lisans sözleşmesi ve (isteniyorsa) bakım-destek sözleşmesi imzalandı: [SOZLESME-LISANS.md](SOZLESME-LISANS.md), [SOZLESME-BAKIM-DESTEK.md](SOZLESME-BAKIM-DESTEK.md)
- [ ] Mağaza bilgileri alındı: unvan, vergi dairesi/no, MERSİS, ETBİS, adres, telefon, e-posta, WhatsApp, IBAN(lar)
- [ ] Logo (SVG veya şeffaf PNG), site ikonu (kare, en az 512 px), marka rengi
- [ ] Ne sattığı (sektör): ürün türü adı tekil/çoğul ("ürün", "dedektör", "kulaklık"…)
- [ ] Ürün listesi (Excel/CSV: SKU, ad, fiyat, stok) ve görseller
- [ ] Varsa eski site: müşteri listesi (CSV), eski adres yapısı (yönlendirmeler için), Analytics/Ads kimlikleri

## 1. Hesaplar — hepsi mağaza sahibinin adına

| Hesap | Kim açar | Not |
|---|---|---|
| Alan adı (ör. magazam.com) | Sahip (veya sahip adına, faturası sahibe) | Alan adının sahibi mağaza olmalı; sizin hesabınızda durmasın. |
| Sunucu (VPS: Hetzner/DigitalOcean) veya Vercel + Neon | Sahip | Faturası sahibe. Size "üye/ekip" yetkisi versin. |
| E-posta (Google Workspace / Yandex / Zoho) + SMTP | Sahip | Sipariş e-postaları bununla gider. SPF/DKIM/DMARC kaydı şart. |
| iyzico veya PayTR üye işyeri | Sahip (şirket evraklarıyla) | Anahtarları sahip panele kendisi girebilir ya da size güvenli kanaldan iletir. |
| Yedek depolama (Cloudflare R2 / S3) | Sahip | Gece yedekleri sunucu dışına buraya gider. |
| Google Analytics, Search Console, Merchant Center, Meta | Sahip | Size yalnızca kullanıcı yetkisi verilir. |
| Netgsm, İYS, e-Arşiv entegratörü, Trendyol/Hepsiburada | Sahip | İsteğe bağlı. |
| Kod deposu (GitHub, özel) | **Siz** (kodun sahibi sizsiniz, bkz. lisans) | Müşteri başına ayrı özel depo; sunucu bu depodan çeker. |

Parolaları e-postayla/WhatsApp'la düz metin göndermeyin; parola yöneticisinin paylaşım özelliğini (1Password, Bitwarden Send) kullanın.

## 2. Müşteriye özel kod deposu

```bash
# Ana (ürün) deposundan müşteriye özel kopya
git clone git@github.com:SIZ/magaza.git magaza-MUSTERI && cd magaza-MUSTERI
git remote rename origin upstream
git remote add origin git@github.com:SIZ/magaza-MUSTERI.git   # GitHub'da önce boş ÖZEL depo açın
git push -u origin main
```

Güncelleme (ana üründeki yenilikleri müşteriye taşıma):

```bash
git fetch upstream && git merge upstream/main   # çakışma olursa çözün
npm ci && npx tsc --noEmit && npm run build     # yerelde doğrulayın
git push origin main                            # sunucuda: git pull && docker compose up -d --build
```

Müşteriye özel kod değişikliği yapmaktan kaçının; mağazaya özgü her şey (ad, logo, renk, sektör, metinler, menüler, banner, sözleşme bilgileri) **panelden** ayarlanır. Böylece güncellemeler çakışmasız alınır.

## 3. Sunucuya kurulum

[../KURULUM.md](../KURULUM.md) § 2'yi uygulayın. Özet:

```bash
cp .env.example .env    # DOMAIN, APEX_DOMAIN, APP_URL, POSTGRES_PASSWORD, AUTH_SECRET, CRON_SECRET, BACKUP_S3_*
docker compose up -d --build
docker compose exec -e ADMIN_EMAIL=sahip@magazam.com -e ADMIN_PASSWORD='GeciciGucluSifre!' -e ADMIN_NAME='Ad Soyad' app npm run db:init
```

- `db:init` **demo veri yüklemez.** Mağaza boş ve genel başlar: ad "Mağazam", ürün türü "ürün", sihirbaz/sözlük/seri no/servis modülleri kapalı.
- `SEED_DEMO` ve `PAYMENT_SIMULATION` değişkenlerini canlı sunucuda **tanımlamayın** (bunlar yalnızca ön izleme içindir).
- `AUTH_SECRET`'ı bir kez belirleyin ve sahibin parola yöneticisinde de saklayın; kaybolursa şifreli saklanan anahtarlar yeniden girilmek zorunda kalır.

## 4. Panelden ilk ayarlar (Panel → Kurulum sayfası sırayla gösterir)

1. **Ayarlar → Marka:** logo, beyaz logo (koyu zemin için), site ikonu, ana renk. Önizlemede okunabilirliği kontrol edin.
2. **Ayarlar → Katalog:** sektör hazır ayarı (Genel / Dedektör / Elektronik / Giyim / Outdoor) veya ürün türü adlarını elle yazın; gerekmeyen modülleri kapatın. Kapalı modülün sayfası 404 verir, menü ve bağlantıları gizlenir.
3. **Ayarlar → Mağaza:** unvan, adres, telefon, vergi, MERSİS, ETBİS, sosyal hesaplar. (Sözleşme metinlerine otomatik dolar.)
4. **Ayarlar → SEO:** site başlığı, açıklama, Search Console doğrulaması.
5. **Ayarlar → Ödeme:** iyzico/PayTR anahtarları → *Bağlantıyı test et*; havale için IBAN. IBAN girilmeden havale seçeneği müşteriye gösterilmez.
6. **Ayarlar → Kargo:** firmalar, ücret kuralı, ücretsiz kargo eşiği, kesim saati; varsa showroom/elden teslim adresi.
7. **Ayarlar → Entegrasyonlar:** SMTP (denemek için mağazadan kendinize "Şifremi unuttum" e-postası gönderin), yeni sipariş bildirim e-postası, Analytics/Pixel.
8. **Kategoriler, Markalar, Ürünler:** Ürünler → *CSV ile güncelle* (SKU yoksa taslak ürün açılır), sonra görseller.
9. **Vitrin:** ana banner (1520×580 + mobil 1080×1350; İngilizce açıksa İngilizce görsel), kampanya kartları, duyuru şeridi, "Ne arıyorsun?" kısayolları.
10. **Sayfalar:** Hakkımızda metni ve yasal metinler — **mağazanın hukukçusuna kontrol ettirin.**
11. **Ekip:** sahibe ayrı, size ayrı kullanıcı (bkz. § 6).

## 5. Canlıya almadan önce test

- [ ] Gerçek kartla küçük tutarlı bir sipariş (ör. 10 TL'lik test ürünü) → ödeme → panelde sipariş → **iade** → kartta iade görüldü
- [ ] Havale siparişi → dekont yükleme → panelde onay
- [ ] Müşteri e-postaları geldi mi (sipariş onayı, kargo), gereksiz klasörüne düşmüyor mu
- [ ] Telefonda: ana sayfa, ürün, sepet, ödeme
- [ ] `https://ALAN-ADI/api/health` 200 dönüyor; UptimeRobot vb. izleme sahibin telefonuna uyarı veriyor
- [ ] Yedek: bir gece sonra `backups/` ve R2'de dosya var; [../KURULUM.md](../KURULUM.md)'deki geri yükleme denemesi yapıldı
- [ ] Panel → SEO sağlık skorundaki kırmızı maddeler kapandı
- [ ] Test ürünleri/siparişleri silindi veya arşivlendi

## 6. Teslim

- Sahibin yönetici hesabı: ilk girişte **kendi şifresini belirlemesini** ve **iki adımlı doğrulamayı** açmasını sağlayın (Hesabım).
- Sizin hesabınız: Panel → Ekip'te **ayrı bir kullanıcı**. Bakım sözleşmesi varsa gereken rol; sözleşme bitince sahip bu kullanıcıyı pasifleştirir. İşlem kayıtları her değişikliği kimin yaptığını gösterir.
- Sahibe teslim edilecekler: [MAGAZA-SAHIBI-KILAVUZU.md](MAGAZA-SAHIBI-KILAVUZU.md), hesap listesi (hangi hizmet, hangi e-postayla, faturası kimde), `.env` değerlerinin güvenli kopyası, yedeğin nerede olduğu.
- [TESLIM-KONTROL-LISTESI.md](TESLIM-KONTROL-LISTESI.md)'yi birlikte imzalayın.
