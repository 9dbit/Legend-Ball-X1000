import { chromium, webkit } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const target=process.env.LEGEND_URL||'http://127.0.0.1:3107/play/?master=ios-fix';
const out=resolve('qa-artifacts/ios-boot');await mkdir(out,{recursive:true});
const reports=[];
async function run(browserType,mode) {
 const browser=await browserType.launch({headless:true});
 const context=await browser.newContext({
   viewport:{width:390,height:844},isMobile:true,hasTouch:true,
   deviceScaleFactor:2,locale:'id-ID',reducedMotion:'reduce',
 });
 const page=await context.newPage();const errors=[],responses=[];
 page.on('pageerror',e=>errors.push('JS '+e.message));
 page.on('console',msg=>{if(msg.type()==='error')errors.push('console '+msg.text());});
 page.on('requestfailed',r=>errors.push('request '+r.url()+' '+r.failure()?.errorText));
 page.on('response',r=>{if(r.status()>=400)responses.push({url:r.url(),status:r.status()})});
 if(mode!=='normal') await page.addInitScript(mode => {
    const orig=HTMLImageElement.prototype.decode;
    if(typeof orig!=='function')return;
    HTMLImageElement.prototype.decode=function(){
      const source=this.currentSrc||this.src||'';
      if(mode==='reject' && /symbol-|legend-master\/(spin|reel-frame)\.png/.test(source)) return Promise.reject(new Error('Safari decode simulated InvalidStateError'));
      if(mode==='hang' && /legend-master\/(gameplay-backdrop|spin)\./.test(source)) return new Promise(()=>{});
      return orig.call(this);
    };
 },mode);
 await page.goto(target,{waitUntil:'domcontentloaded',timeout:40000});
 let outcome='unknown';
 const began=Date.now();
 try{
  await page.waitForFunction(()=>['ready','error'].includes(document.documentElement.dataset.boot),null,{timeout:18000});
  outcome=await page.evaluate(()=>document.documentElement.dataset.boot);
 }catch(e){outcome='timeout';errors.push('boot never settled: '+e.message);}
 const elapsed=Date.now()-began;
 const diag=await page.evaluate(()=>{
   const imgs=[...document.images];
   return {
     status:document.documentElement.dataset.boot,
     gameBound:!!document.querySelector('.legend-scene'),
     slots:document.querySelectorAll('.reel-column').length,
     total:imgs.length,unloaded:imgs.filter(i=>i.complete&&!i.naturalWidth).slice(0,12).map(i=>i.src),
     bootButtonDisabled:document.querySelector('#bootPlay')?.disabled,
     statusText:document.querySelector('#bootStatus')?.textContent,
   };
 });
 await page.screenshot({path:resolve(out,browserType.name()+'-'+mode+'-'+outcome+'.png'),fullPage:false});
 let entered=false;
 if(outcome==='ready'){
   await page.locator('#bootPlay').click();
   await page.waitForFunction(()=>document.documentElement.dataset.boot==='entered',null,{timeout:8000});
   entered=await page.locator('#spin').isVisible();
 }
 reports.push({browser:browserType.name(),mode,outcome,elapsedMs:elapsed,entered,errors:errors.slice(0,20),http:responses.slice(0,15),diag});
 await context.close();await browser.close();
}
for(const type of [webkit,chromium]){
 for(const mode of ['normal','reject','hang'])await run(type,mode);
}
await writeFile(resolve(out,'report.json'),JSON.stringify({target,reports},null,2));
console.log(JSON.stringify(reports,null,2));
for(const x of reports){
 assert.equal(x.outcome,'ready',x.browser+' '+x.mode+' failed to load');
 assert.equal(x.entered,true,x.browser+' '+x.mode+' not clickable');
 assert.equal(x.diag.slots,6,x.browser+' '+x.mode+' 6x5 engine missing');
}
