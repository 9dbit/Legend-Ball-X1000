import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const code=readFileSync(new URL('../../play/boot.js',import.meta.url),'utf8');

function fixture({preview=false,ImageClass=class{decode(){return Promise.resolve()}},fontsReady=Promise.resolve()}={}){
  const timers=new Map();let nextTimer=0,reloaded=false,focused=false;
  const nodes=Object.fromEntries(['bootSplash','bootPlay','bootRetry','bootStatus','bootProgress','gameStyles','spin'].map(id=>[id,{
    hidden:id==='bootRetry',disabled:id==='bootPlay',sheet:{},
    addEventListener(k,fn){this[k]=fn},focus(){focused=true}
  }]));
  const game={inert:true},root={dataset:{boot:'loading'}};
  const window={SkygatePreview:preview,location:{reload(){reloaded=true}}};
  vm.runInNewContext(code,{window,document:{documentElement:root,getElementById:id=>nodes[id],querySelector:()=>game,fonts:{ready:fontsReady}},
    Image:ImageClass,setTimeout:(fn,delay)=>{timers.set(++nextTimer,{fn,delay});return nextTimer;},
    clearTimeout:id=>timers.delete(id),console:{error(){},warn(){}}});
  return {window,nodes,game,root,
    fire(delay){const entry=[...timers].find(([,t])=>t.delay===delay);assert(entry,'missing timer '+delay);timers.delete(entry[0]);entry[1].fn();},
    hasTimer(delay){return [...timers.values()].some(x=>x.delay===delay)},
    get reloaded(){return reloaded},get focused(){return focused}};
}

test('PLAY stays disabled during startup; trusted tap enters after first-paint decode',async()=>{
  const f=fixture();let finish;
  const pending=new Promise(resolve=>finish=resolve);
  const ready=f.window.SkygateBoot.ready([{decode:()=>pending}]);
  f.nodes.bootPlay.click();assert.equal(f.root.dataset.boot,'loading');assert(f.game.inert);
  finish();await ready;
  assert.equal(f.root.dataset.boot,'ready');assert(!f.nodes.bootPlay.disabled);assert(f.game.inert);
  assert(!f.hasTimer(30000));
  f.nodes.bootPlay.click();assert.equal(f.root.dataset.boot,'entered');assert(f.nodes.bootSplash.hidden);assert(!f.game.inert);assert(f.focused);
});

test('a never-settling image decode cannot trap Safari on splash',async()=>{
  const f=fixture();const ready=f.window.SkygateBoot.ready([{decode:()=>new Promise(()=>{})}]);
  await Promise.resolve();f.fire(1800);await ready;
  assert.equal(f.root.dataset.boot,'ready');assert.equal(f.nodes.bootPlay.disabled,false);
  assert(!f.hasTimer(30000));
});

test('failed image decode and permanently pending fonts do not block entry',async()=>{
  const f=fixture({fontsReady:new Promise(()=>{})});
  await f.window.SkygateBoot.ready([{decode:()=>Promise.reject(Error('WebKit image decode failed'))}]);
  assert.equal(f.root.dataset.boot,'ready');f.nodes.bootPlay.click();assert(!f.game.inert);
});

test('missing stylesheet is a blocking failure and Retry remains available',async()=>{
  const f=fixture();f.nodes.gameStyles.sheet=null;
  await assert.rejects(f.window.SkygateBoot.ready([]),/stylesheet/);
  f.window.SkygateBoot.fail(Error('stylesheet'));assert.equal(f.root.dataset.boot,'error');
  assert(f.game.inert);assert(!f.nodes.bootRetry.hidden);assert(f.nodes.bootPlay.hidden);
  f.nodes.bootPlay.click();assert(f.game.inert);f.nodes.bootRetry.click();assert(f.reloaded);
});

test('startup watchdog cannot be reversed by a late image decode',async()=>{
  const f=fixture();const ready=f.window.SkygateBoot.ready([{decode:()=>new Promise(()=>{})}]);
  f.fire(30000);f.fire(1800);await assert.rejects(ready,/expired/);
  assert.equal(f.root.dataset.boot,'error');assert(f.game.inert);
});

test('Studio preview enters automatically when game initialization succeeds',async()=>{
  const f=fixture({preview:true});await f.window.SkygateBoot.ready([]);
  assert.equal(f.root.dataset.boot,'entered');assert(!f.game.inert);assert(!f.focused);
});

test('only splash/hero/main-scene art is required for first-paint',()=>{
  const f=fixture();
  const image=(where,{hidden=false}={})=>({
    matches:q=>q.includes('cascade-fx')?(where==='fx'):q.includes('pwa-stage-background')?(where==='pwa'):false,
    closest:q=>q==='.tile'?(where==='tile'?{}:null):
      q==='.published-layer'?(hidden?{style:{display:'none'}}:{style:{display:''}}):
      q.includes('#bootSplash')?(['splash','hero','sky','logo'].includes(where)?{}:null):null
  });
  const splash=image('splash'),tile=image('tile'),fx=image('fx'),hidden=image('sky',{hidden:true}),sky=image('sky');
  const actual=Array.from(f.window.SkygateBoot.critical([splash,tile,fx,hidden,sky,splash]));
  assert.equal(actual.length,2);assert.equal(actual[0],splash);assert.equal(actual[1],sky);
});

test('optional prefetch images that never decode do not block startup',async()=>{
  const f=fixture({ImageClass:class{decode(){return new Promise(()=>{})}}});
  await f.window.SkygateBoot.ready([],['optional-texture.png']);
  assert.equal(f.root.dataset.boot,'ready');assert(f.game.inert);assert(!f.nodes.bootPlay.disabled);
});
