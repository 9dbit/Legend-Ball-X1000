import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('../..',import.meta.url)));
const read=p=>readFile(resolve(root,p),'utf8');
const blob=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
test('approved master JPEGs are SHA-locked and never regenerated',async()=>{
  const manifest=JSON.parse(await read('studio/assets/legend-master/manifest.json'));
  assert.equal(manifest.schema,'legend/master-ui-locked-v5');
  for(const [name,expected] of [['splash-master.jpg',manifest.splashSha256],['gameplay-approved-reference.jpg',manifest.gameplaySha256]]){
    const b=await readFile(resolve(root,'studio/assets/legend-master',name));
    assert.equal(createHash('sha256').update(b).digest('hex'),expected,name);
  }
  assert.equal(manifest.stagingOnly,true);
  assert.equal(manifest.rightsReviewRequired,true);
  for(const x of manifest.assets){
    const bytes=await readFile(resolve(root,'studio/assets/legend-master',x.path));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),x.sha256,x.path);
  }
});
test('both renderers have the same positions and exactly one live 6x5 grid',async()=>{
  const a=JSON.parse(await read('studio/project.json'));
  const source=await read('play/legend/default-project.js');
  const pre='window.LEGEND_DEFAULT_PROJECT = ';
  assert.ok(source.startsWith(pre));
  const b=JSON.parse(source.slice(pre.length).trim().replace(/;$/,''));
  assert.deepEqual(a.layers,b.layers);
  assert.equal(a.math.grid_columns,6);
  assert.equal(a.math.grid_rows,5);
  for(const id of ['sky','reelframe','winbanner','buybtn','antebtn','creditpanel','betpanel','spinbutton']){
    const l=a.layers.find(x=>x.id===id);
    assert.ok(l,id);
    assert(l.asset.startsWith('legend-master/'),id);
  }
  for(const id of ['guardian','dragon','logo'])assert.equal(a.layers.find(l=>l.id===id).visible,false,'no old duplicate '+id);
  assert.equal(a.layers.filter(l=>l.kind==='grid').length,1);
  const spin=a.layers.find(l=>l.id==='spinbutton'),turbo=a.layers.find(l=>l.id==='turbobtn');
  const auto=a.layers.find(l=>l.id==='autobtn');
  assert(turbo.x>spin.x+spin.w&&turbo.x-spin.x-spin.w<50);
  assert(auto.x+auto.w<spin.x&&spin.x-auto.x-auto.w<50);
  for(const l of a.layers){
    if(l.visible&&['image','grid','circle','text'].includes(l.kind)){
      assert(l.x+l.w<=1081,l.id+' off right');
      assert(l.y+l.h<=1921,l.id+' off bottom');
    }
  }
});
test('Skygate 6x5 settlement, deterministic math and wallet remain byte-for-byte unchanged',async()=>{
  const locked=JSON.parse(await read('game-source-lock.json'));
  for(const p of ['play/config.js','play/engine.js','studio/math/engine.js','studio/math/studio_math.js']){
    const buffer=await readFile(resolve(root,p));
    assert.equal(blob(buffer),locked.gitBlobSha1[p],p);
  }
});
test('approved UI master is bound to interactive DOM, not flattened inactive screenshot',async()=>{
  const html=await read('play/index.html');
  const css=await read('play/legend/approved-master-v5.css');
  const layout=await read('play/legend/raster-layout.js');
  const art=await read('play/legend/art.js');
  assert.match(html,/approved-master-v5\.css/);
  assert.match(html,/id="bootPlay"/);
  assert.match(html,/id="spin"/);
  assert.match(html,/id="reels"/);
  assert.match(html,/id="volumeRange"/);
  assert.match(css,/splash-master\.jpg/);
  assert.match(css,/legend-world-stack\s*\{display:none!important/);
  assert.match(layout,/legend-master-control-image/);
  assert.match(art,/legend-master\/.*file/);
  assert.match(css,/pointer-events:auto!important/);
  assert.doesNotMatch(html,/<canvas[^>]*id="fake-game"/);
});
