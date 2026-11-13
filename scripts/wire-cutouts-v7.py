"""Wire cutout PNG/WebP files into editable Studio layers and public game."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
catalog=json.loads((ROOT/'studio/assets/legend-cutouts/manifest.json').read_text('utf8'))
path=ROOT/'studio/project.json'
project=json.loads(path.read_text('utf8'))
L={x['id']:x for x in project['layers']}
positions={
'sky':('scene-sky.webp',(0,0,1080,1920),0),
'guardian':('hero.png',(0,0,460,580),4),
'dragon':('dragon.png',(335,0,745,296),3),
'logo':('logo.png',(342,94,630,260),6),
'winbanner':('win-frame.png',(202,354,676,112),12),
'reelframe':('reel-bezel.png',(12,481,1056,848),12),
'buybtn':('buy-frame.png',(20,1333,502,119),15),
'antebtn':('booster-frame.png',(550,1333,510,119),15),
'creditpanel':('credit-frame.png',(33,1463,451,96),13),
'betpanel':('bet-frame.png',(492,1463,557,96),13),
'minusbtn':('minus.png',(504,1471,101,101),16),
'plusbtn':('plus.png',(933,1471,101,101),16),
'spinbutton':('spin.png',(407,1563,266,266),16),
'autobtn':('auto.png',(222,1630,137,137),16),
'turbobtn':('turbo.png',(722,1630,137,137),16),
'menubtn':('menu.png',(36,1778,117,117),16),
'infobtn':('info.png',(920,1778,117,117),16)}
for name,(asset,rect,z) in positions.items():
 layer=L[name]
 layer.update(dict(zip(['x','y','w','h'],rect)))
 layer.update(asset='legend-cutouts/'+asset,visible=True,z=z,locked=False)
L['reels'].update(x=72,y=510,w=936,h=780,visible=True,locked=False)
L['winamount'].update(x=266,y=360,w=548,h=86,visible=True,locked=False)
L['bonuscopy'].update(x=250,y=463,w=580,h=25,visible=True,locked=False)
L['credits'].update(x=59,y=1470,w=396,h=80,visible=True,locked=False)
L['betlabel'].update(x=643,y=1470,w=236,h=80,visible=True,locked=False)
L['hint'].update(visible=False)
project['ui']['layout']='cutout-modular-v7'
path.write_text(json.dumps(project,indent=2,ensure_ascii=False)+'\n',encoding='utf8')

release=ROOT/'release-store.mjs'
text=release.read_text('utf8')
if 'export const legendCutoutAssets' not in text:
 pre='export const shippedAssets = ['
 assert pre in text
 assets=[a['path'] for a in catalog['assets']]
 text=text.replace(pre,'export const legendCutoutAssets = '+json.dumps(assets,indent=2,ensure_ascii=False)+';\n'+pre+'  ...legendCutoutAssets,\n')
 release.write_text(text,encoding='utf8')

studio=ROOT/'studio/studio.js'
text=studio.read_text('utf8')
if 'window.LEGEND_CUTOUT_LIBRARY' not in text:
 text=text.replace('const imageFiles=[','const imageFiles=[...(window.LEGEND_CUTOUT_LIBRARY||[]),',1)
 text=text.replace("const storageKey='legend-ball-raster-20261112-v2';","const storageKey='legend-ball-cutout-v7-20261113';",1)
 text=text.replace("if(target&&target.kind==='image'){remember();target.asset=path;",
                   "if(!path.startsWith('legend-cutouts/')&&target&&target.kind==='image'){remember();target.asset=path;",1)
 old="function addAsset(path){remember();const id='art_'+Date.now();const layer={id,name:path.split('/').at(-1).split('.')[0],kind:'image',asset:path,x:315,y:760,w:400,h:220,z:55,opacity:100,visible:true,locked:false,rotate:0};state.layers.push(layer);saveLocal();selectLayer(id);}"
 new="""function addAsset(path){
    const meta=imageFiles.find(asset=>asset.path===path);
    const aspect=meta?.naturalWidth&&meta?.naturalHeight?meta.naturalHeight/meta.naturalWidth:0.65;
    const width=Math.min(meta?.kind==='symbol'?160:540,Math.max(92,meta?.naturalWidth||380));
    const height=Math.round(width*aspect);
    remember();const id='cutout_'+Date.now()+'_'+Math.floor(Math.random()*9999);
    const layer={id,name:meta?.label||path.split('/').at(-1).split('.')[0],kind:'image',
      asset:path,x:Math.round((1080-width)/2),y:Math.round((1920-height)/2),
      w:width,h:height,z:55,opacity:100,visible:true,locked:false,rotate:0};
    state.layers.push(layer);saveLocal();selectTab('layers');selectLayer(id);
  }"""
 assert old in text
 text=text.replace(old,new,1)
 text=text.replace("label.textContent='SEPARATE ASSETS';","label.textContent='CUTOUT LIBRARY';",1)
 text=text.replace("Each PNG / SVG is independent","PNG/WebP cutouts: separate movable layers",1)
 text=text.replace("Image crop cutouts originate from a flattened JPEG reference. This is not a recovered multi-layer PSD or a licensed art source.",
                   "Approved flat JPEG has been segmented into individual transparent cutouts. Resize and move using the layer inspector. These are derived assets, not a recovered layered PSD.",1)
 studio.write_text(text,encoding='utf8')

index=ROOT/'studio/index.html'
text=index.read_text('utf8')
if 'legend-cutouts/catalog.js' not in text:
 text=text.replace('<script src="studio.js?', '<script src="assets/legend-cutouts/catalog.js?v=7"></script><script src="studio.js?',1)
 text=text.replace('studio.js?v=0.14.3-ratio-audio1','studio.js?v=7-cutout-library',1)
 index.write_text(text,encoding='utf8')

play=ROOT/'play/index.html'
text=play.read_text('utf8')
assert 'legend/square-reels.css?v=square-v6-1' in text
text=text.replace('<link rel="stylesheet" href="legend/square-reels.css?v=square-v6-1">',
                  '<link rel="stylesheet" href="legend/cutout-v7.css?v=7">')
assert '<script src="legend/raster-layout.js?v=master-v5"></script>' in text
text=text.replace('<script src="legend/raster-layout.js?v=master-v5"></script>',
                  '<script src="legend/raster-layout.js?v=master-v5"></script><script src="legend/cutout-v7.js?v=7"></script>')
play.write_text(text,encoding='utf8')
print('Wired',len(catalog['assets']),'cutout assets. Math and 6x5 RNG unchanged.')
