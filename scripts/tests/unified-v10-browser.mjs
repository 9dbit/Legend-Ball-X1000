import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.LEGEND_URL||'http://127.0.0.1:3118';
const output='qa-artifacts/unified-v12';await mkdir(output,{recursive:true});
const reports=[];
const inspectScene=()=>({codec:document.createElement('video').canPlayType('video/mp4; codecs="avc1.64001f"'),boot:document.documentElement.dataset.boot,hidden:document.hidden,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,battery:document.getElementById('batterySetting')?.checked,motion:window.LegendV10?.getMotionState(),layers:[...document.querySelectorAll('.legend-scene .legend-art')].map(el=>({id:el.dataset.layer,display:getComputedStyle(el).display,visibility:getComputedStyle(el).visibility,opacity:getComputedStyle(el).opacity,images:[...el.querySelectorAll('img')].map(img=>({src:img.src,complete:img.complete,width:img.naturalWidth,display:getComputedStyle(img).display,visibility:getComputedStyle(img).visibility,opacity:getComputedStyle(img).opacity}))}))});
for(const type of (process.env.LEGEND_BROWSER==='chromium'?[chromium]:[chromium,webkit])){
 const browser=await type.launch({headless:true,...(type===chromium?(process.env.LEGEND_CHROMIUM_PATH?{executablePath:process.env.LEGEND_CHROMIUM_PATH}:{channel:'chrome'}):{})});
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
   const hud=await page.evaluate(()=>{
    const box=id=>document.querySelector(`[data-layer="${id}"]`).getBoundingClientRect().toJSON();
    const stage=document.querySelector('.legend-scene').getBoundingClientRect();
    const boxes=Object.fromEntries(['buybtn','antebtn','creditpanel','betpanel','logo','spinbutton'].map(id=>[id,box(id)]));
    const text=[['buybtn','#buyFeature > span'],['antebtn','#anteFeature > span'],['creditpanel','.legend-credits'],['betpanel','.legend-betlabel']].map(([id,selector])=>{const el=document.querySelector(selector);return {id,box:el.getBoundingClientRect().toJSON(),overflow:el.scrollWidth>el.clientWidth+1||el.scrollHeight>el.clientHeight+1};});
    const skins=[['creditpanel','img',940,242,39,23,903,215],['betpanel','img',940,226,40,14,897,200],['buybtn','.feature',940,282,22,43,910,262],['antebtn','.feature',940,252,19,18,912,228]].map(([id,selector,w,h,x1,y1,x2,y2])=>{
     const parent=document.querySelector(`[data-layer="${id}"]`),el=parent.querySelector(selector),s=getComputedStyle(el,selector==='.feature'?'::after':null),origin=(selector==='.feature'?el:parent).getBoundingClientRect(),ew=parseFloat(s.width),eh=parseFloat(s.height);
     return {id,x:origin.x+parseFloat(s.left)+ew*x1/w,y:origin.y+parseFloat(s.top)+eh*y1/h,width:ew*(x2-x1)/w,height:eh*(y2-y1)/h};
    });
    const plain=['minus','plus'].map(id=>{const s=getComputedStyle(document.getElementById(id));return {id,border:parseFloat(s.borderTopWidth),background:s.backgroundImage,color:s.backgroundColor,shadow:s.boxShadow};});
    return {boxes,text,skins,plain,stage:stage.toJSON(),spin:document.getElementById('spin').getBoundingClientRect().toJSON(),sprite:document.querySelector('#spin .spin-frame').getBoundingClientRect().toJSON()};
   });
   for(const id of ['antebtn','creditpanel','betpanel']){assert(Math.abs(hud.boxes[id].width-hud.boxes.buybtn.width)<1,id+' equal width');assert(Math.abs(hud.boxes[id].height-hud.boxes.buybtn.height)<1,id+' equal height');}
   for(const [a,b,axis] of [['buybtn','antebtn','y'],['creditpanel','betpanel','y'],['buybtn','creditpanel','x'],['antebtn','betpanel','x']])assert(Math.abs(hud.boxes[a][axis]-hud.boxes[b][axis])<1,'HUD alignment');
   for(const s of hud.skins)for(const k of ['x','y','width','height'])assert(Math.abs(s[k]-hud.boxes[s.id][k])<1,s.id+' visible skin '+k+' must match its panel');
   await writeFile(`${output}/${type.name()}-${width}-hud.json`,JSON.stringify(hud,null,2));
   for(const t of hud.text){const p=hud.boxes[t.id];assert(!t.overflow,t.id+' complete HUD text must fit');assert(t.box.x>=p.x+2&&t.box.y>=p.y+2&&t.box.x+t.box.width<=p.x+p.width-2&&t.box.y+t.box.height<=p.y+p.height-2,t.id+' text must stay inside its frame');}
   for(const p of hud.plain){assert.equal(p.border,0);assert.equal(p.background,'none');assert.equal(p.color,'rgba(0, 0, 0, 0)');assert.equal(p.shadow,'none');}
   assert(Math.abs(hud.boxes.logo.x+hud.boxes.logo.width/2-hud.stage.x-hud.stage.width/2)<1,'Logo centered on page');
   assert(Math.abs(hud.sprite.width/hud.stage.width*1080-312)<1&&Math.abs(hud.sprite.height/hud.stage.width*1080-286)<1,'SPIN artwork exactly 30% larger');
   assert(hud.spin.y>=hud.boxes.betpanel.y+hud.boxes.betpanel.height-1,'SPIN touch target must clear HUD');
   assert(hud.boxes.spinbutton.y+hud.boxes.spinbutton.height<=hud.stage.y+hud.stage.height+1,'SPIN stays within scene');
   info.hud=hud;
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
  for(const id of ['guardian','dragon'])assert.equal(await motionPage.locator(`[data-layer="${id}"] > img`).evaluate(img=>getComputedStyle(img).visibility),'hidden','Playing character must replace its poster');
  await motionPage.locator('#spin').click();
  await motionPage.locator('#reels.rolling').waitFor();
  const spinning=await motionPage.evaluate(()=>({filters:[...document.querySelectorAll('#reels .symbol')].map(el=>getComputedStyle(el).filter),streaks:[...document.querySelectorAll('#reels .reel-column')].map(el=>getComputedStyle(el,'::after').display)}));
  assert(spinning.filters.every(f=>f==='none'),'Spinning symbols must remain sharp');
  assert(spinning.streaks.every(s=>s==='none'),'No speed-streak overlay while spinning');
  await motionPage.screenshot({path:`${output}/${type.name()}-spinning.png`});
  await motionPage.waitForFunction(()=>window.SlotGameTest?.getState().rounds===1&&!window.SlotGameTest?.getState().busy);
  const motionBefore=await motionPage.evaluate(()=>window.LegendV10.getMotionState());
  await motionPage.waitForTimeout(6500);
  const motionAfter=await motionPage.evaluate(()=>window.LegendV10.getMotionState());
  for(const movie of motionAfter){assert(movie.loop&&!movie.paused&&!movie.error,movie.id);assert(movie.paintedFrames>motionBefore.find(v=>v.id===movie.id).paintedFrames+2,movie.id+' must render new video frames');assert(movie.duration>=4&&movie.duration<=6,movie.id+' duration');assert(Math.abs(movie.time-motionBefore.find(v=>v.id===movie.id).time)>.15,movie.id+' must advance across its loop');}
  await motionPage.screenshot({path:`${output}/${type.name()}-motion.png`});
  await motionPage.emulateMedia({reducedMotion:'reduce'});
  await motionPage.waitForFunction(()=>window.LegendV10.getMotionState().every(v=>v.paused&&!v.ready));
  for(const id of ['guardian','dragon'])assert.equal(await motionPage.locator(`[data-layer="${id}"] > img`).evaluate(img=>getComputedStyle(img).visibility),'visible','Paused character must restore its poster');
  assert.deepEqual(motionErrors,[]);reports.push({browser:type.name(),motionBefore,motionAfter,reducedMotionPaused:true});
  await motionPage.emulateMedia({reducedMotion:'no-preference'});
  await motionPage.waitForFunction(()=>window.LegendV10.getMotionState().every(v=>!v.paused&&v.ready));
  const resumed=await motionPage.evaluate(()=>window.LegendV10.getMotionState());
  await motionPage.waitForFunction(before=>window.LegendV10.getMotionState().every(v=>v.paintedFrames>before.find(b=>b.id===v.id).paintedFrames+2),resumed);
  const gameBefore=await motionPage.evaluate(()=>{const {credits,bet,rounds,spent,paid}=window.SlotGameTest.getState();return {credits,bet,rounds,spent,paid};});
  const lifecycle=[];
  for(let cycle=0;cycle<3;cycle++){
   const before=await motionPage.evaluate(()=>window.LegendV10.getMotionState());
   await motionPage.evaluate(()=>{
    Object.defineProperty(document,'hidden',{configurable:true,value:true});
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));
    document.dispatchEvent(new Event('freeze'));
   });
   await motionPage.waitForFunction(()=>window.LegendV10.getMotionState().every(v=>v.paused&&!v.ready));
   if(cycle<2){
    assert(await motionPage.evaluate(()=>{
     window.__lostContexts=[...document.querySelectorAll('canvas.legend-motion')].map(c=>c.getContext('webgl').getExtension('WEBGL_lose_context'));
     if(window.__lostContexts.some(e=>!e))return false;
     for(const ext of window.__lostContexts)ext.loseContext();return true;
    }),'Context-loss extension must be available for recovery regression');
    await motionPage.waitForFunction(()=>window.LegendV10.getMotionState().every(v=>v.contextLost&&v.connected&&!v.ready));
    for(const id of ['guardian','dragon'])assert.equal(await motionPage.locator(`[data-layer="${id}"] > img`).evaluate(img=>getComputedStyle(img).visibility),'visible','Lost GPU restores poster');
    if(cycle===0){
     await motionPage.evaluate(()=>window.__lostContexts.forEach(ext=>ext.restoreContext()));
     await motionPage.waitForFunction(before=>window.LegendV10.getMotionState().every(v=>!v.contextLost&&v.restores>before.find(b=>b.id===v.id).restores&&v.paused&&!v.ready),before);
    }
   }
   await motionPage.evaluate(()=>{
    delete document.hidden;
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));
    document.dispatchEvent(new Event('resume'));
    window.dispatchEvent(new Event('focus'));
   });
   if(cycle===1)await motionPage.evaluate(()=>window.__lostContexts.forEach(ext=>ext.restoreContext()));
   await motionPage.waitForFunction(before=>window.LegendV10.getMotionState().every(v=>v.connected&&v.ready&&!v.paused&&!v.contextLost&&v.paintedFrames>before.find(b=>b.id===v.id).paintedFrames+3),before,{timeout:20000});
   lifecycle.push(await motionPage.evaluate(()=>window.LegendV10.getMotionState()));
  }
  // A stuck decoder may keep playing without delivering a frame. Verify the
  // watchdog reloads only the media and recovers without a click or game reset.
  const beforeStall=await motionPage.evaluate(()=>window.LegendV10.getMotionState());
  await motionPage.evaluate(()=>{
   for(const video of document.querySelectorAll('video.legend-motion-source')){
    const requestFrame=video.requestVideoFrameCallback,load=video.load;
    // Stall frame delivery, including native loop restarts in WebKit.
    video.requestVideoFrameCallback=function(){return requestFrame.call(this,()=>{});};
    video.load=function(){this.requestVideoFrameCallback=requestFrame;this.load=load;return load.call(this);};
   }
  });
  await motionPage.waitForFunction(before=>window.LegendV10.getMotionState().every(v=>v.ready&&!v.paused&&v.reloads>before.find(b=>b.id===v.id).reloads&&v.paintedFrames>before.find(b=>b.id===v.id).paintedFrames+3),beforeStall,{timeout:20000});
  const recovered=await motionPage.evaluate(()=>window.LegendV10.getMotionState());
  // Browser autoplay rejection remains recoverable through the next normal tap.
  await motionPage.evaluate(()=>{
   window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));
   const video=document.querySelector('video.legend-motion-source'),play=video.play;
   video.play=()=>Promise.reject(new DOMException('Gesture required','NotAllowedError'));
   video.__restorePlay=()=>{video.play=play;};
   window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));
  });
  await motionPage.waitForFunction(()=>window.LegendV10.getMotionState().some(v=>v.needsGesture));
  await motionPage.evaluate(()=>document.querySelector('video.legend-motion-source').__restorePlay());
  await motionPage.mouse.click(3,3);
  await motionPage.waitForFunction(()=>window.LegendV10.getMotionState().every(v=>v.ready&&!v.paused&&!v.needsGesture));
  const gameAfter=await motionPage.evaluate(()=>{const {credits,bet,rounds,spent,paid}=window.SlotGameTest.getState();return {credits,bet,rounds,spent,paid};});
  assert.deepEqual(gameAfter,gameBefore,'Animation recovery must not change credits or start a round');
  const energyBounds=[];
  for(const [width,height] of [[320,568],[390,844],[430,932],[1440,900]]){
   await motionPage.setViewportSize({width,height});
   const bounds=await motionPage.evaluate(()=>({
    stage:document.querySelector('.legend-scene').getBoundingClientRect().toJSON(),
    energy:document.querySelector('[data-layer="spinbutton"] .legend-motion').getBoundingClientRect().toJSON()
   }));
   const {stage,energy}=bounds;
   assert(energy.x>=stage.x&&energy.y>=stage.y&&energy.right<=stage.right&&energy.bottom<=stage.bottom-2,'Full SPIN energy canvas must fit with bottom clearance');
   energyBounds.push({width,height,...bounds});
  }
  await motionPage.setViewportSize({width:390,height:844});
  await motionPage.screenshot({path:`${output}/${type.name()}-resumed.png`});
  assert.deepEqual(motionErrors,[]);
  reports.push({browser:type.name(),lifecycle,recovered,energyBounds,gamePreserved:true});
  await motionContext.close();
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/studio/universal/?game=legend-ball-x1000');
  await page.locator('iframe[title="Legend Ball shared game renderer"]').waitFor();
  const iframe=page.frameLocator('iframe[title="Legend Ball shared game renderer"]');
  await iframe.locator('.legend-scene[data-layout-version="12"]').waitFor();
  await page.evaluate(()=>{window.__legendMessages=[];const child=document.querySelector('iframe').contentWindow;child.addEventListener('message',e=>window.__legendMessages.push({type:e.data?.type,origin:e.origin,parentMatches:e.source===window,x:e.data?.layers?.find(l=>l.id==='logo')?.x}));child.addEventListener('error',e=>window.__legendMessages.push({error:e.message}));});
  const before=await iframe.locator('[data-layer="logo"]').boundingBox();
  const input=page.getByLabel('X',{exact:true});const previous=Number(await input.inputValue());await input.fill(String(previous+12));await input.press('Tab');
  await page.waitForFunction(expected=>{const f=document.querySelector('iframe');const doc=f?.contentDocument,l=doc?.querySelector('[data-layer="logo"]'),scene=doc?.querySelector('.legend-scene');return l&&scene&&Math.abs(l.getBoundingClientRect().x-scene.getBoundingClientRect().x-expected*scene.getBoundingClientRect().width)<1;},(previous+12)/390);
  const after=await iframe.locator('[data-layer="logo"]').boundingBox();assert(after.x>before.x+6,'Universal Studio edits must move actual game layer');
  assert(await page.evaluate(()=>window.__legendMessages.some(e=>e.type==='legend-layout-update'&&e.parentMatches===true)),'Studio messages must retain the parent sender identity');
  await iframe.locator('.legend-scene').evaluate(scene=>Promise.all([...scene.querySelectorAll('img')].map(img=>img.decode().catch(()=>{}))));
  await page.screenshot({path:`${output}/${type.name()}-universal-studio.png`});assert.deepEqual(errors,[]);
  const download=page.waitForEvent('download');await page.getByTitle('Export project JSON',{exact:true}).click();const file=await download;const path=await file.path();const fs=await import('node:fs/promises');const exported=JSON.parse(await fs.readFile(path));assert.equal(exported.schema,'skygate/studio-v0.3');assert.equal(exported.math.grid_columns,6);assert.equal(exported.math.grid_rows,5);assert.equal(exported.layers.find(x=>x.id==='logo').x,Math.round((previous+12)/390*1080*100)/100);await page.close();
 }catch(error){
  for(const [index,page] of browser.contexts().flatMap(c=>c.pages()).entries()){
   const state=await page.evaluate(inspectScene).catch(e=>({error:e.message}));state.studio=await page.evaluate(()=>({messages:window.__legendMessages,storedLogo:JSON.parse(localStorage.getItem('universal-legend-layout-v12')||'null')?.layers?.find(l=>l.id==='logo'),inputs:[...document.querySelectorAll('input[type=number]')].map(i=>({value:i.value,step:i.step,valid:i.validity.valid}))}));state.frames=await Promise.all(page.frames().filter(f=>f!==page.mainFrame()).map(f=>f.evaluate(()=>{const l=document.querySelector('[data-layer="logo"]');return {logoStyle:l?.getAttribute('style'),logoBox:l?.getBoundingClientRect().toJSON(),projectX:window.LegendV10?.getProject()?.layers.find(x=>x.id==='logo')?.x};}).catch(e=>({error:e.message}))));console.error('BROWSER_FAILURE',type.name(),JSON.stringify(state));
   await writeFile(`${output}/${type.name()}-failure-${index}.json`,JSON.stringify(state,null,2));
   await page.screenshot({path:`${output}/${type.name()}-failure-${index}.png`}).catch(()=>{});
  }
  throw error;
 }finally{await writeFile(output+'/report.json',JSON.stringify(reports,null,2));await browser.close();}
}
await writeFile(output+'/report.json',JSON.stringify(reports,null,2));console.log('PASS V12 Chrome + WebKit responsive HUD, complete energy bounds, repeated lifecycle/GPU/decoder/gesture recovery, unchanged game state, Universal Studio edit/export');
