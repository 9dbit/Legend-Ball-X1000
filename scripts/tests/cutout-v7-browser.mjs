import { chromium, webkit } from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const base=process.env.LEGEND_URL||'http://127.0.0.1:3107/play/?art=cutout-v7';
const engine=process.env.LEGEND_BROWSER==='webkit'?'webkit':'chromium';
const dest=resolve('qa-artifacts/cutout-v7-'+engine);
await mkdir(dest,{recursive:true});
const browser=await (engine==='webkit'?webkit:chromium).launch(engine==='webkit'?{headless:true}:{headless:true,args:['--no-sandbox']});
const checks=[];
try{
 for(const [width,height] of [[320,568],[390,844],[430,932],[864,1536]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:width<700,hasTouch:width<700,deviceScaleFactor:1,reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(new URL(base).origin))errors.push(r.status()+' '+r.url())});
  await page.goto(base,{waitUntil:'domcontentloaded',timeout:35000});
  await page.waitForFunction(()=>document.querySelector('#bootPlay')?.disabled===false,null,{timeout:40000});
  await page.locator('#bootPlay').click();
  await page.waitForFunction(()=>document.documentElement.dataset.boot==='entered',{},{timeout:15000});
  await page.waitForFunction(()=>document.querySelector('.legend-scene')?.dataset.uiVersion==='cutout-v7',{},{timeout:15000});
  await page.waitForTimeout(350);
  const data=await page.evaluate(()=>{
   const scene=document.querySelector('.legend-scene');
   const r=id=>scene.querySelector('[data-layer="'+id+'"]')?.getBoundingClientRect().toJSON();
   const tile=scene.querySelector('.tile:not([aria-hidden=true])')?.getBoundingClientRect().toJSON();
   const transparent=ids=>ids.map(id=>({id,display:getComputedStyle(scene.querySelector('[data-layer="'+id+'"]')).display,src:scene.querySelector('[data-layer="'+id+'"] img')?.src}));
   return {ui:scene.dataset.uiVersion,rects:Object.fromEntries(['logo','guardian','dragon','winbanner','reelframe','reels','buybtn','antebtn','creditpanel','betpanel','spinbutton','minusbtn','plusbtn'].map(id=>[id,r(id)])),
    tile,columns:scene.querySelectorAll('.reel-column').length,cells:scene.querySelectorAll('.tile:not([aria-hidden=true])').length,
    art:transparent(['guardian','dragon','logo','winbanner','reelframe','creditpanel','betpanel']),
    svgCount:scene.querySelectorAll('button svg').length,
    horizontalOverflow:document.documentElement.scrollWidth-innerWidth,
    broken:[...scene.querySelectorAll('img')].filter(i=>getComputedStyle(i).display!=='none'&&i.complete&&!i.naturalWidth).map(i=>i.src),
    credit:document.getElementById('credits').textContent};
  });
  assert.equal(data.ui,'cutout-v7');
  assert.equal(data.columns,6);
  assert.equal(data.cells,30);
  assert(Math.abs(data.tile.width-data.tile.height)<2.5,width+': reel cell not physically square '+JSON.stringify(data.tile));
  assert.equal(data.svgCount,0);
  assert(data.art.every(a=>a.display!=='none'&&a.src?.includes('/legend-cutouts/')),width+': cutout layer missing '+JSON.stringify(data.art));
  assert.deepEqual(data.broken,[],width+': broken images');
  assert(data.horizontalOverflow<=2,width+': overflow');
  await page.screenshot({path:resolve(dest,'game-'+width+'.png')});
  if(width===390){
   const old=await page.locator('#betText').innerText();
   await page.locator('#plus').click();assert.notEqual(await page.locator('#betText').innerText(),old);
   await page.locator('#minus').click();assert.equal(await page.locator('#betText').innerText(),old);
   await page.locator('#spin').click();
   await page.waitForFunction(()=>window.SlotGameTest?.getState().rounds===1&&!window.SlotGameTest?.getState().busy,null,{timeout:45000});
   await page.screenshot({path:resolve(dest,'after-spin.png')});
  }
  checks.push({width,height,tile:[data.tile.width,data.tile.height],columns:6,cells:30,broken:data.broken,art:data.art,rects:data.rects,credit:data.credit,errors});
  if(errors.length)console.warn('ERROR',width,errors);
  await context.close();
 }
 await writeFile(resolve(dest,'summary.json'),JSON.stringify(checks,null,2));
 console.log('PASS V7 CUTOUT RENDERER / mobile views',checks.map(x=>({width:x.width,cell:x.tile,errors:x.errors})));
}catch(e){console.error('FAIL',e.stack);throw e;}finally{await browser.close();}
