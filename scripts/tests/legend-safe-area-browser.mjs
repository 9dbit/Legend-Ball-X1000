import { chromium, webkit } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const base = process.env.LEGEND_URL || 'http://127.0.0.1:3119';
const output = 'qa-artifacts/legend-safe-area';
await mkdir(output, { recursive: true });
const cases = [
  [320,568,20,0,'small-iphone'],
  [375,667,20,0,'iphone-se'],
  [390,844,0,0,'mobile-safari'],
  [393,852,59,34,'iphone-notch-pwa'],
  [430,932,62,34,'iphone-large-pwa'],
  [360,800,24,24,'android-webview'],
  [412,915,24,24,'android-pwa'],
  [709,1536,62,34,'tall-device'],
  [844,390,0,0,'mobile-landscape'],
  [915,412,0,0,'android-landscape']
];
const report = [];
for (const engine of (process.env.LEGEND_BROWSER==='webkit'?[webkit]:process.env.LEGEND_BROWSER==='chromium'?[chromium]:[chromium,webkit])) {
 const browser = await engine.launch({headless:true,...(engine===chromium?{channel:'chrome'}:{})});
 try {
  for (const [width,height,safeTop,safeBottom,id] of cases.filter(c=>!process.env.LEGEND_CASE||c[4]===process.env.LEGEND_CASE)) {
   const context = await browser.newContext({viewport:{width,height},deviceScaleFactor:2,isMobile:true,hasTouch:true,reducedMotion:'reduce'});
   await context.addInitScript(() => {
     Object.defineProperty(navigator,'standalone',{configurable:true,value:true});
   });
   const page = await context.newPage(), errors = [];
   page.on('pageerror',error=>errors.push(error.message));
   await page.goto(base+'/play/',{waitUntil:'domcontentloaded'});
   await page.addStyleTag({content:':root{--legend-test-safe-top:'+safeTop+'px;--legend-test-safe-bottom:'+safeBottom+'px;}'});
   await page.locator('#bootPlay:not(:disabled)').waitFor({timeout:30000});
   const splash = await page.evaluate(()=>{
     const outer=document.querySelector('#bootSplash'),frame=outer.querySelector('.splash-footer'),hit=outer.querySelector('#bootPlay');
     const f=frame.getBoundingClientRect(),b=hit.getBoundingClientRect(),v=outer.getBoundingClientRect(),art=getComputedStyle(outer,'::before');
     return {viewport:[innerWidth,innerHeight],safeHeight:getComputedStyle(outer).getPropertyValue('--legend-device-height').trim(),
      frame:f.toJSON(),button:b.toJSON(),shell:v.toJSON(),art:{width:art.width,height:art.height,backgroundImage:art.backgroundImage},
      splashHeight:getComputedStyle(outer).height,overflow:document.documentElement.scrollWidth>innerWidth+1};
   });
   assert(!splash.overflow,id+' splash horizontal overflow');
   assert(splash.frame.width>0&&splash.frame.height>0,id+' visible frame');
   assert(Math.abs(splash.frame.width*16/9-splash.frame.height)<2,id+' splash aspect ratio');
   assert(splash.frame.y>=safeTop+5,id+' logo image starts below safe top: '+JSON.stringify(splash));
   assert(splash.frame.bottom<=height-safeBottom-5,id+' splash below bottom safe area');
   assert(splash.frame.x>=-1&&splash.frame.right<=width+1,id+' splash horizontal bounds');
   assert(splash.button.x>=splash.frame.x&&splash.button.right<=splash.frame.right,id+' button horizontal bounds');
   assert(splash.button.y>=splash.frame.y&&splash.button.bottom<=splash.frame.bottom,id+' button vertical bounds');
   assert(Math.abs(parseFloat(splash.art.width)-splash.frame.width)<1,id+' art and button frame share width');
   if(process.env.LEGEND_CAPTURE_SCREENSHOTS==='1')await page.screenshot({path:output+'/'+engine.name()+'-'+id+'-splash.png'});
   await page.locator('#bootPlay').click();
   await page.locator('.legend-scene[data-layout-version="12"]').waitFor({timeout:30000});
   const game=await page.evaluate(()=>{
     const stage=document.querySelector('.legend-scene'),g=document.querySelector('.game'),
       e=stage.getBoundingClientRect(),b=g.getBoundingClientRect(),spin=document.querySelector('[data-layer="spinbutton"]')?.getBoundingClientRect();
     return {stage:e.toJSON(),game:b.toJSON(),spin:spin?.toJSON(),overflow:document.documentElement.scrollWidth>innerWidth+1,
       topStyle:getComputedStyle(stage).top,widthStyle:getComputedStyle(stage).width};
   });
   if(process.env.LEGEND_DEBUG==='1')console.log('CASE_BOUNDS',engine.name(),id,JSON.stringify({splash,game}));
   assert(!game.overflow,id+' game horizontal overflow');
   assert(game.stage.y>=safeTop+5,id+' game scene below safe top');
   assert(game.stage.bottom<=height-safeBottom-5,id+' game scene above bottom safe');
   assert(game.stage.x>=-1&&game.stage.right<=width+1,id+' game scene horizontal bounds');
   assert(game.spin&&game.spin.top>=game.stage.top&&game.spin.bottom<=game.stage.bottom+1,id+' spin inside scene');
   assert.deepEqual(errors,[],id+' JavaScript console errors');
   if(process.env.LEGEND_CAPTURE_SCREENSHOTS==='1')await page.screenshot({path:output+'/'+engine.name()+'-'+id+'-game.png'});
   report.push({browser:engine.name(),id,width,height,safeTop,safeBottom,splash,game});
   await context.close();
  }
 } finally { await browser.close(); }
}
await writeFile(output+'/report.json',JSON.stringify(report,null,2));
console.log('PASS SAFE AREA '+report.length+' device/browser cases: splash artwork, ENTER target, game scene, spin bounds, no overflow');
