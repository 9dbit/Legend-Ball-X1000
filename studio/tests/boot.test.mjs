import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const code=readFileSync(new URL('../../play/boot.js',import.meta.url),'utf8');
function fixture(preview=false,ImageClass=class{decode(){return Promise.resolve()}}){
  let timeout,cleared=false,reloaded=false,focused=false;
  const nodes=Object.fromEntries(['bootSplash','bootPlay','bootRetry','bootStatus','bootProgress','gameStyles','spin'].map(id=>[id,{hidden:id==='bootRetry',disabled:id==='bootPlay',sheet:{},addEventListener(k,fn){this[k]=fn},focus(){focused=true}}]));
  const game={inert:true},root={dataset:{boot:'loading'}};
  const window={SkygatePreview:preview,location:{reload(){reloaded=true}}};
  vm.runInNewContext(code,{window,document:{documentElement:root,getElementById:id=>nodes[id],querySelector:()=>game,fonts:{ready:Promise.resolve()}},Image:ImageClass,setTimeout:(fn,ms)=>(ms===30000&&(timeout=fn),ms||1),clearTimeout:()=>{cleared=true},console:{error(){}}});
  return {window,nodes,game,root,expire:()=>timeout(),get cleared(){return cleared},get reloaded(){return reloaded},get focused(){return focused}};
}
test('Play cannot reveal game until decoding finishes; entry is explicit and inert is removed',async()=>{
 const f=fixture();let decode;const pending=new Promise(r=>decode=r);
 const ready=f.window.SkygateBoot.ready([{src:'critical.png',decode:()=>pending}]);
 f.nodes.bootPlay.click();assert.equal(f.root.dataset.boot,'loading');assert(f.game.inert);
 decode();await ready;assert.equal(f.root.dataset.boot,'ready');assert(!f.nodes.bootPlay.disabled);assert(f.game.inert);assert(f.cleared);
 f.nodes.bootPlay.click();assert.equal(f.root.dataset.boot,'entered');assert(f.nodes.bootSplash.hidden);assert(!f.game.inert);assert(f.focused);
});
test('broken optional decorative images do not block an initialized game or need a retry',async()=>{
 const f=fixture();await f.window.SkygateBoot.ready([{src:'decorative.png',decode:()=>Promise.reject(Error('missing optional art'))}]);
 assert.equal(f.root.dataset.boot,'ready');assert(f.game.inert);assert(f.nodes.bootRetry.hidden);assert(!f.nodes.bootPlay.disabled);
 f.nodes.bootPlay.click();assert.equal(f.root.dataset.boot,'entered');assert(!f.game.inert);
});
test('watchdog failure cannot be reversed by late success, and CSS failure blocks entry',async()=>{
 const f=fixture();let decode;const ready=f.window.SkygateBoot.ready([{src:'critical.png',decode:()=>new Promise(r=>decode=r)}]);
 f.expire();decode();await assert.rejects(ready,/expired/);assert.equal(f.root.dataset.boot,'error');assert(f.game.inert);
 const css=fixture();css.nodes.gameStyles.sheet=null;await assert.rejects(css.window.SkygateBoot.ready([]),/stylesheet/);
});
test('Studio preview enters automatically only after successful decoding',async()=>{
 const f=fixture(true);await f.window.SkygateBoot.ready([]);assert.equal(f.root.dataset.boot,'entered');assert(!f.game.inert);assert(!f.focused);
});

test('first-paint filter skips hidden reel bank, FX overlays and unpublished layers',()=>{
 const f=fixture();
 const element=(kind)=>({
  matches:()=>kind==='fx',
  closest:selector=>selector==='.tile[aria-hidden="true"]'?(kind==='offscreen'?{}:null):
   selector==='.published-layer'?(kind==='hidden'?{style:{display:'none'}}:{style:{display:''}}):null
 });
 const live=element('live'), fx=element('fx'), offscreen=element('offscreen'), hidden=element('hidden');
 assert.deepEqual(f.window.SkygateBoot.critical([fx,live,offscreen,hidden]),[live]);
});
test('optional textures that never decode do not block loading or expose the legacy game',async()=>{
 const f=fixture(false,class{decode(){return new Promise(()=>{});}});
 await f.window.SkygateBoot.ready([{src:'critical.png',decode:()=>Promise.resolve()}],['optional-texture.png']);
 assert.equal(f.root.dataset.boot,'ready');assert(f.game.inert);assert(!f.nodes.bootPlay.disabled);
});
