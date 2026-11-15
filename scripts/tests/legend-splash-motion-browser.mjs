import { chromium, webkit } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const url = process.env.LEGEND_URL || 'http://127.0.0.1:3119';
await mkdir('qa-artifacts/legend-splash-motion',{recursive:true});
for (const browserType of [chromium, webkit]) {
  const browser=await browserType.launch({headless:true,...(browserType===chromium?{channel:'chrome'}:{})});
  try {
    const ctx=await browser.newContext({
      viewport:{width:393,height:852},isMobile:true,hasTouch:true,reducedMotion:'no-preference'
    });
    const page=await ctx.newPage();
    const errors=[];
    page.on('pageerror',err=>errors.push(err.message));
    await page.goto(url+'/play/',{waitUntil:'domcontentloaded'});
    await page.addStyleTag({content:':root{--legend-test-safe-top:59px;--legend-test-safe-bottom:34px}'});
    await page.waitForFunction(()=>document.getElementById('bootSplash').classList.contains('layered-ready'),{timeout:30000});
    await page.locator('#bootPlay:not(:disabled)').waitFor({timeout:30000});
    const read=()=>page.evaluate(()=>{
      const stage=document.querySelector('#legendLayeredStage');
      const pick=name=>{
        const el=stage.querySelector('.legend-splash-'+name),cs=getComputedStyle(el);
        return {transform:cs.transform,animation:cs.animationName,opacity:cs.opacity,filter:cs.filter};
      };
      return {character:pick('character'),dragon:pick('dragon'),logo:pick('logo'),
        thunder:pick('thunder'),button:pick('enter'),background:pick('background')};
    });
    const a=await read();
    await page.waitForTimeout(1900);
    const b=await read();
    assert(a.character.animation.includes('legend-character-pulse'));
    assert(a.dragon.animation.includes('legend-dragon-pulse'));
    assert.notEqual(a.character.transform,b.character.transform,'character independent motion');
    assert.notEqual(a.dragon.transform,b.dragon.transform,'dragon independent motion');
    assert.equal(b.logo.animation,'none','logo must remain still');
    assert.equal(b.logo.transform,'none','logo must have no transform');
    if(process.env.LEGEND_CAPTURE_SCREENSHOTS==='1')await page.screenshot({path:'qa-artifacts/legend-splash-motion/'+browserType.name()+'-moving.png'});
    await page.evaluate(()=>document.getElementById('bootSplash').classList.add('enter-pressed'));
    const pressed=await read();
    assert.notEqual(pressed.button.transform,b.button.transform,'ENTER scales down');
    assert.notEqual(pressed.button.filter,b.button.filter,'ENTER glow changes');
    await page.evaluate(()=>document.getElementById('bootSplash').classList.remove('enter-pressed'));
    await page.locator('#bootPlay').tap();
    await page.waitForFunction(()=>document.documentElement.dataset.boot==='entered');
    await page.waitForFunction(()=>document.getElementById('bootSplash').hidden,{timeout:3000});
    assert.deepEqual(errors,[],'no browser runtime error');
    console.log('PASS motion / fixed logo / ENTER press / game transition '+browserType.name());
    await ctx.close();
  } finally {await browser.close();}
}
