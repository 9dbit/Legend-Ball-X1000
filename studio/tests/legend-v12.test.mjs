import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {validateProject} from '../../release-store.mjs';
const root=new URL('../../',import.meta.url);
const read=path=>readFileSync(new URL(path,root));
const fresh=()=>JSON.parse(read('studio/project.json'));
const layer=(p,id)=>p.layers.find(l=>l.id===id);

test('V12 accepts menu-only audio and contained live bet controls without changing math',()=>{
 const p=fresh(),clean=validateProject(p);
 assert.equal(layer(clean,'soundbtn').visible,false);
 assert.equal(layer(clean,'provider').visible,false);assert.equal(layer(clean,'provider').text,'');
 const {name,description,research_note,...runtimeMath}=p.math;
 assert.deepEqual(clean.math,runtimeMath);
 for(const id of ['minusbtn','plusbtn','betlabel']){
  const l=layer(clean,id),panel=layer(clean,'betpanel');
  assert(l.x>=panel.x&&l.y>=panel.y&&l.x+l.w<=panel.x+panel.w&&l.y+l.h<=panel.y+panel.h);
 }
 const legacy=fresh();layer(legacy,'betpanel').asset='legend-v10/bet-frame.webp';
 assert.throws(()=>validateProject(legacy),/Keep soundbtn visible/);
});

test('V12 rejects detached or missing bet controls and hidden panel',()=>{
 for(const mutate of [p=>layer(p,'plusbtn').x+=40,p=>layer(p,'minusbtn').y-=20,p=>p.layers=p.layers.filter(l=>l.id!=='minusbtn')]){
  const p=fresh();mutate(p);assert.throws(()=>validateProject(p),/inside their panel/);
 }
 const hidden=fresh();layer(hidden,'betpanel').visible=false;assert.throws(()=>validateProject(hidden),/Total Bet panel visible/);
 const duplicate=fresh();layer(duplicate,'soundbtn').visible=true;assert.throws(()=>validateProject(duplicate),/Menu sound controls/);
});

test('Native Studio transforms Total Bet as one group and remains publishable',()=>{
 const p=fresh(),original=structuredClone(p),window={};
 vm.runInNewContext(read('studio/layout-groups.js').toString(),{window});
 const affected=window.LegendLayoutGroups.patch(p,'betpanel',{x:500,y:1575,w:503*1.1,h:132});
 assert.equal(affected.length,4);
 for(const id of ['minusbtn','plusbtn','betlabel']){
  const l=layer(p,id),old=layer(original,id);
  assert(Math.abs(l.x-(500+(old.x-555)*1.1))<1e-8);assert(Math.abs(l.w-old.w*1.1)<1e-8);
 }
 assert.deepEqual(layer(p,'guardian'),layer(original,'guardian'));assert.deepEqual(p.math,original.math);
 assert.doesNotThrow(()=>validateProject(p));
});

test('Opaque reel frame is below live square reels and its outer rectangle encloses them',()=>{
 const p=fresh(),frame=layer(p,'reelframe'),grid=layer(p,'reels');
 assert(frame.z<grid.z);assert.equal(grid.w/6,grid.h/5);
 assert(frame.x<grid.x&&frame.y<grid.y&&frame.x+frame.w>grid.x+grid.w&&frame.y+frame.h>grid.y+grid.h);
});

test('Active V12 media is WebP/MP4 and hashes match the exported catalog',()=>{
 const manifest=JSON.parse(read('studio/assets/legend-v12/manifest.json'));
 assert.equal(manifest.version,12);
 for(const a of manifest.assets){
  assert.match(a.path,/\.(webp|mp4)$/);
  const bytes=read('studio/assets/'+a.path);
  assert.equal(bytes.length,a.bytes,a.path);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),a.sha256,a.path);
 }
 const paths=new Set(manifest.assets.map(a=>a.path));
 for(const l of fresh().layers.filter(l=>l.visible!==false)){
  if(l.asset)assert(paths.has(l.asset),l.id+' missing from active catalog');
  if(l.motion)assert(paths.has(l.motion.src),l.id+' animation missing');
 }
 assert.equal(manifest.assets.filter(a=>a.path.endsWith('.mp4')).length,3);
});
