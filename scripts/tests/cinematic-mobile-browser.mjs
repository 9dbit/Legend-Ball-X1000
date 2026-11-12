import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const base=process.env.LEGEND_URL||'http://127.0.0.1:3107/play/';
const out=resolve('qa-artifacts/cinematic-v3');await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const metrics=[];
const overlaps=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
try{
 for(const [width,height] of [[320,568],[390,844],[430,932],[1440,1000]]){
  const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:width<700,hasTouch:width<700,reducedMotion:'no-preference'});
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(new URL(base).origin))errors.push('HTTP '+r.status()+' '+r.url());});
  await page.goto(base,{waitUntil:'domcontentloaded',timeout:35000});
  await page.waitForFunction(()=>document.getElementById('bootPlay')?.disabled===false,null,{timeout:35000});
  await page.locator('#bootPlay').click();
  await page.waitForFunction(()=>document.documentElement.dataset.boot==='entered',null,{timeout:15000});
  await page.waitForFunction(()=>window.LegendCinematics?.getStatus().ready&&[...document.querySelectorAll('.legend-world-image')].every(x=>x.complete&&x.naturalWidth),null,{timeout:25000});
  const initial=await page.evaluate(()=>{
   const scene=document.querySelector('.legend-scene');
   const b=id=>{const r=document.querySelector('[data-layer="'+id+'"]')?.getBoundingClientRect();return r?{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}:null;};
   return {
    world:window.LegendCinematics.getStatus(),imageCount:document.querySelectorAll('.legend-world-image').length,
    visibleCells:scene.querySelectorAll('.tile:not([aria-hidden="true"])').length,
    columns:scene.querySelectorAll('.reel-column').length,
    overflow:document.documentElement.scrollWidth-innerWidth,
    broken:[...scene.querySelectorAll('img')].filter(x=>x.complete&&!x.naturalWidth).map(x=>x.src),
    rects:Object.fromEntries(['autobtn','spinbutton','turbobtn','menubtn','soundbtn','infobtn'].map(id=>[id,b(id)]))
   };
  });
  assert.equal(initial.visibleCells,30);
  assert.equal(initial.columns,6);
  assert.equal(initial.imageCount,3);
  assert(initial.overflow<=2,width+': horizontal overflow');
  assert.deepEqual(initial.broken,[],width+': broken images');
  if(width<700){
   const x=initial.rects;
   for(const id of ['autobtn','turbobtn','menubtn','soundbtn','infobtn']){
     assert(x[id]?.width>=32,width+': small control '+id);
     assert(overlaps(x.spinbutton,x[id])<1,width+': Spin overlaps '+id);
   }
  }
  await page.screenshot({path:resolve(out,'game-'+width+'.png'),fullPage:true});
  if(width===390){
    await page.locator('#spin').click({timeout:10000});
    await page.waitForFunction(()=>document.getElementById('reels')?.classList.contains('rolling'),null,{timeout:10000});
    const blur=await page.evaluate(()=>getComputedStyle(document.querySelector('.reels.rolling .tile .symbol')).filter);
    assert(/blur/.test(blur),'expected directional blur on rolling reel: '+blur);
    await page.screenshot({path:resolve(out,'reel-motion-390.png')});
    await page.waitForFunction(()=>window.SlotGameTest.getState().rounds===1&&!window.SlotGameTest.getState().busy,null,{timeout:35000});
    const settled=await page.evaluate(()=>{const s=window.SlotGameTest.getState();const p=window.SlotGameMath.createEngine(window.SlotGameConfig,20261027).playRound({trace:true});return {win:s.last.round.winX,expected:p.winX,credits:s.credits,expectedCredits:Math.round((100000-2+p.winX*2)*100)/100};});
    assert.equal(settled.win,settled.expected);assert.equal(settled.credits,settled.expectedCredits);
    await page.evaluate(()=>window.LegendCinematics.multiplier(12));
    await page.waitForTimeout(800);
    assert.equal((await page.evaluate(()=>window.LegendCinematics.getStatus())).active,1,'multiplier must switch to crimson scene');
    await page.screenshot({path:resolve(out,'crimson-after-lightning-390.png'),fullPage:true});
    await page.evaluate(()=>window.LegendCinematics.bonus());
    await page.waitForTimeout(800);
    assert.equal((await page.evaluate(()=>window.LegendCinematics.getStatus())).active,2,'bonus must switch to celestial scene');
    await page.screenshot({path:resolve(out,'celestial-after-lightning-390.png'),fullPage:true});
    await page.evaluate(()=>window.LegendCinematics.lightning(0));
    await page.waitForTimeout(800);
    assert.equal((await page.evaluate(()=>window.LegendCinematics.getStatus())).active,0,'next transition must cycle back to warrior');
    initial.settled=settled;
  }
  assert.deepEqual(errors,[],width+': console errors');
  metrics.push({width,height,...initial,errors});
  await ctx.close();
 }
 await writeFile(resolve(out,'report.json'),JSON.stringify({base,metrics},null,2));
 console.log('PASS: three real WebP worlds, lightning transitions, mobile controls, reel motion blur and original Skygate outcomes');
} finally {await browser.close();}
