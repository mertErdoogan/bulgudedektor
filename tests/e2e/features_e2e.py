"""
Yeni özellikler uçtan uca testi: eski adres yönlendirmeleri, yasal metinler, taksit tablosu, varyantlar,
yönetici 2FA, e-posta doğrulama, KVKK veri dökümü ve hesap silme, fatura, müşteri CSV aktarımı, İYS dışa aktarımı,
tek tıkla abonelikten çıkma.

Önkoşul: `npm run db:seed` ile demo veri, `npm run build && npm start` ile çalışan sunucu.
Çalıştırma: python3 tests/e2e/features_e2e.py   (BASE_URL, PSQL ve CHROME ortam değişkenleriyle değiştirilebilir)
"""
import asyncio, base64, hashlib, hmac, json, os, re, struct, subprocess, tempfile, time, urllib.parse, urllib.request
from playwright.async_api import async_playwright

B = os.environ.get("BASE_URL", "http://localhost:3000")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def env(key):
    for line in open(os.path.join(ROOT, ".env"), encoding="utf8"):
        if line.startswith(key + "="):
            return line.split("=", 1)[1].strip().strip('"')
    return ""


def sql(q):
    url = os.environ.get("DATABASE_URL") or env("DATABASE_URL")
    return subprocess.run(["psql", url, "-tAc", q], capture_output=True, text=True).stdout.strip()


def totp(secret_b32, t=None):
    key = base64.b32decode(secret_b32 + "=" * (-len(secret_b32) % 8))
    step = int((t or time.time()) // 30)
    h = hmac.new(key, struct.pack(">Q", step), hashlib.sha1).digest()
    o = h[-1] & 15
    return str((struct.unpack(">I", h[o:o + 4])[0] & 0x7FFFFFFF) % 1000000).zfill(6)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None


def http(path, method="GET", data=None):
    op = urllib.request.build_opener(NoRedirect)
    req = urllib.request.Request(B + path, method=method, data=data, headers={"User-Agent": UA})
    try:
        r = op.open(req)
        return r.status, r.headers, r.read().decode("utf8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.headers, e.read().decode("utf8", "replace")


results = []


def check(name, cond, extra=""):
    results.append((name, bool(cond)))
    print(("PASS " if cond else "FAIL ") + name + (f" — {extra}" if extra else ""))


async def toast(pg, contains=None):
    """Son bildirimi döndürür; contains verilirse o metni içeren bildirimi bekler."""
    try:
        loc = pg.locator("[data-sonner-toast]", has_text=contains) if contains else pg.locator("[data-sonner-toast]")
        t = loc.last
        await t.wait_for(timeout=15000)
        return await t.inner_text()
    except Exception:
        return ""


async def main():
    sql("delete from rate_hits")  # DB tabanlı hız sınırı testler arasında sıfırlanır
    # ── HTTP düzeyi
    for src, dst in [
        ("/kategori/minelab-dedektor", "/marka/minelab"),
        ("/kategori?ara=vanquish", "/ara?q=vanquish"),
        ("/sayfa/satis-sozlesmesi/sasoz", "/sayfa/mesafeli-satis-sozlesmesi"),
        ("/sayfa/garanti-ve-iade-kosullari/gaiad", "/sayfa/iade-ve-degisim"),
        ("/uye/giris", "/giris"),
        ("/listeler/favori", "/favoriler"),
    ]:
        st, h, _ = http(src)
        check(f"yönlendirme {src}", st in (301, 308) and (h.get("Location") or "").endswith(dst), f"{st} {h.get('Location')}")

    st, _, body = http("/sayfa/odeme-ve-teslimat")
    check("ödeme sayfası gerçek IBAN ve unvan", st == 200 and "TR18 0006 2000 3570 0006 2929 42" in body and "Ltd. Şti." in body and "{{" not in body)
    st, _, body = http("/sayfa/mesafeli-satis-sozlesmesi")
    check("mesafeli satış: 14 gün cayma + 6502", "14 gün" in body and "6502" in body)

    st, _, body = http("/urun/gpz-8000")
    check("taksit tablosu 4–6 taksit vade farklı", "6 taksit" in body and "toplam" in body)
    check("varyant seçici", "GPX 6000 · PI" in body and "GPZ 8000 · ZVT" in body)

    # Tek tıkla abonelikten çıkma (RFC 8058)
    email = "musteri1@ornek.com"
    sql(f"update customers set marketing_consent=true where email='{email}'")
    k = hmac.new(env("AUTH_SECRET").encode(), f"unsub:{email}".encode(), hashlib.sha256).hexdigest()[:24]
    st, _, _ = http(f"/api/unsub?e={urllib.parse.quote(email)}&k={k}", "POST", b"List-Unsubscribe=One-Click")
    check("tek tıkla abonelikten çıkma", st == 200 and sql(f"select marketing_consent from customers where email='{email}'") == "f")
    st, _, _ = http(f"/api/unsub?e={urllib.parse.quote(email)}&k=yanlis", "POST")
    check("geçersiz anahtarla çıkış reddedilir", st == 400)

    async with async_playwright() as p:
        br = await p.chromium.launch(executable_path=os.environ.get("CHROME", "/usr/bin/google-chrome"))

        # ── Yönetici 2FA
        ctx = await br.new_context(user_agent=UA, accept_downloads=True)
        pg = await ctx.new_page()
        sql("update users set totp_enabled=false, totp_secret=null, totp_last_step=null where email='admin@arenadedektor.local'")
        await pg.goto(B + "/admin/giris")
        await pg.fill("input[name=email]", "admin@arenadedektor.local")
        await pg.fill("input[name=password]", "Arena123!")
        await pg.click("button[type=submit]")
        await pg.wait_for_url(re.compile(r".*/admin(\?.*)?$"), timeout=60000)
        await pg.goto(B + "/admin/hesap")
        await pg.get_by_role("button", name="Kurulumu başlat").click()
        await pg.wait_for_selector("img[alt*='kare kodu']", timeout=20000)
        secret = (await pg.locator("code").first.inner_text()).replace(" ", "")
        check("2FA kare kod ve anahtar gösterildi", len(secret) == 32)
        await pg.fill("input[name=code]", "000000")
        await pg.get_by_role("button", name="Onayla").click()
        check("2FA yanlış kod reddedildi", "hatalı" in (await toast(pg, "hatalı")))
        await pg.fill("input[name=code]", totp(secret))
        await pg.get_by_role("button", name="Onayla").click()
        await pg.wait_for_selector("text=Açık", timeout=20000)
        check("2FA açıldı", sql("select totp_enabled from users where email='admin@arenadedektor.local'") == "t")
        check("2FA anahtarı şifreli saklanıyor", sql("select totp_secret from users where email='admin@arenadedektor.local'").startswith("v1."))
        await ctx.close()

        ctx = await br.new_context(user_agent=UA)
        pg = await ctx.new_page()
        await pg.goto(B + "/admin/giris")
        await pg.fill("input[name=email]", "admin@arenadedektor.local")
        await pg.fill("input[name=password]", "Arena123!")
        await pg.click("button[type=submit]")
        await pg.wait_for_url(re.compile(r".*/admin/giris/dogrula.*"), timeout=30000)
        check("şifreden sonra kod soruluyor", "/dogrula" in pg.url)
        r = await pg.request.get(B + "/admin/siparisler", max_redirects=0)
        check("kod girilmeden panel açılmaz", r.status in (302, 307))
        # aynı adımın kodu (kurulumda kullanıldı) tekrar kabul edilmez; bir sonraki adımı bekle
        last = int(sql("select totp_last_step from users where email='admin@arenadedektor.local'") or 0)
        while int(time.time() // 30) <= last:
            await asyncio.sleep(2)
        await pg.fill("input[name=code]", totp(secret))
        await pg.click("button[type=submit]")
        await pg.wait_for_url(re.compile(r".*/admin(\?.*)?$"), timeout=60000)
        check("doğru kodla giriş", pg.url.rstrip("/").endswith("/admin"))

        # ── Admin: müşteri CSV içe aktarma
        sql("delete from customers where email='veli.eski@ornek.com'")
        await pg.goto(B + "/admin/musteriler")
        await pg.get_by_role("button", name="İçe aktar").click()
        csv = "﻿Adı;Soyadı;E-Posta;GSM;İl;İlçe;Adres;Bülten\nVeli;Eski;veli.eski@ornek.com;0532 111 22 33;Ankara;Çankaya;Atatürk Blv. 1;Evet\nKayıt;Var;musteri2@ornek.com;;;;;\nBozuk;;bozuk-eposta;;;;;\n"
        f = tempfile.NamedTemporaryFile("w", suffix=".csv", delete=False, encoding="utf8")
        f.write(csv)
        f.close()
        await pg.set_input_files("input[name=file]", f.name)
        await pg.check("input[name=consent]")
        await pg.get_by_role("button", name="İçe aktar").last.click()
        t = await toast(pg, "müşteri eklendi")
        check("CSV: 1 eklendi, 1 vardı, 1 hatalı", "1 müşteri eklendi" in t and "1 kayıt zaten" in t and "geçersiz e-posta" in t, t[:160])
        check("CSV: adres ve izin aktarıldı", sql("select c.marketing_consent||'/'||a.city from customers c join addresses a on a.customer_id=c.id where c.email='veli.eski@ornek.com'") == "true/Ankara")

        # İYS dışa aktarımı
        r = await pg.request.get(B + "/api/admin/export/customers?format=iys")
        txt = (await r.text())
        check("İYS listesi", r.status == 200 and "RECIPIENT;TYPE;SOURCE;STATUS;CONSENT_DATE;RECIPIENT_TYPE" in txt and "veli.eski@ornek.com;EPOSTA;HS_WEB;ONAY" in txt)

        # ── Fatura
        oid = sql("select id from orders where status='DELIVERED' and customer_id is not null order by created_at desc limit 1")
        sql(f"update orders set invoice_url=null, invoice_no=null, invoiced_at=null where id='{oid}'")
        await pg.goto(B + f"/admin/siparisler/{oid}")
        await pg.locator("details:has(input[name=invoiceNo])").evaluate("d => d.open = true")
        await pg.fill("input[name=invoiceNo]", "ARN2026000000123")
        await pg.fill("input[name=invoiceLink]", "https://efatura.example.com/ARN2026000000123.pdf")
        await pg.locator("form:has(input[name=invoiceNo])").get_by_role("button", name="Kaydet").click()
        t = await toast(pg, "Fatura")
        check("fatura eklendi", "Fatura eklendi" in t, t[:80])
        await ctx.close()

        # Müşteri sipariş sayfasında fatura bağlantısı (sipariş anahtarı yerine DB'den doğrudan kontrol + sayfa)
        check("fatura siparişe yazıldı", sql(f"select invoice_no from orders where id='{oid}'") == "ARN2026000000123")

        # ── Müşteri: kayıt, e-posta doğrulama, veri dökümü, hesap silme
        ctx = await br.new_context(user_agent=UA, accept_downloads=True)
        pg = await ctx.new_page()
        mail = f"kvkk{int(time.time())}@ornek.com"
        await pg.goto(B + "/kayit")
        await pg.fill("input[name=name]", "Deneme Kullanıcı")
        await pg.fill("input[name=email]", mail)
        await pg.fill("input[name=phone]", f"05{int(time.time()) % 1000000000:09d}")
        await pg.fill("input[name=password]", "Sifre12345")
        await pg.check("input[name=kvkk]")
        check("kayıtta üyelik sözleşmesi bağlantısı", await pg.locator("a[href='/sayfa/uyelik-sozlesmesi']").count() > 0)
        await pg.click("button[type=submit]")
        await pg.wait_for_url(re.compile(r".*/hesabim.*"), timeout=60000)
        check("doğrulama uyarısı görünüyor", await pg.get_by_text("E-posta adresini doğrula.").count() > 0)
        await pg.get_by_role("button", name="Tekrar gönder").click()
        t = await toast(pg, "eposta-dogrula")
        m = re.search(r"(https?://\S+/eposta-dogrula\S+)", t)
        check("doğrulama bağlantısı üretildi (geliştirme modu)", bool(m), t[:100])
        if m:
            await pg.goto(m.group(1).replace(env("APP_URL") or B, B))
            check("doğrulama sayfası", await pg.get_by_text("E-posta adresin doğrulandı").count() > 0)
            check("doğrulandı olarak işaretlendi", sql(f"select email_verified_at is not null from customers where email='{mail}'") == "t")
            await pg.goto(B + "/eposta-dogrula?e=" + urllib.parse.quote(mail) + "&x=9999999999&t=sahte")
            check("sahte doğrulama bağlantısı reddedilir", await pg.get_by_text("Bağlantı geçersiz").count() > 0)
        await pg.goto(B + "/hesabim?t=profil")
        check("uyarı doğrulamadan sonra kayboldu", await pg.get_by_text("E-posta adresini doğrula.").count() == 0)
        async with pg.expect_download() as dl:
            await pg.get_by_text("Verilerimi indir").click()
        d = await dl.value
        data = json.load(open(await d.path(), encoding="utf8"))
        check("KVKK veri dökümü", data["hesap"]["eposta"] == mail and "siparisler" in data)
        await pg.get_by_text("Hesabımı sil").click()
        await pg.fill("form:has(input[name=confirm]) input[name=password]", "Sifre12345")
        await pg.fill("input[name=confirm]", "yanlış")
        await pg.get_by_role("button", name="Hesabımı kalıcı olarak sil").click()
        check("onay metni olmadan silinmez", "SİL" in (await toast(pg, "SİL")))
        await pg.fill("input[name=confirm]", "SİL")
        await pg.get_by_role("button", name="Hesabımı kalıcı olarak sil").click()
        await pg.wait_for_url(re.compile(r".*hesap=silindi.*"), timeout=30000, wait_until="commit")
        check("hesap silindi ve anonimleşti", sql(f"select count(*) from customers where email='{mail}'") == "0" and sql("select count(*) from customers where name='Silinmiş müşteri' and deleted_at is not null") != "0")
        await ctx.close()
        await br.close()

    ok = sum(1 for _, c in results if c)
    print(f"\n{ok}/{len(results)} geçti")
    raise SystemExit(0 if ok == len(results) else 1)


asyncio.run(main())
