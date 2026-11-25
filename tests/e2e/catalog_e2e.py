"""Sektörden bağımsızlık: Ayarlar > Katalog. Hazır profil seçimi, ürün türü adının metinlere işlenmesi,
kapalı modüllerin (sihirbaz, sözlük, seri no, servis) sayfalarının açılmaması ve bağlantılarının gizlenmesi,
dedektöre özel ürün alanlarının panelde gizlenmesi, çok boyutlu varyant seçimi."""
import os, re, subprocess
from playwright.sync_api import sync_playwright
BASE = os.environ.get("BASE", "http://localhost:3000")
DB = os.environ.get("DATABASE_URL", "postgresql://postgres@localhost:5432/bulgu")
sql = lambda q: subprocess.run(["psql", DB, "-Atc", q], capture_output=True, text=True).stdout.strip()
ok = fail = 0
def check(name, cond, extra=""):
    global ok, fail
    ok, fail = (ok + 1, fail) if cond else (ok, fail + 1)
    print(("PASS " if cond else "FAIL ") + name + (f"  [{extra}]" if extra and not cond else ""))

orig = sql("select value::text from settings where key='catalog'")
FEATURE_HREFS = ["/sihirbaz", "/sozluk", "/seri-no", "/servis"]
def niche_links(page):
    return page.eval_on_selector_all("a[href]", "e => e.map(a => a.getAttribute('href'))")
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        s = b.new_page(viewport={"width": 1280, "height": 900})
        # Demo: dedektör profili
        s.goto(f"{BASE}/marka/minelab")
        check("dedektör profili: başlıkta 'Dedektör'", "Minelab Dedektör Modelleri" in s.title(), s.title())
        check("dedektör profili: sihirbaz açık", s.request.get(f"{BASE}/sihirbaz").status == 200)

        # Panelden "Genel mağaza" profili
        a = b.new_page(viewport={"width": 1280, "height": 1000})
        a.goto(f"{BASE}/admin/giris")
        a.fill("input[name=email]", "admin@derinova.local"); a.fill("input[name=password]", "Demo12345!")
        a.click("button[type=submit]"); a.wait_for_url(re.compile(r"/admin(?!/giris)"))
        a.goto(f"{BASE}/admin/ayarlar?t=katalog")
        a.click("[data-testid=catalog-presets] button:has-text('Genel mağaza')")
        check("profil örnek cümleyi güncelliyor", "Hangi ürün sana uygun?" in a.inner_text("[data-testid=catalog-sample]"))
        a.click("button:has-text('Kaydet')"); a.wait_for_timeout(900)
        check("kaydedildi", sql("select value->>'nounOne' from settings where key='catalog'") == "ürün" and sql("select value->>'wizard' from settings where key='catalog'") == "false")
        check("kurulum adımı tamamlandı", "catalog" in sql("select value::text from settings where key='setup'"))

        for h in FEATURE_HREFS:
            check(f"kapalı modül sayfası yok: {h}", s.request.get(f"{BASE}{h}").status == 404)
        s.goto(f"{BASE}/marka/minelab")
        check("başlık ürün türüyle", "Minelab Ürün Modelleri" in s.title(), s.title())
        for path in ["/", "/kategori/define-ve-sikke", "/urun/equinox-900", "/sss", "/sepet", "/sayfa/hakkimizda"]:
            s.goto(f"{BASE}{path}")
            bad = [h for h in niche_links(s) if any(h == f or h.startswith(f + "?") or h.startswith(f + "/") for f in FEATURE_HREFS)]
            check(f"kapalı modül bağlantısı yok: {path}", not bad, bad[:3])
        s.goto(f"{BASE}/")
        check("amaca göre keşfet (dedektöre özel) gizli", s.locator("text=Ne arıyorsan, ona göre seç").count() == 0)
        m = b.new_page(viewport={"width": 390, "height": 844})
        m.goto(f"{BASE}/")
        check("mobil alt menü ortası kampanyalar", m.locator("nav[aria-label] a[href='/kampanyalar']").count() >= 1 and m.locator("nav[aria-label] a[href='/sihirbaz']").count() == 0)
        a.goto(f"{BASE}/admin/urunler/yeni")
        check("dedektör alanları panelde gizli", a.locator("select[name=technology]").count() == 0 and a.locator("input[name=warrantyMonths]").count() == 1)
        check("servis menüsü gizli", a.locator("aside a[href='/admin/servis'], nav a[href='/admin/servis']").count() == 0)

        # Çok boyutlu varyant (Renk / Beden)
        g = sql("select variant_group from products where slug='go-find-66'")
        sql("update products set variant_group='test-v2', variant_label='Renk: Siyah / Paket: Standart' where slug='go-find-66'")
        sql("update products set variant_group='test-v2', variant_label='Renk: Beyaz / Paket: Standart' where slug='findx-pro'")
        sql("update products set variant_group='test-v2', variant_label='Renk: Siyah / Paket: Pro' where slug='x-terra-pro'")
        s.goto(f"{BASE}/urun/go-find-66")
        ax = s.locator("[data-testid=variant-axes]")
        check("varyant boyutları ayrı satırlarda", ax.count() == 1 and "Renk" in ax.inner_text() and "Paket" in ax.inner_text())
        check("renk değişince paket korunur", ax.locator("a:has-text('Beyaz')").get_attribute("href").endswith("/urun/findx-pro"))
        sql(f"update products set variant_group={'NULL' if not g else repr(g)}, variant_label=NULL where slug in ('go-find-66','findx-pro','x-terra-pro')")
        b.close()
finally:
    sql(f"update settings set value = $${orig}$$::jsonb where key='catalog'")
    sql("update settings set value = jsonb_set(value, '{completedSteps}', (value->'completedSteps') - 'catalog') where key='setup'")

print(f"\n{ok} geçti, {fail} kaldı")
raise SystemExit(0 if fail == 0 else 1)
