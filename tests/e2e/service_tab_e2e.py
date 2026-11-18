"""Hesabım > Servis: geliş amacına göre odak.
Açık kaydı yoksa form öne çıkar; açık kaydı varsa durum kartı öne çıkar, form tek satırlık davete iner;
geçmiş kayıtlar kapalı bir bölümde. Cihaz kartla seçilir; model ve seri no kayıttan gelir.
Önce: npm run db:seed. Sunucu localhost:3000."""
import os, re, subprocess
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
cid = sql("select id from customers where email='musteri1@ornek.com'")
sql(f"delete from service_records where customer_id='{cid}'")
# Müşterinin iki cihazı olsun (aynı modelden iki seri no: eski formdaki ad/seri karışıklığı burada çıkıyordu)
item = sql(f"select i.id||'|'||i.product_id||'|'||i.name from order_items i join orders o on o.id=i.order_id where o.customer_id='{cid}' and i.product_id is not null order by o.created_at limit 1").split("|")
sql(f"update serial_numbers set order_item_id=null, status='IN_STOCK' where serial like 'E2E-SRV-%'")
for n in ("1", "2"):
    sql(f"""insert into serial_numbers (id, product_id, serial, status, order_item_id, sold_at, warranty_until)
            values (gen_random_uuid()::text, '{item[1]}', 'E2E-SRV-00{n}', 'SOLD', '{item[0]}', now(), now() + interval '2 years')
            on conflict (serial) do update set status='SOLD', order_item_id='{item[0]}', warranty_until=now() + interval '2 years'""")
# Geçmiş (kapanmış) bir kayıt
sql(f"""insert into service_records (id, customer_id, contact_name, contact, product_name, serial, issue, status, history, created_at)
        values (gen_random_uuid()::text, '{cid}', 'Ahmet', '05550000000', 'GPZ 7000', 'ESKI-123', 'açılmıyor enerji gelmiyor', 'CLOSED',
        '[{{"status":"RECEIVED","at":"2026-10-01T10:00:00Z"}},{{"status":"READY","at":"2026-10-05T10:00:00Z","note":"Bobin arızası giderildi."}},{{"status":"CLOSED","at":"2026-10-07T10:00:00Z"}}]'::jsonb, now() - interval '45 days')""")

with sync_playwright() as p:
    b = p.chromium.launch()
    c = b.new_context(viewport={"width": 1280, "height": 900}).new_page()
    c.goto(f"{BASE}/giris")
    c.fill("input[name=id]", "musteri1@ornek.com")
    c.fill("input[name=password]", "Demo12345!")
    c.click("button:has-text('Giriş yap')")
    c.wait_for_load_state("networkidle")

    c.goto(f"{BASE}/hesabim?t=servis")
    order = c.evaluate("""() => ['service-new','service-history'].map(t => document.querySelector(`[data-testid=${t}]`)?.getBoundingClientRect().top ?? -1)""")
    chk("açık kaydı yokken form en üstte, geçmişin önünde", order[0] >= 0 and order[0] < order[1], str(order))
    chk("geçmiş kayıtlar kapalı bölümde, sayısıyla", c.locator("[data-testid=service-history]:not([open])").count() == 1 and "Geçmiş servis kayıtları (1)" in c.inner_text("[data-testid=service-history]"))
    chk("geçmiş kaydı açınca sonuç notu görünüyor", (c.click("[data-testid=service-history] summary") or True) and "Bobin arızası giderildi" in c.inner_text("[data-testid=service-past]"))
    chk("cihazlar kart olarak, seri no ve garantiyle", c.locator("[data-testid=service-device]").count() >= 2 and "Garantili" in c.inner_text("[data-testid=service-form]"))

    # "Listede yok" seçilince model/seri alanı açılır
    chk("model alanı başta gizli", not c.locator("input[name=productName]").is_visible())
    c.click("label:has-text('Listede yok')")
    chk("'Listede yok' seçince model alanı açıldı", c.locator("input[name=productName]").is_visible())

    # Cihaz kartından gelen arıza bildir: o cihaz seçili gelir
    c.goto(f"{BASE}/hesabim?ariza=E2E-SRV-002#ariza")
    chk("cihaz kartından gelince doğru cihaz seçili", c.locator("[data-testid=service-device][value='E2E-SRV-002']").is_checked())
    c.fill("textarea[name=issue]", "Açılıyor ama ses gelmiyor, ekranda hata var")
    c.click("button:has-text('Servis kaydını aç')")
    c.wait_for_url(re.compile(r"yeni=\d+"), timeout=10000)
    rec = sql(f"select product_name||'|'||serial from service_records where customer_id='{cid}' and status <> 'CLOSED'")
    chk("kayıt seçilen cihazın adı ve seri no'suyla açıldı", rec == f"{item[2]}|E2E-SRV-002", rec)
    chk("açılış onayı görünüyor", c.locator("[data-testid=service-created]").count() == 1)
    order = c.evaluate("""() => ['service-open-list','service-new','service-history'].map(t => document.querySelector(`[data-testid=${t}]`)?.getBoundingClientRect().top ?? -1)""")
    chk("açık kayıt varken durum kartı en üstte", order[0] >= 0 and order[0] < order[1] < order[2], str(order))
    chk("durum kartında 'şimdi ne olacak' ve aşamalar", "Şimdi ne olacak?" in c.inner_text("[data-testid=service-open]") and "Tamirde" in c.inner_text("[data-testid=service-open]"))
    chk("form tek satırlık davete indi", c.locator("[data-testid=service-new-cta]").count() == 1 and c.locator("[data-testid=service-form]").count() == 0)
    chk("sekmede açık kayıt sayısı rozeti", "Servis1" in c.inner_text("[data-testid=account-tabs]").replace("\n", "").replace(" ", ""))

    c.click("[data-testid=service-new-cta]")
    c.wait_for_selector("[data-testid=service-form]", timeout=8000)
    chk("serviste olan cihaz tekrar seçilemiyor", c.locator("[data-testid=service-device][value='E2E-SRV-002']").is_disabled() and "Zaten serviste" in c.inner_text("[data-testid=service-form]"))
    c.goto(f"{BASE}/hesabim?t=cihazlar")
    chk("cihazlarım'da serviste olan cihaz 'Serviste · durum' gösteriyor", c.locator("text=Serviste · durum").count() == 1)
    b.close()

print(f"\n{ok} geçti, {fail} kaldı")
raise SystemExit(1 if fail else 0)
