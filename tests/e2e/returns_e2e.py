"""Sipariş detayı ve ürün bazlı iade:
teslim edilen siparişte kargo takibi öne çıkmaz, iade her cihaz/adet için ayrı seçilir, açık iade en üstte
kodu ve sonraki adımıyla görünür, aynı adet ikinci kez seçilemez, kısmi para iadesi yalnızca o adetleri stoğa döndürür.
Önce: npm run db:seed. Sunucu localhost:3000 (PAYMENT_SIMULATION açık)."""
import os, re, subprocess
from playwright.sync_api import sync_playwright

BASE = os.environ.get("BASE", "http://localhost:3000")
DB = os.environ.get("DATABASE_URL", "postgresql://postgres@localhost:5432/bulgu").strip('"')
ok = fail = 0


def chk(name, cond, extra=""):
    global ok, fail
    if cond:
        ok += 1
        print("PASS", name)
    else:
        fail += 1
        print("FAIL", name, extra)


def sql(q):
    return subprocess.run(["psql", DB, "-Atc", q], capture_output=True, text=True).stdout.strip()


sql("truncate rate_hits")
# Hazırlık: müşteri 1'in bir siparişi = A ürününden 2 adet (1'i seri numaralı) + B ürününden 1 adet, teslim edildi
oid = sql("select o.id from orders o join customers c on c.id=o.customer_id where c.email='musteri1@ornek.com' and o.status <> 'CANCELLED' order by o.created_at limit 1")
sql(f"delete from return_requests where order_id='{oid}'")
sql(f"delete from order_items where order_id='{oid}'")
pa, pb = sql("select string_agg(id, ',') from (select id from products where status='ACTIVE' order by created_at limit 2) x").split(",")
ia = sql(f"""insert into order_items (id, order_id, product_id, name, sku, unit_price, quantity, total)
             select gen_random_uuid()::text, '{oid}', id, name, sku, 10000, 2, 20000 from products where id='{pa}' returning id""").splitlines()[0]
ib = sql(f"""insert into order_items (id, order_id, product_id, name, sku, unit_price, quantity, total)
             select gen_random_uuid()::text, '{oid}', id, name, sku, 5000, 1, 5000 from products where id='{pb}' returning id""").splitlines()[0]
name_a = sql(f"select name from products where id='{pa}'")
name_b = sql(f"select name from products where id='{pb}'")
sql(f"""insert into serial_numbers (id, product_id, serial, status, order_item_id, sold_at, warranty_until)
        values (gen_random_uuid()::text, '{pa}', 'E2E-IADE-001', 'SOLD', '{ia}', now(), now() + interval '2 years') on conflict (serial) do update set status='SOLD', order_item_id='{ia}', warranty_until=now() + interval '2 years'""")
sql(f"""update orders set status='DELIVERED', payment_status='PAID', payment_method='CARD', payment_meta='{{"raw":"simulated"}}'::jsonb,
        subtotal=25000, discount_total=0, shipping_total=0, total=25000, carrier='MNG Kargo', tracking_number='123412341234',
        shipped_at=now() - interval '3 days', delivered_at=now() - interval '2 days', delivery_method='CARGO' where id='{oid}'""")
stock_a0 = int(sql(f"select stock from products where id='{pa}'"))

with sync_playwright() as p:
    b = p.chromium.launch()
    c = b.new_context(viewport={"width": 1280, "height": 900}).new_page()
    c.goto(f"{BASE}/giris")
    c.fill("input[name=id]", "musteri1@ornek.com")
    c.fill("input[name=password]", "Arena123!")
    c.click("button:has-text('Giriş yap')")
    c.wait_for_load_state("networkidle")

    # Eski "hesabım?iade=" bağlantısı sipariş detayındaki forma gider
    c.goto(f"{BASE}/hesabim?iade={oid}")
    c.wait_for_url(re.compile(r"/siparis/.+iade=1"), timeout=10000)
    page_url = c.url.split("&iade")[0].split("#")[0]
    chk("hesabım iade bağlantısı sipariş detayına yönlendi", "/siparis/" in c.url)
    chk("durum özeti en üstte: teslim edildi", c.get_attribute("[data-testid=order-hero]", "data-status") == "DELIVERED" and "Teslim edildi" in c.inner_text("[data-testid=order-hero]"))
    chk("teslim edilmiş siparişte kargo takip butonu yok", c.locator("[data-testid=track-link]").count() == 0 and c.locator("text=Kargonu takip et").count() == 0)
    chk("hızlı işlemlerde iade ve arıza var", c.locator("[data-testid=tile-return]").count() == 1 and "Arıza" in c.inner_text("[data-testid=quick-actions]"))
    chk("iade süresi gün olarak yazıyor", "gün kaldı" in c.inner_text("[data-testid=tile-return]"))
    units = c.locator("[data-testid=return-unit]")
    chk("her adet ayrı seçilebilir (2 + 1 = 3 birim)", units.count() == 3, str(units.count()))
    chk("seri numaralı cihaz seri no ile listeleniyor", "E2E-IADE-001" in c.inner_text("[data-testid=return-form]"))

    # Ürün seçmeden gönderilemez
    c.select_option("select[name=reason]", "Beklentimi karşılamadı")
    c.click("button:has-text('İade talebini gönder')")
    c.wait_for_timeout(1200)
    chk("ürün seçmeden talep açılmıyor", sql(f"select count(*) from return_requests where order_id='{oid}'") == "0")

    # A ürününün seri numaralı cihazını iade et (diğer adet ve B müşteride kalır)
    c.click("label:has-text('E2E-IADE-001')")
    c.click("button:has-text('İade talebini gönder')")
    c.wait_for_url(re.compile(r"iade=alindi"), timeout=10000)
    c.wait_for_load_state("networkidle")
    items = sql(f"select items::text from return_requests where order_id='{oid}'")
    chk("talep yalnızca seçilen cihazı içeriyor", '"E2E-IADE-001"' in items and '"quantity": 1' in items and name_b not in items, items)
    chk("iade durumu en üstte görünüyor", c.locator("[data-testid=return-status]").count() == 1 and "Talep edildi" in c.inner_text("[data-testid=return-card]"))
    chk("talep sonrası bir sonraki adım yazıyor", "Şimdi ne olacak?" in c.inner_text("[data-testid=return-card]"))
    chk("hızlı işlemde 'İade durumum' çıktı", c.locator("[data-testid=tile-return-status]").count() == 1)
    chk("kalan ürünler için iade hâlâ mümkün ama 'başka ürün' olarak", "Başka bir ürünü iade et" in c.inner_text("[data-testid=tile-return]"))
    chk("üründe '1 adet iade sürecinde' rozeti", c.locator("[data-testid=item-return-badge]").count() == 1)

    c.goto(f"{page_url}&iade=1#iade")
    c.wait_for_load_state("networkidle")
    chk("iade sürecindeki cihaz tekrar seçilemiyor", c.locator("[data-testid=return-unit][value$='|E2E-IADE-001']").is_disabled())
    chk("diğer adetler seçilebilir", c.locator("[data-testid=return-unit]:not([disabled])").count() == 2)

    # Personel onaylar → müşteri kodu en üstte görür
    a = b.new_context(viewport={"width": 1366, "height": 900}).new_page()
    a.goto(f"{BASE}/admin/giris")
    a.fill("input[name=email]", "admin@arenadedektor.local")
    a.fill("input[name=password]", "Arena123!")
    a.click("button[type=submit]")
    a.wait_for_load_state("networkidle")
    rid = sql(f"select id from return_requests where order_id='{oid}'")
    a.goto(f"{BASE}/admin/iadeler?id={rid}")
    chk("panelde iade edilen cihaz ve kısmi iade uyarısı", "E2E-IADE-001" in a.inner_text("[data-testid=return-items]") and "Kısmi iade" in a.inner_text("[data-testid=return-items]"))
    a.select_option("select[name=to]", "APPROVED")
    a.click("button:has-text('Uygula')")
    a.wait_for_timeout(1500)
    code = sql(f"select return_code from return_requests where id='{rid}'")
    c.goto(page_url)
    chk("onaydan sonra iade kodu en üstte, kopyalanabilir", code and code in c.inner_text("[data-testid=return-code]") and c.locator("[data-testid=return-code] button").count() == 1, code)

    # Para iadesi: tutar yalnızca iade edilen cihazın bedeli
    a.goto(f"{BASE}/admin/iadeler?id={rid}")
    a.select_option("select[name=to]", "REFUNDED")
    chk("iade tutarı varsayılanı yalnızca bu cihaz", a.input_value("input[name=refundAmount]") in ("10000", "10000.00"), a.input_value("input[name=refundAmount]"))
    a.click("button:has-text('Uygula')")
    a.wait_for_timeout(2000)
    st = sql(f"select status||'|'||payment_status from orders where id='{oid}'")
    chk("kısmi iade sonrası sipariş teslim edildi kalıyor, ödeme kısmi iade", st == "DELIVERED|PARTIALLY_REFUNDED", st)
    chk("yalnızca iade edilen cihazın seri numarası iade oldu", sql("select status from serial_numbers where serial='E2E-IADE-001'") == "RETURNED")
    chk("stoğa yalnızca 1 adet döndü", int(sql(f"select stock from products where id='{pa}'")) == stock_a0 + 1)

    c.goto(page_url)
    chk("müşteri tarafında 'para iadesi yapıldı' ve tutar", "Para iadesi yapıldı" in c.inner_text("[data-testid=return-card]") and "10.000" in c.inner_text("[data-testid=return-card]"))
    chk("açık iade kalmayınca 'iade durumum' kutusu kalkıyor", c.locator("[data-testid=tile-return-status]").count() == 0)

    # Kalan iki adedi de iade et → hepsi bitince iade butonu kaybolur
    c.goto(f"{page_url}&iade=1#iade")
    for el in c.locator("[data-testid=return-unit]:not([disabled])").all():
        el.evaluate("e => e.closest('label').click()")
    c.select_option("select[name=reason]", "Yanlış ürün seçtim")
    c.click("button:has-text('İade talebini gönder')")
    c.wait_for_url(re.compile(r"iade=alindi"), timeout=10000)
    c.wait_for_load_state("networkidle")
    chk("bütün adetler talep edilince iade butonu kalkıyor", c.locator("[data-testid=tile-return]").count() == 0)
    chk("iki ayrı iade kartı listeleniyor", c.locator("[data-testid=return-card]").count() == 2)
    c.goto(f"{BASE}/hesabim?t=siparisler")
    row = c.locator(f"a[href*='{oid}']").first.locator("xpath=ancestor::div[contains(@class,'rounded-xl')][1]")
    chk("hesabım listesinde de 'İade et' kalktı", row.locator("text=İade et").count() == 0)

    # Kargodaki siparişte takip öne çıkar
    sql(f"update orders set status='SHIPPED', delivered_at=null where id='{oid}'")
    c.goto(page_url)
    chk("kargodaki siparişte takip numarası ve kopyalama en üstte", c.locator("[data-testid=tracking]").count() == 1 and "123412341234" in c.inner_text("[data-testid=tracking]"))
    chk("kargodayken iade butonu yok", c.locator("[data-testid=tile-return]").count() == 0)
    b.close()

print(f"\n{ok} geçti, {fail} kaldı")
raise SystemExit(1 if fail else 0)
