"""Sayfalama: 24'er ürün, 'Daha fazla göster' (?sayfa=N, birikimli), gerçek toplam sayacı, filtre değişince başa dönme."""
import asyncio, os, re, subprocess, sys
from playwright.async_api import async_playwright
B = "http://127.0.0.1:3000"
DB = os.environ.get("DATABASE_URL", "postgresql://postgres@localhost/bulgu").strip('"')
def sql(q): return subprocess.run(["psql", DB, "-tAc", q], capture_output=True, text=True).stdout.strip()
res = []
def chk(n, ok, info=""):
    res.append((n, bool(ok))); print(("OK  " if ok else "FAIL") + " " + n + (f"  [{info}]" if info and not ok else ""))

async def main():
    cat = sql("select id from categories where slug='define-ve-sikke'")
    base = int(sql(f"select count(*) from products where status='ACTIVE' and category_id='{cat}'") or 0)
    sql("delete from products where slug like 'sayfa-test-%'")
    for i in range(40):
        sql(f"insert into products (id, name, slug, sku, price, stock, status, category_id) values (gen_random_uuid()::text, 'Sayfa Test {i:02d}', 'sayfa-test-{i:02d}', 'ST-{i:02d}', {5000 + i}, 3, 'ACTIVE', '{cat}')")
    total = base + 40
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(); pg = await (await b.new_context(viewport={"width": 1280, "height": 900})).new_page()
            await pg.goto(B + "/kategori/define-ve-sikke", wait_until="networkidle")
            cards = lambda: pg.locator("main article").count()
            chk("İlk sayfada 24 ürün", await cards() == 24, await cards())
            chk(f"Sayaç gerçek toplam ({total})", f"{total} ürün" in await pg.inner_text("main"))
            chk("Ilerleme yazısı", f"{total} üründen 24 tanesi" in await pg.inner_text("[data-testid=load-more]"))
            btn = pg.locator("[data-testid=load-more-btn]")
            chk("Buton gerçek bağlantı (?sayfa=2)", "sayfa=2" in (await btn.get_attribute("href") or ""))
            y0 = await pg.evaluate("scrollY")
            await btn.scroll_into_view_if_needed(); y1 = await pg.evaluate("scrollY")
            await btn.click(); await pg.wait_for_url(re.compile(r".*sayfa=2.*")); await pg.wait_for_timeout(1000)
            chk("Daha fazla: 48 ürün", await cards() == 48, await cards())
            chk("Kaydırma yeri korunur", abs(await pg.evaluate("scrollY") - y1) < 400, (y1, await pg.evaluate("scrollY")))
            await pg.locator("[data-testid=load-more-btn]").click(); await pg.wait_for_url(re.compile(r".*sayfa=3.*")); await pg.wait_for_timeout(1000)
            chk(f"Son sayfa: tümü ({total}) ve buton yok", await cards() == total and await pg.locator("[data-testid=load-more-btn]").count() == 0, await cards())
            # Geri dönünce aynı yer
            await pg.goto(B + "/kategori/define-ve-sikke?sayfa=2", wait_until="networkidle")
            chk("Doğrudan ?sayfa=2 → 48 ürün (arama motoru / geri dönüş)", await cards() == 48)
            # Hızlı filtre sayfayı sıfırlar
            href = await pg.locator("[data-testid=quick-filters] a", has_text="Stokta").get_attribute("href")
            chk("Filtre bağlantısı sayfa parametresini taşımaz", "sayfa" not in href, href)
            # Sıralama tüm listede: fiyat artan → en ucuz ilk sayfada
            await pg.goto(B + "/kategori/define-ve-sikke?sirala=fiyat-artan", wait_until="networkidle")
            first = await pg.locator("main article a[href^='/urun/']").first.get_attribute("href")
            chk("Sıralama tüm sonuç üzerinde", first == "/urun/sayfa-test-00", first)
            await b.close()
    finally:
        sql("delete from products where slug like 'sayfa-test-%'")
    bad = [n for n, ok in res if not ok]
    print(f"\n{len(res)-len(bad)}/{len(res)} geçti"); sys.exit(1 if bad else 0)

asyncio.run(main())
