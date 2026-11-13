import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.LEGEND_URL||'http://127.0.0.1:3118';
const output='qa-artifacts/unified-v12';await mkdir(output,{recursive:true});
const reports=[];
const inspectScene=()=>({codec:document.createElement('video').canPlayType('video/mp4; codecs="avc1.64001f"'),boot:document.documentElement.dataset.boot,hidden:document.hidden,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,battery:document.getElementById('batterySetting')?.checked,motion:window.LegendV10?.getMotionState(),layers:[...document.querySelectorAll('.legend-scene .legend-art')].map(el=>({id:el.dataset.layer,display:getComputedStyle(el).display,visibility:getComputedStyle(el).visibility,opacity:getComputedStyle(el).opacity,images:[...el.querySelectorAll('img')].map(img=>({src:img.src,complete:img.complete,width:img.naturalWidth,display:getComputedStyle(img).display,visibility:getComputedStyle(img).visibility,opacity:getComputedStyle(img).opacity}))}))});
for(const type of [chromium,webkit]){
 const browser=await type.launch({headless:true,...(type===chromium?{channel:'chrome'}:{})});
 try{
  for(const [width,height] of [[320,568],[390,844],[430,932],[1440,900]]){
   const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'/play/',{waitUntil:'domcontentloaded'});
   await page.locator('#bootPlay:not(:disabled)').waitFor();await page.locator('#bootPlay').click();
   await page.waitForFunction(()=>document.querySelector('.legend-scene')?.dataset.uiVersion==='unified-v10');
   await page.waitForFunction(()=>document.querySelector('.legend-scene')?.dataset.layoutVersion==='12');
   await page.waitForFunction(()=>[...document.querySelectorAll('.legend-scene img')].every(x=>x.complete));
   const info=await page.evaluate(()=>{
    const stage=document.querySelector('.legend-scene');const tile=stage.querySelector('.tile').getBoundingClientRect();
    return {viewport:[innerWidth,innerHeight],scene:stage.getBoundingClientRect().toJSON(),tile:[tile.width,tile.height],cells:stage.querySelectorAll('.tile:not([aria-hidden="true"])').length,broken:[...stage.querySelectorAll('img')].filter(x=>!x.naturalWidth).map(x=>x.src),overflow:document.documentElement.scrollWidth>innerWidth+1};
   });
   assert.equal(info.cells,30);assert(Math.abs(info.tile[0]-info.tile[1])<2);assert(!info.overflow);assert.deepEqual(info.broken,[]);assert.deepEqual(errors,[]);
   assert(info.scene.x>=-1&&info.scene.y>=-1&&info.scene.x+info.scene.width<=width+1&&info.scene.y+info.scene.height<=height+1,'Entire scene must fit the viewport');
   assert.equal(await page.locator('#sound').isVisible(),false);
   assert.equal(await page.locator('[data-layer="provider"]').isVisible(),false);
   const panel=await page.locator('[data-layer="betpanel"]').boundingBox();
   for(const id of ['minus','plus'])assert(await page.locator('#'+id).evaluate(el=>parseFloat(getComputedStyle(el,'::after').fontSize))>=18,'Bet symbols must remain legible');
   for(const id of ['minus','plus','betText']){
    const b=await page.locator('#'+id).boundingBox();
    assert(b&&b.x>=panel.x-1&&b.y>=panel.y-1&&b.x+b.width<=panel.x+panel.width+1&&b.y+b.height<=panel.y+panel.height+1,id+' must be inside Total Bet');
   }
   await page.evaluate(()=>Promise.all([...document.querySelectorAll('.legend-scene img')].map(img=>img.decode().catch(()=>{}))));
   await writeFile(`${output}/${type.name()}-${width}.json`,JSON.stringify(await page.evaluate(inspectScene),null,2));
   await page.screenshot({path:`${output}/${type.name()}-${width}.png`});
   if(width===390){
    const old=await page.locator('#betText').innerText();await page.locator('#plus').click();assert.notEqual(await page.locator('#betText').innerText(),old);await page.locator('#minus').click();assert.equal(await page.locator('#betText').innerText(),old);
    await page.locator('#menu').click();await page.locator('#volumeRange').press('Home');for(let step=0;step<10;step++)await page.locator('#volumeRange').press('ArrowRight');assert.equal(await page.locator('#volumeValue').innerText(),'50%');
    await page.locator('#soundSetting').uncheck();assert.equal(await page.locator('#soundSetting').isChecked(),false);await page.locator('#closeMenu').click();
    await page.locator('#menu').click();assert.equal(await page.locator('#volumeRange').inputValue(),'50');await page.locator('#closeMenu').click();
    await page.locator('#spin').click();await page.waitForFunction(()=>window.SlotGameTest?.getState().rounds===1&&!window.SlotGameTest?.getState().busy);assert.deepEqual(errors,[]);
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.waitForFunction(()=>{const a=window.LegendV10.getMotionState();return a.length===3&&a.every(v=>v.ready&&!v.paused);});
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.waitForFunction(()=>window.LegendV10.getMotionState().every(v=>v.paused&&!v.ready));
   }
   reports.push({browser:type.name(),...info});await page.close();
  }
  const motionContext=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference',recordVideo:{dir:output+'/motion',size:{width:390,height:844}}});
  const motionPage=await motionContext.newPage(),motionErrors=[];motionPage.on('pageerror',e=>motionErrors.push(e.message));
  const motionConsole=[];motionPage.on('console',m=>{if(m.type()==='warning'||m.type()==='error')motionConsole.push(m.text());});
  motionPage.on('requestfailed',r=>motionConsole.push(r.url()+': '+r.failure()?.errorText));
  await motionPage.goto(base+'/play/',{waitUntil:'domcontentloaded'});await motionPage.locator('#bootPlay:not(:disabled)').waitFor();await motionPage.locator('#bootPlay').click();
  try{await motionPage.waitForFunction(()=>{const a=window.LegendV10?.getMotionState();return a?.length===3&&a.every(v=>v.ready&&!v.paused&&v.duration>0);},{},{timeout:30000});}catch(error){
   const diagnostics={...await motionPage.evaluate(inspectScene),motionErrors,motionConsole};
   await writeFile(`${output}/${type.name()}-motion-failure.json`,JSON.stringify(diagnostics,null,2));console.error('MOTION_DIAGNOSTICS',JSON.stringify(diagnostics));
   await motionPage.screenshot({path:`${output}/${type.name()}-motion-failure.png`});await motionContext.close();throw error;
  }
  const motionBefore=await motionPage.evaluate(()=>window.LegendV10.getMotionState());
  await motionPage.waitForTimeout(6500);
  const motionAfter=await motionPage.evaluate(()=>window.LegendV10.getMotionState());
  for(const movie of motionAfter){assert(movie.loop&&!movie.paused&&!movie.error,movie.id);assert(movie.paintedFrames>motionBefore.find(v=>v.id===movie.id).paintedFrames+2,movie.id+' must render new video frames');assert(movie.duration>=4&&movie.duration<=6,movie.id+' duration');assert(Math.abs(movie.time-motionBefore.find(v=>v.id===movie.id).time)>.15,movie.id+' must advance across its loop');}
  await motionPage.screenshot({path:`${output}/${type.name()}-motion.png`});
  await motionPage.emulateMedia({reducedMotion:'reduce'});
  await motionPage.waitForFunction(()=>window.LegendV10.getMotionState().every(v=>v.paused&&!v.ready));
  assert.deepEqual(motionErrors,[]);reports.push({browser:type.name(),motionBefore,motionAfter,reducedMotionPaused:true});
  await motionPage.emulateMedia({reducedMotion:'no-preference'});
  await motionPage.waitForFunction(()=>window.LegendV10.getMotionState().every(v=>!v.paused&&v.ready));
  const resumed=await motionPage.evaluate(()=>window.LegendV10.getMotionState());
  await motionPage.waitForFunction(before=>window.LegendV10.getMotionState().every(v=>v.paintedFrames>before.find(b=>b.id===v.id).paintedFrames+2),resumed);
  await motionContext.close();
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/studio/universal/?game=legend-ball-x1000');
  await page.locator('iframe[title="Legend Ball shared game renderer"]').waitFor();
  const iframe=page.frameLocator('iframe[title="Legend Ball shared game renderer"]');
  await iframe.locator('.legend-scene[data-layout-version="12"]').waitFor();
  const before=await iframe.locator('[data-layer="logo"]').boundingBox();
  const input=page.getByLabel('X',{exact:true});const previous=Number(await input.inputValue());await input.fill(String(previous+12));await input.press('Tab');
  await page.waitForFunction(expected=>{const f=document.querySelector('iframe');const l=f?.contentDocument?.querySelector('[data-layer="logo"]');return l&&Math.abs(parseFloat(l.style.left)-expected)<.02;},(previous+12)/390*100);
  const after=await iframe.locator('[data-layer="logo"]').boundingBox();assert(after.x>before.x+6,'Universal Studio edits must move actual game layer');
  await iframe.locator('.legend-scene').evaluate(scene=>Promise.all([...scene.querySelectorAll('img')].map(img=>img.decode().catch(()=>{}))));
  await page.screenshot({path:`${output}/${type.name()}-universal-studio.png`});assert.deepEqual(errors,[]);
  const download=page.waitForEvent('download');await page.getByTitle('Export project JSON',{exact:true}).click();const file=await download;const path=await file.path();const fs=await import('node:fs/promises');const exported=JSON.parse(await fs.readFile(path));assert.equal(exported.schema,'skygate/studio-v0.3');assert.equal(exported.math.grid_columns,6);assert.equal(exported.math.grid_rows,5);assert.equal(exported.layers.find(x=>x.id==='logo').x,Math.round((previous+12)/390*1080*100)/100);await page.close();
 }catch(error){
  for(const [index,page] of browser.contexts().flatMap(c=>c.pages()).entries()){
   const state=await page.evaluate(inspectScene).catch(e=>({error:e.message}));console.error('BROWSER_FAILURE',type.name(),JSON.stringify(state));
   await writeFile(`${output}/${type.name()}-failure-${index}.json`,JSON.stringify(state,null,2));
   await page.screenshot({path:`${output}/${type.name()}-failure-${index}.png`}).catch(()=>{});
  }
  throw error;
 }finally{await writeFile(output+'/report.json',JSON.stringify(reports,null,2));await browser.close();}
}
await writeFile(output+'/report.json',JSON.stringify(reports,null,2));console.log('PASS V12 Google Chrome + WebKit 320/390/430/1440, unified Total Bet, menu audio, spin, native Universal Studio preview/edit/export');
