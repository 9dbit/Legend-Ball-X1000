import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const BASE=process.env.LEGEND_URL||'http://127.0.0.1:3107/play/?master=v5';
const DEST=resolve('qa-artifacts/approved-v5');await mkdir(DEST,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const results=[];
const overlap=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
try {
  for(const [width,height] of [[320,568],[390,844],[430,932],[864,1536],[1440,1000]]){
    const context=await browser.newContext({viewport:{width,height},isMobile:width<700,hasTouch:width<700,deviceScaleFactor:1,reducedMotion:'reduce'});
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(new URL(BASE).origin))errors.push('HTTP '+r.status()+' '+r.url());});
    await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:40000});
    await page.waitForFunction(()=>document.querySelector('#bootPlay')?.disabled===false,null,{timeout:40000});
    const splash=await page.evaluate(()=>{
      const boot=document.getElementById('bootSplash');
      return {
        background:getComputedStyle(boot).backgroundImage,
        playLabel:document.getElementById('bootPlay').getAttribute('aria-label'),
        artVisible:getComputedStyle(document.querySelector('.splash-art')).display,
        status:document.documentElement.dataset.boot
      };
    });
    assert(splash.background.includes('legend-master/splash-master.jpg'),'master splash missing');
    assert.equal(splash.artVisible,'none','old hero/dragon overlays visible');
    assert.equal(splash.playLabel,'ENTER LEGEND BALL X1000');
    await page.screenshot({path:resolve(DEST,'splash-'+width+'.png'),fullPage:false});
    await page.locator('#bootPlay').click({timeout:12000});
    await page.waitForFunction(()=>document.documentElement.dataset.boot==='entered',null,{timeout:15000});
    await page.waitForFunction(()=>[...document.querySelectorAll('.legend-master-control-image')].every(x=>x.complete&&x.naturalWidth>0),null,{timeout:12000});
    await page.waitForFunction(()=>document.querySelector('.legend-scene')?.classList.contains('legend-world-ready'),null,{timeout:15000});
    const model=await page.evaluate(()=>{
      const scene=document.querySelector('.legend-scene');
      const rect=id=>{let r=scene.querySelector('[data-layer="'+id+'"]')?.getBoundingClientRect();return r?r.toJSON():null;};
      return {
        imageSource:scene.querySelector('[data-layer=sky] img')?.src,
        squareMaster:Boolean(document.querySelector('link[href*="square-reels.css"]')),
        skyOpacity:Number(getComputedStyle(scene.querySelector('[data-layer=sky]')).opacity),
        frameSource:scene.querySelector('[data-layer=reelframe] img')?.src,
        spinSource:document.querySelector('#spin .spin-frame')?.src,
        menuImage:scene.querySelector('[data-layer=menubtn] img.legend-master-control-image')?.src,
        gameColumns:scene.querySelectorAll('.reel-column').length,
        cells:scene.querySelectorAll('.tile:not([aria-hidden="true"])').length,
        liveWin:document.getElementById('win').textContent,
        liveCredit:document.getElementById('credits').textContent,
        overflow:document.documentElement.scrollWidth-innerWidth,
        brokenImages:[...scene.querySelectorAll('img')].filter(img=>getComputedStyle(img).display!=='none'&&img.complete&&img.naturalWidth===0).map(img=>img.src),
        duplicateHeader:['guardian','dragon','logo'].filter(id=>getComputedStyle(scene.querySelector('[data-layer="'+id+'"]')).display!=='none'),
        rects:Object.fromEntries(['autobtn','spinbutton','turbobtn','menubtn','infobtn','reels'].map(id=>[id,rect(id)]))
      };
    });
    assert(model.imageSource.includes(model.squareMaster?'legend-master/gameplay-square-backdrop.webp':'legend-master/gameplay-backdrop.webp'),'wrong scene');
    assert(model.skyOpacity>.98,width+': approved gameplay hero was hidden under old lightning world');
    assert(model.frameSource.includes(model.squareMaster?'legend-master/reel-frame-square.png':'legend-master/reel-frame.png'),'wrong reel ornament');
    assert(model.spinSource.includes('legend-master/spin.png'),'wrong Spin art');
    assert(model.menuImage.includes('legend-master/menu.png'),'wrong footer art');
    assert.equal(model.gameColumns,6);
    assert.equal(model.cells,30);
    if(model.squareMaster){
      assert(Math.abs(model.rects.reels.width/model.rects.reels.height-1.2)<.03,width+': not a square-tile 6x5 reel');
    }
    assert.deepEqual(model.duplicateHeader,[],'legacy composite reappeared');
    assert.deepEqual(model.brokenImages,[],width+': broken images');
    assert(model.overflow<=2,width+': horizontal overflow');
    assert(model.rects.autobtn.right<model.rects.spinbutton.left,width+': Auto not left');
    assert(model.rects.turbobtn.left>model.rects.spinbutton.right,width+': Turbo not right');
    assert(overlap(model.rects.autobtn,model.rects.spinbutton)<1,'Auto overlaps Spin');
    assert(overlap(model.rects.spinbutton,model.rects.turbobtn)<1,'Turbo overlaps Spin');
    await page.screenshot({path:resolve(DEST,'game-'+width+'.png'),fullPage:false});
    if(width===390){
      await page.locator('#menu').click();
      assert(await page.locator('#menuDialog').evaluate(d=>d.open),'menu did not open');
      assert(await page.locator('#volumeRange').isVisible(),'volume must live inside Menu');
      await page.locator('#volumeRange').evaluate(el=>{el.value='45';el.dispatchEvent(new Event('input',{bubbles:true}));});
      assert.equal(await page.locator('#volumeValue').innerText(),'45%');
      await page.screenshot({path:resolve(DEST,'menu-volume-390.png'),fullPage:false});
      await page.locator('#closeMenu').click();
      await page.locator('#spin').click();
      await page.waitForFunction(()=>window.SlotGameTest?.getState().rounds===1&&!window.SlotGameTest?.getState().busy,null,{timeout:45000});
      const check=await page.evaluate(()=>{
        const state=window.SlotGameTest.getState();
        const exp=window.SlotGameMath.createEngine(window.SlotGameConfig,20261027).playRound({trace:true});
        return {win:state.last.round.winX,expected:exp.winX,balance:state.credits,expectedBalance:Math.round((100000-2+exp.winX*2)*100)/100};
      });
      assert.equal(check.win,check.expected);
      assert.equal(check.balance,check.expectedBalance);
      model.round=check;
    }
    assert.deepEqual(errors,[],width+': browser errors');
    results.push({width,height,status:splash.status,columns:model.gameColumns,cells:model.cells,overflow:model.overflow,round:model.round||null});
    await context.close();
  }
  await writeFile(resolve(DEST,'report.json'),JSON.stringify({url:BASE,results},null,2));
  console.log('PASS: exact JPEG splash, 5 responsive sizes, 6x5 live engine, interactive approved panels and seeded Spin');
} finally {await browser.close();}
