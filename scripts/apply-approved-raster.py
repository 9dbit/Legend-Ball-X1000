"""Apply the reviewed presentation-only restoration once to the isolated repair branch."""
from pathlib import Path
import json,shutil,hashlib
R=Path(__file__).resolve().parents[1]
MARK=R/'design/raster-v2-applied.json'
if MARK.exists():
 print('Raster patch already applied; preserving subsequent edits.');raise SystemExit(0)
def change(path,old,new):
 p=R/path;s=p.read_text();assert old in s,(path,old[:100]);p.write_text(s.replace(old,new))
def layer(id,name,kind,x,y,w,h,z,asset=None,text=None,font=None):
 d=dict(id=id,name=name,kind=kind,x=x,y=y,w=w,h=h,z=z,rotate=0,opacity=100,visible=True,locked=False)
 if asset:d['asset']='legend-raster/'+asset
 if text is not None:d.update(text=text,font=font or 32,color='#fff0c0')
 if font:d['font']=font
 return d
L=layer
p=json.loads((R/'studio/project.json').read_text());p.update(presentation='legend-raster-v2',projectName='LEGEND BALL X1000',bet=2,seed=20261027)
p['math']=json.loads((R/'play/config.js').read_text().split('=',1)[1].strip().rstrip(';'));p['jackpot']['enabled']=False
p['layers']=[
 L('sky','Approved floating island','image',0,0,1080,1920,0,'background.png'),
 L('guardian','Approved anime hero','image',-5,7,420,640,3,'hero.png'),
 L('dragon','Approved blue dragon','image',510,8,580,350,2,'dragon.png'),
 L('logo','LEGEND BALL X1000 title','image',354,264,710,220,5,'logo.png'),
 L('winbanner','Approved win panel rim','image',366,480,688,105,5,'panel.png'),
 L('winamount','Live round win','text',382,484,655,96,6,text='',font=65),
 L('bonuscopy','Source rules reminder','text',422,576,620,28,6,text='4+ SCATTER = 15 FREE SPINS',font=27),
 L('reelframe','Approved gold reel frame','image',16,610,1048,738,12,'reel-frame.png'),
 L('reels','Six columns five rows','grid',44,644,992,672,8),
 L('buybtn','Buy Spin live button','image',30,1370,498,102,15,'panel.png'),
 L('antebtn','Bonus Booster live button','image',551,1370,498,102,15,'panel.png'),
 L('hint','Live round status','text',70,1476,940,34,15,text='',font=24),
 L('creditpanel','Credit panel rim','image',24,1515,446,106,13,'panel.png'),
 L('betpanel','Bet panel rim','image',485,1515,566,106,13,'panel.png'),
 L('credits','Live virtual credits','text',45,1527,404,78,15,text='',font=41),
 L('betlabel','Live total bet','text',630,1527,277,78,15,text='',font=41),
 L('minusbtn','Decrease bet','circle',501,1519,98,98,16,text='-',font=38),
 L('plusbtn','Increase bet','circle',937,1519,98,98,16,text='+',font=38),
 L('autobtn','Autoplay settings','circle',252,1661,130,130,16,text='AUTO',font=25),
 L('spinbutton','Approved PNG Spin button','image',416,1635,249,233,16,'spin.png'),
 L('turbobtn','Spin speed','circle',697,1661,130,130,16,text='NORMAL',font=24),
 L('menubtn','Game menu','circle',34,1789,130,130,16,text='MENU',font=24),
 L('soundbtn','Audio toggle','circle',823,1789,112,112,16,text='SOUND',font=24),
 L('infobtn','Rules and win table','circle',949,1789,112,112,16,text='RULES',font=24),
 L('provider','Provider signature','text',263,1865,554,34,16,text='SOFT TECH  /  VIRTUAL PLAY',font=22)
]
(R/'studio/project.json').write_text(json.dumps(p,indent=2)+'\n')
(R/'studio/project-data.js').write_text('window.SKY_PROJECT_DEFAULT = '+json.dumps(p,separators=(',',':'))+';\n')
(R/'play/legend/default-project.js').write_text('window.LEGEND_DEFAULT_PROJECT = '+json.dumps(p,separators=(',',':'))+';\n')
shutil.copyfile(R/'design/raster-v2/raster-layout.js',R/'play/legend/raster-layout.js')
shutil.copyfile(R/'design/raster-v2/theme.css',R/'play/legend/theme.css')
(R/'play/legend/art.js').write_text('''/* Visual-only PNG catalog; uploaded assets remain authoritative. */
(() => {
 'use strict';
 const names=['crown','hourglass','ring','chalice','ruby','amethyst','topaz','emerald','sapphire','amber','pearl'];
 const balls=Object.freeze(['PYRA','NERIS','VOLTRA','TERRAK','SOLUNE','AETHER']);
 const resolve=(path,resolver)=>resolver?resolver(path):'/play/assets/'+path;
 const sprite=(kind,column=0,resolver)=>{
  const col=Number.isInteger(column)?Math.max(0,Math.min(5,column)):0;
  const file=kind==='scatter'?'scatter-'+(col+1):kind==='orb'?'multiplier':'symbol-'+({amber:'hourglass',pearl:'chalice'}[kind]||kind);
  return resolve('legend-raster/'+file+'.png',resolver);
 };
 window.LegendBallArt=Object.freeze({version:2,format:'png',balls,sprite,logo:'/play/assets/legend-raster/logo.png',hero:'/play/assets/legend-raster/hero.png',textures:resolver=>[...names.map(n=>sprite(n,0,resolver)),sprite('orb',0,resolver),...balls.map((_,i)=>sprite('scatter',i,resolver))]});
})();
''')
change('play/game.js','  if(published)window.SkygateApplyLayout(published,asset);\n  window.SkygateSyncChrome?.(published,asset);','  const layoutProject=published || window.LEGEND_DEFAULT_PROJECT;\n  if(layoutProject)window.SkygateApplyLayout(layoutProject,asset);\n  window.SkygateSyncChrome?.(layoutProject,asset);')
change('play/game.js',"(path==='scene/logo.png'?'/play/legend/logo.svg':path==='scene/hero_composite_reference.jpg'?'/play/legend/scene.svg':'assets/'+path)","'/play/assets/'+path")
change('play/game.js','window.LegendBallArt?.sprite(kind,0)','window.LegendBallArt?.sprite(kind,0,asset)')
change('play/game.js',"featureScreen('LEGEND BALL X1000','WIN UP TO 1000\u00d7'","featureScreen('LEGEND BALL X1000','TUMBLE & FREE SPINS'")
change('play/reels.js','window.LegendBallArt?.textures()','window.LegendBallArt?.textures(asset)')
change('play/reels.js','window.LegendBallArt?.sprite(symbol.kind, cell.column)','window.LegendBallArt?.sprite(symbol.kind, cell.column, this.asset)')
change('play/release.js','window.SkygateApplyLayout=(project,asset)=>{',"window.SkygateApplyLayout=(project,asset)=>{\n  if(project.presentation==='legend-raster-v2')return window.LegendBallApplyLayout(project,asset);")
change('play/release.js','window.SkygateSyncChrome=(project,asset)=>{',"window.SkygateSyncChrome=(project,asset)=>{\n  if(project?.presentation==='legend-raster-v2')return window.LegendBallSyncChrome(project,asset);")
change('play/boot.js','Siap memasuki Skygate','Siap memasuki LEGEND BALL')
manifest=json.loads((R/'studio/assets/legend-raster/manifest.json').read_text());names=[a['name'] for a in manifest['assets']]
change('release-store.mjs','export const shippedAssets = [','export const legendRasterAssets = '+json.dumps(['legend-raster/'+n for n in names])+';\nexport const shippedAssets = [\n  ...legendRasterAssets,')
change('release-store.mjs',"presentation:p.presentation==='olympus-gold'?'olympus-gold':'classic'","presentation:['olympus-gold','legend-raster-v2'].includes(p.presentation)?p.presentation:'classic'")
h=(R/'play/index.html').read_text().replace('/play/legend/scene.svg','/play/assets/legend-raster/background.png').replace('/play/legend/logo.svg','/play/assets/legend-raster/logo.png').replace('/play/legend/spin.svg','/play/assets/legend-raster/spin.png')
h=h.replace('href="legend/theme.css?v=1"','href="legend/theme.css?v=raster2"').replace('src="legend/art.js?v=1"','src="legend/art.js?v=raster2"')
h=h.replace('<script src="game.js?v=0.14.3-legend1"></script>','<script src="legend/default-project.js?v=raster2"></script><script src="legend/raster-layout.js?v=raster2"></script><script src="game.js?v=0.14.3-raster2"></script>')
h=h.replace('src="reels.js?v=0.14.3"','src="reels.js?v=0.14.3-raster2"').replace('src="release.js?v=0.14.3"','src="release.js?v=0.14.3-raster2"')
h=h.replace('<div class="splash-art" aria-hidden="true">','<div class="splash-art" aria-hidden="true">\n<img class="splash-hero" src="/play/assets/legend-raster/hero.png" alt="">\n<img class="splash-dragon" src="/play/assets/legend-raster/dragon.png" alt="">')
h=h.replace('<meta name="description"','<meta name="robots" content="noindex,nofollow,noarchive">\n<meta property="og:image" content="https://legend-ball-web-staging.up.railway.app/play/assets/legend-raster/open-graph.png">\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n<meta name="twitter:card" content="summary_large_image">\n<meta name="description"',1)
(R/'play/index.html').write_text(h)
s=(R/'studio/studio.js').read_text().replace("const storageKey='skygate-studio-20261027-v03';","const storageKey='legend-ball-raster-20261112-v2';")
begin=s.index('  const imageFiles=[');end=s.index('\n  const esc=',begin);catalog=[]
for name in names:
 group='BRAND & SHARE' if name in ['logo.png','app-icon.png','open-graph.png'] else 'SCENE & CHARACTER' if name in ['hero.png','dragon.png','background.png'] else 'FRAME & CONTROLS' if name in ['reel-frame.png','panel.png','spin.png'] else 'REEL SYMBOLS'
 catalog.append(dict(id=name[:-4],path='legend-raster/'+name,group=group,kind='symbol' if group=='REEL SYMBOLS' else 'image'))
catalog.sort(key=lambda f:['SCENE & CHARACTER','BRAND & SHARE','FRAME & CONTROLS','REEL SYMBOLS'].index(f['group']))
s=s[:begin]+'  const imageFiles='+json.dumps(catalog,separators=(',',':'))+';'+s[end:]
s=s.replace('PNG / SVG \u00b7 individual','PNG / RGBA \u00b7 individual').replace('for(const id of previewVisualGrid||state.grid)','for(const [cellIndex,id] of (previewVisualGrid||state.grid).entries())').replace("im.src=assetURL('symbols/'+id+'.png');","im.src=window.LegendBallArt.sprite(id,cellIndex%6,assetURL);")
(R/'studio/studio.js').write_text(s)
s=(R/'studio/index.html').read_text().replace('<script src="studio.js','<script src="/play/legend/art.js?v=raster2"></script><script src="studio.js');(R/'studio/index.html').write_text(s)
profile=json.loads((R/'game-profile.json').read_text());profile['scatter']['artStatus']='raster-variants-integrated-visual-only';profile['artRevision']='approved-raster-v2';profile['artSourceSha256']=manifest['sourceSha256'];(R/'game-profile.json').write_text(json.dumps(profile,indent=2)+'\n')
prepare=(R/'scripts/prepare-play.mjs').read_text().replace("import { generateLegendIcons } from './legend-icons.mjs';",'').replace('import { mkdir, copyFile, access }','import { mkdir, copyFile, access, readFile, writeFile }')
prepare=prepare.replace('await generateLegendIcons(root);','''await mkdir(resolve(root,'play/icons'),{recursive:true});
for(const size of [48,180,192,512]){
 await copyFile(resolve(root,'studio/assets/legend-raster/icons/legend-touch-'+size+'.png'),resolve(root,'play/icons/legend-touch-'+size+'.png'));
 await copyFile(resolve(root,'play/icons/legend-touch-'+size+'.png'),resolve(root,'play/icons/legend-raster-v2-'+size+'.png'));
}
await copyFile(resolve(root,'studio/assets/legend-raster/icons/legend-touch-maskable-512.png'),resolve(root,'play/icons/legend-touch-maskable-512.png'));
await copyFile(resolve(root,'play/icons/legend-touch-maskable-512.png'),resolve(root,'play/icons/legend-raster-v2-maskable-512.png'));
for(const target of ['apple-touch-icon.png','studio/apple-touch-icon.png','play/apple-touch-icon.png'])await copyFile(resolve(root,'play/icons/legend-touch-180.png'),resolve(root,target));
const project=JSON.parse(await readFile(resolve(root,'studio/project.json'),'utf8'));
await writeFile(resolve(root,'play/legend/default-project.js'),'window.LEGEND_DEFAULT_PROJECT = '+JSON.stringify(project)+';\\n');
await writeFile(resolve(root,'studio/project-data.js'),'window.SKY_PROJECT_DEFAULT = '+JSON.stringify(project)+';\\n');''')
(R/'scripts/prepare-play.mjs').write_text(prepare)
for path in ['play/index.html','studio/index.html','play/manifest.webmanifest','studio/manifest.webmanifest']:
 f=R/path;f.write_text(f.read_text().replace('legend-touch-','legend-raster-v2-'))
# UI-only assertions must exercise the actual respective presentation variant.
f=R/'studio/tests/layout_skins.test.mjs';s=f.read_text().replace("const d=dom(),p=JSON.parse(read('studio/project.json'));\n  d.window.SkygateApplyLayout","const d=dom(),p=JSON.parse(read('studio/project.json'));\n  p.presentation='classic';p.layers=p.layers.filter(l=>!['minusbtn','plusbtn'].includes(l.id));\n  d.window.SkygateApplyLayout").replace("assert.match(read('play/game.js'),/WIN UP TO 1000\u00d7/);","assert.match(read('play/game.js'),/TUMBLE & FREE SPINS/);");f.write_text(s)
f=R/'studio/tests/play_ui.test.mjs';s=f.read_text().replace('href="icons\\/legend-touch-180.png"','href="icons\\/legend-raster-v2-180.png"').replace('href="\\/play\\/icons\\/legend-touch-180.png"','href="\\/play\\/icons\\/legend-raster-v2-180.png"').replace("icon.src.includes('legend-touch-192.png')","icon.src.includes('legend-raster-v2-192.png')");f.write_text(s)
# Old experimental transport is not executable and is removed from this repair.
shutil.rmtree(R/'.raster-intake',ignore_errors=True)
MARK.write_text(json.dumps({'version':'raster-v2','sourceSha256':manifest['sourceSha256'],'scope':'presentation-only','engineChanged':False},indent=2)+'\n')
print('Applied unified PNG runtime, Studio scene, asset resolver and icons. Engine source untouched.')
