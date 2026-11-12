import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(fileURLToPath(new URL('../..',import.meta.url)));
const read=p=>readFile(join(root,p),'utf8');
const gitBlob=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');

test('Skygate math and engine bytes remain identical to inherited locked sources',async()=>{
  const lock=JSON.parse(await read('game-source-lock.json'));
  for(const p of ['play/engine.js','play/config.js','studio/math/engine.js','studio/math/studio_math.js']){
    const b=await readFile(join(root,p));
    assert.equal(gitBlob(b),lock.gitBlobSha1[p],p);
  }
});

test('all 3 supplied staging-only backgrounds exist and match their optimized hashes',async()=>{
  const m=JSON.parse(await read('play/assets/legend-cinematics/manifest.json'));
  assert.equal(m.schema,'legend-ball-cinematic-scenes/v1');
  assert.equal(m.scenes.length,3);
  assert.deepEqual(m.scenes.map(x=>x.id),['ember-warrior','crimson-dragon','celestial-temple']);
  for(const x of m.scenes){
    assert.equal(x.stagingOnly,true);
    assert.equal(x.rightsReviewRequired,true);
    const b=await readFile(join(root,'play/assets/legend-cinematics',x.path));
    assert.equal(b.toString('ascii',0,4),'RIFF');
    assert.equal(b.toString('ascii',8,12),'WEBP');
    assert.equal(createHash('sha256').update(b).digest('hex'),x.sha256);
  }
});

test('visual scene controller uses lightning-cut, guarded reduced motion, and only isolated presentation events',async()=>{
  const source=await read('play/legend/cinematics.js');
  assert.match(source,/legend-world-stack/);
  assert.match(source,/scene-ember-warrior.webp/);
  assert.match(source,/scene-crimson-dragon.webp/);
  assert.match(source,/scene-celestial-temple.webp/);
  assert.match(source,/schedule\(\(\)=>swapScene\(next\),154\)/);
  assert.match(source,/prefers-reduced-motion/);
  assert.match(source,/energyBlast/);
  assert.doesNotMatch(source,/(?:playRound|wallet|withdraw|creditSettlement|payout)\s*\(/);
});

test('Game and Studio share updated control geometry without changing symbol rules',async()=>{
  const project=JSON.parse(await read('studio/project.json'));
  const str=await read('play/legend/default-project.js');
  const prefix='window.LEGEND_DEFAULT_PROJECT = ';
  assert.ok(str.startsWith(prefix));
  const original=JSON.parse(str.slice(prefix.length).trim().replace(/;$/,''));
  const controls=['autobtn','spinbutton','turbobtn','menubtn','soundbtn','infobtn','plusbtn','minusbtn','credits','betlabel'];
  for(const id of controls){
    const a=project.layers.find(x=>x.id===id),b=original.layers.find(x=>x.id===id);
    assert.ok(a&&b,id);
    for(const k of ['x','y','w','h'])assert.equal(a[k],b[k],id+':'+k);
  }
  assert.equal(project.math.grid_columns,6);
  assert.equal(project.math.grid_rows,5);
  assert.equal(project.math.bonus_start_spins,15);
  assert.equal(project.math.bonus_retrigger_add_spins,5);
  assert.equal(project.presentation,'legend-raster-v2');
});

test('new theme and event hooks are included after unchanged engine bootstraps',async()=>{
  const html=await read('play/index.html');
  const css=await read('play/legend/cinematics.css');
  const game=await read('play/game.js');
  const reels=await read('play/reels.js');
  assert.match(html,/cinematics\.css\?v=cinematic1/);
  assert.match(html,/cinematics\.js\?v=cinematic1/);
  assert.ok(html.indexOf('legend/cinematics.js')<html.indexOf('game.js?v='));
  assert.match(css,/legend-lightning-flash/);
  assert.match(css,/legend-blast-ring/);
  assert.match(css,/legend-world-ready/);
  assert.match(css,/legend-energy-ball/);
  assert.match(game,/LegendCinematics\?\.multiplier/);
  assert.match(game,/LegendCinematics\?\.bonus/);
  assert.match(reels,/LegendCinematics\?\.energyBlast/);
});
