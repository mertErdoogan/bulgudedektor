import os
import asyncio,sys
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=os.environ.get("CHROME", "/usr/bin/google-chrome"))
        pg=await b.new_page(viewport={'width':390,'height':844})
        await pg.goto(os.environ.get("BASE_URL", "http://localhost:3000") + sys.argv[1], wait_until='networkidle')
        r=await pg.evaluate('''()=>{const W=document.documentElement.clientWidth;const out=[];for(const e of document.querySelectorAll('body *')){const r=e.getBoundingClientRect();if(r.right>W+1&&r.width>0){let p=e.parentElement,clipped=false;while(p){const s=getComputedStyle(p);if(['auto','hidden','scroll','clip'].includes(s.overflowX)){clipped=true;break}p=p.parentElement}if(!clipped)out.push(e.tagName+'.'+String(e.className).slice(0,60)+' R='+Math.round(r.right))}}return [document.documentElement.scrollWidth,out.slice(0,8)]}''')
        print(r)
        await b.close()
asyncio.run(main())
