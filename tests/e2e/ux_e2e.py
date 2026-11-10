import os
import asyncio, re, subprocess, io
from playwright.async_api import async_playwright
B = os.environ.get("BASE_URL", "http://localhost:3000")
res=[]
def chk(n,c): res.append((n,c)); print(('PASS' if c else 'FAIL'),n)
def sql(q): return subprocess.run(['psql', os.environ.get('DATABASE_URL', 'postgresql://postgres@localhost/bulgu'), '-tAc', q],capture_output=True,text=True).stdout.strip()
async def main():
  sql("delete from rate_hits")  # DB tabanlı hız sınırı testler arasında sıfırlanır
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=os.environ.get("CHROME", "/usr/bin/google-chrome"))
    ctx=await b.new_context(viewport={'width':1366,'height':900}, user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'); pg=await ctx.new_page()
    # çerez bandı
    await pg.goto(B+'/', wait_until='networkidle')
    chk('Çerez bandı görünüyor', await pg.locator('text=Çerez tercihlerin').count()==1)
    await pg.click('button:has-text("Sadece zorunlu")'); await pg.wait_for_timeout(300)
    chk('Seçimden sonra bant kapanıyor', await pg.locator('text=Çerez tercihlerin').count()==0)
    await pg.reload(wait_until='networkidle'); chk('Seçim hatırlanıyor', await pg.locator('text=Çerez tercihlerin').count()==0)
    # ana sayfa bölümleri alt alta
    h=await pg.content()
    chk('Bölümler alt alta', all(t in h for t in ['Çok satanlar','Rafa yeni giren cihazlar','Fırsatlar','Aynı gün kargo']))
    chk('Kargo rozeti var', 'kargoda' in h and 'kapında' in h)
    chk('Sosyal kanıt var', 'kişi inceledi' in h or 'sepete ekledi' in h)
    # görüntüleme sayacı + son gezilenler
    pid=sql("select id from products where slug='x-terra-pro'")
    before=int(sql(f"select coalesce(sum(views),0) from product_activity where product_id='{pid}'"))
    await pg.goto(B+'/urun/x-terra-pro', wait_until='networkidle'); await pg.wait_for_timeout(800)
    after=int(sql(f"select coalesce(sum(views),0) from product_activity where product_id='{pid}'"))
    chk('Görüntüleme sayıldı', after==before+1)
    await pg.reload(wait_until='networkidle'); await pg.wait_for_timeout(600)
    chk('Aynı kişi tekrar sayılmıyor', int(sql(f"select coalesce(sum(views),0) from product_activity where product_id='{pid}'"))==after)
    await pg.goto(B+'/', wait_until='networkidle'); await pg.wait_for_timeout(800)
    chk('Son gezdiklerin ana sayfada', await pg.locator('h2:has-text("Son gezdiklerin")').count()==1)
    # favori (misafir)
    await pg.goto(B+'/urun/x-terra-pro', wait_until='networkidle')
    await pg.click('button[aria-label="Favorilere ekle"] >> nth=0'); await pg.wait_for_timeout(400)
    await pg.goto(B+'/favoriler', wait_until='networkidle'); await pg.wait_for_timeout(800)
    chk('Favoriler sayfasında ürün', 'X-Terra Pro' in await pg.content())
    # kayıt -> favori sunucuya taşınır
    await pg.goto(B+'/kayit', wait_until='networkidle')
    await pg.fill('input[name=name]','Test Kullanıcı'); await pg.fill('input[name=email]','yeni@ornek.com'); await pg.fill('input[name=phone]','05321112233'); await pg.fill('input[name=password]','eskisifre1')
    await pg.check('input[name=kvkk]'); await pg.click('button:has-text("Hesabımı oluştur")'); await pg.wait_for_url(re.compile('.*/hesabim.*'))
    await pg.goto(B+'/favoriler', wait_until='networkidle'); await pg.wait_for_timeout(1200)
    chk('Favori hesaba kaydedildi', sql("select count(*) from favorites f join customers c on c.id=f.customer_id where c.email='yeni@ornek.com'")=='1')
    # şifre sıfırlama
    await ctx.clear_cookies()
    await pg.goto(B+'/sifremi-unuttum', wait_until='networkidle'); await pg.fill('input[name=email]','yeni@ornek.com'); await pg.click('button:has-text("Bağlantı gönder")'); await pg.wait_for_timeout(1500)
    chk('Sıfırlama kaydı oluştu', sql("select count(*) from password_resets where kind='customer' and used_at is null")=='1')
    chk('Token düz metin saklanmıyor', len(sql("select token_hash from password_resets order by created_at desc limit 1"))==64)
    r=await pg.goto(B+'/sifre-yenile?t=gecersiz', wait_until='networkidle'); chk('Geçersiz bağlantı reddi', 'süresi dolmuş' in await pg.content())
    # olmayan e-posta aynı mesajı verir (hesap sızdırmaz)
    await pg.goto(B+'/sifremi-unuttum', wait_until='networkidle'); await pg.fill('input[name=email]','yok@ornek.com'); await pg.click('button:has-text("Bağlantı gönder")'); await pg.wait_for_timeout(1200)
    chk('Olmayan e-posta için kayıt yok', sql("select count(*) from password_resets")=='1')
    # sepet anlık görüntüsü
    await pg.goto(B+'/urun/ace-250', wait_until='networkidle'); await pg.click('button:has-text("Sepete ekle") >> nth=0'); await pg.wait_for_timeout(500)
    chk('Sepete ekleme sayıldı', int(sql("select coalesce(sum(carts),0) from product_activity a join products p on p.id=a.product_id where p.slug='ace-250' and a.hour>now()-interval '1 hour'"))>=1)
    await pg.goto(B+'/odeme', wait_until='networkidle'); await pg.fill('input[name=email]','terk@ornek.com'); await pg.press('input[name=email]','Tab'); await pg.wait_for_timeout(800)
    chk('Sepet kaydı oluştu', sql("select count(*) from cart_snapshots where email='terk@ornek.com'")=='1')
    # görsel yükleme webp
    a=await b.new_context(); ap=await a.new_page()
    await ap.goto(B+'/admin/giris'); await ap.fill('input[name=email]','admin@arenadedektor.local'); await ap.fill('input[name=password]','Arena123!'); await ap.click('button[type=submit]'); await ap.wait_for_url(re.compile(r'.*/admin$'))
    from PIL import Image
    im=Image.new('RGB',(3000,2000),(200,30,30)); buf=io.BytesIO(); im.save(buf,'JPEG',quality=95)
    resp=await a.request.post(B+'/api/admin/upload', multipart={'file':{'name':'buyuk.jpg','mimeType':'image/jpeg','buffer':buf.getvalue()}})
    j=await resp.json(); print(j)
    url=(j.get('url') or (j.get('files') or [{}])[0].get('url') or '')
    chk('Yüklenen görsel WebP', url.endswith('.webp'))
    if url:
      g=await a.request.get(B+url); w,hh=Image.open(io.BytesIO(await g.body())).size; chk('Görsel 1600px’e küçültüldü', max(w,hh)==1600)
    # admin şifre sıfırlama sayfası
    await a.clear_cookies(); r=await ap.goto(B+'/admin/giris/sifremi-unuttum'); chk('Admin şifre sayfası açılıyor', r.status==200 and 'Şifre yenileme' in await ap.content())
    await b.close()
  print(f"{sum(c for _,c in res)}/{len(res)} geçti")
asyncio.run(main())
