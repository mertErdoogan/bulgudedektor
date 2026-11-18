"""Çok dil: panelden İngilizceyi aç, ürün çevirisi gir; /en sayfaları, hreflang, canonical, arayüz metinleri,
dil ön ekli bağlantılar, İngilizce form doğrulaması; dil kapatılınca Türkçeye yönlendirme."""
import asyncio, re, sys
from playwright.async_api import async_playwright
B = "http://127.0.0.1:3000"
res = []
def chk(name, ok, info=""):
    res.append((name, bool(ok))); print(("OK  " if ok else "FAIL") + " " + name + (f"  [{info}]" if info and not ok else ""))

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ap = await (await b.new_context(viewport={"width": 1280, "height": 900})).new_page()
        await ap.goto(B + "/admin/giris"); await ap.fill("input[name=email]", "admin@derinova.local"); await ap.fill("input[name=password]", "Demo12345!")
        await ap.click("button[type=submit]"); await ap.wait_for_url(re.compile(r".*/admin$"))
        # Kapalıyken /en → Türkçe
        r = await ap.request.get(B + "/en/urun/manticore", max_redirects=0)
        chk("Dil kapalıyken /en Türkçeye yönlenir", r.status in (307, 308) and r.headers.get("location", "").endswith("/urun/manticore"), str(r.status))
        await ap.goto(B + "/admin/ayarlar?t=diller", wait_until="networkidle")
        await ap.check("input[name=locale_en]"); await ap.click("[data-testid=i18n-settings] button[type=submit]"); await ap.wait_for_timeout(1200)
        # Ürün çevirisi
        await ap.goto(B + "/admin/urunler", wait_until="networkidle")
        await ap.goto(B + "/urun/manticore", wait_until="networkidle")
        pid = await ap.evaluate("(()=>{const m=document.body.innerHTML.match(/productId\\\\?\":\\\\?\"([0-9a-f-]{36})/);return m&&m[1]})()")
        await ap.goto(B + f"/admin/urunler/{pid}", wait_until="networkidle")
        chk("Panelde Çeviriler bölümü", await ap.locator("[data-testid=translation-fields]").count() == 1)
        await ap.locator("[data-testid=translation-fields] summary").first.click()
        await ap.fill("input[name=tr_en_name]", "Manticore Multi-Frequency Detector")
        await ap.fill("textarea[name=tr_en_shortDescription]", "Minelab's most powerful multi-IQ+ detector.")
        await ap.locator("form button[type=submit]", has_text="Kaydet").first.click(); await ap.wait_for_timeout(2000)

        pg = await (await b.new_context(viewport={"width": 1280, "height": 900})).new_page()
        await pg.goto(B + "/en/urun/manticore", wait_until="networkidle")
        html = await pg.content()
        chk("/en ürün sayfası açılır", "Manticore Multi-Frequency Detector" in await pg.inner_text("h1"), await pg.inner_text("h1"))
        chk("html lang=en", await pg.evaluate("document.documentElement.lang") == "en")
        chk("canonical /en", re.search(r'rel="canonical" href="[^"]*/en/urun/manticore"', html) is not None)
        chk("hreflang tr + en + x-default", all(x in html.lower() for x in ['hreflang="tr-tr"', 'hreflang="en"', 'hreflang="x-default"']), str(re.findall(r'<link[^>]*alternate[^>]*>', html)[:4]))
        chk("Butonlar İngilizce", await pg.locator("button", has_text="Add to cart").count() >= 1 and await pg.locator("button", has_text="Buy now").count() >= 1)
        chk("Bilgi satırları İngilizce", "Installments" in await pg.inner_text("[data-testid=pdp-info]"))
        hrefs = await pg.eval_on_selector_all("main a[href^='/urun/']", "els => els.length")
        en_hrefs = await pg.eval_on_selector_all("main a[href^='/en/urun/']", "els => els.length")
        chk(f"Bağlantılar /en ön ekli ({en_hrefs} / tr {hrefs})", en_hrefs > 0 and hrefs == 0)
        chk("Dil seçici", await pg.locator("[data-testid=lang-switch]").count() >= 1)
        await pg.goto(B + "/urun/manticore", wait_until="networkidle")
        chk("Türkçe sayfa Türkçe ad", "Manticore" == (await pg.inner_text("h1")).strip(), await pg.inner_text("h1"))
        await pg.goto(B + "/en/kategori/define-ve-sikke", wait_until="networkidle")
        chk("Kategori başlığı İngilizce", "detectors" in await pg.inner_text("h1"))
        chk("Hızlı filtreler İngilizce", "In stock" in await pg.inner_text("[data-testid=quick-filters]"))
        await pg.goto(B + "/en/urun/ace-250", wait_until="networkidle")
        await pg.click('button:has-text("Buy now")'); await pg.wait_for_url(re.compile(r".*/en/odeme$")); await pg.wait_for_timeout(800)
        chk("Ödeme seçimi /en ve İngilizce", "How would you like to continue?" in await pg.inner_text("main"))
        await pg.click("[data-testid=guest-continue]"); await pg.wait_for_url(re.compile(r".*/en/odeme\?misafir=1")); await pg.wait_for_timeout(1200)
        await pg.locator("button[type=submit]:visible").first.click(); await pg.wait_for_timeout(600)
        errs = await pg.locator(".field-error").all_inner_texts()
        chk("Form hataları İngilizce", any("is required" in e for e in errs), str(errs[:2]))
        sm = await (await pg.request.get(B + "/sitemap.xml")).text()
        chk("Site haritasında /en adresleri", "/en/urun/manticore" in sm and 'hreflang="en"' in sm)
        # Kapat
        await ap.goto(B + "/admin/ayarlar?t=diller", wait_until="networkidle")
        await ap.uncheck("input[name=locale_en]"); await ap.click("[data-testid=i18n-settings] button[type=submit]"); await ap.wait_for_timeout(1200)
        r = await ap.request.get(B + "/en/urun/manticore", max_redirects=0)
        chk("Kapatınca yine Türkçeye yönlenir", r.status in (307, 308))
        await b.close()
    bad = [n for n, ok in res if not ok]
    print(f"\n{len(res)-len(bad)}/{len(res)} geçti")
    sys.exit(1 if bad else 0)

asyncio.run(main())
