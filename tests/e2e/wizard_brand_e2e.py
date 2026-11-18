"""Sihirbazda öncelikli marka (Vitrin > "Bana hangisi?" sihirbazı):
öncelikli = uyan Minelab hep başta, diğer markalar boşluk doldurur; sadece = yalnız Minelab, yoksa uzmana yönlendir; tarafsız = eski davranış.
Önce: npm run db:seed. Sunucu localhost:3000."""
import os, subprocess
from playwright.sync_api import sync_playwright

BASE = os.environ.get("BASE", "http://localhost:3000")
DB = os.environ.get("DATABASE_URL", "postgresql://postgres@localhost:5432/bulgu").strip('"')
ok = fail = 0


def chk(name, cond, extra=""):
    global ok, fail
    ok, fail = (ok + 1, fail) if cond else (ok, fail + 1)
    print("PASS" if cond else "FAIL", name, "" if cond else extra)


def sql(q):
    return subprocess.run(["psql", DB, "-Atc", q], capture_output=True, text=True).stdout.strip()


sql("truncate rate_hits")
MINELAB = set(sql("select p.name from products p join brands b on b.id=p.brand_id where b.slug='minelab' and p.status='ACTIVE'").splitlines())
SAHIL = ["Sahilde kayıp takı", "İlk cihazım", "25–60 bin TL", "Sahil ve ıslak kum", "Evet, hafif olsun", "Kıyıda, sığ suda"]
DEFINE = ["Sikke, takı, define", "Daha önce kullandım", "60–150 bin TL", "Kırmızı, demirli toprak", "Fark etmez", "Hayır"]
POINTER = ["Kazıda nokta tespiti", "İlk cihazım", "25 bin TL'ye kadar", "Normal tarla, park", "Fark etmez", "Hayır"]

with sync_playwright() as p:
    b = p.chromium.launch()
    a = b.new_context(viewport={"width": 1366, "height": 900}).new_page()
    a.goto(f"{BASE}/admin/giris")
    a.fill("input[name=email]", "admin@derinova.local")
    a.fill("input[name=password]", "Demo12345!")
    a.click("button[type=submit]")
    a.wait_for_load_state("networkidle")
    c = b.new_context(viewport={"width": 1280, "height": 900}).new_page()

    def mode(v):
        a.goto(f"{BASE}/admin/vitrin")
        a.locator(f"[data-testid=wizard-mode] input[value={v}]").check(force=True)
        a.locator("[data-testid=wizard-mode]").locator("xpath=ancestor::form").locator("button[type=submit]").click()
        a.wait_for_timeout(1500)

    def run(labels):
        c.goto(f"{BASE}/sihirbaz", wait_until="networkidle")
        for l in labels:
            c.click(f"button:has-text(\"{l}\")")
        c.wait_for_selector("text=önerimiz var", timeout=30000)
        names = [n.strip() for n in c.locator("main h3, main [data-testid=wizard-pick-name]").all_inner_texts()]
        return names, c.inner_text("main")

    def picked(text):
        """Sonuç metninde geçen ürün adları, sayfadaki sırayla"""
        allp = sql("select name from products where status='ACTIVE'").splitlines()
        hits = sorted(((text.find(n), n) for n in allp if text.find(n) >= 0))
        return [n for _, n in hits]

    a.goto(f"{BASE}/admin/vitrin")
    chk("varsayılan: öncelikli seçili", a.locator("[data-testid=wizard-mode] input[value=priority]").is_checked())

    # Tarafsız → referans
    mode("all")
    _, t = run(DEFINE)
    neutral = picked(t)
    chk("tarafsızda marka notu yok", c.locator("[data-testid=wizard-brand-note]").count() == 0)

    mode("priority")
    for name, labels in (("sahil", SAHIL), ("define", DEFINE)):
        _, t = run(labels)
        got = picked(t)
        chk(f"öncelikli ({name}): ilk öneri Minelab", bool(got) and got[0] in MINELAB, str(got))
    _, t = run(POINTER)
    got = picked(t)
    chk("öncelikli (pointer, Minelab pointer yok): boş kalmıyor, diğer marka dolduruyor", bool(got) and got[0] not in MINELAB, str(got))

    mode("only")
    _, t = run(SAHIL)
    got = picked(t)
    chk("sadece Minelab: tüm öneriler Minelab", bool(got) and all(n in MINELAB for n in got), str(got))
    chk("sadece Minelab: 'Minelab modelleri arasından' notu", c.locator("[data-testid=wizard-brand-note]").count() == 1)
    _, t = run(POINTER)
    chk("sadece Minelab, uyan yok: zorlamıyor, uzmana yönlendiriyor", c.locator("[data-testid=wizard-empty]").count() == 1 and "Minelab modeli bulamadık" in t)

    mode("priority")
    print("tarafsız define:", neutral)
    b.close()

print(f"\n{ok} geçti, {fail} kaldı")
raise SystemExit(1 if fail else 0)
