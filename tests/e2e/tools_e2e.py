"""
Satış araçları uçtan uca testi: canlı / terk edilen sepetler, paket (kombin) satış, yapay zekâ ürün içeriği,
e-fatura (Paraşüt ve BirFatura).

Sunucu şu ortamla başlatılmalı (sahte servisleri bu test açar):
  AI_BASE_URL=http://127.0.0.1:4012 PARASUT_BASE_URL=http://127.0.0.1:4013 PAYMENT_SIMULATION=force-test-only
"""
import asyncio, json, os, re, subprocess, threading, urllib.parse, urllib.request, hmac, hashlib
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from playwright.async_api import async_playwright

B = os.environ.get("BASE_URL", "http://localhost:3000")
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"


def env(key):
    try:
        for line in open(os.path.join(ROOT, ".env"), encoding="utf8"):
            if line.startswith(key + "="):
                return line.split("=", 1)[1].strip().strip('"')
    except FileNotFoundError:
        pass
    return os.environ.get(key, "")


def sql(q):
    url = os.environ.get("DATABASE_URL") or env("DATABASE_URL")
    return subprocess.run(["psql", url, "-tAc", q], capture_output=True, text=True).stdout.strip()


results = []


def check(name, cond, extra=""):
    results.append((name, bool(cond)))
    print(("PASS " if cond else "FAIL ") + name + (f" — {extra}" if extra else ""))


async def toast(pg, contains=None):
    try:
        loc = pg.locator("[data-sonner-toast]", has_text=contains) if contains else pg.locator("[data-sonner-toast]")
        t = loc.last
        await t.wait_for(timeout=20000)
        return await t.inner_text()
    except Exception:
        return ""


# ───────────── Sahte Anthropic (4012) ─────────────
AI_CALLS = []


class FakeAnthropic(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers.get("content-length", 0))) or "{}")
        AI_CALLS.append({"key": self.headers.get("x-api-key"), "body": body})
        tool = body["tools"][0]
        props = tool["input_schema"].get("properties", {})
        out = {}
        if tool["name"] == "ping":
            out = {"ok": True}
        else:
            if "shortDescription" in props:
                out.update({
                    "shortDescription": "AI kısa açıklama: başlangıç için ideal, su geçirmez başlıklı dedektör.",
                    "description": "## Genel bakış\nAI detaylı açıklama.\n\n- Madde bir\n- Madde iki",
                    "seoTitle": "AI SEO başlığı Vanquish 560",
                    "seoDescription": "AI SEO açıklaması: hafif, su geçirmez başlıklı, yeni başlayanlar için çok frekanslı metal dedektörü.",
                })
            if "idealFor" in props:
                out.update({"idealFor": ["AI ideal bir", "AI ideal iki"], "notFor": ["AI sınır bir"]})
            if "en" in props:
                out["en"] = {"name": "AI Vanquish EN", "slug": "AI Vanquish EN Slug!", "shortDescription": "AI English short.", "description": "## Overview\nAI English.", "seoTitle": "AI EN title", "seoDescription": "AI EN description."}
        res = {"id": "msg_1", "type": "message", "role": "assistant", "content": [{"type": "tool_use", "id": "tu_1", "name": tool["name"], "input": out}], "stop_reason": "tool_use"}
        data = json.dumps(res).encode()
        self.send_response(200)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


# ───────────── Sahte Paraşüt (4013) ─────────────
PS = {"calls": [], "fail_archive": False, "invoices": {}, "n": 0}


class FakeParasut(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def send(self, code, obj):
        data = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def body(self):
        n = int(self.headers.get("content-length", 0))
        return json.loads(self.rfile.read(n) or "{}") if n else {}

    def nid(self, p):
        PS["n"] += 1
        return f"{p}{PS['n']}"

    def do_POST(self):
        b = self.body()
        path = urllib.parse.urlparse(self.path).path
        PS["calls"].append(("POST", path, b))
        if path == "/oauth/token":
            ok = b.get("username") == "entegrasyon@derinova.example" and b.get("password") == "parasut-sifre"
            return self.send(200 if ok else 401, {"access_token": "tok", "expires_in": 7200} if ok else {"error": "invalid_grant"})
        if self.headers.get("authorization") != "Bearer tok":
            return self.send(401, {"errors": [{"title": "Unauthorized"}]})
        if path.endswith("/contacts"):
            return self.send(201, {"data": {"id": self.nid("c"), "type": "contacts", "attributes": {}}})
        if path.endswith("/products"):
            return self.send(201, {"data": {"id": self.nid("p"), "type": "products", "attributes": {}}})
        if path.endswith("/sales_invoices"):
            sid = self.nid("si")
            PS["invoices"][sid] = {"payload": b, "doc": None}
            return self.send(201, {"data": {"id": sid, "type": "sales_invoices", "attributes": {}}})
        if path.endswith("/e_archives"):
            if PS["fail_archive"]:
                return self.send(422, {"errors": [{"title": "Geçersiz", "detail": "Test hatası: e-Arşiv reddedildi"}]})
            sid = b["data"]["relationships"]["sales_invoice"]["data"]["id"]
            PS["invoices"][sid]["doc"] = "ea" + sid
            return self.send(202, {"data": {"id": "job" + sid, "type": "trackable_jobs", "attributes": {"status": "running"}}})
        return self.send(404, {"errors": [{"title": "yok"}]})

    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        path = u.path
        PS["calls"].append(("GET", self.path, None))
        if self.headers.get("authorization") != "Bearer tok":
            return self.send(401, {"errors": [{"title": "Unauthorized"}]})
        if path.endswith("/contacts") or path.endswith("/products") or path.endswith("/e_invoice_inboxes"):
            return self.send(200, {"data": []})
        m = re.search(r"/trackable_jobs/job(si\d+)$", path)
        if m:
            return self.send(200, {"data": {"id": "job" + m.group(1), "type": "trackable_jobs", "attributes": {"status": "done"}}})
        m = re.search(r"/sales_invoices/(si\d+)$", path)
        if m:
            sid = m.group(1)
            doc = PS["invoices"].get(sid, {}).get("doc")
            return self.send(200, {"data": {"id": sid, "type": "sales_invoices", "attributes": {"invoice_no": "DRN2026" + sid.zfill(9)}, "relationships": {"active_e_document": {"data": {"id": doc, "type": "e_archives"} if doc else None}}}})
        m = re.search(r"/e_archives/(ea\w+)/pdf$", path)
        if m:
            return self.send(200, {"data": {"id": "pdf1", "type": "e_document_pdfs", "attributes": {"url": f"https://parasut-pdf.example.com/{m.group(1)}.pdf"}}})
        m = re.search(r"/e_archives/(ea(si\d+))$", path)
        if m:
            return self.send(200, {"data": {"id": m.group(1), "type": "e_archives", "attributes": {"invoice_number": "DRN2026" + m.group(2).zfill(9)}}})
        return self.send(404, {"errors": [{"title": "yok"}]})


def bf(endpoint, body=None, token=None, method="POST"):
    data = json.dumps(body or {}).encode()
    req = urllib.request.Request(f"{B}/api/birfatura/api/{endpoint}", data=data if method == "POST" else None, method=method, headers={"content-type": "application/json", "token": token or ""})
    try:
        r = urllib.request.urlopen(req)
        return r.status, json.loads(r.read() or "{}")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or "{}")


def nofollow(path):
    class NR(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *a, **k):
            return None
    op = urllib.request.build_opener(NR)
    try:
        r = op.open(urllib.request.Request(B + path, headers={"User-Agent": UA}))
        return r.status, r.headers.get("Location")
    except urllib.error.HTTPError as e:
        return e.code, e.headers.get("Location")


def order_key(oid):
    secret = env("AUTH_SECRET") or "dev-secret"
    return hmac.new(secret.encode(), f"order:{oid}".encode(), hashlib.sha256).hexdigest()[:24]


async def admin_login(br):
    ctx = await br.new_context(user_agent=UA, viewport={"width": 1440, "height": 1000})
    pg = await ctx.new_page()
    await pg.goto(B + "/admin/giris")
    await pg.fill("input[name=email]", "admin@derinova.local")
    await pg.fill("input[name=password]", "Demo12345!")
    await pg.click("button[type=submit]")
    await pg.wait_for_url(re.compile(r".*/admin(\?.*)?$"), timeout=60000)
    return ctx, pg


async def main():
    sql("delete from rate_hits")
    sql("update users set totp_enabled=false, totp_secret=null, totp_last_step=null")
    sql("delete from settings where key in ('ai','einvoice')")
    for port, h in [(4012, FakeAnthropic), (4013, FakeParasut)]:
        srv = ThreadingHTTPServer(("127.0.0.1", port), h)
        threading.Thread(target=srv.serve_forever, daemon=True).start()

    async with async_playwright() as p:
        br = await p.chromium.launch(executable_path=os.environ.get("CHROME", "/usr/bin/google-chrome"))

        # ───────── Canlı sepet: izin yoksa kayıt tutulmaz
        c0 = await br.new_context(user_agent=UA)
        p0 = await c0.new_page()
        await p0.goto(B + "/urun/ace-250", wait_until="networkidle")
        await p0.click('button:has-text("Sadece zorunlu")'); await p0.wait_for_timeout(500)
        await p0.get_by_role("button", name="Sepete ekle", exact=True).first.click()
        await p0.wait_for_timeout(2500)
        vid0 = await p0.evaluate("localStorage.getItem('site_vid')")
        check("Çerez izni yoksa canlı sepet tutulmaz", vid0 is None and sql("select count(*) from live_carts") == "0", f"{vid0}")
        await c0.close()

        # ───────── Paket: ürün sayfası → sepet → ödeme
        ctx = await br.new_context(user_agent=UA, viewport={"width": 1440, "height": 1000})
        pg = await ctx.new_page()
        await pg.goto(B + "/urun/manticore", wait_until="networkidle")
        await pg.click('button:has-text("Tümünü kabul et")'); await pg.wait_for_timeout(500)
        card = pg.locator("[data-testid=bundle-card]").first
        check("Ürün sayfasında paket kutusu", await card.count() == 1)
        p_m = float(sql("select price from products where slug='manticore'"))
        p_p = float(sql("select price from products where slug='pro-pointer-at'"))
        want = round((p_m + p_p) * 0.08)
        price_txt = await card.locator("[data-testid=bundle-price]").inner_text()
        check("Paket fiyatı doğru", re.sub(r"\D", "", price_txt).startswith(str(int(p_m + p_p - want))), f"{price_txt} beklenen {p_m + p_p - want}")
        await card.scroll_into_view_if_needed(); await pg.wait_for_timeout(1500)
        imgs = await card.evaluate("c => [...c.querySelectorAll('img')].filter(i => i.complete && i.naturalWidth > 0).length")
        check("Paket ürün görselleri yüklendi", imgs >= 2, str(imgs))
        await card.locator("[data-testid=bundle-add]").click(); await pg.wait_for_timeout(2500)
        vid = await pg.evaluate("localStorage.getItem('site_vid')")
        row = sql(f"select item_count||'|'||value from live_carts where id='{vid}'")
        check("Canlı sepet kaydı (izinli ziyaretçi)", row.startswith("2|") and abs(float(row.split("|")[1]) - (p_m + p_p)) < 1, row)

        await pg.goto(B + "/sepet", wait_until="networkidle"); await pg.wait_for_timeout(1500)
        check("Sepette paket indirimi", await pg.locator("[data-testid=bundle-applied]").count() == 1)
        body = await pg.inner_text("main")
        check("İndirim tutarı sepette", f"{want:,}".replace(",", ".") in body, f"beklenen {want}")
        # Kupon paketle birleşmez: paket daha avantajlı → kupon notu
        await pg.fill("input[placeholder='Kupon kodu']", "HOSGELDIN"); await pg.click("text=Uygula")
        await pg.wait_for_selector("[data-testid=coupon-note]", timeout=20000)
        check("Kupon yerine paket uygulandı (birleşmez)", "Paket indirimi daha avantajlı" in await pg.locator("[data-testid=coupon-note]").inner_text())

        # İngilizce sepet: paket adı çevrilmiş
        await pg.goto(B + "/en/cart", wait_until="networkidle"); await pg.wait_for_timeout(1500)
        check("İngilizce sepette paket adı", "Manticore + Pro-Pointer AT set" in await pg.inner_text("main"))

        # Ödeme (kart simülasyonu)
        await pg.goto(B + "/odeme?misafir=1", wait_until="networkidle")
        await pg.fill("input[name=phone]", "05321234567")
        await pg.fill("input[name=email]", "paket.test@ornek.com")
        await pg.fill("input[name=fullName]", "Paket Müşteri")
        await pg.select_option("select[name=city]", "İzmir")
        await pg.wait_for_function("document.querySelector(\"select[name=district]\")?.options.length > 2"); await pg.select_option("select[name=district]", "Bornova")
        await pg.fill("textarea[name=line]", "Kazımdirik Mah. 123 Sk. No 4")
        await pg.check("input[name=terms]")
        await pg.wait_for_timeout(1500)
        await pg.locator("button[type=submit]:visible").first.click()
        await pg.wait_for_url(re.compile(r".*/odeme/simulasyon.*"), timeout=60000)
        await pg.click("button[value=ok]")
        await pg.wait_for_url(re.compile(r".*/siparis/.*yeni=1.*"), timeout=60000)
        oid = re.search(r"/siparis/([^?]+)", pg.url).group(1)
        r = sql(f"select bundle_discount||'|'||discount_total||'|'||coalesce(applied_bundles::text,'')||'|'||payment_status||'|'||total from orders where id='{oid}'")
        parts = r.split("|")
        check("Sipariş paket indirimini kaydetti", abs(float(parts[0]) - want) < 0.01 and "Manticore" in parts[2] and parts[3] == "PAID", r)
        order_total = float(parts[4])
        check("Canlı sepet siparişe dönüştü", sql(f"select order_id from live_carts where id='{vid}'") == oid)
        await ctx.close()

        # ───────── Panel
        actx, ap = await admin_login(br)

        # Sepetler ekranı
        sql("insert into live_carts(id, email, name, items, value, item_count, path, updated_at, created_at) "
            f"values (gen_random_uuid()::text, 'terk@ornek.com', 'Terk Eden', '[{{\"productId\": \"{sql('select id from products where slug=$$gpz-8000$$')}\", \"qty\": 1}}]', 100, 1, '/urun/gpz-8000', now() - interval '3 hours', now() - interval '4 hours')")
        sql("insert into cart_snapshots(id, email, name, items, consent, updated_at) values (gen_random_uuid()::text, 'terk@ornek.com', 'Terk Eden', '[]', true, now() - interval '3 hours') on conflict (email) do update set consent=true")
        sql("insert into live_carts(id, items, value, item_count, path) "
            f"values (gen_random_uuid()::text, '[{{\"productId\": \"{sql('select id from products where slug=$$ace-250$$')}\", \"qty\": 2}}]', 200, 2, '/sepet')")
        await ap.goto(B + "/admin/sepetler", wait_until="networkidle")
        stats = await ap.locator("[data-testid=cart-stats]").inner_text()
        check("Sepet istatistikleri", "Şu an aktif sepet" in stats and "Terk edilen" in stats)
        check("Canlı sekmede aktif sepet", await ap.locator("[data-testid=cart-row]").count() >= 1 and "Ziyaretçi" in await ap.locator("[data-testid=cart-table]").inner_text())
        await ap.goto(B + "/admin/sepetler?t=terk", wait_until="networkidle")
        tbl = await ap.locator("[data-testid=cart-table]").inner_text()
        check("Terk edilen sekmesi", "Terk Eden" in tbl and "GPZ 8000" in tbl, tbl[:200])
        await ap.get_by_role("button", name="E-postayla hatırlat").first.click()
        msg = await toast(ap)
        check("Elle hatırlatma (izinli, SMTP yoksa açık hata)", "gönderildi" in msg or "SMTP" in msg, msg)
        await ap.goto(B + "/admin/sepetler?t=donusen", wait_until="networkidle")
        check("Siparişe dönüşen sekmesi", await ap.locator(f"a[href='/admin/siparisler/{oid}']").count() == 1)

        # Paket yönetimi: yeni paket
        await ap.goto(B + "/admin/paketler?yeni=1", wait_until="networkidle")
        await ap.fill("input[name=name]", "Test paketi")
        sels = ap.locator("[data-testid=bundle-items] select[name=itemProduct]")
        await sels.nth(0).select_option(sql("select id from products where slug='equinox-900'"))
        await sels.nth(1).select_option(sql("select id from products where slug='eqx-11-baslik'"))
        await ap.fill("input[name=discountValue]", "5")
        prev = await ap.locator("[data-testid=bundle-preview]").inner_text()
        check("Panel paket önizlemesi", "Paket fiyatı" in prev)
        await ap.get_by_role("button", name="Kaydet").click()
        await ap.wait_for_url(re.compile(r".*/admin/paketler$"), timeout=30000)
        check("Paket kaydedildi", sql("select count(*) from bundle_items bi join bundles b on b.id=bi.bundle_id where b.name='Test paketi'") == "2")
        await ap.goto(B + "/urun/equinox-900", wait_until="networkidle")
        check("Yeni paket ürün sayfasında", "Test paketi" in await ap.inner_text("body"))

        # ───────── Yapay zekâ
        await ap.goto(B + "/admin/ayarlar?t=yapay-zeka", wait_until="networkidle")
        await ap.fill("[data-testid=ai-settings] input[name=apiKey]", "sk-ant-test-0123456789abcdefghijkl")
        await ap.click("[data-testid=ai-settings] button[type=submit]")
        await toast(ap, "kaydedildi")
        check("AI anahtarı şifreli saklanıyor", sql("select value->>'apiKey' from settings where key='ai'").startswith("v1."))
        await ap.goto(B + "/admin/ayarlar?t=yapay-zeka", wait_until="networkidle")
        await ap.get_by_role("button", name="Bağlantıyı test et").click()
        check("AI bağlantı testi", "başarılı" in await toast(ap, "başarılı"))

        pid = sql("select id from products where slug='vanquish-560-pro-pack'")
        await ap.goto(B + f"/admin/urunler/{pid}", wait_until="networkidle")
        await ap.check("[data-testid=ai-part-en]")
        await ap.fill("[data-testid=ai-note]", "Sahilde de kullanılır")
        await ap.click("[data-testid=ai-run]")
        await ap.wait_for_selector("[data-testid=ai-results]", timeout=60000)
        n = await ap.locator("[data-testid=ai-suggestion]").count()
        check("AI önerileri geldi (TR + satış + EN)", n == 12, str(n))
        last = AI_CALLS[-1]
        prompt = last["body"]["messages"][0]["content"]
        check("AI isteği ürün bilgisini ve notu içerir", "Vanquish 560 Pro-Pack" in prompt and "Sahilde de kullanılır" in prompt and last["key"].startswith("sk-ant-test"))
        check("AI isteğinde müşteri verisi yok", "@ornek.com" not in json.dumps(last["body"]))
        await ap.click("[data-testid=ai-apply-all]")
        await ap.wait_for_timeout(500)
        check("Öneriler forma yazıldı", (await ap.input_value("textarea[name=shortDescription]")).startswith("AI kısa açıklama") and (await ap.input_value("input[name=tr_en_slug]")) == "ai-vanquish-en-slug")
        check("SEO açıklaması (kontrollü alan) güncellendi", (await ap.input_value("textarea[name=seoDescription]")).startswith("AI SEO açıklaması"))
        await ap.locator("button[type=submit]:visible", has_text="Değişiklikleri kaydet").click()
        await toast(ap, "kaydedildi")
        await ap.wait_for_timeout(1000)
        check("Ürün AI içeriğiyle kaydedildi", sql(f"select short_description from products where id='{pid}'").startswith("AI kısa açıklama") and sql(f"select value from translations where entity='product' and entity_id='{pid}' and field='name' and locale='en'") == "AI Vanquish EN")
        check("Kimler için ideal kaydedildi", "AI ideal bir" in sql(f"select ideal_for::text from products where id='{pid}'"))

        # ───────── E-fatura: Paraşüt
        await ap.goto(B + "/admin/ayarlar?t=e-fatura", wait_until="networkidle")
        await ap.click("[data-testid=einvoice-parasut]")
        await ap.fill("input[name=parasutCompanyId]", "123456")
        await ap.fill("input[name=parasutClientId]", "client-id")
        await ap.fill("input[name=parasutClientSecret]", "client-secret")
        await ap.fill("input[name=parasutUsername]", "entegrasyon@derinova.example")
        await ap.fill("input[name=parasutPassword]", "parasut-sifre")
        await ap.click("[data-testid=einvoice-settings] button[type=submit]")
        await toast(ap, "kaydedildi")
        check("Paraşüt şifresi şifreli saklanıyor", sql("select value->>'parasutPassword' from settings where key='einvoice'").startswith("v1."))
        await ap.goto(B + "/admin/ayarlar?t=e-fatura", wait_until="networkidle")
        await ap.get_by_role("button", name="Bağlantıyı test et").click()
        check("Paraşüt bağlantı testi", "başarılı" in await toast(ap, "Paraşüt"))

        await ap.goto(B + f"/admin/siparisler/{oid}", wait_until="networkidle")
        await ap.get_by_role("button", name="Paraşüt'te faturayı kes").click()
        msg = await toast(ap, "Fatura")
        check("Paraşüt faturası kesildi", "kesildi" in msg, msg)
        r = sql(f"select invoice_status||'|'||coalesce(invoice_no,'')||'|'||coalesce(invoice_url,'') from orders where id='{oid}'")
        check("Sipariş fatura bilgisi", r.startswith("ISSUED|DRN2026") and r.endswith(f"/api/fatura/{oid}"), r)
        sid = next(k for k, v in PS["invoices"].items())
        payload = PS["invoices"][sid]["payload"]["data"]
        tot = 0.0
        for d in payload["relationships"]["details"]["data"]:
            a = d["attributes"]
            tot += (a["unit_price"] * a["quantity"] - a.get("discount_value", 0)) * (1 + a["vat_rate"] / 100)
        check("Fatura toplamı sipariş toplamına eşit (indirim dağıtıldı)", abs(tot - order_total) < 0.1, f"{tot:.2f} / {order_total}")
        check("Bireysel alıcıda e-Arşiv ve 11111111111", any(c[1].endswith("/e_archives") for c in PS["calls"]) and any(c[0] == "POST" and c[1].endswith("/contacts") and c[2]["data"]["attributes"]["tax_number"] == "11111111111" for c in PS["calls"]))
        st, loc = nofollow(f"/api/fatura/{oid}?k={order_key(oid)}")
        check("Faturam bağlantısı güncel PDF'e yönlenir", st == 302 and (loc or "").startswith("https://parasut-pdf.example.com/"), f"{st} {loc}")
        st, _ = nofollow(f"/api/fatura/{oid}")
        check("Anahtarsız fatura bağlantısı kapalı", st == 403, str(st))
        # Aynı sipariş iki kez faturalanmaz
        before = len(PS["invoices"])
        await ap.goto(B + f"/admin/siparisler/{oid}", wait_until="networkidle")
        check("Faturalı siparişte kes düğmesi yok", await ap.get_by_role("button", name="Paraşüt'te faturayı kes").count() == 0 and len(PS["invoices"]) == before)

        # Hata ve tekrar deneme: satış faturası yeniden oluşturulmaz
        oid2 = sql("select id from orders where payment_status='PAID' and channel='WEB' and invoice_url is null and status not in ('CANCELLED','REFUNDED') order by created_at desc limit 1")
        PS["fail_archive"] = True
        await ap.goto(B + f"/admin/siparisler/{oid2}", wait_until="networkidle")
        await ap.get_by_role("button", name="Paraşüt'te faturayı kes").click()
        msg = await toast(ap, "Test hatası")
        check("Paraşüt hatası anlaşılır gösterildi", "e-Arşiv reddedildi" in msg, msg)
        await ap.goto(B + f"/admin/siparisler/{oid2}", wait_until="networkidle")
        check("Hata siparişte görünür", "reddedildi" in await ap.locator("[data-testid=einvoice-error]").inner_text())
        count_si = len(PS["invoices"])
        PS["fail_archive"] = False
        await ap.get_by_role("button", name="Tekrar dene").click()
        msg = await toast(ap, "kesildi")
        check("Tekrar denemede kesildi, satış faturası tekrar oluşmadı", "kesildi" in msg and len(PS["invoices"]) == count_si, f"{msg} {count_si}->{len(PS['invoices'])}")

        # ───────── E-fatura: BirFatura
        await ap.goto(B + "/admin/ayarlar?t=e-fatura", wait_until="networkidle")
        await ap.click("[data-testid=einvoice-birfatura]")
        await ap.click("[data-testid=einvoice-settings] button[type=submit]")
        await toast(ap, "kaydedildi")
        await ap.goto(B + "/admin/ayarlar?t=e-fatura", wait_until="networkidle")
        token = await ap.input_value("[data-testid=birfatura-token]")
        check("BirFatura anahtarı üretildi", re.match(r"^[0-9a-f-]{36}$", token or "") is not None)
        st, _ = bf("orderStatus", token="yanlis")
        check("BirFatura yanlış token reddedilir", st == 401)
        st, j = bf("orderStatus", token=token)
        check("BirFatura sipariş durumları", st == 200 and any(x["Id"] == 2 for x in j["OrderStatus"]))
        st, j = bf("paymentMethods", token=token)
        check("BirFatura ödeme yöntemleri", st == 200 and len(j["PaymentMethods"]) == 3)
        now = datetime.now(timezone.utc) + timedelta(hours=3)
        fmt = lambda d: d.strftime("%d.%m.%Y %H:%M:%S")
        st, j = bf("orders", {"orderStatusId": 2, "startDateTime": fmt(now - timedelta(days=30)), "endDateTime": fmt(now + timedelta(minutes=5))}, token)
        orders_ = j.get("Orders", [])
        check("BirFatura siparişleri çekti", st == 200 and len(orders_) >= 1, f"{st} {len(orders_)}")
        if orders_:
            o = orders_[0]
            lines = sum((d["ProductUnitPriceTaxIncluding"] - d["DiscountUnitTaxIncluding"]) * d["ProductQuantity"] for d in o["OrderDetails"])
            check("BirFatura tutarları tutarlı", abs(lines + o["ShippingChargeTotalTaxIncluding"] - o["TotalPaidTaxIncluding"]) < 0.1, f"{lines} + {o['ShippingChargeTotalTaxIncluding']} vs {o['TotalPaidTaxIncluding']}")
            check("BirFatura tarih biçimi", re.match(r"^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}:\d{2}$", o["OrderDate"]) is not None)
            target = next((x for x in orders_ if not sql(f"select invoice_url from orders where number={x['OrderId']}")), o)
            st, j = bf("invoiceLinkUpdate", {"orderId": target["OrderId"], "faturaUrl": "https://uygulama.birfatura.com/dosyagetir?guid=x.pdf", "faturaNo": "ARS2026000000001", "faturaTarihi": fmt(now)}, token)
            r = sql(f"select invoice_no||'|'||invoice_provider||'|'||invoice_status from orders where number={target['OrderId']}")
            check("BirFatura fatura bağlantısı siparişe yazıldı", st == 200 and r == "ARS2026000000001|birfatura|ISSUED", f"{st} {r}")
            st, j = bf("orderCargoUpdate", {"orderId": target["OrderId"], "orderStatusId": 4, "cargoTrackingCode": "AT27NN805", "cargoCompany": "Aras"}, token)
            r = sql(f"select status||'|'||tracking_number from orders where number={target['OrderId']}")
            check("BirFatura kargo bilgisi siparişe yazıldı", st == 200 and r.endswith("|AT27NN805"), f"{st} {r}")
        await ap.goto(B + "/admin/ayarlar?t=e-fatura", wait_until="networkidle")
        check("Son çekme bilgisi", "sipariş" in await ap.locator("[data-testid=birfatura-last-pull]").inner_text())
        st, _ = bf("orders", {"startDateTime": "yanlış"}, token)
        check("BirFatura hatalı tarih reddedilir", st == 400)

        await actx.close()
        await br.close()

    sql("delete from settings where key in ('ai','einvoice')")
    ok = sum(1 for _, c in results if c)
    print(f"\n{ok}/{len(results)} geçti")
    raise SystemExit(0 if ok == len(results) else 1)


asyncio.run(main())
