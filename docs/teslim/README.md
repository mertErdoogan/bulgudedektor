# Müşteriye teslim paketi

| Belge | Kim için | Ne zaman |
|---|---|---|
| [KURULUM-MUSTERI.md](KURULUM-MUSTERI.md) | Geliştirici | Her yeni müşteri: hesaplar, ayrı kod deposu, kurulum, ilk ayarlar, canlı test, teslim |
| [MAGAZA-SAHIBI-KILAVUZU.md](MAGAZA-SAHIBI-KILAVUZU.md) | Mağaza sahibi | Teslimde verilir; günlük kullanım |
| [SOZLESME-LISANS.md](SOZLESME-LISANS.md) | İki taraf | Kurulumdan önce imzalanır (şablon, avukata kontrol ettirin) |
| [SOZLESME-BAKIM-DESTEK.md](SOZLESME-BAKIM-DESTEK.md) | İki taraf | İsteğe bağlı aylık bakım (şablon, avukata kontrol ettirin) |
| [TESLIM-KONTROL-LISTESI.md](TESLIM-KONTROL-LISTESI.md) | İki taraf | Teslim günü birlikte doldurulup imzalanır |

Teknik sunucu kurulumu: [../KURULUM.md](../KURULUM.md). Çok dil: [../COKLU-DIL.md](../COKLU-DIL.md).

## Bilinen sınırlar (müşteriye baştan söyleyin)

- **Kargo API'si yok:** takip numarası elle girilir; takip bağlantısı otomatik oluşur.
- **WhatsApp Business API yok:** bildirimler `wa.me` hazır mesajıyla panelden gönderilir.
- **Netgsm, Trendyol, Hepsiburada, PayTR, iyzico kayıtlı kart:** kod hazır ve sahte servislerle test edildi; ilk gerçek hesapla kurulumda canlı deneme şart.
- **Deneme sınırı sayaçları** veritabanında tutulur; tek sunucu için uygundur.
- **Tek mağaza / tek kurulum:** her müşteri ayrı sunucu ve veritabanı kullanır (çok kiracılı SaaS değildir).
- **Yazılı banner görselleri:** İngilizce açıksa her banner için İngilizce görsel ayrıca yüklenmelidir.
