"""Beyaz etiket: mağaza adı, logo, ikon ve ana renk panelden yönetilir; kodda sabit marka kalmaz.
Panel > Ayarlar > Marka sekmesi, canlı önizleme, kayıt, sitenin rengi/logosu/ikonu ve sekme başlığı."""
import os, subprocess, re
from playwright.sync_api import sync_playwright
BASE = os.environ.get("BASE", "http://localhost:3000")
DB = os.environ.get("DATABASE_URL", "postgresql://postgres@localhost:5432/bulgu")
sql = lambda q: subprocess.run(["psql", DB, "-Atc", q], capture_output=True, text=True).stdout.strip()
ok = fail = 0
def check(name, cond, extra=""):
    global ok, fail
    ok, fail = (ok + 1, fail) if cond else (ok, fail + 1)
    print(("PASS " if cond else "FAIL ") + name + (f"  [{extra}]" if extra and not cond else ""))

orig_brand = sql("select value::text from settings where key='brand'")
orig_store = sql("select value::text from settings where key='store'")
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": 1280, "height": 900})
        # Demo: varsayılan kırmızı, kendi logo dosyası
        pg.goto(f"{BASE}/")
        check("demo logosu ayarlardan", pg.locator("header img[src='/brand/logo.svg']").count() >= 1)
        check("varsayılan renkte ek stil yok", pg.locator("style#brand-colors").inner_html() == "")

        # Panelden marka değiştir
        pg.goto(f"{BASE}/admin/giris")
        pg.fill("input[name=email]", "admin@derinova.local"); pg.fill("input[name=password]", "Demo12345!")
        pg.click("button[type=submit]"); pg.wait_for_url(re.compile(r"/admin(?!/giris)"))
        pg.goto(f"{BASE}/admin/ayarlar?t=marka")
        check("Marka sekmesi açılıyor", pg.locator("[data-testid=brand-preview]").count() == 1)
        pg.fill("input[name=color]", "#0369a1")
        check("önizleme rengi canlı değişiyor", "rgb(3, 105, 161)" in pg.locator("[data-testid=brand-preview] span:has-text('Sepete ekle')").evaluate("e => getComputedStyle(e).backgroundColor"))
        pg.fill("input[name=color]", "kirmizi"); pg.click("button:has-text('Kaydet')"); pg.wait_for_timeout(700)
        check("geçersiz renk reddediliyor", "#rrggbb" in pg.inner_text("body"))
        pg.fill("input[name=color]", "#0369a1")
        pg.evaluate("document.querySelectorAll('input[name=logoUrl],input[name=logoWhiteUrl],input[name=iconUrl]').forEach(i => i.value = '')")
        pg.click("button:has-text('Kaydet')"); pg.wait_for_timeout(900)
        sql("""update settings set value = value || '{"logoUrl":"","logoWhiteUrl":"","iconUrl":""}'::jsonb where key='brand'""")
        check("renk kaydedildi", sql("select value->>'color' from settings where key='brand'") == "#0369a1")
        sql("""update settings set value = value || '{"name":"Kuzey Outdoor"}'::jsonb where key='store'""")

        s = b.new_page(viewport={"width": 1280, "height": 900})
        s.goto(f"{BASE}/")
        check("logo yoksa ad yazı olarak", "Kuzey Outdoor" in s.locator("header").inner_text())
        check("eski marka adı görünmüyor (başlık)", "Derinova" not in s.locator("header").inner_text())
        css = s.locator("style#brand-colors").inner_html()
        check("ana renk siteye uygulanıyor", "--color-brand:#0369a1" in css, css[:80])
        btn = s.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--color-brand').trim()")
        check("tema değişkeni ezildi", btn == "#0369a1", btn)
        icon = s.locator("link[rel=icon]").first.get_attribute("href") or ""
        check("ikon yoksa baş harf ikonu", icon.startswith("/favicon-brand"), icon)
        r = s.request.get(f"{BASE}/favicon-brand")
        check("baş harf ikonu PNG", r.status == 200 and "image/png" in r.headers.get("content-type", ""))
        s.goto(f"{BASE}/kategori/define-ve-sikke")
        check("kategori metni mağaza adıyla", "Kuzey Outdoor’de" in (s.text_content("main") or ""))
        s.goto(f"{BASE}/urun/equinox-900")
        check("sekme başlığı mağaza adıyla biter", s.title().endswith("Kuzey Outdoor"), s.title())
        check("koyu zemin logosu yazı", "Kuzey Outdoor" in s.locator("footer").inner_text())
        b.close()
finally:
    sql(f"update settings set value = '{orig_brand}'::jsonb where key='brand'")
    sql(f"update settings set value = $${orig_store}$$::jsonb where key='store'")

print(f"\n{ok} geçti, {fail} kaldı")
raise SystemExit(0 if fail == 0 else 1)
