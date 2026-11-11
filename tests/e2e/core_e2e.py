import os
import asyncio, re, subprocess
from playwright.async_api import async_playwright, expect

B = os.environ.get("BASE_URL", "http://localhost:3000")
def sql(q):
    return subprocess.run(["psql", os.environ.get("DATABASE_URL", "postgresql://postgres@localhost/bulgu"), "-tAc", q], capture_output=True, text=True).stdout.strip()

results = []
def check(name, cond, extra=""):
    results.append((name, bool(cond)))
    print(("PASS " if cond else "FAIL ") + name + (f" — {extra}" if extra else ""))

async def toast_text(pg):
    try:
        t = pg.locator("[data-sonner-toast]").last
        await t.wait_for(timeout=15000)
        return await t.inner_text()
    except Exception:
        return ""

async def admin_login(pg, email="admin@arenadedektor.local"):
    await pg.goto(B + "/admin/giris")
    await pg.fill("input[name=email]", email)
    await pg.fill("input[name=password]", "Arena123!")
    await pg.click("button[type=submit]")
    await pg.wait_for_url(re.compile(r".*/admin(\?.*)?$"), timeout=60000)

async def main():
    sql("delete from rate_hits")  # DB tabanlı hız sınırı testler arasında sıfırlanır
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get("CHROME", "/usr/bin/google-chrome"))
        errs = []
        # ───────── Müşteri: kart (simülasyon) ile misafir sipariş + kupon
        ctx = await b.new_context(viewport={"width": 1300, "height": 900})
        pg = await ctx.new_page()
        pg.on("pageerror", lambda e: errs.append(str(e)))
        stock_before = int(sql("select stock from products where slug='ace-250'"))
        await pg.goto(B + "/urun/ace-250", wait_until="networkidle")
        await pg.locator("main >> text=Sepete ekle").first.click()
        await pg.wait_for_timeout(500)
        await pg.goto(B + "/sepet", wait_until="networkidle")
        await pg.fill("input[placeholder='Kupon kodu']", "HOSGELDIN")
        await pg.click("text=Uygula")
        await pg.wait_for_selector("text=Hoş geldin indirimi uygulandı", timeout=20000)
        check("Kupon sepette uygulandı", True)
        await pg.goto(B + "/odeme", wait_until="networkidle")
        await pg.fill("input[name=phone]", "05321234567")
        await pg.fill("input[name=email]", "e2e.test@ornek.com")
        await pg.fill("input[name=fullName]", "Test Müşteri")
        await pg.select_option("select[name=city]", "İzmir")
        await pg.wait_for_function("document.querySelector(\"select[name=district]\")?.options.length > 2"); await pg.select_option("select[name=district]", "Bornova")
        await pg.fill("textarea[name=line]", "Kazımdirik Mah. 123 Sk. No 4")
        await pg.check("input[name=terms]")
        await pg.locator("button[type=submit]:visible").first.click()
        await pg.wait_for_url(re.compile(r".*/odeme/simulasyon.*"), timeout=60000)
        await pg.click("button[value=ok]")
        await pg.wait_for_url(re.compile(r".*/siparis/.*yeni=1.*"), timeout=60000)
        check("Kartla ödeme sonrası sipariş sayfası", "siparişin alındı" in (await pg.inner_text("body")))
        oid = re.search(r"/siparis/([^?]+)", pg.url).group(1)
        row = sql(f"select status||'|'||payment_status||'|'||discount_total||'|'||coalesce(coupon_code,'') from orders where id='{oid}'")
        check("Sipariş PAID + kupon indirimi kaydedildi", row.startswith("PAID|PAID|") and "HOSGELDIN" in row, row)
        check("Stok düştü", int(sql("select stock from products where slug='ace-250'")) == stock_before - 1)
        check("Kampanya kullanım sayısı arttı", sql("select usage_count from campaigns where code='HOSGELDIN'") == "1")
        # sepet temizlendi mi
        await pg.goto(B + "/sepet", wait_until="networkidle")
        check("Sipariş sonrası sepet boş", "Sepetin boş" in await pg.inner_text("body"))

        # ───────── Havale siparişi
        await pg.goto(B + "/urun/findx-pro", wait_until="networkidle")
        await pg.locator("main >> text=Sepete ekle").first.click()
        await pg.goto(B + "/odeme", wait_until="networkidle")
        await pg.fill("input[name=phone]", "05321234567")
        await pg.fill("input[name=email]", "e2e.test@ornek.com")
        await pg.fill("input[name=fullName]", "Test Müşteri")
        await pg.click("text=Showroom'dan teslim al")
        await pg.click("text=Havale / EFT")
        await pg.check("input[name=terms]")
        await pg.locator("button[type=submit]:visible").first.click()
        await pg.wait_for_url(re.compile(r".*/siparis/.*"), timeout=60000)
        body = await pg.inner_text("body")
        check("Havale siparişinde IBAN gösterildi", "Havale / EFT bilgileri" in body)
        tid = re.search(r"/siparis/([^?]+)", pg.url).group(1)
        r2 = sql(f"select status||'|'||payment_method||'|'||delivery_method||'|'||discount_total from orders where id='{tid}'")
        check("Havale indirimi + showroom teslim", r2.startswith("PENDING_PAYMENT|TRANSFER|PICKUP|") and float(r2.split("|")[3]) > 0, r2)

        # ───────── Admin: sipariş işleme (seri no ata, kargola, teslim)
        actx = await b.new_context(viewport={"width": 1400, "height": 900})
        ap = await actx.new_page()
        ap.on("pageerror", lambda e: errs.append(str(e)))
        await admin_login(ap)
        await ap.goto(B + f"/admin/siparisler/{oid}", wait_until="networkidle")
        await ap.click("button:has-text('Hazırlanıyor')")
        await ap.wait_for_timeout(2500)
        check("Admin: Hazırlanıyor", sql(f"select status from orders where id='{oid}'") == "PREPARING")
        await ap.reload(wait_until="networkidle")
        await ap.fill("input[name=tracking]", "123456789")
        await ap.click("button:has-text('Kargoya verildi')")
        await ap.wait_for_timeout(2500)
        check("Admin: kargo", sql(f"select status||'|'||tracking_number from orders where id='{oid}'") == "SHIPPED|123456789")
        await ap.reload(wait_until="networkidle")
        await ap.click("button:has-text('Teslim edildi')")
        await ap.wait_for_timeout(2500)
        check("Admin: teslim", sql(f"select status from orders where id='{oid}'") == "DELIVERED")
        # havale ödemesini onayla
        await ap.goto(B + f"/admin/siparisler/{tid}", wait_until="networkidle")
        await ap.click("button:has-text('Ödeme alındı')")
        t = await toast_text(ap)
        check("Admin: havale onaylandı", sql(f"select payment_status from orders where id='{tid}'") == "PAID", t)
        # seri takipli ürün: seri ataması zorunlu
        # Ön koşul: seri takipli ürün içeren, seri atanmamış ödenmiş bir sipariş ve stokta bir seri no (rastgele demo veriye bağlı kalmasın)
        pid = sql("select i.product_id from order_items i join orders o on o.id=i.order_id where o.status='PAID' and i.product_id is not null and not exists (select 1 from serial_numbers s where s.order_item_id=i.id) order by o.number limit 1")
        if pid:
            sql(f"update products set track_serial=true where id='{pid}'")
            sql(f"insert into serial_numbers (product_id, serial, status) values ('{pid}', 'E2E-SERI-' || floor(random()*1e9)::text, 'IN_STOCK')")
        sid = sql("select o.id from orders o join order_items i on i.order_id=o.id join products p on p.id=i.product_id where p.track_serial and o.status='PAID' and not exists (select 1 from serial_numbers s where s.order_item_id=i.id) order by o.number limit 1")
        if sid:
            await ap.goto(B + f"/admin/siparisler/{sid}", wait_until="networkidle")
            await ap.fill("input[name=tracking]", "999")
            await ap.click("button:has-text('Kargoya verildi')")
            await ap.wait_for_timeout(2500)
            check("Seri no atanmadan kargolanamaz", sql(f"select status from orders where id='{sid}'") == "PAID")
            await ap.goto(B + f"/admin/siparisler/{sid}", wait_until="networkidle")
            sel = ap.locator("select[name=serialIds]").first
            opts = await sel.locator("option").all_inner_texts()
            if len(opts) > 1:
                await sel.select_option(index=1)
                await ap.click("button:has-text('Ata')")
                await ap.wait_for_timeout(2500)
                check("Seri no atandı", sql(f"select count(*) from serial_numbers s join order_items i on i.id=s.order_item_id where i.order_id='{sid}'") != "0")

        # ───────── Admin: ürün oluştur (görsel yükle), yayınla, mağazada gör, sil
        await ap.goto(B + "/admin/urunler/yeni", wait_until="networkidle")
        await ap.fill("input[name=name]", "E2E Test Dedektör")
        await ap.fill("input[name=sku]", "E2E-001")
        await ap.fill("input[name=price]", "12345")
        await ap.fill("input[name=stock]", "4")
        await ap.set_input_files("input[type=file]", "/home/claude/bulgu/public/demo/x-terra-pro.jpg")
        await ap.wait_for_selector("text=KAPAK", timeout=20000)
        await ap.select_option("select[name=status]", "ACTIVE")
        await ap.click("button:has-text('Ürünü oluştur')")
        await ap.wait_for_url(re.compile(r".*/admin/urunler/[0-9a-f-]{36}$"), timeout=60000)
        pid = ap.url.split("/")[-1]
        check("Ürün oluşturuldu + görsel", sql(f"select count(*) from product_images where product_id='{pid}'") == "1")
        await pg.goto(B + "/urun/e2e-test-dedektor", wait_until="networkidle")
        check("Yeni ürün mağazada görünüyor", "E2E Test Dedektör" in await pg.inner_text("body"))
        img = await pg.locator("main img").first.get_attribute("src")
        r = await pg.request.get(B + img)
        check("Yüklenen görsel servis ediliyor", r.status == 200, img)
        # fiyat güncelle
        await ap.goto(B + f"/admin/urunler/{pid}", wait_until="networkidle")
        await ap.fill("input[name=price]", "11999")
        await ap.click("button:has-text('Değişiklikleri kaydet')")
        await ap.wait_for_timeout(2500); t = ""
        check("Ürün güncellendi", sql(f"select price from products where id='{pid}'") == "11999.00", t)
        # sil
        ap.once("dialog", lambda d: asyncio.ensure_future(d.accept()))
        await ap.click("button:has-text('Ürünü sil')")
        await ap.wait_for_url(re.compile(r".*/admin/urunler$"), timeout=30000)
        check("Ürün silindi", sql(f"select count(*) from products where id='{pid}'") == "0")

        # ───────── Kampanya oluştur
        await ap.goto(B + "/admin/kampanyalar?yeni=1", wait_until="networkidle")
        await ap.fill("input[name=name]", "E2E kupon")
        await ap.fill("input[name=code]", "E2E10")
        await ap.fill("input[name=value]", "10")
        await ap.click("button:has-text('Kaydet')")
        await ap.wait_for_url(re.compile(r".*/admin/kampanyalar$"), timeout=30000)
        check("Kampanya oluşturuldu", sql("select count(*) from campaigns where code='E2E10'") == "1")

        # ───────── Banner / ayar
        await ap.goto(B + "/admin/ayarlar?t=kargo", wait_until="networkidle")
        await ap.fill("textarea[name=pickupAddress]", "Test showroom adresi, İstanbul")
        await ap.click("button:has-text('Kaydet')")
        await ap.wait_for_timeout(2500)
        check("Kargo ayarı kaydedildi", "Test showroom" in sql("select value->>'pickupAddress' from settings where key='shipping'"))

        # ───────── Yetki: depo kullanıcısı raporlara giremez
        dctx = await b.new_context()
        dp = await dctx.new_page()
        await admin_login(dp, "depo@arenadedektor.local")
        await dp.goto(B + "/admin/raporlar", wait_until="networkidle")
        check("Depo: raporlar engellendi", "yetki=yok" in dp.url, dp.url)
        nav = await dp.inner_text("aside")
        check("Depo: menüde Raporlar/Ayarlar yok", "Raporlar" not in nav and "Ayarlar" not in nav and "Stok" in nav)
        r = await dp.request.get(B + "/api/admin/export/orders")
        check("Depo: finans CSV engellendi", r.status == 403)
        await dp.goto(B + "/admin/urunler", wait_until="networkidle")
        check("Depo: maliyet/marj görmez", "MARJ" not in (await dp.inner_text("main")).upper())

        # ───────── Müşteri hesabı: kayıt (misafir hesabı sahiplenme) + iade talebi
        cctx = await b.new_context()
        cp = await cctx.new_page()
        await cp.goto(B + "/kayit", wait_until="networkidle")
        await cp.fill("input[name=name]", "Test Müşteri")
        await cp.fill("input[name=email]", "e2e.test@ornek.com")
        await cp.fill("input[name=phone]", "05321234567")
        await cp.fill("input[name=password]", "sifre12345")
        await cp.check("input[name=kvkk]")
        await cp.click("button[type=submit]")
        await cp.wait_for_url(re.compile(r".*/hesabim.*"), timeout=30000)
        await cp.goto(B + "/hesabim?t=siparisler", wait_until="networkidle")
        check("Misafir siparişleri hesaba bağlandı", (await cp.inner_text("main")).count("BD-") >= 2)
        await cp.goto(B + f"/hesabim?iade={oid}", wait_until="networkidle")
        await cp.select_option("select[name=reason]", "Beklentimi karşılamadı")
        await cp.click("button:has-text('Talebi gönder')")
        await cp.wait_for_timeout(2500)
        check("İade talebi oluştu", sql(f"select count(*) from return_requests where order_id='{oid}'") == "1")
        # iade onay + para iadesi (admin)
        rid = sql(f"select id from return_requests where order_id='{oid}'")
        await ap.goto(B + f"/admin/iadeler?id={rid}", wait_until="networkidle")
        await ap.select_option("select[name=to]", "REFUNDED")
        await ap.click("button:has-text('Uygula')")
        await ap.wait_for_timeout(3000); t = ""
        st = sql(f"select status||'|'||payment_status from orders where id='{oid}'")
        check("İade: sipariş REFUNDED, stok geri", st == "REFUNDED|REFUNDED" and int(sql("select stock from products where slug='ace-250'")) == stock_before, st + " " + t)

        # ───────── Sihirbaz
        await pg.goto(B + "/sihirbaz", wait_until="networkidle")
        for label in ["Sahilde kayıp takı", "İlk cihazım", "25–60 bin TL", "Sahil ve ıslak kum", "Evet, hafif olsun", "Kıyıda, sığ suda"]:
            await pg.click(f"button:has-text('{label}')")
        await pg.wait_for_selector("text=önerimiz var", timeout=30000)
        check("Sihirbaz öneri verdi", "Vanquish" in await pg.inner_text("main"))

        # ───────── Mobil taşma kontrolü
        mctx = await b.new_context(viewport={"width": 390, "height": 844})
        mp = await mctx.new_page()
        for path in ["/", "/urun/vanquish-560-pro-pack", "/kategori/define-ve-sikke", "/sepet", "/odeme", "/hesabim", "/sihirbaz"]:
            await mp.goto(B + path, wait_until="networkidle")
            w = await mp.evaluate("document.documentElement.scrollWidth")
            check(f"Mobil taşma yok {path}", w <= 391, str(w))

        check("Sayfa JS hatası yok", not errs, "; ".join(errs[:3]))
        await b.close()
    print(f"\n{sum(r for _, r in results)}/{len(results)} geçti")

asyncio.run(main())
