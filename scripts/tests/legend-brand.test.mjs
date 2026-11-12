import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {validateProject} from '../../release-store.mjs';
const root=resolve(fileURLToPath(new URL('../..',import.meta.url)));
const read=p=>readFile(resolve(root,p),'utf8');
const lock=JSON.parse(await read('game-source-lock.json'));
const blob=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const source=JSON.parse((await read('play/config.js')).split('=')[1].trim().replace(/;$/,''));
test('engine and playable math remain byte-identical to locked Skygate',async()=>{
 for(const file of ['play/engine.js','play/config.js','studio/math/engine.js','studio/math/studio_math.js'])assert.equal(blob(await readFile(resolve(root,file))),lock.gitBlobSha1[file],file);
 assert.equal(source.grid_columns,6);assert.equal(source.grid_rows,5);assert.equal(source.bonus_start_spins,15);assert.equal(source.bonus_trigger_scatters,4);assert.equal(source.bonus_retrigger_add_spins,5);assert.equal(source.bonus_retrigger_scatters,3);assert.equal(source.round_max_win_x,5000);
});
test('27 genuine PNG layers trace to the exact approved reference',async()=>{
 const m=JSON.parse(await read('studio/assets/legend-raster/manifest.json'));
 assert.equal(m.sourceSha256,'53a1573585a62546b4bfec821c7642697845f395ca017b9eb3f62941356b3ea9');assert.equal(m.assets.length,27);
 for(const a of m.assets){
  const b=await readFile(resolve(root,'studio/assets/legend-raster',a.name));assert.deepEqual([...b.subarray(0,8)],[137,80,78,71,13,10,26,10]);assert.equal(b.readUInt32BE(16),a.width);assert.equal(b.readUInt32BE(20),a.height);assert.equal(createHash('sha256').update(b).digest('hex'),a.sha256,a.name);
  if(['hero.png','dragon.png','reel-frame.png','spin.png'].includes(a.name))assert(a.transparentPixels>1000,a.name+' alpha');
  assert.deepEqual(b,await readFile(resolve(root,'play/assets/legend-raster',a.name)),a.name+' must match Studio');
 }
});
test('default gameplay and Studio use the same scene and playable math preset',async()=>{
 const p=JSON.parse(await read('studio/project.json'));assert.equal(p.presentation,'legend-raster-v2');assert.deepEqual(p.math,source);assert.equal(p.jackpot.enabled,false);
 const context={window:{}};vm.runInNewContext(await read('play/legend/default-project.js'),context);assert.equal(JSON.stringify(context.window.LEGEND_DEFAULT_PROJECT),JSON.stringify(p));vm.runInNewContext(await read('studio/project-data.js'),context);assert.equal(JSON.stringify(context.window.SKY_PROJECT_DEFAULT),JSON.stringify(p));
 assert.equal(validateProject(p).presentation,'legend-raster-v2');const corrupt=structuredClone(p);corrupt.layers.find(l=>l.id==='guardian').asset='../../secret.png';assert.throws(()=>validateProject(corrupt),/unsupported image/);
 assert(p.layers.filter(l=>l.asset).every(l=>l.asset.startsWith('legend-raster/')&&l.asset.endsWith('.png')));
});
test('six Scatter skins honor uploaded assets without modifying mathematical symbols',async()=>{
 const context={window:{}};vm.runInNewContext(await read('play/legend/art.js'),context);const a=context.window.LegendBallArt;assert.equal(a.format,'png');assert.equal(a.version,2);assert.equal(new Set(Array.from({length:6},(_,c)=>a.sprite('scatter',c))).size,6);
 assert.equal(a.sprite('scatter',2,p=>'override:'+p),'override:legend-raster/scatter-3.png');assert.equal(a.sprite('orb',4,p=>'uploaded:'+p),'uploaded:legend-raster/multiplier.png');assert.match(await read('play/reels.js'),/sprite\(symbol.kind, cell.column, this.asset\)/);assert.doesNotMatch(await read('play/legend/art.js'),/Math\.random|createRng/);assert.equal(JSON.parse(await read('game-profile.json')).scatter.maxOnePerColumnEnforced,false);
});
test('actual PNG branding, shared renderer and versioned raster icons are wired',async()=>{
 const h=await read('play/index.html');assert.match(h,/<title>LEGEND BALL X1000/);assert.match(h,/legend\/raster-layout.js/);
 for(const n of ['hero','dragon','logo','background','spin'])assert(h.includes('legend-raster/'+n+'.png'),n);
 assert.doesNotMatch(h,/\/play\/legend\/(scene|logo|spin)\.svg/);assert.match(h,/og:image.+legend-raster\/open-graph.png/);assert.match(h,/legend-raster-v2-180.png/);
 for(const size of [48,180,192,512]){const b=await readFile(resolve(root,'play/icons/legend-raster-v2-'+size+'.png'));assert.equal(b.readUInt32BE(16),size);assert.equal(b.readUInt32BE(20),size);}
 await access(resolve(root,'play/icons/legend-raster-v2-maskable-512.png'));const manifest=JSON.parse(await read('play/manifest.webmanifest'));assert.equal(manifest.name,'LEGEND BALL X1000');assert(manifest.icons.every(i=>i.src.includes('raster-v2')));
});
