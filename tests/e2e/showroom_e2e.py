"""Ürün sayfasında "Showroom'da gör" kutusu: form/randevu yok; hazır mesajlı WhatsApp, arama, yol tarifi,
şu an açık mı bilgisi; panelden "Showroom'da sergileniyor" işaretlenince "Sergide" etiketi.
Önce: npm run db:seed. Sunucu localhost:3000."""
import os
import subprocess
from urllib.parse import unquote

from playwright.sync_api import sync_playwright

BASE = os.environ.get("BASE", os.environ.get("BASE_URL", "http://localhost:3000"))
DB = os.environ.get("DATABASE_URL", "postgresql://postgres@localhost:5432/bulgu").strip('"')
ok = fail = 0


def chk(name, cond, extra=""):
    global ok, fail
    ok, fail = (ok + 1, fail) if cond else (ok, fail + 1)
    print("PASS" if cond else "FAIL", name, "" if cond else extra)


def sql(q):
    return subprocess.run(["psql", DB, "-Atc", q], capture_output=True, text=True).stdout.strip()


sql("truncate rate_hits")
pid, slug, name = sql("select id||'|'||slug||'|'||name from products where status='ACTIVE' order by created_at limit 1").split("|")
sql(f"update products set on_display=false where id='{pid}'")

with sync_playwright() as p:
    b = p.chromium.launch()
    c = b.new_context(viewport={"width": 1280, "height": 900}).new_page()
    c.goto(f"{BASE}/urun/{slug}")
    card = c.locator("[data-testid=showroom-card]")
    chk("ürün sayfasında showroom kutusu var", card.count() == 1)
    chk("form / randevu alanı yok", card.locator("form, input, select, textarea").count() == 0)
    wa = c.get_attribute("[data-testid=showroom-wa]", "href") or ""
    chk("WhatsApp mesajı ürün adıyla ve showroom sorusuyla hazır", name in unquote(wa) and "showroom" in unquote(wa), unquote(wa))
    chk("Ara butonu tel: bağlantısı", (c.get_attribute("[data-testid=showroom-call]", "href") or "").startswith("tel:"))
    chk("Yol tarifi Google Haritalar'a gidiyor", "google.com/maps/dir" in (c.get_attribute("[data-testid=showroom-map]", "href") or ""))
    chk("açık / kapalı bilgisi görünüyor", c.locator("[data-testid=showroom-open]").count() == 1 and ("açık" in c.inner_text("[data-testid=showroom-open]") or "Kapalı" in c.inner_text("[data-testid=showroom-open]")))
    chk("sergide değilken 'Sergide' etiketi yok", c.locator("[data-testid=on-display]").count() == 0)
    chk("tıklama ölçümü için bağlam işaretli", c.get_attribute("[data-testid=showroom-wa]", "data-contact") == "showroom")

    # Panelden "Showroom'da sergileniyor" işaretle
    a = b.new_context(viewport={"width": 1366, "height": 900}).new_page()
    a.goto(f"{BASE}/admin/giris")
    a.fill("input[name=email]", "admin@arenadedektor.local")
    a.fill("input[name=password]", "Arena123!")
    a.click("button[type=submit]")
    a.wait_for_load_state("networkidle")
    a.goto(f"{BASE}/admin/urunler/{pid}")
    a.locator("input[name=onDisplay]").check(force=True)
    a.locator("input[name=onDisplay]").locator("xpath=ancestor::form").locator("button[type=submit]").last.click()
    a.wait_for_timeout(2500)
    chk("panelde işaret kaydedildi", sql(f"select on_display from products where id='{pid}'") == "t")

    c.goto(f"{BASE}/urun/{slug}")
    chk("sergideyken 'Sergide' etiketi ve 'deneyebilirsin' başlığı", c.locator("[data-testid=on-display]").count() == 1 and "deneyebilirsin" in c.inner_text("[data-testid=showroom-card]"))
    wa = unquote(c.get_attribute("[data-testid=showroom-wa]", "href") or "")
    chk("sergideyken mesaj 'görmek istiyorum' diye başlıyor", "görmek istiyorum" in wa, wa)

    m = b.new_context(viewport={"width": 390, "height": 844}).new_page()
    m.goto(f"{BASE}/urun/{slug}")
    chk("mobilde kutu taşmıyor", m.evaluate("document.documentElement.scrollWidth") <= 390)
    b.close()

print(f"\n{ok} geçti, {fail} kaldı")
raise SystemExit(1 if fail else 0)
