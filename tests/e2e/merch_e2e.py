"""Vitrin önceliği (marka ağırlığı) uçtan uca.

Panel → Vitrin → "Raflarda marka ağırlığı" kartından ayar değişince: ana sayfa rafları, kategori "Önerilen"
sıralaması, ürün sayfası rozeti ve sabit ürünler doğru davranıyor mu; arama ve fiyat sıralaması tarafsız mı;
ana sayfa sahnesi (banner + ambiyans + 3 kampanya kartı) ve banner rehberi var mı.
"""
import os, re, json, asyncio, subprocess
from playwright.async_api import async_playwright

B = os.environ.get("BASE_URL", "http://localhost:3000")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130.0 Safari/537.36"
DB = os.environ.get("DATABASE_URL", "postgresql://postgres@localhost/bulgu")
res = []
def chk(n, c, info=""): c = bool(c); res.append((n, c)); print(("PASS" if c else "FAIL"), n, "" if c else info)
def sql(q): return subprocess.run(["psql", DB, "-tAc", q], capture_output=True, text=True).stdout.strip()

BEST = """() => {
  const sec = [...document.querySelectorAll('section')].find(s => s.querySelector('h2')?.innerText.trim() === 'Çok satanlar');
  if (!sec) return [];
  return [...sec.querySelectorAll('a[href^="/urun/"]')].map(a => a.getAttribute('href')).filter((v, i, arr) => arr.indexOf(v) === i);
}"""

async def main():
    sql("update users set totp_enabled=false, totp_secret=null, totp_last_step=null")
    sql("delete from rate_hits")
    sql("delete from settings where key in ('merch','ticker')")  # varsayılanlar: minelab / dengeli / en yeni kartlar; şerit açık
    minelab = set(sql("select p.slug from products p join brands b on b.id=p.brand_id where b.slug='minelab' and p.status='ACTIVE'").split("\n"))
    ace = sql("select id from products where slug='ace-250'")
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(executable_path=os.environ.get("CHROME", "/usr/bin/google-chrome"))
            c = await b.new_context(user_agent=UA, viewport={"width": 1440, "height": 900}); pg = await c.new_page()
            errs = []; pg.on("pageerror", lambda e: errs.append(pg.url + " :: " + str(e)[:90]))
            share = lambda items: sum(1 for x in items if x.split("/")[-1] in minelab)

            # ── Varsayılan (Dengeli): 10'luk rafta 8 Minelab, diğerleri araya serpiştirilmiş
            await pg.goto(B + "/", wait_until="networkidle")
            await pg.click('button:has-text("Sadece zorunlu")')
            best = await pg.evaluate(BEST)
            chk("Çok satanlar 8 ürün", len(best) == 8, best)
            chk("Dengeli: 8'de 6 Minelab", share(best) == 6, [x.split('/')[-1] for x in best])
            first_other = next((i for i, x in enumerate(best) if x.split("/")[-1] not in minelab), -1)
            chk("Diğer markalar en sona itilmiyor, araya serpişiyor", 0 < first_other < 6, first_other)
            cards = await pg.evaluate("() => [...document.querySelectorAll('[data-testid=hero-cards] > a')].map(a => a.getAttribute('href'))")
            chk("Banner altı: 3 kart, hepsi Minelab cihazı (en yeni)", len(cards) == 3 and share(cards) == 3, cards)
            chk("Banner altı: aksesuar yok", "/urun/eqx-11-baslik" not in cards, cards)
            chk("Banner altı: 'YENİ' etiketi", (await pg.locator("[data-testid=hero-cards] >> text=YENİ").count()) == 3)
            # Oklar yalnızca banner'ın üstüne gelince görünür
            await pg.mouse.move(5, 5); await pg.wait_for_timeout(400)
            op0 = await pg.evaluate("() => getComputedStyle(document.querySelector('[data-testid=hero-next]')).opacity")
            await pg.locator("[data-testid=hero-stage] picture").first.hover(); await pg.wait_for_timeout(500)
            op1 = await pg.evaluate("() => getComputedStyle(document.querySelector('[data-testid=hero-next]')).opacity")
            chk("Banner okları: fare üstündeyken görünür, değilken gizli", op0 == "0" and op1 == "1", (op0, op1))
            # Kayan şerit: varsayılan maddeler, soldan sağa
            tk = pg.locator("[data-testid=ticker]")
            chk("Kayan şerit görünür, soldan sağa", await tk.count() == 1 and await tk.get_attribute("data-dir") == "ltr")
            chk("Kayan şerit maddeleri", "Seri numaranla orijinallik sorgula" in await tk.inner_text())
            chk("Sahne: banner paletinden aurora katmanı", await pg.locator("[data-testid=hero-stage] > div[aria-hidden] > div[style*=radial-gradient]").count() >= 1)
            chk("Marka ızgarası: Minelab ilk ve notlu", "Türkiye distribütörü" in (await pg.inner_text("main")))

            # ── Ürün sayfası rozeti
            await pg.goto(B + "/urun/manticore", wait_until="networkidle")
            chk("Minelab ürününde distribütör rozeti", await pg.locator("[data-testid=focus-badge]").count() == 1)
            await pg.goto(B + "/urun/ace-250", wait_until="networkidle")
            chk("Diğer marka ürününde rozet yok", await pg.locator("[data-testid=focus-badge]").count() == 0)

            # ── Kategori: Önerilen sıralama Minelab'ı üste alır; fiyat sıralaması tarafsız
            cat = sql("select c.slug from categories c join products p on p.category_id=c.id join brands b on b.id=p.brand_id where p.status='ACTIVE' group by c.slug having count(distinct b.slug) > 1 and sum((b.slug='minelab')::int) >= 2 order by count(*) desc limit 1")
            await pg.goto(B + f"/kategori/{cat}", wait_until="networkidle")
            links = await pg.evaluate("() => [...new Set([...document.querySelectorAll('main article a[href^=\"/urun/\"]')].map(a => a.getAttribute('href')))]")
            chk(f"Kategori ({cat}) önerilen: ilk 2 Minelab", share(links[:2]) == 2, links[:4])
            await pg.goto(B + f"/kategori/{cat}?sirala=fiyat-artan", wait_until="networkidle")
            links2 = await pg.evaluate("() => [...new Set([...document.querySelectorAll('main article a[href^=\"/urun/\"]')].map(a => a.getAttribute('href')))]")
            cheapest = sql(f"select '/urun/'||p.slug from products p join categories c on c.id=p.category_id where c.slug='{cat}' and p.status='ACTIVE' order by p.price asc limit 1")
            chk("Fiyat sıralaması tarafsız (en ucuz ilk)", links2[:1] == [cheapest], (links2[:2], cheapest))

            # ── Panel: kart, önizleme, banner rehberi
            ac = await b.new_context(user_agent=UA, viewport={"width": 1440, "height": 1000}); ap = await ac.new_page()
            ap.on("pageerror", lambda e: errs.append(ap.url + " :: " + str(e)[:90]))
            await ap.goto(B + "/admin/giris"); await ap.fill("input[name=email]", "admin@arenadedektor.local"); await ap.fill("input[name=password]", "Arena123!")
            await ap.click("button[type=submit]"); await ap.wait_for_url(re.compile(r".*/admin$"))
            await ap.goto(B + "/admin/vitrin", wait_until="networkidle")
            chk("Panel: önizleme 8 ürün", await ap.locator("[data-testid=merch-preview] li").count() == 8)
            chk("Panel: önizleme özeti", "8 üründen 6 tanesi Minelab" in await ap.inner_text("main"), (await ap.inner_text("[data-testid=merch-preview]"))[:80])
            card = ap.locator("form:has([name=weight])")

            # Yüksek + ACE 250 sabitle (süresiz)
            await card.locator("label:has(input[value=high])").click()
            await card.locator("select[name=pinAdd]").select_option(ace)
            await card.get_by_role("button", name="Kaydet").click(); await ap.wait_for_timeout(1800)
            mset = json.loads(sql("select value::text from settings where key='merch'") or "{}")
            chk("Panel kaydı: yüksek + 1 sabit", mset.get("weight") == "high" and [x["productId"] for x in mset.get("pinned", [])] == [ace], mset)
            await pg.goto(B + "/", wait_until="networkidle")
            best = await pg.evaluate(BEST)
            chk("Sabit ürün rafın başında", best[:1] == ["/urun/ace-250"], best[:3])
            chk("Yüksek: sabit hariç 7'de 6 Minelab", share(best[1:]) == 6, [x.split('/')[-1] for x in best])
            ace_cat = sql("select c.slug from categories c join products p on p.category_id=c.id where p.slug='ace-250'")
            await pg.goto(B + f"/kategori/{ace_cat}", wait_until="networkidle")
            first = await pg.evaluate("() => document.querySelector('main article a[href^=\"/urun/\"]')?.getAttribute('href')")
            chk("Sabit ürün kendi kategorisinde de başta", first == "/urun/ace-250", first)
            await pg.goto(B + "/ara?q=ace", wait_until="networkidle")
            sres = await pg.evaluate("() => document.querySelector('main article a[href^=\"/urun/\"]')?.getAttribute('href')")
            chk("Arama tarafsız: 'ace' aramasında ilk sonuç ACE 250", sres == "/urun/ace-250", sres)

            # Sabitin süresi geçmiş olsun → raf başından düşer, panelde "Süresi doldu"
            await ap.goto(B + "/admin/vitrin", wait_until="networkidle")
            await card.locator("input[name=pinUntil]").fill("2000-01-01")
            await card.get_by_role("button", name="Kaydet").click(); await ap.wait_for_timeout(1500)
            await ap.reload(wait_until="networkidle")
            chk("Panel: süresi dolan sabit işaretli", "Süresi doldu" in await ap.inner_text("main"))
            await pg.goto(B + "/", wait_until="networkidle")
            chk("Süresi dolan sabit raftan düşer", (await pg.evaluate(BEST))[:1] != ["/urun/ace-250"])

            # Kapalı + rozet kapalı + not boş
            await card.locator("label:has(input[value=off])").click()
            await card.locator("input[name=pinRemove]").check()
            await card.locator("input[name=badge]").uncheck()
            await card.locator("input[name=focusNote]").fill("")
            await card.get_by_role("button", name="Kaydet").click(); await ap.wait_for_timeout(1500)
            mset = json.loads(sql("select value::text from settings where key='merch'") or "{}")
            chk("Kapalı + sabit kaldırıldı + rozet kapalı", mset.get("weight") == "off" and mset.get("pinned") == [] and mset.get("badge") is False, mset)
            await pg.goto(B + "/urun/manticore", wait_until="networkidle")
            chk("Rozet kapatılınca görünmez", await pg.locator("[data-testid=focus-badge]").count() == 0)
            await pg.goto(B + "/", wait_until="networkidle")
            chk("Not boşken marka kartında görünmez", "Türkiye distribütörü" not in await pg.inner_text("main"))

            # Banner altı kartlar: kampanya kartları moduna geç
            await ap.goto(B + "/admin/vitrin", wait_until="networkidle")
            await card.locator("label:has(input[value=banners])").click()
            await card.get_by_role("button", name="Kaydet").click(); await ap.wait_for_timeout(1500)
            await pg.goto(B + "/", wait_until="networkidle")
            txt = await pg.locator("[data-testid=hero-cards]").inner_text()
            chk("Kampanya kartı modu: paneldeki kartlar", "Equinox 900, 3 taksit" in txt and "Kazıda hedefi saniyede bul" in txt, txt[:120])

            # Kayan şerit: madde ekle (bağlantı + öne çıkar), yön/renk değiştir
            tf = ap.locator("form:has([name=tText])")
            empty = tf.locator("input[name=tText]").nth(4)
            await empty.fill("Yılbaşına özel kampanya")
            await tf.locator("input[name=tHref]").nth(4).fill("/kampanyalar")
            await tf.locator("label:has(input[value=rtl])").click()
            await tf.locator("label:has(input[value=dark])").click()
            await tf.locator("input[name=tRemove][value='2']").check()
            await tf.get_by_role("button", name="Kaydet").click(); await ap.wait_for_timeout(1500)
            tset = json.loads(sql("select value::text from settings where key='ticker'") or "{}")
            chk("Şerit kaydı: 4 madde, sağdan sola, siyah", [i["text"] for i in tset.get("items", [])] == ["Minelab'ın en yeni modelleri stoklarda", "3 aya kadar vade farksız taksit", "Hangi dedektör? Uzmanımıza WhatsApp'tan sor", "Yılbaşına özel kampanya"] and tset.get("direction") == "rtl" and tset.get("theme") == "dark", tset)
            await pg.goto(B + "/", wait_until="networkidle")
            tk = pg.locator("[data-testid=ticker]")
            chk("Şerit ana sayfada güncel (yön + yeni madde + bağlantı)", await tk.get_attribute("data-dir") == "rtl" and await tk.locator("a[href='/kampanyalar']").count() >= 1 and "orijinallik" not in await tk.inner_text())
            # Zararlı bağlantı reddedilir
            await ap.reload(wait_until="networkidle")
            tf = ap.locator("form:has([name=tText])")
            await tf.locator("input[name=tHref]").first.fill("javascript:alert(1)")
            await tf.get_by_role("button", name="Kaydet").click(); await ap.wait_for_timeout(1200)
            chk("Şerit: javascript: bağlantısı reddedilir", "javascript" not in sql("select value::text from settings where key='ticker'"))
            # Kapat
            await ap.reload(wait_until="networkidle")
            tf = ap.locator("form:has([name=tText])")
            await tf.locator("input[name=enabled]").uncheck()
            await tf.get_by_role("button", name="Kaydet").click(); await ap.wait_for_timeout(1200)
            await pg.goto(B + "/", wait_until="networkidle")
            chk("Şerit kapatılınca görünmez", await pg.locator("[data-testid=ticker]").count() == 0)

            # Banner rehberi
            await ap.goto(B + "/admin/vitrin?yeni=1", wait_until="networkidle")
            t = await ap.inner_text("main")
            chk("Banner rehberi: ölçü ve 'kırpılmaz' notu", "1520×580" in t and "kırpılmaz" in t)
            chk("Kampanya kartı yeri 3 adet", "Kampanya kartları (banner altı, 3 adet)" in t)
            chk("Sayfa hatası yok", not errs, errs[:3])
            await b.close()
    finally:
        sql("delete from settings where key in ('merch','ticker')")
    print(f"{sum(c for _, c in res)}/{len(res)} geçti")

asyncio.run(main())
