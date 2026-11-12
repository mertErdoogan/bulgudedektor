"""Reklam ve analitik ölçümü uçtan uca.

Kontrol edilenler: Consent Mode v2 sinyalleri, olay kuyruğu (betik geç yüklense de olay kaybolmaz),
GA4 e-ticaret olayları, Google Ads satın alma dönüşümü, Meta Pixel olayları (eventID ile),
sipariş kaynağı (gclid/utm) kaydı, Meta Conversions API (sahte sunucuya), onaysız ziyaretçide hiçbir şey gitmemesi.

Sunucu şu ortamla başlatılmalı: META_GRAPH_URL=http://127.0.0.1:4011  (sahte Graph API'yi bu test açar)
"""
import os, re, json, asyncio, subprocess, threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from playwright.async_api import async_playwright

B = os.environ.get("BASE_URL", "http://localhost:3000")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130.0 Safari/537.36"
DB = os.environ.get("DATABASE_URL", "postgresql://postgres@localhost/bulgu")
res = []
def chk(n, c, info=""): c = bool(c); res.append((n, c)); print(("PASS" if c else "FAIL"), n, "" if c else info)
def sql(q): return subprocess.run(["psql", DB, "-tAc", q], capture_output=True, text=True).stdout.strip()

capi = []
class H(BaseHTTPRequestHandler):
    def do_POST(self):
        n = int(self.headers.get("content-length", 0)); capi.append({"path": self.path, "body": json.loads(self.rfile.read(n) or b"{}")})
        self.send_response(200); self.send_header("Content-Type", "application/json"); self.end_headers(); self.wfile.write(b'{"events_received":1}')
    def log_message(self, *a): pass

TAGS = {"gaMeasurementId": "G-TEST1234", "googleAdsIds": "AW-111,AW-222", "adsPurchaseLabels": "AW-111/AbC123", "metaPixelId": "998877", "metaCapiToken": "test-token", "gtmId": ""}

async def ev(pg):
    """dataLayer ve fbq kuyruğundaki çağrıları düz listeye çevirir"""
    return await pg.evaluate("""() => ({
      g: (window.dataLayer||[]).map(a => Array.from(a)),
      f: (window.fbq && window.fbq.queue ? window.fbq.queue : []).map(a => Array.from(a)),
      ads: window.__arenaAds || null })""")

async def main():
    sql("update users set totp_enabled=false, totp_secret=null, totp_last_step=null")  # features testi 2FA açar; giriş testleri sıfırdan başlar
    sql("delete from rate_hits")
    srv = HTTPServer(("127.0.0.1", 4011), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
    sql("delete from rate_hits")
    old = sql("select value::text from settings where key='integrations'")
    sql(f"insert into settings(key, value) values ('integrations', '{json.dumps(TAGS)}'::jsonb) on conflict (key) do update set value = settings.value || excluded.value")
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(executable_path=os.environ.get("CHROME", "/usr/bin/google-chrome"))

            # ── 1) Onay yok: hiçbir etiket yüklenmez
            c0 = await b.new_context(user_agent=UA); p0 = await c0.new_page()
            ext0 = []
            p0.on("request", lambda r: ext0.append(r.url) if re.search(r"googletagmanager|facebook", r.url) else None)
            await p0.goto(B + "/urun/vanquish-560-pro-pack", wait_until="networkidle")
            await p0.click('button:has-text("Sadece zorunlu")'); await p0.wait_for_timeout(800)
            await p0.goto(B + "/", wait_until="networkidle"); await p0.wait_for_timeout(500)
            e0 = await ev(p0)
            chk("Onay yokken Google/Meta isteği yok", not ext0, ext0[:3])
            chk("Onay yokken dataLayer'a komut gitmedi", not any(x and x[0] in ("config", "consent") for x in e0["g"]), e0["g"][:3])
            await c0.close()

            # ── 2) Reklam bağlantısıyla gelen ziyaretçi, tümünü kabul ediyor
            c = await b.new_context(user_agent=UA, viewport={"width": 1366, "height": 900})
            # Dış betikler test ortamında yok; isteği boş yanıtla karşıla (stub'lar kuyruğu tutar)
            await c.route(re.compile(r".*(googletagmanager|connect\.facebook)\.(com|net)/.*"), lambda r: r.fulfill(status=200, body="", content_type="application/javascript"))
            pg = await c.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
            await pg.goto(B + "/urun/vanquish-560-pro-pack?gclid=TESTGCLID123&utm_source=google&utm_medium=cpc&utm_campaign=kis-kampanyasi", wait_until="networkidle")
            # view_item onaydan ÖNCE tetiklendi → kuyrukta beklemeli, onayla gitmeli
            await pg.click('button:has-text("Tümünü kabul et")'); await pg.wait_for_timeout(1500)
            e = await ev(pg)
            g = e["g"]
            cons = next((x for x in g if x[:2] == ["consent", "default"]), None)
            chk("Consent Mode v2: tüm sinyaller granted", cons and all(cons[2].get(k) == "granted" for k in ("ad_storage", "ad_user_data", "ad_personalization", "analytics_storage")), cons)
            cfg = [x[1] for x in g if x and x[0] == "config"]
            chk("GA4 + iki Google Ads hesabı yapılandırıldı", set(cfg) == {"G-TEST1234", "AW-111", "AW-222"}, cfg)
            chk("Kuyruktaki view_item onaydan sonra gönderildi", any(x[:2] == ["event", "view_item"] for x in g))
            chk("Sayfa görüntüleme gitti", any(x[:2] == ["event", "page_view"] for x in g))
            chk("Meta: init + ViewContent", any(x[:2] == ["init", "998877"] for x in e["f"]) and any(x[:2] == ["track", "ViewContent"] for x in e["f"]), e["f"][:4])
            await pg.get_by_role("button", name="Sepete ekle").first.click(); await pg.wait_for_timeout(500)
            e = await ev(pg)
            chk("add_to_cart (GA) + AddToCart (Meta)", any(x[:2] == ["event", "add_to_cart"] for x in e["g"]) and any(x[:2] == ["track", "AddToCart"] for x in e["f"]))

            # Arama ve WhatsApp
            await pg.goto(B + "/ara?q=equinox", wait_until="networkidle"); await pg.wait_for_timeout(800)
            e = await ev(pg)
            s_ev = next((x for x in e["g"] if x[:2] == ["event", "search"]), None)
            chk("Arama olayı (terim + sonuç sayısı)", s_ev and s_ev[2].get("search_term") == "equinox" and s_ev[2].get("results", 0) > 0, s_ev)
            await pg.goto(B + "/iletisim", wait_until="networkidle")
            wa = pg.locator("a[href*='wa.me']").first
            await wa.evaluate("a => { a.removeAttribute('target'); a.addEventListener('click', ev => ev.preventDefault(), {once:true}) }")
            await wa.click(); await pg.wait_for_timeout(400)
            e = await ev(pg)
            chk("WhatsApp tıklaması = contact olayı", any(x[:2] == ["event", "contact"] and x[2].get("method") == "whatsapp" for x in e["g"]) and any(x[:2] == ["track", "Contact"] for x in e["f"]))

            # Sipariş (havale)
            await pg.goto(B + "/odeme", wait_until="networkidle"); await pg.wait_for_timeout(1200)
            e = await ev(pg)
            chk("begin_checkout + InitiateCheckout", any(x[:2] == ["event", "begin_checkout"] for x in e["g"]) and any(x[:2] == ["track", "InitiateCheckout"] for x in e["f"]))
            await pg.fill("input[name=phone]", "05559870011")
            await pg.fill("input[name=email]", "reklam.test@ornek.com")
            await pg.fill("input[name=fullName]", "Reklam Testi")
            await pg.click("text=Showroom'dan teslim al")
            await pg.click("text=Havale / EFT")
            await pg.check("input[name=terms]")
            await pg.locator("button[type=submit]:visible").first.click()
            await pg.wait_for_url(re.compile(r".*/siparis/.*"), timeout=60000)
            await pg.wait_for_timeout(1500)
            oid = re.search(r"/siparis/([^?]+)", pg.url).group(1)
            num = sql(f"select number from orders where id='{oid}'")
            e = await ev(pg)
            pur = next((x for x in e["g"] if x[:2] == ["event", "purchase"]), None)
            chk("GA4 purchase (sipariş no, değer, TRY)", pur and pur[2].get("currency") == "TRY" and pur[2].get("value", 0) > 0 and num in str(pur[2].get("transaction_id")), pur)
            conv = [x for x in e["g"] if x[:2] == ["event", "conversion"]]
            chk("Google Ads dönüşümü doğru etikete, değerle", len(conv) == 1 and conv[0][2].get("send_to") == "AW-111/AbC123" and conv[0][2].get("value", 0) > 0 and conv[0][2].get("transaction_id"), conv)
            fp = next((x for x in e["f"] if x[:2] == ["track", "Purchase"]), None)
            chk("Meta Purchase + eventID (CAPI ile tekilleştirme)", fp and len(fp) >= 4 and fp[3].get("eventID", "").startswith("purchase-"), fp)
            # Yenileme: satın alma tekrar gönderilmemeli
            await pg.reload(wait_until="networkidle"); await pg.wait_for_timeout(1200)
            e = await ev(pg)
            chk("Sayfa yenilenince purchase tekrar gitmedi", not any(x[:2] == ["event", "purchase"] for x in e["g"]))

            attr = json.loads(sql(f"select attribution::text from orders where id='{oid}'") or "{}")
            chk("Siparişte kaynak: gclid + utm + onay", attr.get("gclid") == "TESTGCLID123" and attr.get("campaign") == "kis-kampanyasi" and attr.get("marketing") is True and attr.get("landing") == "/urun/vanquish-560-pro-pack", attr)
            await pg.wait_for_timeout(1500)
            got = [x for x in capi if "/998877/events" in x["path"]]
            body = got[-1]["body"]["data"][0] if got else {}
            chk("Meta CAPI: Purchase sunucudan gitti (aynı event_id, hash'li e-posta)", got and body.get("event_name") == "Purchase" and body.get("event_id") == fp[3]["eventID"] and len(body["user_data"]["em"][0]) == 64 and "token=test-token" in got[-1]["path"], got[-1] if got else None)
            chk("CAPI gönderildi işareti", sql(f"select attribution->>'capiSent' from orders where id='{oid}'") == "true")

            # Panel: kaynak görünür + raporda kırılım
            ac = await b.new_context(user_agent=UA, viewport={"width": 1400, "height": 900}); ap = await ac.new_page()
            await ap.goto(B + "/admin/giris"); await ap.fill("input[name=email]", "admin@arenadedektor.local"); await ap.fill("input[name=password]", "Arena123!")
            await ap.click("button[type=submit]"); await ap.wait_for_url(re.compile(r".*/admin(?!/giris).*"))
            await ap.goto(B + f"/admin/siparisler/{oid}", wait_until="networkidle")
            chk("Sipariş detayında kaynak: Google Ads", "Kaynak: Google Ads" in await ap.inner_text("body"))
            await ap.goto(B + "/admin/raporlar?r=1", wait_until="networkidle")
            chk("Raporda satış kaynağı kartı", "Satış kaynağı" in await ap.inner_text("body"))
            # 404 kaydı
            sql("delete from not_found_logs where path='/eski-urun-adresi-test'")
            await pg.goto(B + "/eski-urun-adresi-test"); await pg.goto(B + "/eski-urun-adresi-test")
            chk("404 kaydı sayılıyor", sql("select hits from not_found_logs where path='/eski-urun-adresi-test'") == "2")
            await pg.goto(B + "/wp-login.php")
            chk("Bot çöp adresleri kaydedilmiyor", sql("select count(*) from not_found_logs where path like '%wp-login%'") == "0")
            await ap.goto(B + "/admin/yonlendirmeler", wait_until="networkidle")
            row = ap.locator("tr:has-text('/eski-urun-adresi-test')")
            await row.locator("input[name=toPath]").fill("/urun/vanquish-560-pro-pack")
            await row.locator("button[type=submit]").click(); await ap.wait_for_timeout(1500)
            chk("404'ten tek tıkla yönlendirme", sql("select to_path from redirects where from_path='/eski-urun-adresi-test'") == "/urun/vanquish-560-pro-pack" and sql("select count(*) from not_found_logs where path='/eski-urun-adresi-test'") == "0")
            r = await pg.goto(B + "/eski-urun-adresi-test")
            chk("Yönlendirme çalışıyor", pg.url.endswith("/urun/vanquish-560-pro-pack"))
            sql("delete from redirects where from_path='/eski-urun-adresi-test'")
            chk("Sayfa hatası yok", not errs, errs[:3])
            await b.close()
    finally:
        sql(f"update settings set value = $${old}$$::jsonb where key='integrations'" if old else "delete from settings where key='integrations'")
        srv.shutdown()
    print(f"{sum(c for _, c in res)}/{len(res)} geçti")

asyncio.run(main())
