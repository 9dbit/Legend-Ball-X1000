/* Real Chromium mobile smoke for the isolated LEGEND BALL X1000 staging preview.
 * Requires playwright installed by the dedicated QA workflow, not runtime app. */
import { chromium, devices } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const url=process.env.LEGEND_URL || 'http://127.0.0.1:3107/play/';
const output=resolve('qa-artifacts');
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const metrics=[];
try {
  for(const [width,height] of [[320,568],[390,844],[430,932]]) {
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:true,hasTouch:true,reducedMotion:'reduce'});
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(new URL(url).origin))errors.push('HTTP '+r.status()+' '+r.url());});
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:35000});
    await page.waitForFunction(()=>document.querySelector('#bootPlay')?.disabled===false,{timeout:35000});
    await page.screenshot({path:resolve(output,'legend-splash-'+width+'.png'),fullPage:true});
    await page.locator('#bootPlay').click();
    await page.waitForFunction(()=>document.documentElement.dataset.boot==='entered',{timeout:10000});
    const ready=await page.evaluate(()=>{
      const grid=document.querySelector('#reels'),game=document.querySelector('.game');
      const visible=Array.from(grid.querySelectorAll('.tile')).filter(t=>t.getAttribute('aria-hidden')!=='true');
      const broken=Array.from(document.images).filter(img=>img.closest('.game')&&img.complete&&img.naturalWidth===0).map(img=>img.src);
      return {visibleCells:visible.length,columns:grid.querySelectorAll('.reel-column').length,horizontalOverflow:document.documentElement.scrollWidth-innerWidth,brokenImages:broken,gameWidth:game.getBoundingClientRect().width,spin:document.querySelector('#spin').getBoundingClientRect().toJSON()};
    });
    if(ready.visibleCells!==30||ready.columns!==6)throw Error(width+': expected 30 cells across 6 reels, got '+JSON.stringify(ready));
    if(ready.horizontalOverflow>2)throw Error(width+': unexpected page horizontal overflow '+ready.horizontalOverflow);
    if(ready.brokenImages.length)throw Error(width+': broken images '+ready.brokenImages.join(', '));
    if(errors.length)throw Error(width+': JS/network errors '+errors.join(' | '));
    await page.screenshot({path:resolve(output,'legend-game-'+width+'.png'),fullPage:true});
    if(width===390){
      await page.locator('#spin').click({timeout:10000});
      await page.waitForFunction(()=>Number(document.querySelector('#rounds')?.textContent||0)>=1,{timeout:30000});
      await page.screenshot({path:resolve(output,'legend-after-spin-'+width+'.png'),fullPage:true});
      if(errors.length)throw Error('Spin JS/network errors '+errors.join(' | '));
    }
    metrics.push({width,height,...ready,errors});
    await context.close();
  }
  await writeFile(resolve(output,'mobile-qa.json'),JSON.stringify({url,metrics},null,2));
  console.log('PASS mobile Chromium: '+JSON.stringify(metrics.map(({width,visibleCells,columns,horizontalOverflow,brokenImages})=>({width,visibleCells,columns,horizontalOverflow,brokenImages}))));
} finally {await browser.close();}
