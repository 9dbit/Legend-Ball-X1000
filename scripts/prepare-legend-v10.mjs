// Deterministic sprite extraction and WebP packaging. Originals stay untouched.
import {readFileSync,writeFileSync,mkdirSync,copyFileSync,readdirSync,statSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const source=resolve(process.argv[2]||'../optimized_assets/Sources');
const dest=join(root,'studio/assets/legend-v10');mkdirSync(dest,{recursive:true});
const run=(...args)=>execFileSync('magick',args);
const copy=(from,to)=>copyFileSync(join(source,from),join(dest,to));
for(const [from,to] of Object.entries({'01_background.webp':'background.webp','01_hero_character.webp':'hero.webp','02_dragon.webp':'dragon.webp','02_temple.webp':'temple.webp','03_clouds.webp':'clouds.webp','04_thunder.webp':'thunder.webp','Legend_Ball_Hero_v3_720p_5s.mp4':'hero-720.mp4','Legend_Ball_Dragon_Loop_5s.mp4':'dragon-720.mp4','Legend_Ball_Energy_Loop_5s.mp4':'energy-720.mp4'}))copy(from,to);
run(join(dest,'hero.webp'),'-bordercolor','none','-border','90x120','-quality','92',join(dest,'hero-poster.webp'));
const crop=(sheet,rect,name,size)=>run(join(source,sheet),'-crop',rect,'+repage',...(size?['-resize',size]:[]),'-quality','93',join(dest,name+'.webp'));
crop('Legend Ball X1000 transparent asset sheet(1).webp','810x465+155+10','logo','850x');
const buttons='Transparent Legend Ball X1000 button sheet.webp';
for(const [name,rect,size] of [['spin','580x565+270+25','420x'],['auto','350x355+180+575','180x'],['turbo','350x355+580+575','180x'],['menu','350x360+180+945','180x'],['info','350x360+580+945','180x']])crop(buttons,rect,name,size);
// Existing clean panel masters contain no baked credit/bet numerals.
for(const name of ['win-frame','reel-frame','buy-frame','bonus-frame','credit-frame','bet-frame','minus','plus','sound'])run(join(root,'studio/assets/legend-v9',name+'.png'),'-quality','93',join(dest,name+'.webp'));
const sheet='Legend Ball X1000 Transparent Asset Sheet.webp';
const cells={crown:[35,163],amethyst:[392,163],hourglass:[748,163],emerald:[35,529],sapphire:[392,529],ring:[748,529],chalice:[35,897],scatter:[392,897],multiplier:[748,897]};
for(const [name,[x,y]] of Object.entries(cells))crop(sheet,`340x340+${x}+${y}`,'symbol-'+name,'256x256');
// Preserve all nine engine outcomes; distinguish reused character artwork with
// a readable tier badge in the renderer rather than changing math identities.
for(const [name,from] of Object.entries({ruby:'crown',topaz:'crown',amber:'chalice',pearl:'hourglass'}))copyFileSync(join(dest,'symbol-'+from+'.webp'),join(dest,'symbol-'+name+'.webp'));
const inventory=readdirSync(dest).filter(x=>/\.(webp|mp4)$/.test(x)).map(file=>{
 const bytes=readFileSync(join(dest,file));const video=file.endsWith('.mp4');
 const dims=video?execFileSync('ffprobe',['-v','error','-select_streams','v:0','-show_entries','stream=width,height','-of','csv=s=x:p=0',join(dest,file)],{encoding:'utf8'}).trim().split('x').map(Number):execFileSync('magick',['identify','-format','%w %h',join(dest,file)],{encoding:'utf8'}).split(' ').map(Number);
 return {id:file.replace(/\.[^.]+$/,''),path:'legend-v10/'+file,label:file.replace(/\.[^.]+$/,'').replaceAll('-',' '),kind:video?'video':file.startsWith('symbol-')?'symbol':'image',group:video?'ANIMATION':file.startsWith('symbol-')?'SYMBOLS':'LEGEND BALL V10',naturalWidth:dims[0],naturalHeight:dims[1],bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
});
writeFileSync(join(dest,'manifest.json'),JSON.stringify({version:10,assets:inventory},null,2));
writeFileSync(join(dest,'catalog.js'),'window.LEGEND_V10_ASSET_LIBRARY='+JSON.stringify(inventory.filter(x=>x.kind!=='video'))+';\n');
const p=JSON.parse(readFileSync(join(root,'studio/project.json')));
p.layers=p.layers.filter(l=>!['temple','cloudfar','cloudfront','thunder'].includes(l.id));
for(const l of p.layers){if(l.asset)l.asset='legend-v10/'+l.asset.split('/').at(-1).replace('scene-sky.webp','background.webp').replace('hero-master.png','hero-poster.webp').replace('dragon-master.png','dragon.webp').replace('logo-master.png','logo.webp').replace(/\.png$/,'.webp');}
const rects={sky:[-24,-24,1128,1968],guardian:[-32,12,455,607],dragon:[315,-48,790,593],logo:[365,220,695,320],winbanner:[262,454,665,130],winamount:[365,474,460,80],bonuscopy:[180,580,720,31],reelframe:[20,610,1040,817],reels:[66,637,948,790],buybtn:[22,1440,502,122],antebtn:[555,1440,503,122],creditpanel:[24,1580,465,110],credits:[60,1594,385,82],betpanel:[650,1580,260,110],betlabel:[660,1594,240,82],minusbtn:[520,1581,120,108],plusbtn:[935,1581,120,108],spinbutton:[402,1680,276,276],autobtn:[200,1730,155,155],turbobtn:[725,1730,155,155],menubtn:[26,1782,128,128],soundbtn:[160,1870,100,100],infobtn:[924,1782,128,128],provider:[300,1880,480,28]};
// Keep the main action and all secondary hit targets within the design canvas.
rects.spinbutton=[410,1688,260,260];rects.spinbutton[1]=1650;
rects.soundbtn=[28,1650,125,125];rects.provider=[300,1890,480,25];
for(const l of p.layers){if(rects[l.id])[l.x,l.y,l.w,l.h]=rects[l.id];if(l.id==='provider')l.text='XDPLAY  /  VIRTUAL PLAY';l.name=l.name.replace(/^Approved /,'');}
p.layers.find(l=>l.id==='guardian').z=6;p.layers.find(l=>l.id==='logo').z=8;
Object.assign(p.layers.find(l=>l.id==='logo'),{x:260,y:140,h:300});
Object.assign(p.layers.find(l=>l.id==='dragon'),{x:300,y:-40,w:760,h:570});
const extra=(id,name,asset,rect,z,opacity=100,parallax={x:0,y:0})=>({id,name,kind:'image',asset:'legend-v10/'+asset,x:rect[0],y:rect[1],w:rect[2],h:rect[3],z,rotate:0,opacity,visible:true,locked:false,parallax});
p.layers.push(extra('temple','Cliff temple','temple.webp',[610,0,570,620],1,85,{x:5,y:3}),extra('cloudfar','Distant storm clouds','clouds.webp',[-60,90,1100,450],2,34,{x:8,y:4}),extra('cloudfront','Cloud veil over dragon body','clouds.webp',[310,115,680,380],4,70,{x:15,y:8}),extra('thunder','Foreground lightning','thunder.webp',[-30,-35,1140,750],5,60,{x:10,y:6}));
for(const [id,x,y] of [['sky',3,2],['guardian',5,3],['dragon',10,5]])p.layers.find(l=>l.id===id).parallax={x,y};
p.layers.find(l=>l.id==='guardian').motion={src:'legend-v10/hero-720.mp4',poster:'legend-v10/hero-poster.webp',mode:'black-matte',loop:true};
p.layers.find(l=>l.id==='dragon').motion={src:'legend-v10/dragon-720.mp4',poster:'legend-v10/dragon.webp',mode:'black-matte',loop:true};
p.layers.find(l=>l.id==='spinbutton').motion={src:'legend-v10/energy-720.mp4',poster:'legend-v10/spin.webp',mode:'black-matte',loop:true};
p.ui={...p.ui,layout:'unified-v10',designWidth:1080,designHeight:1920};
writeFileSync(join(root,'studio/project.json'),JSON.stringify(p,null,2)+'\n');
writeFileSync(join(root,'play/layout.json'),JSON.stringify(p,null,2)+'\n');
console.log(JSON.stringify({assets:inventory.length,bytes:inventory.reduce((n,x)=>n+x.bytes,0),layers:p.layers.length}));
