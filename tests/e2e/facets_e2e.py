"""Filtre panelindeki sayı = o seçeneğe tıklayınca listelenen ürün sayısı (marka, kategori, arama ve diğer filtreler uygulanmışken).
Ayrıca sipariş teşekkür kutusu yeşil. Önce: npm run db:seed. Sunucu localhost:3000."""
import os, re, subprocess
from urllib.parse import urlencode, urlsplit, parse_qsl
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


brands = sql("select b.slug from brands b where exists (select 1 from products p where p.brand_id=b.id and p.status='ACTIVE')").splitlines()
cats = sql("select c.slug from categories c where c.parent_id is null and c.is_active limit 3").splitlines()
pages = [f"/marka/{b}" for b in brands] + [f"/kategori/{c}" for c in cats] + ["/urunler?stok=1", "/urunler?tek=MULTI"]

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_context(viewport={"width": 1280, "height": 900}).new_page()

    def total(url):
        pg.goto(BASE + url)
        m = re.search(r"(\d+) ürün", pg.inner_text("main"))
        return int(m.group(1)) if m else 0

    checked = 0
    for page in pages:
        pg.goto(BASE + page)
        opts = pg.evaluate("""() => [...document.querySelectorAll('form input[type=checkbox]')]
            .filter(i => ['seviye','tek','su','marka'].includes(i.name) && !i.checked)
            .map(i => ({name: i.name, value: i.value, n: Number(i.closest('label')?.querySelector('span.text-xs')?.textContent || 'NaN')}))""")
        for o in opts:
            if o["n"] != o["n"]:
                continue
            parts = urlsplit(page)
            # Aynı boyutta başka seçim varsa sayı "bu seçenek tek başına" anlamına gelir
            q = [kv for kv in parse_qsl(parts.query) if kv[0] != o["name"]] + [(o["name"], o["value"])]
            url = f"{parts.path}?{urlencode(q)}"
            got = total(url)
            checked += 1
            chk(f"{page}: {o['name']}={o['value']} sayı {o['n']} → listede {got}", got == o["n"])
    chk("en az birkaç seçenek denendi", checked >= 5, str(checked))

    # Teşekkür kutusu yeşil
    # Demo verisi rastgele: şifresi bilinen tek müşteri musteri1 ve siparişi olmayabilir; ödenmiş bir siparişi ona ver
    oid = sql("select id from orders where payment_status='PAID' order by created_at, id limit 1")
    sql(f"update orders set customer_id=(select id from customers where email='musteri1@ornek.com'), email='musteri1@ornek.com' where id='{oid}'")
    cust = sql(f"select c.email from customers c join orders o on o.customer_id=c.id where o.id='{oid}'")
    sql("truncate rate_hits")
    pg.goto(BASE + "/giris", wait_until="networkidle")
    pg.fill("input[name=id]", cust)
    pg.fill("input[name=password]", "Arena123!")
    pg.click("button:has-text('Giriş yap')")
    try:
        pg.wait_for_url(re.compile(r"/hesabim"), timeout=30000)
    except Exception:
        print("LOGIN", pg.url, pg.inner_text("main")[:300])
        raise
    pg.goto(f"{BASE}/siparis/{oid}?yeni=1")
    bg = pg.evaluate("() => getComputedStyle(document.querySelector('[data-testid=order-thanks]')).backgroundColor")
    chk("teşekkür kutusu yeşil", bg in ("rgb(231, 244, 234)",), bg)
    b.close()

print(f"\n{ok} geçti, {fail} kaldı")
raise SystemExit(1 if fail else 0)
