# Testler

## Birim testleri (sunucu gerekmez)

```bash
npx tsx tests/unit/arena-parse.test.ts   # eski site ayrıştırıcısı (tests/fixtures/arena)
npx tsx tests/unit/csv.test.ts           # CSV okuma/yazma
npx tsx tests/unit/totp.test.ts          # iki adımlı doğrulama (RFC 6238 vektörleri)
npx tsx tests/unit/sanitize.test.ts      # içerik HTML'inde XSS temizliği
npx tsx tests/unit/marketplace.test.ts   # Trendyol/Hepsiburada adaptörleri, sahte API ile (demo veritabanı gerekir)
```

## Uçtan uca testler (Playwright, Python)

Önkoşullar: `pip install playwright`, Chrome, `psql`, demo veri ve çalışan bir sunucu:

```bash
npm run db:seed
npm run build && CRON_SECRET=test123 PAYMENT_SIMULATION=force-test-only npm start
export DATABASE_URL=postgresql://...   # .env'deki ile aynı
```

| Dosya | Kapsam |
|---|---|
| `core_e2e.py` | Sepet, ödeme (simülasyon), havale, admin sipariş akışı, seri no, iade, roller/yetkiler, kampanya, sihirbaz |
| `seo_e2e.py` | Meta etiketleri, yapılandırılmış veri, site haritası, llms.txt, yönlendirmeler |
| `ux_e2e.py` | Son bakılanlar, favoriler, teslimat rozetleri, sosyal kanıt, şifre sıfırlama, çerez onayı |
| `smart_e2e.py` | Akıllı arama (yazım hatası, Türkçe karakter), öneriler, Hemen al |
| `features_e2e.py` | Eski adres yönlendirmeleri, yasal metinler, taksit tablosu, varyantlar, 2FA, e-posta doğrulama, KVKK döküm/silme, fatura, müşteri CSV, İYS, tek tıkla çıkış |
| `team_e2e.py` | İş listesi ve atama, toplu kargo/atama, toplama listesi ve etiket, takip no içe aktarma, hazır yanıtlar, panel bildirimleri |
| `paytr_e2e.py` | PayTR: ayar, bağlantı testi, iframe, imzalar, bildirim (sahte imza, idempotent, başarısız, geç ödeme uyarısı), sağlayıcı değiştirme, PayTR iadesi. Sunucu `PAYTR_BASE_URL=http://127.0.0.1:4010` ile başlatılmalı. |
| `ads_e2e.py` | Reklam ölçümü: onaysız ziyaretçide etiket yok, Consent Mode v2, olay kuyruğu (betik geç yüklense de olay kaybolmaz), GA4 e-ticaret olayları, Google Ads satın alma dönüşümü, Meta Pixel + Conversions API (aynı eventID), sipariş kaynağı (gclid/utm), panelde kaynak ve rapor, 404 kaydı → tek tıkla yönlendirme. Sunucu `META_GRAPH_URL=http://127.0.0.1:4011` ile başlatılmalı. |
| `mobile_overflow.py <yol>` | 390 px genişlikte yatay taşma kontrolü |

Her dosya bağımsızdır; demo veriyi değiştirdikleri için aralarında `npm run db:seed` çalıştırın. Ortam değişkenleri: `BASE_URL`, `DATABASE_URL`, `CHROME`.
