"""Ürün/kategori/ödeme akışı: deneme kiralaması yok, benzer modeller üstte, hızlı filtreler, katlanır kısa bilgi,
giriş/misafir seçimi, misafir sonrası bilgi ve Türkçe form doğrulaması."""
import asyncio, re, sys
from playwright.async_api import async_playwright
B = "http://127.0.0.1:3000"
res = []
def chk(name, ok):
    res.append((name, bool(ok))); print(("OK  " if ok else "FAIL") + " " + name)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await (await b.new_context(viewport={"width": 1280, "height": 900}, locale="en-US")).new_page()
        await pg.goto(B + "/urun/vanquish-560-pro-pack", wait_until="networkidle")
        html = await pg.content()
        chk("Önce dene / kiralama yok", "Önce dene" not in html and "kiralama" not in html.lower())
        sim = pg.locator("[data-testid=pdp-similar]")
        chk("Benzer modeller var", await sim.count() == 1)
        y_sim = (await sim.bounding_box())["y"]; y_tabs = (await pg.locator("#genel").bounding_box())["y"]
        chk("Benzer modeller bölümlerden önce", y_sim < y_tabs)
        chk("Güven kutuları 4", await pg.locator("[data-testid=pdp-trust] > *").count() == 4)
        await pg.locator("[data-testid=gallery-main]").click(); await pg.wait_for_timeout(400)
        chk("Tam ekran galeri açılır", await pg.locator("[data-testid=gallery-lightbox]").count() == 1)
        await pg.keyboard.press("Escape")

        await pg.goto(B + "/kategori/define-ve-sikke", wait_until="networkidle")
        chk("Kısa bilgi katlanmış", await pg.locator("[data-testid=catalog-answer]").count() == 1 and not await pg.locator("[data-testid=catalog-answer]").get_attribute("open"))
        chk("Kısa bilgi metni sayfada (SEO)", "için hangi dedektör" in await pg.content())
        q = pg.locator("[data-testid=quick-filters] a")
        chk("Hızlı filtreler", await q.count() >= 4)
        n0 = int(re.search(r"(\d+) ürün", await pg.locator("text=/\\d+ ürün$/").first.inner_text()).group(1))
        await pg.locator("[data-testid=quick-filters] a", has_text="Çok frekanslı").click(); await pg.wait_for_url(re.compile(r".*tek=MULTI.*")); await pg.wait_for_timeout(800)
        n1 = int(re.search(r"(\d+) ürün", await pg.locator("text=/\\d+ ürün$/").first.inner_text()).group(1))
        chk(f"Hızlı filtre daraltır ({n0}→{n1})", 0 < n1 < n0)
        chk("Hızlı filtre etkin görünür", await pg.locator("[data-testid=quick-filters] a[aria-pressed=true]").count() == 1)
        sel = pg.locator("select#sirala")
        pr = await sel.evaluate("e => parseFloat(getComputedStyle(e).paddingRight)")
        chk(f"Açılır liste oku içeride (sağ boşluk {pr}px)", pr >= 36)

        # Ödeme: giriş yapmamış → seçim ekranı
        await pg.goto(B + "/urun/ace-250", wait_until="networkidle")
        await pg.click('button:has-text("Hemen al")'); await pg.wait_for_url("**/odeme"); await pg.wait_for_timeout(800)
        chk("Giriş / misafir seçimi", await pg.locator("[data-testid=checkout-gate]").count() == 1)
        await pg.click("[data-testid=guest-continue]"); await pg.wait_for_url("**/odeme?misafir=1"); await pg.wait_for_timeout(1500)
        chk("Misafir bilgilendirmesi", await pg.locator("[data-testid=guest-info]").count() == 1)
        await pg.locator("button[type=submit]:visible").first.click(); await pg.wait_for_timeout(700)
        errs = await pg.locator(".field-error").all_inner_texts()
        chk("Türkçe alan hataları gösterilir", len(errs) >= 3 and any("boş bırakılamaz" in e for e in errs))
        chk("Etiketli mesaj (Cep telefonu)", any("Cep telefonu" in e for e in errs))
        await pg.fill("input[name=email]", "yanlis")
        await pg.locator("button[type=submit]:visible").first.click(); await pg.wait_for_timeout(500)
        errs = await pg.locator(".field-error").all_inner_texts()
        chk("E-posta biçim mesajı", any("Geçerli bir e-posta" in e for e in errs))
        await pg.fill("input[name=email]", "e2e.test@ornek.com"); await pg.wait_for_timeout(200)
        errs = await pg.locator(".field-error").all_inner_texts()
        chk("Düzeltilince hata kalkar", not any("e-posta" in e for e in errs))
        m = await (await b.new_context(viewport={"width": 390, "height": 844})).new_page()
        for path in ["/kategori/define-ve-sikke", "/urun/vanquish-560-pro-pack", "/odeme"]:
            await m.goto(B + path, wait_until="networkidle")
            sw = await m.evaluate("document.documentElement.scrollWidth")
            chk(f"Mobilde yana taşma yok {path} ({sw})", sw <= 390)
        await b.close()
    bad = [n for n, ok in res if not ok]
    print(f"\n{len(res)-len(bad)}/{len(res)} geçti")
    sys.exit(1 if bad else 0)

asyncio.run(main())
