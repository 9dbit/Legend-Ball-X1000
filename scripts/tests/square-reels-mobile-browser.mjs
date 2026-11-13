import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const BASE=process.env.LEGEND_URL||'http://127.0.0.1:3107/play/?square=v6';
const browserName=process.env.LEGEND_BROWSER==='webkit'?'webkit':'chromium';
const DEST=resolve('qa-artifacts/square-reels-v6-'+browserName);
await mkdir(DEST,{recursive:true});
const b=await (browserName==='webkit'?webkit:chromium).launch(browserName==='webkit'?{headless:true}:{headless:true,args:['--no-sandbox']});
const reports=[];
try {
  for(const [width,height] of [[320,568],[390,844],[430,932],[864,1536]]){
    const context=await b.newContext({viewport:{width,height},isMobile:width<700,hasTouch:width<700,deviceScaleFactor:1,reducedMotion:'reduce'});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(new URL(BASE).origin))errors.push(r.status()+' '+r.url())});
    await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:45000});
    await page.waitForFunction(()=>document.querySelector('#bootPlay')?.disabled===false,null,{timeout:45000});
    await page.locator('#bootPlay').click({timeout:12000});
    await page.waitForFunction(()=>document.documentElement.dataset.boot==='entered',null,{timeout:20000});
    await page.waitForFunction(()=>document.querySelectorAll('.legend-scene .reel-column').length===6,null,{timeout:15000});
    await page.waitForTimeout(450);
    const data=await page.evaluate(()=>{
      const scene=document.querySelector('.legend-scene');
      const layer=id=>scene.querySelector('[data-layer="'+id+'"]');
      const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,top:r.top,left:r.left}};
      const rr=id=>rect(layer(id));
      const tile=rect(scene.querySelector('.reel-column .tile:not([aria-hidden="true"])'));
      const panelData={};
      for(const id of ['buybtn','antebtn','credits','betlabel']){
        const outer=rect(layer(id)),body=rect(layer(id).querySelector(id==='buybtn'||id==='antebtn'?'span':'strong'));
        panelData[id]={outer,body,contained:body.left>=outer.left-1&&body.right<=outer.right+1&&body.top>=outer.top-1&&body.bottom<=outer.bottom+1};
      }
      const pngs=[...scene.querySelectorAll('.legend-master-control-image')].map(el=>el.src);
      return {
        reels:rr('reels'),reelframe:rr('reelframe'),feature:rr('buybtn'),
        spin:rr('spinbutton'),tile,columns:scene.querySelectorAll('.reel-column').length,
        liveCells:scene.querySelectorAll('.tile:not([aria-hidden="true"])').length,
        panelData,svgButtonCount:scene.querySelectorAll('button svg').length,
        pngs,skySrc:scene.querySelector('[data-layer=sky] img').src,
        frameSrc:scene.querySelector('[data-layer=reelframe] img').src,
        broken:[...scene.querySelectorAll('img')].filter(img=>getComputedStyle(img).display!=='none'&&img.complete&&!img.naturalWidth).map(el=>el.src),
        overflow:document.documentElement.scrollWidth-innerWidth,
        currentCredit:document.getElementById('credits').textContent,
        win:document.getElementById('win').textContent
      };
    });
    assert.equal(data.columns,6);
    assert.equal(data.liveCells,30);
    assert(Math.abs(data.tile.width/data.tile.height-1)<.03, width+': tile is not square '+JSON.stringify(data.tile));
    assert(Math.abs(data.reels.width/data.reels.height-1.2)<.03, width+': board ratio not 6:5');
    assert(data.feature.top>data.reelframe.bottom-3,width+': buy panel overlaps frame');
    assert(data.spin.width>0&&Math.abs(data.spin.width/data.spin.height-1)<.02);
    assert(data.skySrc.includes('gameplay-square-backdrop.webp'));
    assert(data.frameSrc.includes('reel-frame-square.png'));
    assert.equal(data.svgButtonCount,0);
    assert.equal(data.pngs.length,4);
    assert.deepEqual(data.broken,[]);
    assert(data.overflow<=2,width+': horizontal overflow '+data.overflow);
    for(const [name,panel] of Object.entries(data.panelData))assert(panel.contained,width+': '+name+' content out of panel');
    assert.deepEqual(errors,[],width+': JS/network errors');
    await page.screenshot({path:resolve(DEST,'game-'+width+'.png')});
    if(width===390){
      const old=await page.locator('#betText').textContent();
      await page.locator('#plus').click();
      const changed=await page.locator('#betText').textContent();
      assert.notEqual(changed,old,'plus button not interactive');
      await page.locator('#minus').click();
      assert.equal(await page.locator('#betText').textContent(),old,'minus button not interactive');
      const before=await page.locator('#credits').textContent();
      await page.locator('#spin').click();
      await page.waitForFunction((previous)=>!document.querySelector('#spin').disabled&&document.querySelector('#credits').textContent!==previous,before,{timeout:35000});
      const after=await page.locator('#credits').textContent();
      assert.notEqual(after,before,'spin/wallet did not work');
      await page.screenshot({path:resolve(DEST,'after-spin-390.png')});
      data.interactions={plus:true,minus:true,spin:true};
    }
    reports.push({viewport:[width,height],tile:data.tile,reels:data.reels,
      imageCount:data.pngs.length,panelBoundsOk:true,svgButtons:0,errors});
    await context.close();
  }
  await writeFile(resolve(DEST,'summary.json'),JSON.stringify(reports,null,2));
  console.log('PASS 6x5 square reels, raster-only controls, panels, spin and wallet',JSON.stringify(reports));
}finally{await b.close()}