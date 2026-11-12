import {chromium} from 'playwright';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const base=process.env.LEGEND_URL||'http://127.0.0.1:3107/play/';
const out=resolve('qa-artifacts/raster-v2');await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});const records=[];
try{
 for(const [width,height] of [[320,568],[390,844],[430,932],[1440,1000]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:width<700,hasTouch:width<700,reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(new URL(base).origin))errors.push('HTTP '+r.status()+' '+r.url());});
  await page.goto(base,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!document.getElementById('bootPlay').disabled,null,{timeout:30000});await page.screenshot({path:resolve(out,'splash-'+width+'.png')});
  await page.locator('#bootPlay').click();await page.waitForFunction(()=>document.documentElement.dataset.boot==='entered');
  const r=await page.evaluate(()=>{
   const scene=document.querySelector('.legend-scene');const required=['reels','spin','credits','betText','auto','turbo','menu','sound','help','buyFeature','anteFeature'];
   return{scene:!!scene,artVersion:scene?.dataset.artVersion,visibleCells:scene?.querySelectorAll('.tile:not([aria-hidden="true"])').length,columns:scene?.querySelectorAll('.reel-column').length,overflow:document.documentElement.scrollWidth-innerWidth,broken:[...scene.querySelectorAll('img')].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src),activeRaster:[...scene.querySelectorAll('img.symbol, .legend-art img, .spin-frame')].map(i=>i.src),targets:required.map(id=>{const n=document.getElementById(id),b=n.getBoundingClientRect();return{id,x:b.x,y:b.y,w:b.width,h:b.height,visible:b.width>0&&b.height>0};})};
  });
  assert.equal(r.visibleCells,30);assert.equal(r.columns,6);assert.equal(r.artVersion,'raster-v2');assert(r.overflow<=2);assert.deepEqual(r.broken,[]);assert(r.activeRaster.every(url=>url.includes('/legend-raster/')&&url.endsWith('.png')));
  assert(r.targets.every(t=>t.visible&&t.x>=-1&&t.x+t.w<=width+1&&t.y>=-1&&t.y+t.h<=height+1),'all controls inside viewport');await page.screenshot({path:resolve(out,'game-'+width+'.png')});
  if(width===390){
   await page.locator('#spin').click();await page.waitForFunction(()=>window.SlotGameTest.getState().rounds===1&&!window.SlotGameTest.getState().busy,null,{timeout:30000});
   const settled=await page.evaluate(()=>{const s=window.SlotGameTest.getState(),expected=window.SlotGameMath.createEngine(window.SlotGameConfig,20261027).playRound({trace:true});return{rounds:s.rounds,actual:s.last.round.winX,expected:expected.winX,credits:s.credits,calculated:Math.round((100000-2+expected.winX*2)*100)/100};});
   assert.equal(settled.actual,settled.expected);assert.equal(settled.credits,settled.calculated);r.spin=settled;await page.locator('#help').click();await page.screenshot({path:resolve(out,'rules-390.png')});await page.locator('#closeModal').click();await page.screenshot({path:resolve(out,'after-spin-390.png')});
  }
  assert.deepEqual(errors,[]);records.push({width,height,...r,errors});await context.close();
 }
 if(process.env.TEST_STUDIO==='1'){
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,reducedMotion:'reduce'});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));const project=JSON.parse(await readFile('studio/project.json','utf8'));
  await page.addInitScript(({project})=>{window.addEventListener('message',event=>{if(event.data?.type==='skygate-editor-request')window.postMessage({type:'skygate-editor-state',project,assets:{'assets/legend-raster/hero.png':location.origin+'/play/assets/legend-raster/app-icon.png'}},location.origin);});},{project});
  const origin=new URL(base).origin;await page.goto(origin+'/studio/editor-preview/?qa=raster',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.boot==='entered',null,{timeout:30000});
  const result=await page.evaluate(()=>({version:document.querySelector('.legend-scene')?.dataset.artVersion,hero:document.querySelector('[data-layer=guardian] img')?.src,cells:document.querySelectorAll('.legend-scene .tile:not([aria-hidden="true"])').length,math:window.SkygateActiveRelease?.project.math}));assert.equal(result.version,'raster-v2');assert(result.hero.endsWith('/app-icon.png'));assert.equal(result.cells,30);assert.deepEqual(result.math,project.math);assert.deepEqual(errors,[]);await page.screenshot({path:resolve(out,'studio-override-390.png')});records.push({studioDraftOverride:result});await context.close();
 }
 await writeFile(resolve(out,'report.json'),JSON.stringify({base,records},null,2));console.log('PASS: real mobile/desktop PNG UI, controls, unchanged seeded spin and Studio asset override');
}finally{await browser.close();}
