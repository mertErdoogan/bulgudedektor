"""Servis kabul fişi ve seri no ile doldurma, yasal süre uyarısı, rol bazlı iş listesi, personel/ölü stok raporu,
haftalık dikkat özeti, kurulumda eksik alanlar, saat uyumsuzluğu uyarısı, Türkçe metin düzeltmeleri.
Önce: npm run db:seed. Sunucu localhost:3000."""
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


def login(pg, email, pw="Arena123!"):
    pg.goto(f"{BASE}/admin/giris")
    pg.fill("input[name=email]", email)
    pg.fill("input[name=password]", pw)
    pg.click("button[type=submit]")
    pg.wait_for_load_state("networkidle")


sql("truncate rate_hits")
with sync_playwright() as p:
    b = p.chromium.launch()
    a = b.new_context(viewport={"width": 1366, "height": 900}).new_page()
    login(a, "admin@arenadedektor.local")

    # Servis: satılmış seri no okutulunca müşteri/ürün dolar, kabul fişi basılır
    # Seed'de satışa bağlı seri no yoksa: bir sipariş kalemine stoktaki bir seri numarasını bağla
    if not sql("select 1 from serial_numbers where status='SOLD' and order_item_id is not null limit 1"):
        sql("""update serial_numbers set status='SOLD', sold_at=now(), warranty_until=now() + interval '2 years',
               order_item_id=(select oi.id from order_items oi where oi.product_id = serial_numbers.product_id limit 1)
               where id = (select s.id from serial_numbers s where s.status='IN_STOCK' and exists (select 1 from order_items oi where oi.product_id = s.product_id) limit 1)""")
    sold = sql("select s.serial||'|'||p.name from serial_numbers s join products p on p.id=s.product_id where s.status='SOLD' and s.order_item_id is not null limit 1").split("|")
    a.goto(f"{BASE}/admin/servis?yeni=1")
    a.fill("[data-testid=svc-serial]", sold[0])
    a.locator("textarea[name=issue]").click()
    a.wait_for_selector("[data-testid=svc-serial-info]", timeout=8000)
    chk("seri no ile ürün kendiliğinden doldu", a.input_value("input[name=productName]") == sold[1], a.input_value("input[name=productName]"))
    chk("seri no ile müşteri adı ve telefon doldu", a.input_value("input[name=contactName]") != "" and a.input_value("input[name=contact]") != "")
    chk("garanti durumu gösterildi", "garanti" in a.inner_text("[data-testid=svc-serial-info]"))
    a.fill("textarea[name=issue]", "Ekran yanıp sönüyor")
    a.fill("textarea[name=accessories]", "Cihaz + 1 bobin + şarj kablosu, çanta yok")
    a.click("button:has-text('Kaydı aç')")
    a.wait_for_url(re.compile(r"servis\?id="), timeout=10000)
    chk("kayıt açılınca kabul fişi bağlantısı", a.locator("[data-testid=svc-receipt]").count() == 1)
    href = a.get_attribute("[data-testid=svc-receipt]", "href")
    a.goto(BASE + href)
    chk("kabul fişi iki nüsha", a.locator("[data-testid=receipt]").count() == 2)
    chk("fişte teslim alınanlar ve imza alanı", "şarj kablosu" in a.inner_text("body") and "imza" in a.inner_text("body"))

    # Yasal süre: 16 gün önce açılmış kayıt iş listesinde uyarı olur
    sql("update service_records set created_at = now() - interval '16 days' where status='IN_REPAIR'")
    a.goto(f"{BASE}/admin/isler")
    chk("servis 15. gün sonrası yasal süre uyarısı", "yasal süre dolmak üzere" in a.inner_text("main"))

    # Rol bazlı iş listesi: fatura işleri satışçıda görünmez, yöneticide görünür
    chk("yöneticide fatura işleri var", "faturayı ekle" in a.inner_text("main"))
    s = b.new_context(viewport={"width": 1366, "height": 900}).new_page()
    login(s, "satis@arenadedektor.local")
    s.goto(f"{BASE}/admin/isler")
    chk("satışçıda fatura işleri yok", "faturayı ekle" not in s.inner_text("main"))
    chk("atanmamış işte 'Ata' yazıyor", "Ata" in s.inner_text("main"))

    # Raporlar: personel ve ölü stok
    a.goto(f"{BASE}/admin/raporlar?r=365")
    chk("personel bazında satış raporu", a.locator("[data-testid=report-sellers]").count() == 1)
    chk("ölü stok raporu", a.locator("[data-testid=report-dead]").count() == 1)
    chk("grafik ekseni 'bin' yazıyor", " bin" in a.inner_text("main") or "mn" in a.inner_text("main"))

    # Haftalık dikkat özeti: kayıp seri no ve fiyat düşüşü görünür
    sid = sql("select id from serial_numbers where status='IN_STOCK' limit 1")
    a.goto(f"{BASE}/admin/stok")
    sql(f"insert into audit_logs(id, action, entity, entity_id, summary) values (gen_random_uuid()::text, 'stock', 'serial', '{sid}', 'TEST-SN durumu KAYIP (sayımda bulunamadı)')")
    sql("""insert into audit_logs(id, action, entity, summary, data) values (gen_random_uuid()::text, 'update', 'product', 'Test ürün · fiyat 10.000 → 1.000', '{"priceFrom":10000,"priceTo":1000}')""")
    a.goto(f"{BASE}/admin/kayitlar/ozet")
    d = a.inner_text("[data-testid=digest]")
    chk("özette stoktan çıkan cihaz", "KAYIP" in d)
    chk("özette fiyat düşüşü", "10.000 → 1.000" in d)
    a.goto(f"{BASE}/admin/ayarlar?t=guvenlik")
    a.click("button:has-text('Özeti şimdi gönder')")
    a.wait_for_timeout(1500)
    chk("SMTP yokken özetin gitmediği açıkça söylenir", "gönderilemedi" in " ".join(a.locator("[data-sonner-toast]").all_inner_texts()))

    # Kurulum: eksik alan yazılır; kargo teslim adresi mağaza adresinden önerilir
    sql("""insert into settings(key, value) values ('shipping', '{"pickupAddress": ""}') on conflict (key) do update set value = settings.value || '{"pickupAddress": ""}'""")
    a.goto(f"{BASE}/admin/kurulum")
    m = a.inner_text("main")
    chk("kurulumda eksik alan adı (SMTP zorunlu adım)", "SMTP sunucu" in m)
    miss = " ".join(a.locator("[data-testid=setup-missing]").all_inner_texts())
    chk("teslim adresi boşsa mağaza adresi sayılır, eksik denmez", "showroom teslim adresi" not in miss, miss)
    a.goto(f"{BASE}/admin/ayarlar?t=kargo")
    chk("teslim adresi mağaza adresiyle önerilir", a.input_value("textarea[name=pickupAddress]") != "")

    # Saat uyumsuzluğu uyarısı
    sql("""insert into settings(key, value) values ('store', '{"workingHours": "Hafta içi 09:00-19:00", "openingHours": "Mo-Fr 09:00-20:00"}') on conflict (key) do update set value = settings.value || '{"workingHours": "Hafta içi 09:00-19:00", "openingHours": "Mo-Fr 09:00-20:00"}'""")
    a.goto(f"{BASE}/admin/ayarlar?t=magaza")
    chk("iki saat alanı tutmuyorsa uyarı", a.locator("[data-testid=hours-mismatch]").count() == 1)

    # Hata mesajında yıldız yok
    a.goto(f"{BASE}/admin/urunler/yeni")
    a.fill("input[name=name]", "Yıldız testi")
    a.locator("main button[type=submit]").last.click()
    a.wait_for_timeout(800)
    errs = " ".join(a.locator(".field-error").all_inner_texts())
    chk("hata mesajında * yok", errs and "*" not in errs, errs)
    b.close()

print(f"\n{ok}/{ok + fail} passed")
raise SystemExit(1 if fail else 0)
