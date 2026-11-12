import os
import asyncio, re, urllib.request
from playwright.async_api import async_playwright
B = os.environ.get("BASE_URL", "http://localhost:3000")
res=[]
def chk(n,c): res.append((n,c)); print(('PASS' if c else 'FAIL'),n)
def _sql(q):
  import subprocess
  return subprocess.run(['psql', os.environ.get('DATABASE_URL', 'postgresql://postgres@localhost/bulgu'), '-tAc', q], capture_output=True, text=True).stdout.strip()
async def main():
  _sql("update users set totp_enabled=false, totp_secret=null, totp_last_step=null")  # features testi 2FA açar; giriş testleri sıfırdan başlar
  _sql("delete from rate_hits")
  _sql("delete from rate_hits")  # DB tabanlı giriş hız sınırı testler arasında sıfırlanır
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=os.environ.get("CHROME", "/usr/bin/google-chrome")); pg=await (await b.new_context()).new_page()
    await pg.goto(B+'/admin/giris'); await pg.fill('input[name=email]','admin@arenadedektor.local'); await pg.fill('input[name=password]','Arena123!')
    await pg.click('button[type=submit]'); await pg.wait_for_url(re.compile(r'.*/admin$'))
    # yeni yazı - kısa cevapsız yayınlama reddedilmeli
    await pg.goto(B+'/admin/blog/yeni', wait_until='networkidle')
    await pg.fill('input[name=title]','Pinpointer nasıl kullanılır? Adım adım rehber')
    await pg.select_option('select[name=status]','PUBLISHED')
    await pg.fill('textarea[name=content]','## Nedir\n'+'Pinpointer kazıda hedefi bulur. '*20)
    await pg.click('button:has-text("Oluştur")'); await pg.wait_for_timeout(1500)
    chk('Kısa cevapsız yayın reddi', 'Kısa cevap' in await pg.content())
    await pg.fill('textarea[name=answer]','Pinpointer kazılan çukurda hedefin yerini saniyeler içinde gösteren küçük el dedektörüdür. Açıp ucu toprağa yaklaştırırsın, hedefe yaklaştıkça ses ve titreşim artar. Kazı süresini kısaltır ve hedefe zarar verme riskini azaltır. Su geçirmez modeller sahilde de kullanılır.')
    await pg.fill('textarea[name=faq]','Pinpointer şart mı? | Değil ama kazıyı çok hızlandırır.')
    await pg.click('button:has-text("Oluştur")'); await pg.wait_for_url(re.compile(r'.*/admin/blog/[0-9a-f-]{36}$'), timeout=20000)
    url=pg.url
    r=await pg.goto(B+'/blog/pinpointer-nasil-kullanilir-adim-adim-rehber'); chk('Yazı yayında', r.status==200)
    h=await pg.content(); chk('Yazı FAQ şeması', '"FAQPage"' in h and 'Pinpointer şart mı?' in h)
    # slug değiştir -> 301
    await pg.goto(url, wait_until='networkidle'); await pg.fill('input[name=slug]','pinpointer-kullanimi'); await pg.click('button:has-text("Kaydet")'); await pg.wait_for_timeout(2000)
    r=await pg.goto(B+'/blog/pinpointer-nasil-kullanilir-adim-adim-rehber'); chk('Eski URL yeni URL\'ye yönleniyor', r.url.endswith('/blog/pinpointer-kullanimi') and r.status==200)
    req=urllib.request.Request(B+'/blog/pinpointer-nasil-kullanilir-adim-adim-rehber')
    class NR(urllib.request.HTTPRedirectHandler):
      def redirect_request(self,*a,**k): return None
    try: urllib.request.build_opener(NR).open(req); code=200
    except urllib.error.HTTPError as e: code=e.code
    chk('Kalıcı yönlendirme kodu (308/301)', code in (301,308))
    # SSS ekle
    await pg.goto(B+'/admin/sss', wait_until='networkidle')
    await pg.fill('input[name=question]','Dedektör yağmurda kullanılır mı?'); await pg.fill('textarea[name=answer]','Başlığı su geçirmez modeller hafif yağmurda kullanılabilir; gövde için yağmurluk önerilir.')
    await pg.click('button:has-text("Ekle")'); await pg.wait_for_timeout(1500)
    await pg.goto(B+'/sss'); chk('SSS sitede', 'Dedektör yağmurda kullanılır mı?' in await pg.content())
    # Yönlendirme elle
    await pg.goto(B+'/admin/yonlendirmeler', wait_until='networkidle')
    nf=pg.locator('form:has(input[name=fromPath]:visible)')  # 404 listesindeki satır formları gizli fromPath taşır
    await nf.locator('input[name=fromPath]').fill('https://eskisite.com/urunler/ace-250.html'); await nf.locator('input[name=toPath]').fill('/urun/ace-250')
    await pg.click('button:has-text("Ekle")'); await pg.wait_for_timeout(1500)
    r=await pg.goto(B+'/urunler/ace-250.html'); chk('Elle eklenen yönlendirme', r.url.endswith('/urun/ace-250'))
    # ayarlar seo kaydet
    await pg.goto(B+'/admin/ayarlar?t=seo', wait_until='networkidle')
    await pg.fill('input[name=googleVerification]','<meta name="google-site-verification" content="abc123XYZ" />')
    if await pg.locator('button:has-text("IndexNow anahtarı üret")').count(): await pg.click('button:has-text("IndexNow anahtarı üret")'); await pg.wait_for_timeout(1500)
    await pg.goto(B+'/admin/ayarlar?t=seo', wait_until='networkidle')
    await pg.fill('input[name=googleVerification]','<meta name="google-site-verification" content="abc123XYZ" />')
    await pg.click('button:has-text("Kaydet")'); await pg.wait_for_timeout(1500)
    await pg.goto(B+'/'); h=await pg.content(); chk('Google doğrulama meta', 'content="abc123XYZ"' in h)
    r=await pg.goto(B+'/indexnow-key.txt'); chk('IndexNow anahtar dosyası', r.status==200 and len((await pg.inner_text('body')).strip())==32)
    await b.close()
  print(f"{sum(c for _,c in res)}/{len(res)} geçti")
asyncio.run(main())
