"""Sepette kalmış, sonradan silinen / stoğu biten ürün: bir kez bildirilir, sepetten düzeltilir, ödeme kilitlenmez.
Önce: npm run db:seed. Sunucu localhost:3000."""
import json, os, subprocess
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


good = sql("select id from products where status='ACTIVE' and stock >= 5 order by created_at limit 1")
low = sql(f"select id from products where status='ACTIVE' and id <> '{good}' order by created_at limit 1 offset 1")
sql(f"update products set stock=1, allow_backorder=false where id='{low}'")
KEY = "bulgu_cart_v1"
cart = [{"productId": "silinmis-urun-id", "quantity": 1}, {"productId": good, "quantity": 1}, {"productId": low, "quantity": 3}]

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_context().new_page()
    pg.goto(BASE + "/")
    pg.evaluate("([k, v]) => localStorage.setItem(k, v)", [KEY, json.dumps(cart)])
    pg.goto(BASE + "/sepet")
    pg.wait_for_selector("[data-sonner-toast]", timeout=10000)
    pg.wait_for_timeout(1500)
    toasts = " ".join(pg.locator("[data-sonner-toast]").all_inner_texts())
    chk("silinen ürün bir kez bildirildi", "artık satışta olmadığı için sepetten çıkarıldı" in toasts, toasts)
    chk("stok azalınca adet düşürüldü bildirimi", "adet 1 yapıldı" in toasts, toasts)
    stored = json.loads(pg.evaluate("k => localStorage.getItem(k)", KEY))
    chk("silinen ürün sepetten gerçekten çıktı", all(i["productId"] != "silinmis-urun-id" for i in stored), str(stored))
    chk("stoktaki adede indirildi", next(i["quantity"] for i in stored if i["productId"] == low) == 1, str(stored))
    chk("sepette kalıcı uyarı yok", "artık satışta değil" not in pg.inner_text("main"))
    pg.reload()
    pg.wait_for_timeout(2500)
    chk("yenileyince uyarı tekrar çıkmıyor", pg.locator("[data-sonner-toast]").count() == 0 and "satışta" not in pg.inner_text("main"))
    pg.goto(BASE + "/odeme")
    pg.wait_for_timeout(2500)
    chk("ödeme adımında hata yok", "satışta değil" not in pg.inner_text("main") and "Stokta" not in pg.inner_text("main"))
    chk("ödeme butonu aktif", pg.locator("button[type=submit]:not([disabled])").count() >= 1)
    b.close()

print(f"\n{ok} geçti, {fail} kaldı")
raise SystemExit(1 if fail else 0)
