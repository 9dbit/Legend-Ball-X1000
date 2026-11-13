import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const browserType=process.env.LEGEND_BROWSER==='webkit'?webkit:chromium;
const browserName=browserType===webkit?'webkit':'chromium';
const base=process.env.LEGEND_URL||'http://127.0.0.1:3118/play/?review=v9';
const dir=resolve('qa-artifacts/curated-v9-'+browserName);
await mkdir(dir,{recursive:true});
const browser=await browserType.launch(browserType===webkit?{headless:true}:{headless:true,args:['--no-sandbox']});
const logs=[];
try{
 for(const [w,h] of [[320,568],[390,844],[430,932],[864,1536]]){
  const context=await browser.newContext({viewport:{width:w,height:h},isMobile:w<700,hasTouch:w<700,deviceScaleFactor:1,reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',err=>errors.push(err.message));
  page.on('response',res=>{if(res.status()>=400&&res.url().startsWith(new URL(base).origin))errors.push(res.status()+' '+res.url());});
  await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>document.getElementById('bootPlay')?.disabled===false,null,{timeout:30000});
  await page.locator('#bootPlay').click();
  await page.waitForFunction(()=>document.querySelector('.legend-scene')?.dataset.uiVersion==='curated-v9',null,{timeout:15000});
  await page.waitForTimeout(250);
  const state=await page.evaluate(()=>{
   const scene=document.querySelector('.legend-scene');
   const layer=id=>scene.querySelector('[data-layer="'+id+'"]');
   const bounds=id=>{const r=layer(id).getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,b:r.bottom,r:r.right}};
   const tile=scene.querySelector('.tile:not([aria-hidden="true"])')?.getBoundingClientRect();
   return{viewport:[innerWidth,innerHeight],ui:scene.dataset.uiVersion,
    scene:scene.getBoundingClientRect().toJSON(),cells:scene.querySelectorAll('.tile:not([aria-hidden=true])').length,
    columns:scene.querySelectorAll('.reel-column').length,
    tile:[tile.width,tile.height],
    layers:Object.fromEntries(['guardian','dragon','logo','winbanner','bonuscopy','reelframe','reels','buybtn','antebtn','creditpanel','betpanel','minusbtn','plusbtn','spinbutton','provider'].map(id=>[id,bounds(id)])),
    art:Object.fromEntries(['sky','guardian','dragon','logo','winbanner','reelframe','creditpanel','betpanel','spinbutton'].map(id=>[id,layer(id).querySelector('img')?.src||layer(id).querySelector('.spin-frame')?.src||getComputedStyle(layer(id).querySelector('button')).backgroundImage])),
    broken:[...scene.querySelectorAll('img')].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src),
    viewportOverflow:document.documentElement.scrollWidth-innerWidth,
    controlSvg:scene.querySelectorAll('button svg').length,
   };
  });
  assert.equal(state.ui,'curated-v9');
  assert.equal(state.cells,30);assert.equal(state.columns,6);
  assert(Math.abs(state.tile[0]-state.tile[1])<=2.5,w+': square tile broken');
  assert(state.scene.width>0&&state.scene.height>0);
  assert(Math.abs(state.scene.height/state.scene.width-1920/1080)<.04,'stage stretched');
  assert.equal(state.viewportOverflow<=2,true,'horizontal overflow');
  assert.equal(state.controlSvg,0,'SVG controls remain');
  assert.deepEqual(state.broken,[]);
  for(const id of ['guardian','dragon','logo','winbanner','reelframe','creditpanel','betpanel'])assert(state.art[id]?.includes('/legend-v9/'),id+' should use V9 transparent art');
  assert.deepEqual(errors,[],w+': runtime errors');
  await page.screenshot({path:resolve(dir,'game-'+w+'.png')});
  if(w===390){
   const old=await page.locator('#betText').innerText();
   await page.locator('#plus').click();assert.notEqual(await page.locator('#betText').innerText(),old);
   await page.locator('#minus').click();assert.equal(await page.locator('#betText').innerText(),old);
   await page.locator('#spin').click();
   await page.waitForFunction(()=>window.SlotGameTest?.getState().rounds===1&&!window.SlotGameTest?.getState().busy,null,{timeout:40000});
   state.spinPass=true;
  }
  logs.push(state);
  await context.close();
 }
 await writeFile(resolve(dir,'report.json'),JSON.stringify(logs,null,2));
 console.log('PASS curated V9 alpha assets and single-coordinate stage '+browserName+' | '+logs.map(x=>x.viewport[0]).join(','));
}finally{await browser.close()}