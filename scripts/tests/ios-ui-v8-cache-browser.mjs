import { chromium, webkit } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const host=(process.env.LEGEND_BASE||'http://127.0.0.1:3118').replace(/\/$/,'');
const browserType=process.env.LEGEND_BROWSER==='webkit'?'webkit':'chromium';
const browser=await (browserType==='webkit'?webkit:chromium).launch(
  browserType==='webkit'?{headless:true}:{headless:true,args:['--no-sandbox']}
);
const artifact=resolve('qa-artifacts/ios-ui-v8-'+browserType);
await mkdir(artifact,{recursive:true});
const cases=[
 {suffix:'/play/?square=v6&verify=1',name:'legacy-square-v6'},
 {suffix:'/play/?art=cutout-v7&verify=1',name:'legacy-art-v7'},
 {suffix:'/play/?ui=cutout-v8-20261113&verify=1',name:'fresh-v8'}
];
const results=[];
try{
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,
   deviceScaleFactor:1,reducedMotion:'reduce'});
 for(const item of cases){
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push('JS '+e.message));
  page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(host))errors.push('HTTP '+r.status()+' '+r.url());});
  const response=await page.goto(host+item.suffix,{waitUntil:'domcontentloaded',timeout:40000});
  assert.equal(response.status(),200,item.suffix);
  assert.equal(response.headers()['cache-control'],'no-store, no-cache, must-revalidate','public HTML must never cache');
  await page.waitForFunction(()=>document.querySelector('#bootPlay')?.disabled===false,null,{timeout:45000});
  await page.locator('#bootPlay').click();
  await page.waitForFunction(()=>document.querySelector('.legend-scene')?.dataset.uiVersion==='cutout-v7',null,{timeout:20000});
  await page.waitForTimeout(500);
  const model=await page.evaluate(()=>{
   const scene=document.querySelector('.legend-scene');
   const tile=scene.querySelector('.tile:not([aria-hidden=true])')?.getBoundingClientRect();
   return {
    build:document.documentElement.dataset.uiBuild,
    layout:scene.dataset.uiVersion,
    query:location.search,
    versionStamp:document.getElementById('legend-ui-version-stamp')?.textContent,
    background:scene.querySelector('[data-layer=sky] img')?.src,
    hero:scene.querySelector('[data-layer=guardian] img')?.src,
    logo:scene.querySelector('[data-layer=logo] img')?.src,
    frame:scene.querySelector('[data-layer=reelframe] img')?.src,
    columns:scene.querySelectorAll('.reel-column').length,
    cells:scene.querySelectorAll('.tile:not([aria-hidden=true])').length,
    tile:tile?[tile.width,tile.height]:null,
    svgControlCount:scene.querySelectorAll('button svg').length,
    brokenImages:[...scene.querySelectorAll('img')].filter(i=>getComputedStyle(i).display!=='none'&&i.complete&&!i.naturalWidth).map(i=>i.src),
    widthOverflow:document.documentElement.scrollWidth-innerWidth
   };
  });
  assert.equal(model.build,'cutout-v8-20261113');
  assert.equal(model.layout,'cutout-v7');
  assert(model.query.includes('ui=cutout-v8-20261113'),'legacy bookmarks must be updated');
  assert.equal(model.versionStamp,'UI V8 · CUTOUT');
  for(const key of ['background','hero','logo','frame']) assert(model[key]?.includes('/legend-cutouts/'),key+': stale flattened JPEG');
  assert.equal(model.columns,6);assert.equal(model.cells,30);
  assert(Math.abs(model.tile[0]-model.tile[1])<2,'reel tiles no longer square');
  assert.equal(model.svgControlCount,0);
  assert.deepEqual(model.brokenImages,[]);
  assert(model.widthOverflow<=2,'page has horizontal overflow');
  assert.deepEqual(errors,[],'runtime errors');
  await page.screenshot({path:resolve(artifact,item.name+'-390.png')});
  if(item.name==='fresh-v8'){
    const old=await page.locator('#betText').innerText();
    await page.locator('#plus').click();
    assert.notEqual(await page.locator('#betText').innerText(),old,'plus button');
    await page.locator('#minus').click();
    assert.equal(await page.locator('#betText').innerText(),old,'minus button');
    await page.locator('#spin').click();
    await page.waitForFunction(()=>window.SlotGameTest?.getState().rounds===1&&!window.SlotGameTest?.getState().busy,null,{timeout:45000});
    model.spinPassed=true;
  }
  results.push({route:item.suffix,...model});
  await page.close();
 }
 // Simulate returning to an old Safari in-app tab after a future deploy.
 // A version mismatch must offer an explicit upgrade without resetting a round.
 const backPage=await ctx.newPage();
 await backPage.route('**/play/ui-version.json?check=*',route=>route.fulfill({
   status:200,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},
   body:JSON.stringify({ui:'cutout-v9-probe',layout:'cutout-modular-v7'})
 }));
 await backPage.goto(host+'/play/?ui=cutout-v8-20261113',{waitUntil:'load',timeout:40000});
 await backPage.locator('#legend-ui-outdated').waitFor({timeout:15000});
 assert((await backPage.url()).includes('ui=cutout-v8-20261113'),'page must not silently restart');
 assert.equal(await backPage.locator('#legend-ui-outdated button').innerText(),'Muat terbaru');
 await backPage.close();
 const version=await ctx.request.get(host+'/play/ui-version.json?check='+Date.now());
 assert.equal(version.status(),200);
 assert.match(version.headers()['cache-control'],/no-store/);
 assert.equal((await version.json()).ui,'cutout-v8-20261113');
 const css=await ctx.request.get(host+'/play/legend/cutout-v7.css?v=cutout-v8-20261113');
 assert.equal(css.status(),200);
 assert.match(css.headers()['cache-control'],/no-store/);
 const legacyScript=await ctx.request.get(host+'/play/legend/default-project.js?v=master-v5');
 assert.equal(legacyScript.status(),200);
 assert.match(legacyScript.headers()['cache-control'],/no-store/);
 await writeFile(resolve(artifact,'report.json'),JSON.stringify({host,browserType,results},null,2));
 console.log('PASS iOS fresh build guard',browserType,'legacy routes/current build, no-store headers, modular PNG, square tiles, spin');
}finally{await browser.close();}
