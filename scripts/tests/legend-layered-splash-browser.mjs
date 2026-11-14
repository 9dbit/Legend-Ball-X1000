import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const url=process.env.LEGEND_URL||'http://127.0.0.1:3119';
await mkdir('qa-artifacts/legend-layered-splash',{recursive:true});
for(const engine of [chromium,webkit]){
 const browser=await engine.launch({headless:true,...(engine===chromium?{channel:'chrome'}:{})});
 try{
  for(const [width,height,safeTop,safeBottom,id] of [[393,852,59,34,'iphone-notch'],[430,932,62,34,'iphone-large'],[360,800,24,24,'android'],[844,390,0,0,'landscape']]){
   const ctx=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
   const page=await ctx.newPage(); const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(url+'/play/',{waitUntil:'domcontentloaded'});
   await page.addStyleTag({content:':root{--legend-test-safe-top:'+safeTop+'px;--legend-test-safe-bottom:'+safeBottom+'px;}'});
   await page.locator('#bootPlay:not(:disabled)').waitFor({timeout:30000});
   await page.waitForFunction(()=>document.getElementById('bootSplash').classList.contains('layered-ready'),{timeout:25000});
   const before=await page.evaluate(()=>{
    const splash=document.getElementById('bootSplash'),stage=document.getElementById('legendLayeredStage');
    const rect=stage.getBoundingClientRect(),btn=document.getElementById('bootPlay').getBoundingClientRect();
    const l=[...stage.querySelectorAll('img')].map(e=>({name:e.className,width:e.naturalWidth,complete:e.complete,opacity:getComputedStyle(e).opacity}));
    return {ready:splash.classList.contains('layered-ready'),frame:rect.toJSON(),button:btn.toJSON(),layers:l,stageOpacity:getComputedStyle(stage).opacity,stageVisibility:getComputedStyle(stage).visibility,overflow:document.documentElement.scrollWidth>innerWidth+1};
   });
   assert.equal(before.layers.length,6,'six layers required');
   assert.equal(before.stageOpacity,'1','approved art must be visible without a blank transition frame');
   assert.equal(before.stageVisibility,'visible','layered scene must be visible');
   assert(before.layers.every(x=>x.complete&&x.width>0),'all layers decoded');
   assert(!before.overflow,'no horizontal overflow');
   assert(before.frame.top>=safeTop-1&&before.frame.bottom<=height-safeBottom+1,'stage inside safe area');
   assert(before.button.top>=before.frame.top&&before.button.bottom<=before.frame.bottom,'enter in stage');
   await page.screenshot({path:'qa-artifacts/legend-layered-splash/'+engine.name()+'-'+id+'.png'});
   const button=page.locator('#bootPlay');
   if(id==='iphone-notch'){
    await button.dispatchEvent('pointerdown',{bubbles:true,pointerType:'touch'});
    await page.evaluate(()=>document.getElementById('bootSplash').classList.add('enter-pressed'));
    const pressed=await page.locator('.legend-splash-enter').evaluate(el=>getComputedStyle(el).transform);
    assert.notEqual(pressed,'none','button push transform');
    await page.evaluate(()=>document.getElementById('bootSplash').classList.remove('enter-pressed'));
   }
   await button.click();
   await page.waitForFunction(()=>document.documentElement.dataset.boot==='entered');
   await page.waitForFunction(()=>document.getElementById('bootSplash').hidden,{timeout:3000});
   assert.deepEqual(errors,[]);
   console.log('PASS',engine.name(),id,JSON.stringify({frame:[Math.round(before.frame.x),Math.round(before.frame.y),Math.round(before.frame.width),Math.round(before.frame.height)]}));
   await ctx.close();
  }
 }finally{await browser.close();}
}
console.log('PASS Layered splash / enter button / mobile safe area');
