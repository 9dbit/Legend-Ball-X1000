import { chromium, webkit } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const base=process.env.LEGEND_URL||'http://127.0.0.1:3119';
await mkdir('qa-artifacts/legend-layered-splash',{recursive:true});
const cases=[
 [393,852,59,34,'iphone-notch-pwa'],[430,932,62,34,'iphone-large-pwa'],
 [360,800,24,24,'android-pwa'],[393,736,0,0,'iphone-browser'],
 [320,568,20,0,'compact-browser'],[844,390,0,0,'landscape']
];
for(const type of [chromium,webkit]){
 const browser=await type.launch({headless:true});
 try{
  for(const [width,height,safeTop,safeBottom,id] of cases){
   const ctx=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,
     deviceScaleFactor:2,reducedMotion:'reduce'});
   const page=await ctx.newPage(), errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'/play/',{waitUntil:'domcontentloaded'});
   await page.addStyleTag({content:`:root{--legend-test-safe-top:${safeTop}px;--legend-test-safe-bottom:${safeBottom}px}`});
   await page.locator('#bootPlay:not(:disabled)').waitFor({timeout:30000});
   await page.waitForFunction(()=>document.getElementById('bootSplash')?.classList.contains('layered-ready'),{timeout:30000});
   const state=await page.evaluate(()=>{
     const e=document.getElementById('legendLayeredStage'),s=document.getElementById('bootSplash');
     const btn=document.getElementById('bootPlay'),logo=e.querySelector('.legend-splash-logo');
     const rect=o=>o.getBoundingClientRect().toJSON();
     return {frame:rect(e),shell:rect(s),button:rect(btn),logo:rect(logo),
      opacity:getComputedStyle(e).opacity,visible:getComputedStyle(e).visibility,
      layers:[...e.querySelectorAll('img')].map(x=>({n:x.className,w:x.naturalWidth,h:x.naturalHeight,ok:x.complete,src:x.currentSrc})),
      documentOverflow:document.documentElement.scrollWidth>innerWidth+1};
   });
   assert.equal(state.opacity,'1','foreground never blank');
   assert.equal(state.visible,'visible');
   assert.equal(state.layers.length,6);
   assert(state.layers.every(x=>x.ok&&x.w===941&&x.h===2160),'source-aligned art assets');
   assert(!state.documentOverflow,'no horizontal scroll');
   if(width<height){
    assert(state.frame.x<=1&&state.frame.right>=width-1,'art covers screen width');
    assert(state.frame.y<=1&&state.frame.bottom>=height-1,'art covers screen height');
    assert(state.button.top>=safeTop+1,'ENTER below notch');
    assert(state.button.bottom<=height-safeBottom-1,'ENTER above home gesture');
    // Static logo sits below the status bar (content starts around y 0.16 of master).
    assert(state.frame.y+state.frame.height*.16>=safeTop,
      'logo content remains below the notch');
   }else{
    assert(state.button.top>=0&&state.button.bottom<=height,'landscape ENTER visible');
   }
   const hit=await page.evaluate(()=>{
     const b=document.querySelector('#bootPlay').getBoundingClientRect();
     const x=b.left+b.width/2,y=b.top+b.height/2;
     return document.elementFromPoint(x,y)?.id;
   });
   assert.equal(hit,'bootPlay','visual ENTER hitbox aligned');
   if(process.env.LEGEND_CAPTURE_SCREENSHOTS==='1')await page.screenshot({
     path:`qa-artifacts/legend-layered-splash/${type.name()}-${id}.png`});
   await page.locator('#bootPlay').click();
   await page.waitForFunction(()=>document.documentElement.dataset.boot==='entered',{timeout:30000});
   await page.waitForFunction(()=>document.getElementById('bootSplash').hidden,{timeout:3000});
   assert.deepEqual(errors,[]);
   console.log('PASS',type.name(),id,
       Math.round(state.frame.width)+'x'+Math.round(state.frame.height),'full-bleed');
   await ctx.close();
  }
 }finally{await browser.close();}
}
console.log('PASS full-bleed splash: browser / PWA / landscape, touch, and transition');
