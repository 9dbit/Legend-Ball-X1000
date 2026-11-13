import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const base=process.env.LEGEND_STUDIO_URL||'http://127.0.0.1:3107/studio/';
const dest=resolve('qa-artifacts/cutout-v7-studio');await mkdir(dest,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errs=[];page.on('pageerror',e=>errs.push(e.message));
try{
 const res=await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
 assert.equal(res.status(),200,'Studio needs authorized preview access');
 await page.waitForFunction(()=>!!window.SKYGATE_STUDIO?.getState,null,{timeout:20000});
 await page.locator('#editModeBtn').click();
 await page.waitForFunction(()=>document.querySelector('#gameCanvas')?.contentDocument?.querySelector('.legend-scene')?.dataset.uiVersion==='cutout-v7',null,{timeout:30000});
 const initial=await page.evaluate(()=>{
  const data=window.SKYGATE_STUDIO.getState(),s=document.querySelector('#gameCanvas').contentDocument;
  return{layers:data.layers.length,renderer:s.querySelector('.legend-scene').dataset.uiVersion,
  logo:s.querySelector('[data-layer=logo]').getBoundingClientRect().toJSON()};
 });
 await page.locator('[data-tab=assets]').click();
 const total=await page.locator('[data-asset^="legend-cutouts/"]').count();
 assert(total>=30,'Transparent cutouts must be present in the library');
 await page.screenshot({path:resolve(dest,'studio-library.png')});
 await page.locator('[data-asset="legend-cutouts/dragon.png"]').click();
 const after=await page.evaluate(()=>({layers:window.SKYGATE_STUDIO.getState().layers.length,selected:window.SKYGATE_STUDIO.getSelected()}));
 assert.equal(after.layers,initial.layers+1,'click asset must ADD, not overwrite an existing layer');
 assert(after.selected.startsWith('cutout_'),'new asset should be selected');
 const layer=await page.evaluate(()=>window.SKYGATE_STUDIO.getState().layers.find(x=>x.id===window.SKYGATE_STUDIO.getSelected()));
 assert.equal(layer.asset,'legend-cutouts/dragon.png');
 await page.waitForTimeout(750);
 const inserted=await page.evaluate(()=>document.querySelector('#gameCanvas').contentDocument.querySelector('[data-layer="'+window.SKYGATE_STUDIO.getSelected()+'"]')?.getBoundingClientRect().toJSON());
 assert(inserted?.width>30&&inserted?.height>30,'new cutout should render as independent source-sized image');
 // Edit existing logo through Studio Inspector and verify same live DOM renderer moves.
 await page.locator('[data-layer-row="logo"]').click();
 const before=await page.evaluate(()=>document.querySelector('#gameCanvas').contentDocument.querySelector('[data-layer=logo]').getBoundingClientRect().toJSON());
 const oldX=await page.evaluate(()=>window.SKYGATE_STUDIO.getState().layers.find(x=>x.id==='logo').x);
 const input=page.locator('input[data-path="layers.'+(await page.evaluate(()=>window.SKYGATE_STUDIO.getState().layers.findIndex(x=>x.id==='logo')))+'.x"]');
 await input.fill(String(oldX+70));await input.dispatchEvent('change');
 await page.waitForTimeout(1100);
 const change=await page.evaluate(()=>({x:window.SKYGATE_STUDIO.getState().layers.find(x=>x.id==='logo').x,
   rect:document.querySelector('#gameCanvas').contentDocument.querySelector('[data-layer=logo]').getBoundingClientRect().toJSON()}));
 assert.equal(change.x,oldX+70);
 assert(change.rect.left>before.left+12,'moving X in Studio must move actual public renderer');
 const index=await page.evaluate(()=>window.SKYGATE_STUDIO.getState().layers.findIndex(x=>x.id==='logo'));
 const widthInput=page.locator('input[data-path="layers.'+index+'.w"]');
 const oldWidth=await page.evaluate(()=>window.SKYGATE_STUDIO.getState().layers.find(x=>x.id==='logo').w);
 await widthInput.fill(String(oldWidth-90));await widthInput.dispatchEvent('change');
 await page.waitForTimeout(950);
 const resized=await page.evaluate(()=>document.querySelector('#gameCanvas').contentDocument.querySelector('[data-layer="logo"]').getBoundingClientRect().toJSON());
 assert(resized.width<change.rect.width-20,'Studio width field must resize the real logo layer');
 await page.screenshot({path:resolve(dest,'studio-edit-logo.png')});
 assert.deepEqual(errs,[],'Studio page errors');
 await writeFile(resolve(dest,'summary.json'),JSON.stringify({initial,total,after,before,change},null,2));
 console.log('PASS STUDIO LIBRARY / add independent cutout / move existing logo',JSON.stringify({initialLayers:initial.layers,libraryAssets:total,added:layer.asset,deltaX:change.rect.left-before.left}));
}finally{await browser.close()}