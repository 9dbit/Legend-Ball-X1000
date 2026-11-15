import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.LEGEND_URL||'http://127.0.0.1:3132';
const out='qa-artifacts/legend-menus-v13';
await mkdir(out,{recursive:true});
const configs=[
 {name:'iphone-se',width:320,height:568,safeTop:20,safeBottom:0,engine:chromium},
 {name:'iphone-pwa',width:393,height:852,safeTop:59,safeBottom:34,engine:webkit},
 {name:'iphone-large',width:430,height:932,safeTop:62,safeBottom:34,engine:webkit},
 {name:'android',width:360,height:800,safeTop:24,safeBottom:24,engine:chromium}
];
const reports=[];
for(const conf of configs){
 const browser=await conf.engine.launch({headless:true,...(conf.engine===chromium?{channel:'chrome'}:{})});
 try {
  const context=await browser.newContext({
    viewport:{width:conf.width,height:conf.height},isMobile:true,hasTouch:true,deviceScaleFactor:1,
    reducedMotion:'reduce'
  });
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/play/',{waitUntil:'domcontentloaded'});
  await page.addStyleTag({content:`:root{--legend-test-safe-top:${conf.safeTop}px;--legend-test-safe-bottom:${conf.safeBottom}px}`});
  await page.locator('#bootPlay:not(:disabled)').waitFor({timeout:30000});
  await page.locator('#bootPlay').click();
  await page.waitForFunction(()=>document.documentElement.dataset.boot==='entered',{timeout:30000});
  await page.waitForFunction(()=>window.LegendMenuV13?.version==='13');
  const visual=()=>page.evaluate(()=>{
   const d=[...document.querySelectorAll('dialog[open]')][0];
   if(!d)return null;
   const h=d.querySelector('.dialog-head'),b=d.querySelector('.dialog-body'),close=d.querySelector('.close');
   const rect=e=>e.getBoundingClientRect().toJSON();
   return {id:d.id,rect:rect(d),head:rect(h),body:rect(b),close:rect(close),
     overflow:document.documentElement.scrollWidth>innerWidth+1,
     css:getComputedStyle(d).backgroundImage,
     scrollable:d.scrollHeight>d.clientHeight+4,
     title:d.querySelector('h2')?.textContent,
     heading:getComputedStyle(h,'::before').backgroundImage,
     goldBorder:getComputedStyle(d).borderTopColor};
  });
  await page.locator('#menu').click();
  await page.locator('#menuDialog[open]').waitFor();
  let menu=await visual();
  assert.equal(menu.id,'menuDialog');
  assert(menu.rect.width<=conf.width+2&&menu.rect.right<=conf.width+2,'menu within width');
  assert(menu.rect.height<=conf.height+2,'menu within height');
  assert(menu.rect.y>=conf.safeTop-1,'modal below notch/status area');
  assert(menu.rect.bottom<=conf.height-conf.safeBottom+1,'modal above home-indicator area');
  assert(menu.close.width>=40,'close button tap target');
  assert(menu.heading.includes('logo.webp'),'real artwork header');
  assert(!menu.overflow,'menu page no document overflow');
  await page.screenshot({path:out+'/'+conf.name+'-system.png'});
  await page.locator('#batterySetting').check();
  assert.equal(await page.locator('#batterySetting').isChecked(),true);
  await page.locator('#lockSetting').uncheck();
  await page.locator('#promoSetting').uncheck();
  await page.locator('#volumeRange').fill('55');
  assert.equal(await page.locator('#volumeValue').textContent(),'55%');
  const beforeBet=await page.locator('#settingsTotal').textContent();
  await page.locator('#settingsPlus').click();
  assert.notEqual(await page.locator('#settingsTotal').textContent(),beforeBet);
  await page.locator('#closeMenu').click();
  await page.locator('#auto').click();
  await page.locator('#autoDialog[open]').waitFor();
  const auto=await visual();
  assert.equal(auto.id,'autoDialog');
  await page.screenshot({path:out+'/'+conf.name+'-autoplay.png'});
  await page.locator('#autoTurbo').check();
  assert(await page.locator('#autoTurbo').isChecked(),'turbo tick');
  assert(!await page.locator('#autoQuick').isChecked(),'quick exclusivity');
  await page.locator('#autoTurbo').uncheck();
  await page.locator('#autoCount').fill('10');
  assert.equal(await page.locator('#autoCountValue').textContent(),'200');
  assert((await page.locator('#autoStart').textContent()).includes('(200)'));
  await page.locator('#closeAuto').click();
  await page.locator('#turbo').click();
  await page.locator('#turbo').click();
  await page.locator('#winToast[data-kind="speed"]:not([hidden])').waitFor({timeout:3000});
  const toast={title:await page.locator('#toastTitle').textContent(),
    amount:await page.locator('#toastAmount').textContent()};
  await page.screenshot({path:out+'/'+conf.name+'-turbo.png'});
  assert.equal(toast.title,'TURBO SPIN');
  assert.equal(toast.amount,'ENABLED');
  await page.locator('#help').click();
  await page.locator('#modal[open]').waitFor();
  const rules=await visual();
  assert.equal(rules.id,'modal');
  assert(await page.locator('#tumbleRules').isVisible());
  assert(await page.locator('#bonusRules').isVisible());
  assert.equal(await page.locator('#paytableDetails').getAttribute('open'),null);
  await page.screenshot({path:out+'/'+conf.name+'-rules.png'});
  await page.locator('#paytableDetails summary').click();
  assert(await page.locator('#paytableDetails').evaluate(x=>x.open),'win table expands');
  assert(await page.locator('#paytable tr').count()>1,'paytable populated');
  await page.locator('#closeModal').click();
  assert.deepEqual(errors,[],'no runtime errors in popup flow: '+conf.name);
  reports.push({name:conf.name,menu,auto,rules,toast,errors});
  console.log('PASS',conf.engine.name(),conf.name,'settings/autoplay/turbo/rules and live controls');
  await context.close();
 }finally{await browser.close();}
}
await writeFile(out+'/report.json',JSON.stringify(reports,null,2));
console.log('PASS LEGEND MENUS V13 '+reports.length+' device cases');
