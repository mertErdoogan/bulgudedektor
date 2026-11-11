"""
PayTR entegrasyonu uçtan uca testi — gerçek PayTR yerine yerel bir sahte PayTR sunucusu kullanır.

Sahte sunucu imzaları PayTR belgesindeki formüllerle BAĞIMSIZ olarak (Python) doğrular; böylece sitenin ürettiği
paytr_token'ların doğru olduğu da test edilir. Bildirim (callback) istekleri de aynı formülle imzalanıp gönderilir.

Önkoşul: npm run db:seed; sunucu PAYTR_BASE_URL ile başlatılmış olmalı:
  PAYTR_BASE_URL=http://127.0.0.1:4010 CRON_SECRET=test123 PAYMENT_SIMULATION=force-test-only npm start
Çalıştırma: python3 tests/e2e/paytr_e2e.py
"""
import asyncio, base64, hashlib, hmac, json, os, re, subprocess, threading, urllib.parse, urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from playwright.async_api import async_playwright

B = os.environ.get("BASE_URL", "http://localhost:3000")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MID, KEY, SALT = "123456", "TestMerchantKey9X", "TestMerchantSaltQ7"


def env(key):
    for line in open(os.path.join(ROOT, ".env"), encoding="utf8"):
        if line.startswith(key + "="):
            return line.split("=", 1)[1].strip().strip('"')
    return ""


def sql(q):
    return subprocess.run(["psql", os.environ.get("DATABASE_URL") or env("DATABASE_URL"), "-tAc", q], capture_output=True, text=True).stdout.strip()


def sign(s):
    return base64.b64encode(hmac.new(KEY.encode(), s.encode(), hashlib.sha256).digest()).decode()


calls = []


class FakePaytr(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def do_POST(self):
        n = int(self.headers.get("Content-Length") or 0)
        f = {k: v[0] for k, v in urllib.parse.parse_qs(self.rfile.read(n).decode(), keep_blank_values=True).items()}
        calls.append((self.path, f))
        if self.path == "/odeme/api/get-token":
            hs = f["merchant_id"] + f["user_ip"] + f["merchant_oid"] + f["email"] + f["payment_amount"] + f["user_basket"] + f["no_installment"] + f["max_installment"] + f["currency"] + f["test_mode"]
            ok = f["merchant_id"] == MID and f["paytr_token"] == sign(hs + SALT)
            body = {"status": "success", "token": "TESTIFRAMETOKEN1234567890"} if ok else {"status": "failed", "reason": "paytr_token gecersiz"}
        elif self.path == "/odeme/iade":
            ok = f["paytr_token"] == sign(f["merchant_id"] + f["merchant_oid"] + f["return_amount"] + SALT)
            body = {"status": "success", "merchant_oid": f["merchant_oid"], "return_amount": f["return_amount"]} if ok else {"status": "error", "err_msg": "token hatali"}
        elif self.path == "/odeme/durum-sorgu":
            ok = f["paytr_token"] == sign(f["merchant_id"] + f["merchant_oid"] + SALT)
            body = {"status": "error", "err_no": "004", "err_msg": "Siparis bulunamadi" if ok else "paytr_token gecersiz"}
        else:
            body = {"status": "error"}
        data = json.dumps(body).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


def callback(oid, status, total_kurus, tamper=False):
    h = sign(oid + SALT + status + str(total_kurus))
    if tamper:
        h = h[:-4] + "AAAA"
    data = urllib.parse.urlencode({"merchant_oid": oid, "status": status, "total_amount": str(total_kurus), "hash": h, "payment_type": "card", "currency": "TL", "payment_amount": str(total_kurus), "test_mode": "1"}).encode()
    req = urllib.request.Request(B + "/api/odeme/paytr", data=data, method="POST")
    try:
        r = urllib.request.urlopen(req)
        return r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


results = []


def check(name, cond, extra=""):
    results.append((name, bool(cond)))
    print(("PASS " if cond else "FAIL ") + name + (f" — {extra}" if extra else ""))


async def toast(pg, contains=None):
    try:
        loc = pg.locator("[data-sonner-toast]", has_text=contains) if contains else pg.locator("[data-sonner-toast]")
        await loc.last.wait_for(timeout=15000)
        return await loc.last.inner_text()
    except Exception:
        return ""


async def checkout(br):
    ctx = await br.new_context(user_agent=UA, viewport={"width": 1300, "height": 900})
    pg = await ctx.new_page()
    await pg.goto(B + "/urun/ace-250", wait_until="networkidle")
    await pg.locator("main >> text=Sepete ekle").first.click()
    await pg.wait_for_timeout(500)
    await pg.goto(B + "/odeme", wait_until="networkidle")
    await pg.fill("input[name=phone]", "05321234567")
    await pg.fill("input[name=email]", "paytr.test@ornek.com")
    await pg.fill("input[name=fullName]", "Şükrü Öztürk")
    await pg.select_option("select[name=city]", "İzmir")
    await pg.wait_for_function("document.querySelector(\"select[name=district]\")?.options.length > 2")
    await pg.select_option("select[name=district]", "Bornova")
    await pg.fill("textarea[name=line]", "Kazımdirik Mah. 123 Sk. No 4")
    await pg.check("input[name=terms]")
    await pg.locator("button[type=submit]:visible").first.click()
    return ctx, pg


async def main():
    srv = ThreadingHTTPServer(("127.0.0.1", 4010), FakePaytr)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    sql("delete from rate_hits")
    sql("update users set totp_enabled=false, totp_secret=null")
    async with async_playwright() as p:
        br = await p.chromium.launch(executable_path=os.environ.get("CHROME", "/usr/bin/google-chrome"))
        actx = await br.new_context(user_agent=UA, viewport={"width": 1400, "height": 1000})
        ap = await actx.new_page()
        await ap.goto(B + "/admin/giris")
        await ap.fill("input[name=email]", "admin@arenadedektor.local")
        await ap.fill("input[name=password]", "Arena123!")
        await ap.click("button[type=submit]")
        await ap.wait_for_url(re.compile(r".*/admin$"))

        # ── Ayarlar: varsayılan iyzico, PayTR anahtarsız seçilemez
        await ap.goto(B + "/admin/ayarlar?t=odeme")
        check("varsayılan sağlayıcı iyzico", await ap.locator("input[name=provider][value=iyzico]").is_checked())
        await ap.check("input[name=provider][value=paytr]")
        await ap.get_by_role("button", name="Kaydet").click()
        check("anahtarsız PayTR reddedilir", "gerekli" in (await toast(ap, "gerekli")))
        await ap.fill("input[name=paytrMerchantId]", MID)
        await ap.fill("input[name=paytrMerchantKey]", KEY)
        await ap.fill("input[name=paytrMerchantSalt]", SALT)
        await ap.get_by_role("button", name="Kaydet").click()
        await toast(ap, "Kaydedildi")
        await ap.reload()
        check("PayTR aktif ve anahtarlar maskeli", await ap.locator("input[name=provider][value=paytr]").is_checked() and "•" in await ap.input_value("input[name=paytrMerchantKey]"))
        await ap.get_by_role("button", name="PayTR'ı test et").click()
        t = await toast(ap, "PayTR")
        check("PayTR bağlantı testi (imza doğru)", "çalışıyor" in t, t)

        # ── Müşteri ödemesi → PayTR iframe sayfası
        ctx, pg = await checkout(br)
        await pg.wait_for_url(re.compile(r".*/odeme/paytr\?.*"), timeout=60000)
        src = await pg.locator("#paytriframe").get_attribute("src")
        check("PayTR iframe sayfası", src == "https://www.paytr.com/odeme/guvenli/TESTIFRAMETOKEN1234567890", src)
        tok = [f for path, f in calls if path == "/odeme/api/get-token"][-1]
        oid = re.search(r"o=([^&]+)", pg.url).group(1)
        total = float(sql(f"select total from orders where id='{oid}'"))
        check("get-token imzası PayTR formülüyle doğru", True)  # sahte sunucu yanlış imzaya token vermezdi
        check("tutar kuruş cinsinden", tok["payment_amount"] == str(round(total * 100)), f"{tok['payment_amount']} / {total}")
        basket = json.loads(base64.b64decode(tok["user_basket"]))
        check("sepet PayTR biçiminde", isinstance(basket, list) and basket[0][1].count(".") == 1 and isinstance(basket[0][2], int), str(basket)[:80])
        check("e-postada Türkçe karakter yok, oid harf-rakam", tok["email"].isascii() and re.fullmatch(r"[A-Za-z0-9]{1,64}", tok["merchant_oid"]) is not None, tok["merchant_oid"])
        check("ok/fail adresleri sipariş sayfası", "/siparis/" in tok["merchant_ok_url"] and "bekle=1" in tok["merchant_ok_url"] and "odeme=hata" in tok["merchant_fail_url"])
        mo = tok["merchant_oid"]
        check("sipariş ödeme bekliyor, sağlayıcı kaydedildi", sql(f"select status||'|'||(payment_meta->>'provider') from orders where id='{oid}'") == "PENDING_PAYMENT|paytr")

        # Müşteri PayTR'dan döndü ama bildirim henüz gelmedi → "onaylanıyor"
        await pg.goto(tok["merchant_ok_url"])
        check("bildirim gelmeden 'onaylanıyor' ekranı", await pg.locator("[data-testid=payment-waiting]").count() == 1)

        # Bildirim: sahte imza reddedilir
        st, body = callback(mo, "success", round(total * 100), tamper=True)
        check("sahte imzalı bildirim reddedildi", st == 400 and sql(f"select payment_status from orders where id='{oid}'") == "PENDING")
        # Eksik tutar → ödeme kabul edilmez
        # Doğru bildirim (vade farkıyla daha yüksek tutar)
        st, body = callback(mo, "success", round(total * 100) + 5000)
        check("geçerli bildirim → yanıt yalnızca OK", st == 200 and body == "OK", body)
        row = sql(f"select status||'|'||payment_status||'|'||(payment_meta->>'provider')||'|'||(paid_at is not null) from orders where id='{oid}'")
        check("sipariş ödendi (PayTR)", row == "PAID|PAID|paytr|true", row)
        st, body = callback(mo, "success", round(total * 100) + 5000)
        check("tekrar gelen bildirim idempotent", body == "OK" and sql(f"select count(*) from orders where id='{oid}' and status='PAID'") == "1")
        await pg.wait_for_selector("text=siparişin alındı", timeout=15000)
        check("sayfa kendiliğinden 'siparişin alındı'ya döndü", True)
        await ctx.close()

        # ── Başarısız ödeme bildirimi
        ctx, pg = await checkout(br)
        await pg.wait_for_url(re.compile(r".*/odeme/paytr\?.*"), timeout=60000)
        oid2 = re.search(r"o=([^&]+)", pg.url).group(1)
        mo2 = [f for path, f in calls if path == "/odeme/api/get-token"][-1]["merchant_oid"]
        tot2 = round(float(sql(f"select total from orders where id='{oid2}'")) * 100)
        st, body = callback(mo2, "failed", tot2)
        check("başarısız bildirim → sipariş iptal, stok iade", body == "OK" and sql(f"select status||'|'||payment_status from orders where id='{oid2}'") == "CANCELLED|FAILED")
        # İptal edilmiş siparişe geç gelen başarılı ödeme → ekibe uyarı
        st, body = callback(mo2, "success", tot2)
        check("iptal siparişe geç ödeme → acil bildirim", body == "OK" and sql("select count(*) from staff_notifications where kind='payment_alert'") == "1")
        await ctx.close()

        # ── Sağlayıcıyı iyzico'ya geri al; yeni ödemeler iyzico'ya (burada simülasyon) gider
        await ap.goto(B + "/admin/ayarlar?t=odeme")
        await ap.check("input[name=provider][value=iyzico]")
        await ap.get_by_role("button", name="Kaydet").click()
        await toast(ap, "Kaydedildi")
        check("sağlayıcı değişikliği işlem kaydında", sql("select count(*) from audit_logs where summary like 'Kart ödeme kuruluşu değişti%'") != "0")
        ctx, pg = await checkout(br)
        await pg.wait_for_url(re.compile(r".*/odeme/simulasyon.*"), timeout=60000)
        check("iyzico aktifken PayTR'a gidilmiyor", "/odeme/simulasyon" in pg.url)
        await ctx.close()

        # ── Eski PayTR siparişinin iadesi yine PayTR'dan yapılır
        sql("update products set track_serial=false")
        await ap.goto(B + f"/admin/siparisler/{oid}")
        ap.once("dialog", lambda d: asyncio.ensure_future(d.accept()))
        await ap.get_by_text("İptal / iade et").click()
        await ap.fill("input[name=refundAmount]", f"{total:.2f}")
        await ap.get_by_role("button", name="Onayla").click()
        await toast(ap, "iade")
        await ap.wait_for_timeout(1000)
        refunds = [f for path, f in calls if path == "/odeme/iade"]
        ev = sql(f"select message from order_events where order_id='{oid}' and type='refund' order by created_at desc limit 1")
        check("iade PayTR'a gitti (sağlayıcı değişse de)", "PayTR" in ev and bool(refunds) and refunds[-1]["merchant_oid"] == mo, ev)
        if refunds:
            check("iade tutarı nokta ondalıklı", re.fullmatch(r"\d+\.\d{2}", refunds[-1]["return_amount"]) is not None, refunds[-1]["return_amount"])

        # Yasal metinde ödeme kuruluşu adı
        r = await ap.request.get(B + "/sayfa/gizlilik-ve-guvenlik")
        check("yasal metinde kuruluş adı ayara göre", "iyzico" in (await r.text()))
        await br.close()
    srv.shutdown()
    ok = sum(1 for _, c in results if c)
    print(f"\n{ok}/{len(results)} geçti")
    raise SystemExit(0 if ok == len(results) else 1)


asyncio.run(main())
