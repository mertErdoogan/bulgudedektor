"""Boş kurulum denetiminden çıkan düzeltmeler: kupon/kampanya, kısmi iade tutarı, kurulum, menü/SSS tekrarı,
SEO'da olmayan marka, sayfa önizleme, servis bildirimi, kategori hiyerarşisi, /hakkimizda yönlendirmesi.
Önce: npm run db:seed. Sunucu localhost:3000."""
import json, os, re, subprocess, urllib.request
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


def toasts(pg):
    pg.wait_for_timeout(1800)
    return " ".join(pg.locator("[data-sonner-toast]").all_inner_texts())


# ---------- /hakkimizda kısa adresi ----------
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None


try:
    urllib.request.build_opener(NoRedirect).open(BASE + "/hakkimizda")
    loc = ""
except urllib.error.HTTPError as e:
    loc = e.headers.get("location", "") if e.code in (301, 308) else f"code {e.code}"
chk("/hakkimizda → /sayfa/hakkimizda kalıcı yönlendirme", loc.endswith("/sayfa/hakkimizda"), loc)

# ---------- SEO: katalogda olmayan marka vaat edilmez ----------
html = urllib.request.urlopen(BASE + "/").read().decode()
desc = re.search(r'<meta name="description" content="([^"]*)"', html)
desc = desc.group(1) if desc else ""
absent = [n for n in sql("select b.name from brands b where not exists (select 1 from products p where p.brand_id=b.id and p.status='ACTIVE')").splitlines() if n]
active = [n for n in sql("select distinct b.name from brands b join products p on p.brand_id=b.id and p.status='ACTIVE' where b.is_active").splitlines() if n]
chk("ana sayfa açıklamasında yer tutucu kalmadı", "{markalar}" not in html, desc)
chk("açıklamada satıştaki bir marka geçiyor", any(n in desc for n in active), desc)
chk("ürünü olmayan marka açıklamada yok", not any(n in desc for n in absent), f"{absent} / {desc}")

with sync_playwright() as p:
    b = p.chromium.launch()

    # ---------- Kupon, otomatik kampanyadan kötüyse kampanya uygulanır, ödeme kilitlenmez ----------
    pid, price = sql("select id, price from products where status='ACTIVE' and stock >= 3 and price >= 5000 order by created_at limit 1").split("|")
    sql("delete from campaigns where code='KOTUKUPON' or name='TEST oto %10'")
    sql("insert into campaigns(id, name, type, value, scope, is_active) values (gen_random_uuid()::text, 'TEST oto %10', 'PERCENT', 10, 'ALL', true)")
    sql("insert into campaigns(id, name, type, value, code, scope, is_active) values (gen_random_uuid()::text, 'TEST kötü kupon', 'FIXED', 50, 'KOTUKUPON', 'ALL', true)")
    c = b.new_context(viewport={"width": 1366, "height": 900}).new_page()
    c.goto(BASE + "/")
    c.evaluate("([k, v]) => { localStorage.setItem(k, v); sessionStorage.setItem('bulgu_coupon', 'KOTUKUPON') }", ["bulgu_cart_v1", json.dumps([{"productId": pid, "quantity": 1}])])
    c.goto(BASE + "/sepet")
    c.wait_for_timeout(2500)
    note = c.locator("[data-testid=coupon-note]")
    chk("daha iyi kampanya varken kupon notu gösterilir", note.count() == 1, c.inner_text("main")[:400])
    chk("kupon hatası (kırmızı) gösterilmez", c.locator("p.text-danger").count() == 0)
    sql("delete from campaigns where code='KOTUKUPON' or name='TEST oto %10'")

    # ---------- Admin ----------
    a = b.new_context(viewport={"width": 1366, "height": 900}).new_page()
    a.goto(f"{BASE}/admin/giris")
    a.fill("input[name=email]", "admin@derinova.local")
    a.fill("input[name=password]", "Demo12345!")
    a.click("button[type=submit]")
    a.wait_for_load_state("networkidle")

    # Kısmi iade: indirimli (havale) siparişte önerilen tutar ödenen paydır, liste fiyatı değil
    oid = sql("select o.id from orders o where o.status in ('DELIVERED','PAID','SHIPPED') and (select count(*) from order_items i where i.order_id=o.id) >= 2 order by o.number limit 1")
    items = [r.split("|") for r in sql(f"select id, name, unit_price, quantity, total from order_items where order_id='{oid}' order by id").splitlines()]
    subtotal = sum(float(r[4]) for r in items)
    disc = round(subtotal * 0.02)
    sql(f"update orders set payment_method='TRANSFER', campaign_id=null, discount_total={disc}, subtotal={subtotal}, total={subtotal - disc} + shipping_total where id='{oid}'")
    first = items[0]
    ritems = json.dumps([{"orderItemId": first[0], "name": first[1], "quantity": 1, "unitPrice": float(first[2]), "serials": []}])
    rid = sql(f"insert into return_requests(id, order_id, reason, status, items) values (gen_random_uuid()::text, '{oid}', 'Vazgeçtim', 'APPROVED', '{ritems}'::jsonb) returning id").splitlines()[0]
    expected = round((float(first[4]) - disc * float(first[4]) / subtotal) / int(first[3]), 2)
    a.goto(f"{BASE}/admin/iadeler?id={rid}")
    val = float(a.input_value("[data-testid=refund-amount]") or 0)
    chk("kısmi iade önerisi ödenen pay kadar", abs(val - expected) < 0.02, f"{val} != {expected} (liste {first[2]})")
    chk("kartsız siparişte elle iade uyarısı", a.locator("[data-testid=manual-refund-note]").count() == 1)
    sql(f"delete from return_requests where id='{rid}'")

    # Kurulum: SMTP zorunlu adım; ödeme adımı kart kapalı + havale ile tamamlanabilir
    a.goto(f"{BASE}/admin/kurulum")
    m = a.inner_text("main")
    chk("kurulumda e-posta (SMTP) adımı var", "E-posta gönderimi (SMTP)" in m)
    chk("zorunlu adım sayısı söyleniyor", "Zorunlu" in m)

    # Menü: aynı yerde aynı etiket ikinci kez eklenemez
    loc, label = sql("select location, label from menu_items order by sort_order limit 1").split("|")
    before = sql("select count(*) from menu_items")
    a.goto(f"{BASE}/admin/menuler")
    a.select_option("select[name=location]", loc)
    a.fill("input[name=label]", label)
    a.fill("input[name=url]", "/tekrar-deneme")
    a.locator("input[name=label]").locator("xpath=ancestor::form").locator("button[type=submit]").click()
    t = toasts(a)
    chk("menüde çift kayıt engellenir", "zaten" in t and sql("select count(*) from menu_items") == before, t)

    # SSS: aynı genel soru ikinci kez eklenemez (büyük/küçük harf, noktalama farkı da aynı sayılır)
    q = sql("select question from faqs where kind='FAQ' and product_id is null and category_id is null limit 1")
    if q:
        before = sql("select count(*) from faqs")
        a.goto(f"{BASE}/admin/sss?t=sss")
        a.fill("input[name=question]", q.upper() + " ?")
        a.fill("textarea[name=answer]", "Tekrar eden soru denemesi, kaydedilmemeli.")
        a.locator("input[name=question]").locator("xpath=ancestor::form").locator("button[type=submit]").click()
        t = toasts(a)
        chk("SSS'de çift soru engellenir", "zaten kayıtlı" in t and sql("select count(*) from faqs") == before, t)

    # Ürün formu: alt kategoriler "Ana › Alt" diye görünür
    if sql("select count(*) from categories where parent_id is not null") != "0":
        a.goto(f"{BASE}/admin/urunler/yeni")
        opts = a.locator("select[name=categoryId] option").all_inner_texts()
        chk("kategori seçiminde hiyerarşi", any("›" in o for o in opts), str(opts[:8]))

    # Sayfalar: önizleme sitede görüneceği hali gösterir, alanlar dolar
    pgid = sql("select id from pages where slug='mesafeli-satis-sozlesmesi'") or sql("select id from pages limit 1")
    a.goto(f"{BASE}/admin/sayfalar?id={pgid}")
    a.click("[data-testid=content-preview-tab]")
    a.wait_for_selector("[data-testid=content-preview] .prose-lite", timeout=10000)
    prev = a.inner_text("[data-testid=content-preview]")
    chk("sayfa önizlemesi çalışır", len(prev) > 50, prev[:200])
    chk("önizlemede {{alan}} yer tutucusu kalmaz", "{{" not in prev, prev[:200])
    chk("önizlemede ham HTML etiketi görünmez", "<h2" not in prev and "<p>" not in prev)

    # Servis: durum kaydedince bildirim görünür
    sid = sql("select id from service_records order by created_at desc limit 1")
    if sid:
        a.goto(f"{BASE}/admin/servis?id={sid}")
        form = a.locator("select[name=status]").locator("xpath=ancestor::form")
        cur = a.input_value("select[name=status]")
        nxt = "IN_REPAIR" if cur != "IN_REPAIR" else "READY"
        a.select_option("select[name=status]", nxt)
        form.locator("button[type=submit]").click()
        t = toasts(a)
        chk("servis güncellemesinde bildirim çıkar", "güncellendi" in t, t)
        chk("durum kutusu yeni durumu gösterir", a.input_value("select[name=status]") == nxt)

    # Banner şerit rengi: elle seçilen renk sahneye uygulanır, sekmede bağlı ürünün fotoğrafı
    bid = sql("select id from banners where placement='HERO' and is_active order by sort_order limit 1")
    sql(f"update banners set stage_color='#123456' where id='{bid}'")
    h0 = b.new_page(viewport={"width": 1440, "height": 900})
    h0.goto(BASE + "/")
    chk("elle seçilen şerit rengi uygulanır", h0.get_attribute("[data-testid=hero-banner]", "data-stage") == "#123456")
    prod = sql(f"select count(*) from banners where id='{bid}' and link_url like '/urun/%'") == "1"
    if prod:
        chk("ürüne bağlı banner sekmesinde ürün fotoğrafı", h0.locator("[data-testid=hero-tab]").first.locator("img").count() == 1)
    sql(f"update banners set stage_color=null where id='{bid}'")

    # Kategoriler açılır menüsü: logosu girilmiş marka logo ile görünür (baş harf değil)
    logo = sql("select logo_url from brands where slug='minelab'")
    sql("update brands set logo_url='/demo/p/x-terra-pro-1.jpg' where slug='minelab'")
    sql("update menu_items set is_active=true where url like '/sayfa/hakkimizda%'")
    store = sql("select value::text from settings where key='store'")
    sql("""insert into settings(key, value) values ('store', '{"announcement": ""}') on conflict (key) do update set value = settings.value || '{"announcement": ""}'""")
    h = b.new_context(viewport={"width": 1100, "height": 900}).new_page()
    h.goto(BASE + "/")
    h.locator("button:has-text('Kategoriler'), a:has-text('Kategoriler')").first.hover()
    h.wait_for_timeout(1200)
    grid = h.locator("[data-testid=mega-brands]")
    imgs = grid.first.locator("img").count() if grid.count() else 0
    chk("Kategoriler menüsünde marka logosu görünür", imgs >= 1, f"grid={grid.count()} img={imgs}")
    has_about = sql("select count(*) from menu_items where location='HEADER' and is_active and url like '/sayfa/hakkimizda%'") != "0"
    if has_about:
        chk("duyuru boşken de üst şerit ve Hakkımızda görünür (1100px)", h.locator("[data-testid=top-strip] a[href^='/sayfa/hakkimizda']").is_visible())
    sql(f"update brands set logo_url={'null' if not logo else repr(logo)} where slug='minelab'")
    if store:
        sql(f"update settings set value = $${store}$$::jsonb where key='store'")
    else:
        sql("delete from settings where key='store'")

    b.close()

print(f"\n{ok} geçti, {fail} kaldı")
raise SystemExit(1 if fail else 0)
