"""Rafa yeni giren büyük kartı: panelde ürünün 'büyük mavi kartta göster' işareti; kaldırınca en son eklenene döner."""
import asyncio, re, sys
from playwright.async_api import async_playwright
B = "http://127.0.0.1:3000"
res = []
def chk(n, ok, info=""):
    res.append((n, bool(ok))); print(("OK  " if ok else "FAIL") + " " + n + (f"  [{info}]" if info and not ok else ""))

async def lead(pg):
    await pg.goto(B + "/", wait_until="networkidle")
    el = pg.locator("[data-testid=new-lead]")
    return (await el.inner_text()) if await el.count() else ""

async def toggle(ap, slug, on):
    await ap.goto(B + "/urun/" + slug, wait_until="networkidle")
    pid = await ap.evaluate("(()=>{const m=document.body.innerHTML.match(/productId\\\\?\":\\\\?\"([0-9a-f-]{36})/);return m&&m[1]})()")
    await ap.goto(B + f"/admin/urunler/{pid}", wait_until="networkidle")
    cb = ap.locator("input[name=newSpotlight]")
    await (cb.check() if on else cb.uncheck())
    await ap.locator("form button[type=submit]", has_text="Kaydet").first.click()
    # CI yavaş olabilir: kaydın bittiğini bildirimden anla, sonra kısa bekle
    try:
        await ap.wait_for_selector("[data-sonner-toast]", timeout=15000)
    except Exception:
        pass
    await ap.wait_for_timeout(1500)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ap = await (await b.new_context(viewport={"width": 1280, "height": 900})).new_page()
        await ap.goto(B + "/admin/giris"); await ap.fill("input[name=email]", "admin@derinova.local"); await ap.fill("input[name=password]", "Demo12345!")
        await ap.click("button[type=submit]"); await ap.wait_for_url(re.compile(r".*/admin$"))
        pg = await (await b.new_context(viewport={"width": 1280, "height": 900})).new_page()
        before = await lead(pg)
        chk("Varsayılan: SON EKLENEN", "SON EKLENEN" in before, before[:60])
        await toggle(ap, "ace-250", True)
        t = await lead(pg)
        chk("İşaretlenen ürün büyük kartta", "Ace 250" in t and "ÖNE ÇIKAN" in t, t[:80])
        await toggle(ap, "vanquish-560-pro-pack", True)
        t = await lead(pg)
        chk("Yeni işaret öncekinin yerine geçer", "Vanquish 560" in t, t[:80])
        await ap.goto(B + "/admin/urunler", wait_until="networkidle")
        await toggle(ap, "ace-250", False)
        t = await lead(pg)
        chk("Başka ürünün işaretini kaldırmak seçimi bozmaz", "Vanquish 560" in t, t[:80])
        await toggle(ap, "vanquish-560-pro-pack", False)
        # Ana sayfa önbelleği kaydın hemen ardından yenilenir; birkaç saniye içinde eski haline dönmesini bekle
        for _ in range(12):
            t = await lead(pg)
            if "SON EKLENEN" in t and "ÖNE ÇIKAN" not in t:
                break
            await pg.wait_for_timeout(1500)
        # Metnin tamamı (ürün adı) değil, mod karşılaştırılır: otomatik seçimde aynı anda yeni ürün de eklenmiş olabilir
        chk("İşaret kalkınca otomatiğe döner", "SON EKLENEN" in t and "ÖNE ÇIKAN" not in t, t[:80])
        await b.close()
    bad = [n for n, ok in res if not ok]
    print(f"\n{len(res)-len(bad)}/{len(res)} geçti"); sys.exit(1 if bad else 0)

asyncio.run(main())
