import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const base=process.env.LEGEND_URL||'http://127.0.0.1:3107/play/?v=spin-v4';
const path=resolve('qa-artifacts/spin-v4');
await mkdir(path,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const results=[];
const intersects=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
try{
 for(const [width,height] of [[320,568],[390,844],[430,932],[1440,1000]]){
  const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:width<700,hasTouch:width<700,reducedMotion:'no-preference'});
  const page=await ctx.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(new URL(base).origin))errors.push('HTTP '+r.status()+' '+r.url());});
  await page.goto(base,{waitUntil:'domcontentloaded',timeout:40000});
  await page.waitForFunction(()=>document.getElementById('bootPlay')?.disabled===false,null,{timeout:35000});
  await page.locator('#bootPlay').click();
  await page.waitForFunction(()=>document.documentElement.dataset.boot==='entered',null,{timeout:10000});
  const actual=await page.evaluate(()=>{
   const r=id=>{const rect=document.querySelector('[data-layer="'+id+'"]')?.getBoundingClientRect();return rect?.toJSON()||null;};
   const spin=document.querySelector('[data-layer="spinbutton"]');
   const ring=getComputedStyle(spin,'::after');
   return {
    spin:r('spinbutton'),auto:r('autobtn'),turbo:r('turbobtn'),menu:r('menubtn'),rules:r('infobtn'),
    soundVisible:!!document.getElementById('sound')?.getClientRects().length,
    soundAriaHidden:document.getElementById('sound')?.getAttribute('aria-hidden'),
    ringBackground:ring.backgroundImage,ringAnimation:ring.animationName,
    columns:document.querySelectorAll('.legend-scene .reel-column').length,
    tiles:document.querySelectorAll('.legend-scene .tile:not([aria-hidden="true"])').length,
    overflow:document.documentElement.scrollWidth-innerWidth,
    broken:[...document.querySelectorAll('.legend-scene img')].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src)
   };
  });
  assert.equal(actual.columns,6,width+': columns');
  assert.equal(actual.tiles,30,width+': reel cells');
  assert(actual.overflow<=2,width+': overflow '+actual.overflow);
  assert.deepEqual(actual.broken,[],width+': assets');
  assert.equal(actual.soundVisible,false,'external Volume must not be visible');
  assert.equal(actual.soundAriaHidden,'true','legacy sound button must be hidden from screen readers');
  assert(/spin-lightning\.svg/.test(actual.ringBackground),width+': missing energy ring');
  assert(/legendSpinConduitReverse/.test(actual.ringAnimation),width+': energy rotation not active');
  assert(actual.auto&&actual.spin&&actual.turbo);
  assert(actual.auto.right<actual.spin.left,width+': Auto must be left of Spin');
  assert(actual.turbo.left>actual.spin.right,width+': Turbo must be directly right of Spin');
  assert(actual.turbo.left-actual.spin.right < width*.065,width+': Turbo too far from Spin');
  assert(intersects(actual.spin,actual.turbo)<1&&intersects(actual.spin,actual.auto)<1,width+': overlapped controls');
  assert(actual.spin.width>actual.turbo.width*1.75,width+': Spin must be visually dominant');
  if(width<700)assert(actual.turbo.width>=42,width+': Turbo touch target below 42px');
  await page.screenshot({path:resolve(path,'spin-'+width+'.png'),fullPage:true});

  if(width===390){
    await page.locator('#menu').click();
    assert(await page.locator('#menuDialog').evaluate(el=>el.open));
    const slider=page.locator('#volumeRange');
    assert(await slider.isVisible(),'Volume slider must be in Menu');
    assert.equal(await page.locator('#volumeValue').innerText(),'70%');
    await slider.evaluate(el=>{el.value='45';el.dispatchEvent(new Event('input',{bubbles:true}));});
    assert.equal(await page.locator('#volumeValue').innerText(),'45%');
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('legend-ball-settings-v1')));
    assert.equal(saved.volume,45,'slider persistence');
    await page.screenshot({path:resolve(path,'volume-menu-390.png')});
    await page.locator('#closeMenu').click();
    await page.locator('#turbo').click();
    assert(/quick/.test(await page.locator('#turbo').getAttribute('aria-label')));
    await page.locator('#spin').click();
    await page.waitForFunction(()=>window.SlotGameTest?.getState().rounds===1&&!window.SlotGameTest.getState().busy,null,{timeout:40000});
    const settled=await page.evaluate(()=>{
      const state=window.SlotGameTest.getState();
      const expected=window.SlotGameMath.createEngine(window.SlotGameConfig,20261027).playRound({trace:true});
      return {won:state.last.round.winX,expected:expected.winX,balance:state.credits,
        expectedBalance:Math.round((100000-2+expected.winX*2)*100)/100};
    });
    assert.equal(settled.won,settled.expected);
    assert.equal(settled.balance,settled.expectedBalance);
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.getElementById('bootPlay')?.disabled===false,null,{timeout:35000});
    await page.locator('#bootPlay').click();
    await page.locator('#menu').click();
    assert.equal(await page.locator('#volumeRange').inputValue(),'45','reloaded volume');
    await page.locator('#batterySetting').check();
    await page.locator('#closeMenu').click();
    const reduced=await page.evaluate(()=>getComputedStyle(document.querySelector('[data-layer="spinbutton"]'),'::after').animationName);
    assert.equal(reduced,'none','battery saver must stop continuous lightning animation');
    actual.settled=settled;
  }
  assert.deepEqual(errors,[],width+': browser errors');
  results.push({width,height,columns:actual.columns,tiles:actual.tiles,overflow:actual.overflow,energyRing:actual.ringAnimation,turboGap:actual.turbo.left-actual.spin.right,soundVisible:actual.soundVisible,settled:actual.settled||null});
  await ctx.close();
 }
 await writeFile(resolve(path,'report.json'),JSON.stringify({base,results},null,2));
 console.log('PASS V4: energy-orbit Spin, Turbo-right, Menu Volume, 6x5 game outcomes and mobile layouts');
}finally{await browser.close();}
