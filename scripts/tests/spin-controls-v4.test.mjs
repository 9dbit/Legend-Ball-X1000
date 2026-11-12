import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root=resolve(fileURLToPath(new URL('../..',import.meta.url)));
const read=p=>readFile(resolve(root,p),'utf8');
const sha=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');

test('source-locked 6x5 Skygate RNG, engine, math and payout config are unchanged',async()=>{
  const lock=JSON.parse(await read('game-source-lock.json'));
  for(const path of ['play/engine.js','play/config.js','studio/math/engine.js','studio/math/studio_math.js']){
    const bytes=await readFile(resolve(root,path));
    assert.equal(sha(bytes),lock.gitBlobSha1[path],path);
  }
  const config=JSON.parse((await read('play/config.js')).split('=')[1].trim().replace(/;$/,''));
  assert.equal(config.grid_columns,6);assert.equal(config.grid_rows,5);
  assert.equal(config.bonus_start_spins,15);assert.equal(config.bonus_retrigger_add_spins,5);
});

test('Game & Studio use identical thumb-safe geometry with Turbo immediately right of Spin',async()=>{
  const project=JSON.parse(await read('studio/project.json'));
  const js=await read('play/legend/default-project.js');
  const prefix='window.LEGEND_DEFAULT_PROJECT = ';
  assert.ok(js.startsWith(prefix));
  const backup=JSON.parse(js.slice(prefix.length).trim().replace(/;$/,''));
  const ids=['spinbutton','autobtn','turbobtn','menubtn','infobtn','soundbtn','provider'];
  for(const id of ids){
    const a=project.layers.find(l=>l.id===id),b=backup.layers.find(l=>l.id===id);
    assert.ok(a&&b,id);
    for(const key of ['x','y','w','h'])assert.equal(a[key],b[key],id+'.'+key);
  }
  const spin=project.layers.find(l=>l.id==='spinbutton');
  const turbo=project.layers.find(l=>l.id==='turbobtn');
  const auto=project.layers.find(l=>l.id==='autobtn');
  assert(spin.w>=260,'Spin should be a focal, large control');
  assert(turbo.x>spin.x+spin.w&&turbo.x-(spin.x+spin.w)<=55,'Turbo must be adjacent on right');
  assert(auto.x+auto.w<spin.x&&spin.x-auto.x-auto.w<=55,'Auto must be adjacent on left');
  for(const l of project.layers.filter(l=>['spinbutton','autobtn','turbobtn','menubtn','infobtn'].includes(l.id))){
    assert(l.x>=0&&l.y>=0&&l.x+l.w<=1080&&l.y+l.h<=1920,l.id+' must fit Studio');
    assert(l.visible,l.id+' must remain enabled');
  }
});

test('V4 original electric spin asset and animation are independently editable',async()=>{
  const svg=await read('play/legend/spin-lightning.svg');
  const css=await read('play/legend/spin-controls.css');
  assert.match(svg,/<svg[^>]*viewBox="0 0 400 400"/);
  assert.match(svg,/<linearGradient/);
  assert.match(svg,/<path/);
  assert.match(css,/spin-lightning\.svg/);
  assert.match(css,/legendSpinConduitReverse/);
  assert.match(css,/prefers-reduced-motion/);
  assert.match(css,/spin\.battery-saver/);
  assert.match(css,/pointer-events:none/);
});

test('sound is controlled through accessible menu switch and persistent volume slider',async()=>{
  const html=await read('play/index.html');
  const game=await read('play/game.js');
  const css=await read('play/legend/spin-controls.css');
  const model=await read('play/settings-model.js');
  assert.match(html,/id="volumeRange" type="range" min="0" max="100"/);
  assert.match(html,/id="volumeValue"/);
  assert.match(html,/id="soundSetting"/);
  assert.match(html,/spin-controls\.css\?v=spin-v4/);
  assert.match(css,/\.game #sound\s*\{display:none!important/);
  assert.match(game,/preferences\.volume=next/);
  assert.match(game,/mixer\.updateMix\(\)/);
  assert.match(game,/E\('sound'\)\.tabIndex=-1/);
  const settings=(await import('node:module')).createRequire(import.meta.url)(resolve(root,'play/settings-model.js'));
  assert.equal(settings.normalize({volume:46}).volume,45);
  assert.equal(settings.normalize({volume:-123}).volume,0);
  assert.equal(settings.normalize({volume:1000}).volume,100);
  assert.equal(settings.normalize({volume:'NaN'}).volume,70);
  assert.match(model,/volume:Number\.isFinite/);
});
