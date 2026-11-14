"""Dış göz değerlendirmesinden sonra yapılan düzeltmeler uçtan uca.

Sepetteki otomatik kampanya ürün sayfasında ve kartta görünüyor mu (ve sepetle aynı tutar mı), "YENİ" yalnızca rozetli
üründe mi, "altın dedektörü" aramasında altın cihazları önde mi, mobilde kategori ilk ekranında ürün var mı,
mobil banner başlığı, boş görsel yer tutucusu, kompakt çerez penceresi.
"""
import os, re, asyncio, subprocess
from playwright.async_api import async_playwright

B = os.environ.get("BASE_URL", "http://localhost:3000")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130.0 Safari/537.36"
DB = os.environ.get("DATABASE_URL", "postgresql://postgres@localhost/bulgu")
res = []
def chk(n, c, info=""): c = bool(c); res.append((n, c)); print(("PASS" if c else "FAIL"), n, "" if c else info)
def sql(q): return subprocess.run(["psql", DB, "-tAc", q], capture_output=True, text=True).stdout.strip()

async def main():
    sql("delete from rate_hits")
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get("CHROME", "/usr/bin/google-chrome"))
        c = await b.new_context(user_agent=UA, viewport={"width": 1440, "height": 900}); pg = await c.new_page()
        errs = []; pg.on("pageerror", lambda e: errs.append(pg.url + " :: " + str(e)[:90]))

        # ── Çerez penceresi kompakt (sol altta, en fazla 420 px)
        await pg.goto(B + "/", wait_until="networkidle")
        box = await pg.locator("[role=dialog][aria-label='Çerez tercihleri']").bounding_box()
        chk("Çerez penceresi kompakt", box and box["width"] <= 420 and box["x"] < 100, box)
        await pg.click('button:has-text("Sadece zorunlu")')

        # ── Ürün sayfası: sepette düşecek kampanya tutarı
        await pg.goto(B + "/urun/vanquish-560-pro-pack", wait_until="networkidle")
        deal = await pg.locator("[data-testid=pdp-deal]").inner_text() if await pg.locator("[data-testid=pdp-deal]").count() else ""
        chk("Ürün sayfası: 'Sepette 48.088 TL'", "48.088" in deal, deal)
        chk("Ürün sayfası: sıfır olan sorular sayısı gösterilmiyor", await pg.locator("text=Sorular (0)").count() == 0)
        await pg.get_by_role("button", name="Sepete ekle").first.click(); await pg.wait_for_timeout(1200)
        await pg.goto(B + "/sepet", wait_until="networkidle")
        chk("Sepet toplamı ürün sayfasındakiyle aynı", "48.088" in await pg.inner_text("main"))

        # ── Ürün sayfası: bölüm menüsü (yorum sayısıyla), tıklayınca bölüme gider, satın al kutusu ekrandan çıkınca menüde mini satın al
        await pg.goto(B + "/urun/vanquish-560-pro-pack", wait_until="networkidle")
        tabs = pg.locator("[data-testid=pdp-tabs]")
        chk("Bölüm menüsünde yorum sayısı", "Yorumlar" in await tabs.inner_text() and "2" in await tabs.locator("a[href='#yorumlar']").inner_text())
        await tabs.locator("a[href='#yorumlar']").click(); await pg.wait_for_timeout(1200)
        top = await pg.evaluate("document.getElementById('yorumlar').getBoundingClientRect().top")
        chk("Yorumlar'a tıklayınca bölüme gidiyor", 0 < top < 260, top)
        chk("Okunan bölüm vurgulu", await tabs.locator("a[aria-current=true]").get_attribute("href") == "#yorumlar")
        chk("Menüde mini 'Sepete ekle' görünür", await tabs.locator("button:has-text('Sepete ekle')").is_visible())
        chk("Öne çıkan bilgiler (teknoloji, su, ağırlık)", await pg.locator("[data-testid=pdp-facts] >> text=Teknoloji").count() == 1)
        chk("Fiyat kartında teslimat satırı", await pg.locator("[data-testid=pdp-delivery]").count() == 1)

        # ── Kartlar: sepette fiyatı, YENİ sadece rozetli üründe
        await pg.goto(B + "/kategori/define-ve-sikke", wait_until="networkidle")
        vq = pg.locator("article:has(a[href='/urun/vanquish-560-pro-pack'])")
        chk("Kartta 'Sepette' fiyatı", "48.088" in await vq.locator("[data-testid=card-deal]").inner_text())
        chk("Kampanya dışı üründe 'Sepette' yok", await pg.locator("article:has(a[href='/urun/ace-250']) [data-testid=card-deal]").count() == 0)
        news = await pg.evaluate("() => [...document.querySelectorAll('article')].filter(a => [...a.querySelectorAll('span')].some(s => s.textContent.trim() === 'YENİ')).map(a => a.querySelector('a[href^=\"/urun/\"]').getAttribute('href'))")
        chk("YENİ yalnızca Manticore'da", news == ["/urun/manticore"], news)
        chk("Kartta tam genişlikte kırmızı buton yok", await pg.locator("article button.bg-brand").count() == 0)

        # ── Arama: altın dedektörü → altın cihazları önde
        await pg.goto(B + "/ara?q=altın dedektörü", wait_until="networkidle")
        first = await pg.evaluate("() => [...document.querySelectorAll('main article a[href^=\"/urun/\"]')].map(a => a.getAttribute('href')).filter((v, i, a) => a.indexOf(v) === i).slice(0, 3)")
        gold = {"/urun/gpx-6000", "/urun/gpz-8000", "/urun/gold-monster-2000"}
        chk("Altın aramasında ilk 3 sonuç altın cihazı", set(first) == gold, first)

        # ── Boş görsel yer tutucusu
        pid = sql("select id from products where slug='ace-250'")
        saved = sql(f"select url || '|' || sort_order from product_images where product_id='{pid}'").split("\n")
        sql(f"delete from product_images where product_id='{pid}'")
        await pg.goto(B + "/kategori/define-ve-sikke", wait_until="networkidle")
        chk("Görselsiz üründe yer tutucu", await pg.locator("article:has(a[href='/urun/ace-250']) [role=img][aria-label='Görsel hazırlanıyor']").count() == 1)
        for row in filter(None, saved):
            url, so = row.rsplit("|", 1)
            sql(f"insert into product_images (id, product_id, url, sort_order) values (gen_random_uuid()::text, '{pid}', '{url}', {so})")

        # ── Ana sayfa bölümleri
        await pg.goto(B + "/", wait_until="networkidle")
        half = await pg.evaluate("() => document.querySelector('.ticker-track')?.scrollWidth / 2")
        chk("Şerit dikişsiz (yarısı ≥ 2560 px)", half and half >= 2560, half)
        chk("Nav'da kurumsal link yok (üst şeritte)", await pg.locator("nav[aria-label='Ana menü'] a[href='/sayfa/hakkimizda']").count() == 0 and await pg.locator("header a[href='/sayfa/hakkimizda']").count() == 1)
        chk("Test bandı: ilk soru cevapları", await pg.locator("[data-testid=wizard-band] a[href='/sihirbaz?amac=altin']").count() == 1)
        ex = pg.locator("[data-testid=explore]")
        chk("Amacına göre keşfet: sekmeler", await ex.get_by_role("tab").count() >= 4)
        await ex.get_by_role("tab", name="Doğal altın").click(); await pg.wait_for_timeout(400)
        hrefs = await ex.locator("[role=tabpanel] a[href^='/urun/']").evaluate_all("els => [...new Set(els.map(e => e.getAttribute('href')))]")
        chk("Sekme değişince altın cihazları", "/urun/gpx-6000" in hrefs and "/urun/ace-250" not in hrefs, hrefs)
        chk("Marka vitrini: Minelab büyük + diğer markalar", await pg.locator("[data-testid=brand-showcase] a[href='/marka/garrett']").count() == 1 and await pg.locator("[data-testid=brand-showcase] a[href^='/urun/']").count() == 4)
        eb = await pg.locator("[data-testid=expert-band]").inner_text()
        chk("Uzman bandı: kamera/görüntülü yok", "kamera" not in eb.lower() and "görüntülü" not in eb.lower() and "WhatsApp" in eb)
        chk("Güven bandı: seri no formu", await pg.locator("[data-testid=trust-band] form[action='/seri-no'] input[name=no]").count() == 1)
        chk("Yorumlar: puan dağılımı", await pg.locator("[data-testid=home-reviews] >> text=onaylı yorum").count() == 1)
        chk("Rehber vitrini: 3 yazı + okuma süresi", await pg.locator("[data-testid=blog-showcase] a[href^='/blog/']").count() == 3 and await pg.locator("[data-testid=blog-showcase] >> text=/dk okuma/").count() == 1)

        # ── Animasyonlar: ilk ekran animasyonsuz, aşağıdaki bölümler kaydırınca bir kez belirir
        await pg.goto(B + "/", wait_until="networkidle")
        chk("Banner hiç gizlenmiyor", await pg.evaluate("getComputedStyle(document.querySelector('[data-testid=hero-stage]')).opacity") == "1")
        chk("Aşağıdaki bölüm başta gizli", await pg.evaluate("getComputedStyle(document.querySelector('[data-testid=explore]')).opacity") == "0")
        for y in range(0, 12000, 700):
            await pg.evaluate(f"window.scrollTo(0,{y})"); await pg.wait_for_timeout(100)
        await pg.wait_for_timeout(1300)
        chk("Kaydırınca tüm bölümler görünür", await pg.evaluate("[...document.querySelectorAll('[data-reveal-root] section.rv')].every(s => s.classList.contains('in') && getComputedStyle(s).opacity === '1')"))
        b1 = pg.locator("[data-testid=explore] article button:has-text('Sepete ekle')").first
        await b1.click(); await pg.wait_for_timeout(250)
        chk("Sepete ekle: 'Eklendi' onayı", await pg.locator("[data-testid=explore] article button:has-text('Eklendi')").count() == 1)
        rm = await b.new_context(user_agent=UA, viewport={"width": 1440, "height": 900}, reduced_motion="reduce"); rp = await rm.new_page()
        await rp.goto(B + "/", wait_until="networkidle")
        chk("Hareketi azalt: animasyon yok, her şey görünür", await rp.evaluate("getComputedStyle(document.querySelector('[data-testid=explore]')).opacity") == "1")
        await rm.close()

        # ── Sayfa geçişi: sunucu yavaşken tıklar tıklamaz iskelet + çubuk, sayfa gelince kalkar
        await pg.goto(B + "/kategori/define-ve-sikke", wait_until="networkidle")
        async def slow(route):
            if route.request.headers.get("rsc") == "1" and "next-router-prefetch" not in route.request.headers:
                await asyncio.sleep(1.2)
            await route.continue_()
        await pg.route("**/*", slow)
        await pg.locator("main article a[href='/urun/x-terra-pro']").first.click(); await pg.wait_for_timeout(300)
        chk("Tıklayınca ürün iskeleti hemen", await pg.locator("[data-testid=route-skeleton]").count() == 1)
        await pg.wait_for_url("**/urun/x-terra-pro"); await pg.wait_for_timeout(500)
        chk("Sayfa gelince iskelet kalkıyor", await pg.locator("[data-testid=route-skeleton]").count() == 0)
        await pg.unroute("**/*")
        r = await pg.request.get(B + "/uye/giris", max_redirects=0)
        chk("Eski adres yönlendirmesi hâlâ 308", r.status in (301, 308), r.status)

        # ── Mobil: kategori ilk ekranında ürün, banner başlığı
        m = await b.new_context(user_agent=UA, viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True); mp = await m.new_page()
        mp.on("pageerror", lambda e: errs.append(mp.url + " :: " + str(e)[:90]))
        await mp.goto(B + "/kategori/define-ve-sikke", wait_until="networkidle")
        top = await mp.locator("main article").first.bounding_box()
        chk("Mobil kategori: ilk ürün ilk ekranda", top and top["y"] < 700, top)
        await mp.goto(B + "/", wait_until="networkidle")
        chk("Mobil banner başlığı", await mp.locator("[data-testid=hero-caption]").count() == 1)
        logo = await mp.locator("header a[aria-label$='ana sayfa'] svg, header a[aria-label$='ana sayfa'] img").first.bounding_box()
        chk("Mobil logo küçük", logo and logo["height"] <= 40, logo)
        chk("Sayfa hatası yok", not errs, errs[:2])
        await b.close()
    ok = sum(1 for _, c in res if c); print(f"{ok}/{len(res)} geçti")

asyncio.run(main())
