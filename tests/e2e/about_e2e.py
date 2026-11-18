"""Hakkımızda sayfası: radar hero, sayılar, kısayollar, markalar, tıklayınca yüklenen harita, açık/kapalı rozeti,
içerik sayfasının basılınca küçülmemesi ve İngilizce sürüm."""
import os
from playwright.sync_api import sync_playwright
BASE = os.environ.get("BASE", "http://localhost:3000")
ok = fail = 0
def check(name, cond):
    global ok, fail
    ok, fail = (ok + 1, fail) if cond else (ok, fail + 1)
    print(("PASS " if cond else "FAIL ") + name)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={"width": 1280, "height": 900})
    pg.goto(f"{BASE}/sayfa/hakkimizda")
    check("sayfa açılıyor", pg.locator("[data-testid=about-page]").count() == 1)
    check("sayılar gösteriliyor", pg.locator("[data-testid=about-stats] li").count() >= 3)
    hrefs = pg.eval_on_selector_all("[data-testid=about-actions] a", "e => e.map(a => a.getAttribute('href'))")
    check("işlevsel kısayollar", {"/sihirbaz", "/seri-no", "/servis", "/siparis-takip"} <= set(hrefs))
    check("Minelab ilk marka", "Minelab" in pg.locator("[data-testid=about-brands] li").first.inner_text())
    check("panel metni korunuyor", "Neden Derinova" in pg.inner_text(".about-prose"))
    check("showroom metinde tekrar etmiyor", "Showroom" not in pg.inner_text(".about-prose"))
    check("harita önce yüklenmiyor (KVKK)", pg.locator("[data-testid=about-map-frame]").count() == 0)
    pg.click("[data-testid=about-map-load]")
    check("tıklayınca harita yükleniyor", "maps.google.com" in (pg.get_attribute("[data-testid=about-map-frame]", "src") or ""))
    check("yol tarifi linkleri", pg.locator("[data-testid=about-directions] a").count() == 3)
    check("açık/kapalı rozeti", pg.locator("[data-testid=about-open]").count() == 1)
    pg.hover(".about-prose"); pg.mouse.down()
    check("metne basınca sayfa küçülmüyor", pg.evaluate("getComputedStyle(document.querySelector('.about-prose').closest('article') || document.body).scale") in ("none", "1"))
    pg.mouse.up()
    pg.goto(f"{BASE}/en/sayfa/hakkimizda")
    txt = pg.inner_text("[data-testid=about-page]")
    # İngilizce panelden kapalıysa /en Türkçeye yönlenir; açıksa İngilizce metin gelir
    check("İngilizce sürüm / yönlendirme", ("What can you do here?" in txt) if "/en/" in pg.url else ("Bizde neler yapabilirsin?" in txt))
    b.close()
print(f"\n{ok}/{ok+fail} passed"); raise SystemExit(1 if fail else 0)
