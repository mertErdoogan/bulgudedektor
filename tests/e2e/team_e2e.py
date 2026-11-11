"""
Ekip araçları uçtan uca testi: iş listesi ve atama, toplu sipariş işlemleri (kargo, atama, toplama listesi, etiket),
takip no içe aktarma, hazır yanıt şablonları, panel bildirimleri.

Önkoşul: npm run db:seed, çalışan sunucu. Çalıştırma: python3 tests/e2e/team_e2e.py
"""
import asyncio, os, re, subprocess, time
from playwright.async_api import async_playwright

B = os.environ.get("BASE_URL", "http://localhost:3000")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def env(key):
    for line in open(os.path.join(ROOT, ".env"), encoding="utf8"):
        if line.startswith(key + "="):
            return line.split("=", 1)[1].strip().strip('"')
    return ""


def sql(q):
    return subprocess.run(["psql", os.environ.get("DATABASE_URL") or env("DATABASE_URL"), "-tAc", q], capture_output=True, text=True).stdout.strip()


results = []


def check(name, cond, extra=""):
    results.append((name, bool(cond)))
    print(("PASS " if cond else "FAIL ") + name + (f" — {extra}" if extra else ""))


async def toast(pg, contains=None):
    try:
        loc = pg.locator("[data-sonner-toast]", has_text=contains) if contains else pg.locator("[data-sonner-toast]")
        t = loc.last
        await t.wait_for(timeout=15000)
        return await t.inner_text()
    except Exception:
        return ""


async def login(br, email):
    ctx = await br.new_context(user_agent=UA, viewport={"width": 1400, "height": 1000})
    pg = await ctx.new_page()
    await pg.goto(B + "/admin/giris")
    await pg.fill("input[name=email]", email)
    await pg.fill("input[name=password]", "Arena123!")
    await pg.click("button[type=submit]")
    await pg.wait_for_url(re.compile(r".*/admin(\?.*)?$"), timeout=60000)
    return ctx, pg


async def main():
    sql("delete from rate_hits")
    sql("update users set totp_enabled=false, totp_secret=null")
    async with async_playwright() as p:
        br = await p.chromium.launch(executable_path=os.environ.get("CHROME", "/usr/bin/google-chrome"))
        ctx, pg = await login(br, "admin@arenadedektor.local")

        # ── İş listesi
        await pg.goto(B + "/admin")
        check("panoda iş listesi", await pg.get_by_text("Bugün yapılacaklar").count() == 1)
        groups = await pg.locator("[data-group]").count()
        check("iş grupları görünüyor", groups >= 2, f"{groups} grup")
        kinds = await pg.locator("[data-work]").evaluate_all("els => els.map(e => e.dataset.work)")
        check("hazırlık/seri/kargo işleri", any(k in kinds for k in ["to_prepare", "serial_missing", "to_ship"]), str(set(kinds)))
        first = pg.locator("[data-group=depo] [data-work]").first
        await first.locator("select").select_option(label="Ben üstleniyorum")
        check("işi üstlenme", "Üstlendin" in (await toast(pg, "Üstlendin")))
        await pg.reload()
        mine = await pg.get_by_role("button", name=re.compile("Bana atanan")).inner_text()
        check("Bana atanan sayacı", re.search(r"\b1\b", mine) is not None, mine)
        badge = await pg.locator("a[href='/admin/isler']").first.inner_text()
        check("menüde İş listesi rozeti", "1" in badge, badge.replace("\n", " "))
        await pg.goto(B + "/admin/isler")
        check("iş listesi sayfası", await pg.get_by_text("Hedef süreler").count() == 1)

        # Havale bildirimi → iş listesinde en üstte gecikme olmadan görünür
        oid = sql("select id from orders where status in ('PAID','PREPARING') order by number limit 1")
        sql("update orders set status='PENDING_PAYMENT', payment_status='PENDING', payment_method='TRANSFER', paid_at=null, payment_meta=jsonb_build_object('transferNotice', jsonb_build_object('sender','Test Gönderen','at', now()::text)) where id='" + oid + "'")
        await pg.goto(B + "/admin/isler")
        check("havale bildirimi iş olarak çıktı", await pg.locator("[data-work=transfer_notice]").count() == 1)

        # ── Toplu işlemler
        sql("update orders set status='PAID', payment_status='PAID', payment_method='CARD', paid_at=now() where id='" + oid + "'")
        sql("update products set track_serial=false")  # seri numarası zorunluluğu toplu kargo testini engellemesin
        ids = sql("select string_agg(id, ',' order by number) from (select id, number from orders where status in ('PAID','PREPARING') and delivery_method='CARGO' order by number limit 2) x").split(",")
        await pg.goto(B + "/admin/siparisler")
        nums = sql("select string_agg(lpad(number::text, 6, '0'), ',' order by number) from orders where id in ('" + "','".join(ids) + "')").split(",")
        for n in nums:
            await pg.get_by_label(re.compile(f"BD-{n} seç")).check()
        await pg.select_option("select[name=to]", "SHIPPED")
        for i, oid2 in enumerate(ids):
            await pg.fill(f"input[name=tracking_{oid2}]", f"TEST{i}12345")
        await pg.get_by_role("button", name="Uygula").click()
        t = await toast(pg, "sipariş")
        check("toplu kargoya verme", "2 sipariş güncellendi" in t, t[:120])
        check("takip numaraları yazıldı", sql("select count(*) from orders where tracking_number like 'TEST_12345' and status='SHIPPED'") == "2")

        # Toplu atama başka kişiye → o kişiye bildirim
        depo = sql("select id from users where email like 'depo@%'")
        await pg.goto(B + "/admin/siparisler?durum=SHIPPED")
        await pg.get_by_label(re.compile(r"Tümünü seç")).check()
        await pg.select_option("select[name=to]", f"ASSIGN:{depo}")
        await pg.get_by_role("button", name="Uygula").click()
        check("toplu atama", "atandı" in (await toast(pg, "atandı")))
        check("atanan kişiye bildirim", sql(f"select count(*) from staff_notifications where user_id='{depo}' and kind='assigned'") != "0")

        # Yazdırma: toplama listesi ve etiket
        all_ids = sql("select string_agg(id, ',') from (select id from orders order by number limit 3) x")
        await pg.goto(B + f"/admin/yazdir?ids={all_ids}&tur=toplama")
        check("toplama listesi", await pg.get_by_role("heading", name="Toplama listesi").count() == 1 and await pg.locator("tbody tr").count() >= 1)
        await pg.goto(B + f"/admin/yazdir?ids={all_ids}&tur=etiket")
        check("adres etiketleri", await pg.locator(".lbl").count() == 3)

        # Takip no içe aktarma (yapıştırma)
        target = sql("select number from orders where status in ('PAID','PREPARING') order by number limit 1")
        if target:
            await pg.goto(B + "/admin/siparisler")
            await pg.get_by_role("button", name="Takip no yükle").click()
            await pg.fill("textarea[name=text]", f"Sipariş no;Takip no\n{target};YK998877\n999999;YOK")
            await pg.get_by_role("button", name="Kargoya verildi yap").click()
            t = await toast(pg, "kargoya verildi")
            check("takip no içe aktarma", "1 sipariş kargoya verildi" in t and "bulunamadı" in t, t[:140])
        else:
            check("takip no içe aktarma", False, "uygun sipariş yok")

        # ── Hazır yanıtlar
        await pg.goto(B + "/admin/sablonlar")
        check("varsayılan şablonlar", await pg.get_by_text("Havale hatırlatma").count() >= 1)
        await pg.get_by_role("link", name="Yeni şablon").click()
        await pg.fill("input[name=title]", "Test şablonu")
        await pg.fill("textarea[name=body]", "Merhaba {ad}, {siparis_no} için {personel} yazıyor.")
        await pg.get_by_role("button", name="Kaydet").click()
        check("şablon eklendi", "kaydedildi" in (await toast(pg, "kaydedildi")))

        oid = sql("select id from orders where status='SHIPPED' order by number limit 1")
        await pg.goto(B + f"/admin/siparisler/{oid}")
        check("siparişte İlgilenen seçimi", await pg.locator("select[name=assignee]").count() == 1)
        await pg.select_option("select[aria-label='Hazır yanıt seç']", label="Kargoya verildi")
        body = await pg.input_value("textarea[name=body]")
        no = sql(f"select lpad(number::text, 6, '0') from orders where id='{oid}'")
        check("şablon alanları doldu", f"BD-{no}" in body and "{" not in body and "TEST" in body, body[:120])
        check("WhatsApp bağlantısı hazır", "wa.me" in (await pg.get_by_text("WhatsApp'ta aç").get_attribute("href") or ""))
        await pg.get_by_role("button", name="Geçmişe kaydet").click()
        check("mesaj sipariş geçmişine kaydedildi", "geçmişine" in (await toast(pg, "geçmişine")))
        check("olay müşteriye görünür", sql(f"select count(*) from order_events where order_id='{oid}' and type='message' and is_public") != "0")

        # Mesajlar ekranında şablon ekleme
        await pg.goto(B + "/admin/mesajlar")
        await pg.select_option("select[aria-label='Hazır yanıt ekle']", label="Model önerisi (danışmanlık)")
        v = await pg.input_value("form textarea[name=body]")
        check("mesaj kutusuna şablon eklendi", "Doğru cihazı" in v and "{" not in v, v[:80])

        # ── Bildirimler
        before = int(sql("select count(*) from staff_notifications") or 0)
        sctx = await br.new_context(user_agent=UA)
        sp = await sctx.new_page()
        await sp.goto(B + "/iletisim")
        await sp.fill("input[name=name]", "Bildirim Testi")
        await sp.fill("input[name=contact]", "0532 999 88 77")
        subj = sp.locator("[name=subject]")
        if await subj.count():
            if await subj.evaluate("e => e.tagName") == "SELECT":
                await subj.select_option(index=1)
            else:
                await subj.fill("Fiyat sorusu")
        await sp.fill("textarea[name=message]", "Manticore için taksit seçenekleri nedir?")
        if await sp.locator("input[name=kvkk]").count():
            await sp.check("input[name=kvkk]")
        await sp.locator("form:has(textarea[name=message]) button[type=submit]").click()
        await toast(sp, "Mesajın alındı")
        await sctx.close()
        check("müşteri mesajı bildirim oluşturdu", int(sql("select count(*) from staff_notifications") or 0) > before)
        await pg.goto(B + "/admin")
        await pg.wait_for_selector("[data-testid=bell-count]", timeout=15000)
        n = await pg.locator("[data-testid=bell-count]").inner_text()
        check("zilde okunmamış sayısı", int(n) >= 1, n)
        await pg.click("[data-testid=bell]")
        await pg.wait_for_selector("text=Yeni mesaj", timeout=10000)
        check("bildirim listesinde mesaj", await pg.get_by_text(re.compile("Yeni mesaj")).count() >= 1)
        await pg.reload()
        await pg.wait_for_timeout(1500)
        check("açınca okundu sayıldı", await pg.locator("[data-testid=bell-count]").count() == 0)

        # Yetki: depo kullanıcısı mesaj bildirimlerini görmez (inbox yetkisi yoksa) ama kendisine atananı görür
        dctx, dp = await login(br, sql("select email from users where id='" + depo + "'"))
        r = await dp.request.get(B + "/api/admin/bildirimler?liste=1")
        j = await r.json()
        titles = [i["title"] for i in j["items"]]
        has_inbox = sql(f"select 'inbox.manage' = any(r.permissions) from users u join roles r on r.id=u.role_id where u.id='{depo}'") == "t"
        check("yetkiye göre bildirim filtresi", any("atadı" in t for t in titles) and (has_inbox or not any("Yeni mesaj" in t for t in titles)), str(titles[:4]))
        await dctx.close()
        await ctx.close()
        await br.close()

    ok = sum(1 for _, c in results if c)
    print(f"\n{ok}/{len(results)} geçti")
    raise SystemExit(0 if ok == len(results) else 1)


asyncio.run(main())
