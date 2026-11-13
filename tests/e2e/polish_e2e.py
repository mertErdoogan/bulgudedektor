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
