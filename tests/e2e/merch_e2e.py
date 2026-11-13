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
    sql("delete from settings where key='merch'")  # varsayılan: minelab / dengeli
    minelab = set(sql("select p.slug from products p join brands b on b.id=p.brand_id where b.slug='minelab' and p.status='ACTIVE'").split("\n"))
    ace = sql("select id from products where slug='ace-250'")
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(executable_path=os.environ.get("CHROME", "/usr/bin/google-chrome"))
            c = await b.new_context(user_agent=UA, viewport={"width": 1440, "height": 900}); pg = await c.new_page()
            errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
            share = lambda items: sum(1 for x in items if x.split("/")[-1] in minelab)

            # ── Varsayılan (Dengeli): 10'luk rafta 8 Minelab, diğerleri araya serpiştirilmiş
            await pg.goto(B + "/", wait_until="networkidle")
            await pg.click('button:has-text("Sadece zorunlu")')
            best = await pg.evaluate(BEST)
            chk("Çok satanlar 8 ürün", len(best) == 8, best)
            chk("Dengeli: 8'de 6 Minelab", share(best) == 6, [x.split('/')[-1] for x in best])
            first_other = next((i for i, x in enumerate(best) if x.split("/")[-1] not in minelab), -1)
            chk("Diğer markalar en sona itilmiyor, araya serpişiyor", 0 < first_other < 6, first_other)
            hero_txt = await pg.locator("main section").first.inner_text()
            chk("Sahne: 3 kampanya kartı", all(t in hero_txt for t in ["Vanquish 560 Pro-Pack", "Equinox 900, 3 taksit", "Kazıda hedefi saniyede bul"]), hero_txt[:200])
            chk("Sahne: ambiyans katmanı (banner'ın küçük kopyası)", await pg.locator("img.blur-\\[64px\\]").count() >= 1)
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
            ap.on("pageerror", lambda e: errs.append(str(e)))
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

            # Banner rehberi
            await ap.goto(B + "/admin/vitrin?yeni=1", wait_until="networkidle")
            t = await ap.inner_text("main")
            chk("Banner rehberi: ölçü ve 'kırpılmaz' notu", "1520×580" in t and "kırpılmaz" in t)
            chk("Kampanya kartı yeri 3 adet", "Kampanya kartları (banner altı, 3 adet)" in t)
            chk("Sayfa hatası yok", not errs, errs[:3])
            await b.close()
    finally:
        sql("delete from settings where key='merch'")
    print(f"{sum(c for _, c in res)}/{len(res)} geçti")

asyncio.run(main())
