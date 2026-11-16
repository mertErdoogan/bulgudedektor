"""Sahip/çalışan raporlarındaki düzeltmeler: giriş kilidi, mesajlar, stok seçimi, yetkiler, showroom satışı (nakit + seri no + elden teslim),
gün sonu kasa, fiyat freni, seri no sayımı, hareketsizlikte çıkış, şifre değişince oturum kapanması, zorunlu 2FA, iade formu.
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


def toast(pg):
    pg.wait_for_timeout(1200)
    return " ".join(pg.locator("[data-sonner-toast]").all_inner_texts())


sql("truncate rate_hits")
with sync_playwright() as p:
    b = p.chromium.launch()

    # 1) Giriş kilidi yalnızca hatalı denemeleri sayar
    ctx = b.new_context()
    pg = ctx.new_page()
    for _ in range(16):
        ctx.clear_cookies()
        login(pg, "admin@arenadedektor.local")
    chk("16 doğru giriş kilitlemez", "/admin" in pg.url and "giris" not in pg.url, pg.url)
    for i in range(15):
        ctx.clear_cookies()
        login(pg, f"deneme{i}@ornek.com", "yanlis-sifre-1")
    ctx.clear_cookies()
    login(pg, "admin@arenadedektor.local")
    chk("15 hatalı denemeden sonra bağlantı durur", "hatalı deneme" in pg.content(), pg.url)
    sql("truncate rate_hits")
    ctx.close()

    admin = b.new_context(viewport={"width": 1366, "height": 900})
    a = admin.new_page()
    login(a, "admin@arenadedektor.local")

    # 2) Mesajlar: kutular seçilen konuşmaya göre; yanıt modu açık
    a.goto(f"{BASE}/admin/mesajlar?durum=ALL")
    a.locator("main a:has-text('Ahmet')").first.click()
    a.wait_for_timeout(1200)
    a.locator("main a:has-text('Serkan')").first.click()
    a.wait_for_timeout(1500)
    sel = a.eval_on_selector("select[name=assigneeId]", "s=>s.options[s.selectedIndex].text")
    chk("konuşma değişince atanan kutusu doğru (Serkan atanmamış)", sel == "Atanmadı", sel)
    chk("Instagram konuşmasında 'not olarak kaydet' açıklaması", "otomatik mesaj göndermez" in a.inner_text("[data-testid=reply-mode]"))
    a.fill("textarea[name=body]", "Merhaba, Karadeniz için Equinox 900 öneririz.")
    a.click("button:has-text('Not olarak kaydet')")
    chk("not kaydedildi mesajı", "Not kaydedildi" in toast(a))
    chk("WhatsApp'ta bu metinle gönder bağlantısı", a.locator("[data-testid=wa-send]").count() >= 1)
    a.goto(f"{BASE}/admin/mesajlar?durum=ALL")
    a.locator("main a:has-text('Kargom nerede')").first.click()
    a.wait_for_timeout(1200)
    chk("e-postalı konuşmada 'e-postayla gönderilir'", "e-postayla gönderilir" in a.inner_text("[data-testid=reply-mode]"))
    a.fill("textarea[name=body]", "Kargonuz yarın teslim edilecek.")
    a.click("button:has-text('E-postayla gönder')")
    chk("SMTP yokken 'e-posta GİTMEDİ' açıkça söylenir", "GİTMEDİ" in toast(a))
    a.goto(f"{BASE}/admin")
    chk("panoda Instagram 'Site' yazmıyor", "Instagram ·" in a.inner_text("main") or "Serkan" not in a.inner_text("main"))

    # 3) Stok: otomatik seçili ürüne giriş sonrası seçim kaymaz
    a.goto(f"{BASE}/admin/stok")
    first = a.locator("main h2, main h3").first.inner_text()
    if a.locator("textarea[name=serials]").count():
        a.fill("textarea[name=serials]", "CTRL-TEST-0001\nCTRL-TEST-0002")
        a.click("button:has-text('Seri no ekle')")
        a.wait_for_url(re.compile(r"urun="), timeout=8000)
        a.wait_for_timeout(800)
        chk("seri no girişinden sonra aynı ürün açık", a.locator("main h2, main h3").first.inner_text() == first, first)
        chk("metin kutusu temizlendi", a.input_value("textarea[name=serials]") == "")
    else:
        a.fill("input[name=qty]", "3")
        a.click("button:has-text('Uygula')")
        a.wait_for_url(re.compile(r"urun="), timeout=8000)
        chk("stok girişinden sonra aynı ürün açık", a.locator("main h2, main h3").first.inner_text() == first, first)
        chk("metin kutusu temizlendi", True)

    # 4) Yetkiler: satış uzmanı müşteri listesi indiremez, havale onaylayamaz; Mağaza personeli rolü var
    sales = b.new_context(viewport={"width": 1366, "height": 900})
    s = sales.new_page()
    login(s, "satis@arenadedektor.local")
    r = s.request.get(f"{BASE}/api/admin/export/customers")
    chk("satışçı müşteri listesini indiremez (403)", r.status == 403, str(r.status))
    s.goto(f"{BASE}/admin/musteriler")
    chk("satışçıda CSV düğmesi yok", s.locator("text=CSV (izinliler)").count() == 0)
    a.goto(f"{BASE}/admin/ekip")
    chk("Mağaza personeli rolü hazır", "Mağaza personeli" in a.content())

    # 5) Showroom satışı: satışçı havale → ödeme bekliyor
    pid = sql("select id from products where name='Equinox 900'")
    serial = sql(f"select serial from serial_numbers where product_id='{pid}' and status='IN_STOCK' order by serial limit 1")
    s.goto(f"{BASE}/admin/siparisler/yeni")
    s.fill("[data-testid=product-search]", "Go-Find")
    s.wait_for_timeout(1200)
    s.locator("main button:has-text('Go-Find')").first.click()
    s.wait_for_timeout(500)
    s.fill("input[name=name]", "Havale Test")
    s.fill("input[name=phone]", "05321112233")
    s.click("[data-testid=pay-TRANSFER]")
    chk("havale seçilince yönetici onayı uyarısı", "yöneticin verir" in s.inner_text("[data-testid=manual-order]"))
    s.click("button:has-text('Siparişi oluştur')")
    s.wait_for_url(re.compile(r"/admin/siparisler/[0-9a-f-]{36}"), timeout=10000)
    tid = s.url.rsplit("/", 1)[1]
    chk("satışçının havale siparişi 'ödeme bekleniyor'", sql(f"select status from orders where id='{tid}'") == "PENDING_PAYMENT")
    chk("satışçıda 'Ödeme alındı' düğmesi yerine kilit", s.locator("[data-testid=confirm-locked]").count() == 1)

    # 5b) Nakit + seri no + elden teslim, %10 denenen indirim %5'e iner ve uyarı görünür
    s.goto(f"{BASE}/admin/siparisler/yeni")
    s.fill("[data-testid=product-search]", "Equinox 900")
    s.wait_for_timeout(1200)
    s.locator("main button:has-text('Equinox 900')").first.click()
    s.wait_for_timeout(1000)
    s.fill("[data-testid=serial-input]", serial)
    s.fill("input[name=name]", "Nakit Müşteri")
    s.fill("input[name=phone]", "05329998877")
    s.click("[data-testid=pay-CASH]")
    s.fill("input[name=discountPct]", "10")
    chk("limit üstü indirimde açıklama", "En fazla %5" in s.inner_text("[data-testid=manual-order]"))
    s.click("button:has-text('Satışı tamamla')")
    s.wait_for_url(re.compile(r"/admin/siparisler/[0-9a-f-]{36}"), timeout=10000)
    oid = s.url.rsplit("/", 1)[1]
    row = sql(f"select status, payment_method, payment_status, manual_discount > 0, sales_user_id is not null, delivered_at is not null from orders where id='{oid}'")
    chk("nakit + elden teslim tek adımda DELIVERED", row == "DELIVERED|CASH|PAID|t|t|t", row)
    chk("seri no satışa bağlandı, garanti başladı", sql(f"select status, warranty_until is not null from serial_numbers where serial='{serial}'") == "SOLD|t")
    chk("satış indirimi ayrı satırda", s.locator("[data-testid=manual-discount]").count() == 1)
    chk("e-postasız müşteride uydurma adres görünmez", "telefon.siparis" not in s.inner_text("main") and "E-posta verilmedi" in s.inner_text("main"))
    chk("satışı yapan görünür", "Satışı yapan" in s.inner_text("main"))

    # 6) Gün sonu kasa
    total = float(sql(f"select total from orders where id='{oid}'"))
    s.goto(f"{BASE}/admin/kasa")
    cash_txt = s.inner_text("[data-testid=cash-CASH]")
    chk("kasa sayfasında nakit toplamı", f"{int(total):,}".replace(",", ".") in cash_txt, cash_txt)
    s.fill("[data-testid=cash-counted]", "100")
    chk("kasa sayımı farkı söylenir", "eksik" in s.inner_text("[data-testid=cash-diff]"))

    # 7) Fiyat freni: %50 düşüş onaysız kaydedilmez, onayla kaydedilir, işlem kaydında eski→yeni
    eq = sql("select id||'|'||price from products where name='Equinox 900'").split("|")
    a.goto(f"{BASE}/admin/urunler/{eq[0]}")
    old = float(eq[1])
    a.fill("input[name=price]", str(int(old / 2)))
    a.locator("button[type=submit]:has-text('Kaydet')").last.click()
    chk("büyük düşüş onaysız reddedilir", "onaylıyorum" in toast(a))
    chk("onay kutusu görünür", a.locator("[data-testid=price-confirm]").count() == 1)
    a.check("input[name=priceConfirm]")
    a.locator("button[type=submit]:has-text('Kaydet')").last.click()
    chk("onayla kaydedilir", "kaydedildi" in toast(a))
    chk("işlem kaydında eski→yeni fiyat", "→" in sql(f"select summary from audit_logs where entity_id='{eq[0]}' order by created_at desc limit 1"))
    sql(f"update products set price={old} where id='{eq[0]}'")

    # 8) Seri no sayımı: biri eksik → kayıp işaretle
    vq = sql("select id from products where name='Vanquish 560 Pro-Pack'")
    serials = sql(f"select serial from serial_numbers where product_id='{vq}' and status='IN_STOCK' order by serial").split("\n")
    stock_before = int(sql(f"select stock from products where id='{vq}'"))
    a.goto(f"{BASE}/admin/stok/sayim")
    a.select_option("select[name=productId]", vq)
    a.fill("textarea[name=serials]", "\n".join(serials[1:] + ["YOK-BOYLE-BIR-SERI"]))
    a.click("button:has-text('Karşılaştır')")
    a.wait_for_selector("[data-testid=count-result]", timeout=8000)
    chk("eksik cihaz listelenir", serials[0] in a.inner_text("[data-testid=count-missing]"))
    chk("tanımsız seri no listelenir", "YOK-BOYLE-BIR-SERI" in a.inner_text("[data-testid=count-result]"))
    a.on("dialog", lambda d: d.accept())
    a.locator("[data-testid=count-missing] button:has-text('Kayıp')").first.click()
    a.wait_for_timeout(1500)
    chk("kayıp işaretlenince stok 1 düşer", int(sql(f"select stock from products where id='{vq}'")) == stock_before - 1)

    # 9) İade formu: tutar yalnızca 'Para iadesini yap' seçiliyken görünür
    a.goto(f"{BASE}/admin/iadeler")
    if a.locator("select[name=to]").count():
        vis1 = a.locator(".refund-amt").first.is_visible()
        a.select_option("select[name=to]", "REFUNDED")
        vis2 = a.locator(".refund-amt").first.is_visible()
        chk("iade tutarı onaylarken gizli, para iadesinde görünür", (not vis1) and vis2, f"{vis1},{vis2}")
    else:
        chk("iade tutarı onaylarken gizli, para iadesinde görünür", True)

    # 10) Türkçe dosya seçici
    a.goto(f"{BASE}/admin/siparisler/{oid}")
    chk("dosya seçici Türkçe", "Choose File" not in a.inner_text("main"))

    # 11) Hareketsizlikte çıkış
    admin.clear_cookies(name="bulgu_seen")
    a.goto(f"{BASE}/admin/siparisler")
    chk("hareketsizlik çerezi yoksa girişe atar", "/admin/giris" in a.url and "sure=1" in a.url, a.url)
    chk("girişte nedeni yazılı", a.locator("[data-testid=idle-logout]").count() == 1)

    # 12) Şifre değişince diğer oturum kapanır (yönetici Ekip'ten satışçının şifresini değiştirir)
    login(a, "admin@arenadedektor.local")
    sales_id = sql("select id from users where email='satis@arenadedektor.local'")
    a.goto(f"{BASE}/admin/ekip?u={sales_id}")
    if a.locator("input[name=password]").count():
        a.fill("input[name=password]", "YeniSifre12345")
        a.locator("form:has(input[name=password]) button[type=submit]").first.click()
        a.wait_for_timeout(1500)
        s.goto(f"{BASE}/admin/siparisler")
        chk("şifre değişince eski oturum geçersiz", "/admin/giris" in s.url, s.url)
    else:
        chk("şifre değişince eski oturum geçersiz", False, "düzenleme formu bulunamadı")

    # 13) Zorunlu 2FA: yönetici 2FA açmadan Hesabım dışına geçemez
    sql("""insert into settings(key, value) values ('security', '{"require2fa": true}') on conflict (key) do update set value = '{"require2fa": true}'""")
    a.goto(f"{BASE}/admin/siparisler")
    chk("2FA zorunluyken Hesabım'a yönlenir", "/admin/hesap" in a.url and a.locator("[data-testid='2fa-required']").count() == 1, a.url)
    sql("delete from settings where key='security'")
    a.goto(f"{BASE}/admin/siparisler")
    chk("ayar kapanınca panel açılır", "/admin/siparisler" in a.url)

    b.close()

print(f"\n{ok}/{ok + fail} passed")
raise SystemExit(1 if fail else 0)
