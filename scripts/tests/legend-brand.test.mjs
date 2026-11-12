import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=resolve(fileURLToPath(new URL('../..', import.meta.url)));
const read=path=>readFile(resolve(root,path),'utf8');
const lock=JSON.parse(await read('game-source-lock.json'));
const profile=JSON.parse(await read('game-profile.json'));
function blob(bytes){
  return createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
}
test('independent Legend Ball math and financial rules remain byte-for-byte Skygate', async()=>{
  for(const file of ['play/engine.js','play/config.js','studio/math/engine.js','studio/math/studio_math.js']){
    const bytes=await readFile(resolve(root,file));
    assert.equal(blob(bytes),lock.gitBlobSha1[file],file+' must remain unchanged');
  }
  assert.equal(profile.grid.columns,6);
  assert.equal(profile.grid.rows,5);
  const config=JSON.parse((await read('play/config.js')).split('=')[1].trim().replace(/;$/,''));
  assert.equal(config.bonus_trigger_scatters,4);
  assert.equal(config.bonus_start_spins,15);
  assert.equal(config.bonus_retrigger_scatters,3);
  assert.equal(config.bonus_retrigger_add_spins,5);
  assert.equal(config.round_max_win_x,5000);
});
test('new original art assets exist as independent SVG files',async()=>{
  for(const file of ['logo.svg','scene.svg',...['crown','hourglass','ring','chalice','ruby','amethyst','topaz','emerald','sapphire','orb'].map(s=>'symbol-'+s+'.svg'),...Array.from({length:6},(_,i)=>'ball-'+(i+1)+'.svg')]){
    const content=await read('play/legend/'+file);
    assert.match(content,/<svg[\s\S]*<\/svg>/);
    assert.match(content,/viewBox=/);
    assert.ok(!/dragon ball|goku|vegeta|shenron/i.test(content),file);
  }
  const art=await read('play/legend/art.js');
  assert.match(art,/kind==='scatter'/);
  assert.match(art,/column/);
  assert.equal(profile.scatter.maxOnePerColumnEnforced,false);
});
test('mobile entry branding, accessible controls, PWA manifest and sprite wiring',async()=>{
  const html=await read('play/index.html');
  assert.match(html,/<title>LEGEND BALL X1000/);
  assert.match(html,/src="legend\/art\.js/);
  assert.match(html,/id="spin"/);
  assert.match(html,/id="reels"/);
  assert.match(html,/src="\/play\/legend\/scene\.svg"/);
  assert.doesNotMatch(html,/>SKYGATE 5000</);
  const reel=await read('play/reels.js');
  assert.match(reel,/LegendBallArt\?\.sprite\(symbol\.kind, cell\.column\)/);
  const manifest=JSON.parse(await read('play/manifest.webmanifest'));
  assert.equal(manifest.name,'LEGEND BALL X1000');
  assert.equal(manifest.icons.length,3);
  for(const size of [48,180,192,512]){
    const bytes=await readFile(resolve(root,'play/icons/legend-touch-'+size+'.png'));
    assert.equal(bytes.subarray(1,4).toString(),'PNG');
    assert.equal(bytes.readUInt32BE(16),size);
  }
  await access(resolve(root,'play/icons/legend-touch-maskable-512.png'));
});
