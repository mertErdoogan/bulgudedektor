import os
import asyncio, re, subprocess
from playwright.async_api import async_playwright
B = os.environ.get("BASE_URL", "http://localhost:3000")
UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130.0 Safari/537.36'
res=[]
def chk(n,c): res.append((n,c)); print(('PASS' if c else 'FAIL'),n)
def sql(q): return subprocess.run(['psql', os.environ.get('DATABASE_URL', 'postgresql://postgres@localhost/bulgu'), '-tAc', q],capture_output=True,text=True).stdout.strip()
async def main():
  sql("delete from rate_hits")  # DB tabanlı hız sınırı testler arasında sıfırlanır
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=os.environ.get("CHROME", "/usr/bin/google-chrome"))
    c=await b.new_context(viewport={'width':1440,'height':900}, user_agent=UA); pg=await c.new_page()
    await pg.goto(B+'/', wait_until='networkidle'); await pg.click('button:has-text("Sadece zorunlu")')
    await pg.fill('input[name=q] >> nth=0','vanqish'); await pg.wait_for_timeout(900)
    chk('Yazım hatalı aramada öneri', await pg.locator('#arama-onerileri >> text=Vanquish 560 Pro-Pack').count()>=1)
    await pg.screenshot(path='/tmp/qa/s1.png', clip={'x':0,'y':0,'width':1440,'height':520})
    await pg.keyboard.press('ArrowDown'); await pg.keyboard.press('Enter'); await pg.wait_for_url('**/urun/vanquish-560-pro-pack')
    chk('Klavye ile öneriye gidiş', True)
    await pg.goto(B+'/ara?q=minelap', wait_until='networkidle'); chk('Sonuç sayfası (minelap→Minelab)', 'Equinox' in await pg.content())
    await pg.goto(B+'/ara?q=zzzyok', wait_until='networkidle'); h=await pg.content(); chk('Sonuçsuz sayfa yönlendiriyor', 'sonuç bulamadık' in h and 'Uzmana sor' in h)
    await pg.wait_for_timeout(500); chk('Sonuçsuz arama kaydedildi', sql("select results from search_queries where term='zzzyok'")=='0')
    # öneriler
    await pg.goto(B+'/urun/vanquish-560-pro-pack', wait_until='networkidle'); h=await pg.content()
    chk('Birlikte alınanlar', 'Bunu alanlar şunları da aldı' in h); chk('Benzer modeller', 'Benzer modeller' in h)
    await pg.goto(B+'/urun/x-terra-pro', wait_until='networkidle'); await pg.goto(B+'/', wait_until='networkidle'); await pg.wait_for_timeout(1500)
    chk('Sana özel öneriler', await pg.locator('h2:has-text("Sana özel öneriler")').count()==1)
    el=pg.locator('h2:has-text("Sana özel öneriler")'); await el.scroll_into_view_if_needed(); bb=await el.bounding_box(); await pg.screenshot(path='/tmp/qa/s2.png', clip={'x':0,'y':max(0,bb['y']-20),'width':1440,'height':560})
    # hemen al
    await pg.goto(B+'/urun/ace-250', wait_until='networkidle'); await pg.click('button:has-text("Hemen al")'); await pg.wait_for_url('**/odeme'); await pg.wait_for_timeout(800)
    chk('Hemen al → ödeme', 'Ace 250' in await pg.content())
    await pg.goto(B+'/sepet', wait_until='networkidle'); await pg.wait_for_timeout(1500); chk('Sepette birlikte alınanlar', 'Bunlarla birlikte alınanlar' in await pg.content())
    await b.close()
  print(f"{sum(c for _,c in res)}/{len(res)} geçti")
asyncio.run(main())
