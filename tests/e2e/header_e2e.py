"""Header ve menü uçtan uca.

Sade nav (Minelab ve kategori menüleri), arama paleti (boş durum + yazarken), "/" kısayolu, kaydırınca ince başlık,
ana sayfa "Ne arıyorsun?" kısayolları ve paneldeki "Kısayollar ve menü kartı" ayarı.
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
    sql("update users set totp_enabled=false, totp_secret=null, totp_last_step=null")
    sql("delete from rate_hits")
    sql("delete from settings where key in ('nav','merch')")
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(executable_path=os.environ.get("CHROME", "/usr/bin/google-chrome"))
            c = await b.new_context(user_agent=UA, viewport={"width": 1440, "height": 900}); pg = await c.new_page()
            errs = []; pg.on("pageerror", lambda e: errs.append(pg.url + " :: " + str(e)[:90]))
            await pg.goto(B + "/", wait_until="networkidle")
            await pg.click('button:has-text("Sadece zorunlu")')
            nav = pg.locator("nav[aria-label='Ana menü']")

            # ── Nav: Minelab menüsü (seriler + görselli modeller + kampanya kartı)
            await nav.locator("a:has-text('Minelab')").hover(); await pg.wait_for_timeout(500)
            panel = nav.locator("text=Öne çıkan modeller")
            chk("Minelab menüsü açılıyor", await panel.count() == 1)
            chk("Minelab menüsünde 6 model", await nav.locator("a[href^='/urun/']").count() == 6)
            chk("Seriler listesi", await nav.locator("a[href^='/marka/minelab?kategori=']").count() >= 3)
            chk("Kampanya kartı (otomatik)", await nav.locator("a[href='/kampanyalar']:has-text('Kampanyayı gör')").count() == 1)
            await pg.keyboard.press("Escape"); await pg.wait_for_timeout(200)
            chk("Esc menüyü kapatıyor", await nav.locator("text=Öne çıkan modeller").count() == 0)

            # ── Kategori menüsü: markaya göre + öne çıkanlar
            await pg.mouse.move(700, 700); await pg.wait_for_timeout(300)
            await nav.locator("a:has-text('Define Dedektörü')").hover(); await pg.wait_for_timeout(500)
            chk("Kategori menüsü: markaya göre", await nav.locator("a[href='/kategori/define-ve-sikke?marka=minelab']").count() == 1)
            chk("Kategori menüsü: 3 ürün", await nav.locator("a[href^='/urun/']").count() == 3)
            await pg.mouse.move(700, 800); await pg.wait_for_timeout(400)
            chk("Kurumsal linkler menüde/üst şeritte", await pg.locator("header a[href='/sayfa/hakkimizda']").count() >= 1)

            # ── Arama paleti: "/" kısayolu, boş durum, yazarken
            await pg.keyboard.press("/"); await pg.wait_for_timeout(900)
            focused = await pg.evaluate("document.activeElement?.getAttribute('name')")
            chk("'/' arama kutusuna odaklıyor", focused == "q")
            pal = pg.locator("[aria-label='Arama önerileri']")
            chk("Boş durum: öne çıkan modeller", await pal.locator("text=ÖNE ÇIKAN MODELLER").count() == 1 and await pal.locator("a[href^='/urun/']").count() >= 3)
            chk("Boş durum: markalar", await pal.locator("a[href='/marka/minelab']").count() == 1)
            await pg.keyboard.type("equ"); await pg.wait_for_timeout(1000)
            chk("Yazarken: ürün + fiyat + stok", await pal.locator("a[href='/urun/equinox-900']:has-text('Stokta')").count() == 1)
            chk("Yazarken: toplam sonuç", await pal.locator("text=/tüm sonuçlar \\(\\d+\\)/").count() == 1)
            await pg.keyboard.press("ArrowDown"); await pg.keyboard.press("Enter")
            await pg.wait_for_url(re.compile(r".*/urun/.+"), timeout=8000)
            chk("↓ + Enter ürüne gidiyor", "/urun/" in pg.url)
            recent = await pg.evaluate("localStorage.getItem('arena:son-aramalar')")
            chk("Son aramalara kaydedildi", recent and "equ" in recent)

            # ── Kaydırınca ince başlık
            await pg.goto(B + "/", wait_until="networkidle")
            sb = pg.locator("[data-testid=sticky-bar]")
            chk("İnce başlık başta gizli", await sb.get_attribute("aria-hidden") == "true")
            await pg.mouse.wheel(0, 1200); await pg.wait_for_timeout(700)
            chk("Kaydırınca ince başlık görünür", await sb.get_attribute("aria-hidden") == "false")

            # ── Ana sayfa kısayolları
            sc = pg.locator("[data-testid=shortcuts]")
            chk("Ne arıyorsun? kısayolları", await sc.count() == 1 and await sc.locator("a.group").count() == 9)
            chk("Minelab kısayolu öne çıkmış", await sc.locator("a[href='/marka/minelab'] span.ring-brand").count() == 1)
            chk("En çok satılan sıralaması çalışıyor", (await (await pg.request.get(B + "/urunler?sirala=cok-satan")).text()).count("/urun/") > 3)

            # ── Panel: kısayol ekle, kampanya kartını elle yaz
            ac = await b.new_context(user_agent=UA, viewport={"width": 1440, "height": 1000}); ap = await ac.new_page()
            ap.on("pageerror", lambda e: errs.append(ap.url + " :: " + str(e)[:90]))
            await ap.goto(B + "/admin/giris"); await ap.fill("input[name=email]", "admin@arenadedektor.local"); await ap.fill("input[name=password]", "Arena123!")
            await ap.click("button[type=submit]"); await ap.wait_for_url(re.compile(r".*/admin$"))
            await ap.goto(B + "/admin/vitrin", wait_until="networkidle")
            form = ap.locator("form:has([name=sLabel])")
            await form.locator("input[name=sLabel]").nth(9).fill("Haftanın Ürünü")
            await form.locator("input[name=sHref]").nth(9).fill("/urun/manticore")
            await form.locator("select[name=sIcon]").nth(9).select_option("star")
            await form.locator("input[name=sOrder]").nth(9).fill("0")
            await form.locator("label:has(input[name=sRemove][value='5'])").click()  # Derin Arama'yı sil
            await form.locator("label:has(input[name=pMode][value=custom])").click()
            await form.locator("input[name=pEyebrow]").fill("TEST KARTI")
            await form.locator("input[name=pTitle]").fill("Deneme kampanya başlığı")
            await form.locator("input[name=pHref]").fill("/marka/minelab")
            await form.get_by_role("button", name="Kaydet").click(); await ap.wait_for_timeout(1800)
            chk("Panel: kaydedildi", "Kısayollar ve menü kartı kaydedildi" in await ap.inner_text("body"))
            bad = form.locator("input[name=sHref]").nth(0)
            await bad.fill("javascript:alert(1)")
            await form.get_by_role("button", name="Kaydet").click(); await ap.wait_for_timeout(1500)
            chk("Panel: güvensiz bağlantı reddedildi", "bağlantısı / ile başlamalı" in await ap.inner_text("body"))

            await pg.goto(B + "/", wait_until="networkidle")
            first = pg.locator("[data-testid=shortcuts] a.group").first
            chk("Yeni kısayol ilk sırada", await first.get_attribute("href") == "/urun/manticore" and "Haftanın Ürünü" in await first.inner_text())
            chk("Silinen kısayol gitti", await pg.locator("[data-testid=shortcuts] a[href='/kategori/derin-arama']").count() == 0)
            await nav.locator("a:has-text('Minelab')").hover(); await pg.wait_for_timeout(500)
            chk("Elle kampanya kartı menüde", await nav.locator("a[href='/marka/minelab']:has-text('Deneme kampanya başlığı')").count() == 1)

            # ── Mobil: tam ekran arama
            m = await b.new_context(user_agent=UA, viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True); mp = await m.new_page()
            mp.on("pageerror", lambda e: errs.append(mp.url + " :: " + str(e)[:90]))
            await mp.goto(B + "/", wait_until="networkidle")
            await mp.locator("input[data-search-input]:visible").first.click(); await mp.wait_for_timeout(300)
            await mp.keyboard.type("mant"); await mp.wait_for_timeout(1000)
            box = await mp.locator("[aria-label='Arama önerileri']").bounding_box()
            chk("Mobil: arama tam ekran", box and box["width"] >= 380)
            chk("Mobil: geri butonu", await mp.locator("button[aria-label='Aramayı kapat']").count() == 1)
            chk("Sayfa hatası yok", not errs, errs[:2])
            await b.close()
    finally:
        sql("delete from settings where key='nav'")
    ok = sum(1 for _, c in res if c); print(f"{ok}/{len(res)} geçti")

asyncio.run(main())
