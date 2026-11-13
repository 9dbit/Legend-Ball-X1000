import {chromium, webkit} from 'playwright';
import assert from 'node:assert/strict';

const base=process.env.LEGEND_URL||'http://127.0.0.1:3107/play/?ios-boot-smoke=1';
for(const [name,browserType] of [['Chromium mobile',chromium],['WebKit iPhone viewport',webkit]]){
  const browser=await browserType.launch({headless:true,args:name.startsWith('Chromium')?['--no-sandbox']:[]});
  try{
    const context=await browser.newContext({
      viewport:{width:393,height:852},isMobile:true,hasTouch:true,
      deviceScaleFactor:1,reducedMotion:'no-preference'
    });
    const page=await context.newPage(),errors=[];
    page.on('pageerror',err=>errors.push(err.message));
    await page.addInitScript(()=>{
      // Simulate the iOS decode promise that never settles while network assets
      // can still load. Both splash PLAY and first SPIN must remain usable.
      Object.defineProperty(HTMLImageElement.prototype,'decode',{
        configurable:true,value(){return new Promise(()=>{});}
      });
    });
    await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForFunction(()=>document.documentElement.dataset.boot==='ready',null,{timeout:20000});
    const play=page.locator('#bootPlay');
    assert(await play.isEnabled(),name+': PLAY should be enabled');
    assert.equal(await page.locator('#bootStatus').innerText(),'Siap memasuki LEGEND BALL');
    await play.click();
    await page.waitForFunction(()=>document.documentElement.dataset.boot==='entered'&&!!window.SlotGameTest,null,{timeout:12000});
    assert.equal(await page.locator('.game').evaluate(e=>e.inert),false);
    assert.equal(await page.locator('#bootSplash').isHidden(),true);
    assert.equal(await page.locator('.tile:not([aria-hidden="true"])').count(),30);
    await page.locator('#spin').click();
    await page.waitForFunction(()=>{
      const s=window.SlotGameTest?.getState();
      return s?.rounds===1&&!s?.busy;
    },null,{timeout:50000});
    assert.deepEqual(errors,[],name+': browser page error');
    console.log(name+': PASS stalled decode -> PLAY -> 6x5 game -> first completed spin');
    await context.close();
  }finally{
    await browser.close();
  }
}
