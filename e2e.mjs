import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1280,height:900}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:8765/',{waitUntil:'networkidle'});
await page.locator('[data-tab="industry"]').waitFor();
if(await page.locator('[data-tab="v68"]').count())throw Error('Legacy tabs must start collapsed');
for(let i=0;i<6;i++){
  await page.locator('#company').selectOption({index:i});
  await page.locator('[data-tab="industry"]').click();
  await page.getByRole('button',{name:'この業種の工程・人員を点検'}).click();
}
await page.getByRole('button',{name:'財務と仕訳を確認'}).click();
await page.getByRole('button',{name:'NPC企業の取引を更新'}).click();
const canvas=page.locator('#city3d');await canvas.waitFor();
const visual=await canvas.evaluate(c=>({width:c.width,height:c.height,context:!!c.getContext('webgl')}));
if(!visual.width||!visual.height)throw Error('3D canvas missing');
await page.locator('#toggle-legacy').click();
await page.locator('[data-tab="v68"]').waitFor();
await page.locator('[data-tab="history"]').click();
page.on('dialog',d=>d.accept());
await page.locator('#save').click();
await page.locator('#load').click();
if(errors.length)throw Error('Browser JS errors: '+errors.join('; '));
console.log('Ver6.9 browser E2E passed',JSON.stringify(visual));
await browser.close();
