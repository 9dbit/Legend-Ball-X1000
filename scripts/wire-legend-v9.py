"""Stage V9 curated asset library and single-coordinate layout on a feature branch only.
No Railway or production changes, and no RNG/credits/settlement source changes.
"""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
manifest=json.loads((ROOT/'studio/assets/legend-v9/manifest.json').read_text('utf8'))
P=ROOT/'studio/project.json'
data=json.loads(P.read_text('utf8'))
layers={x['id']:x for x in data['layers']}
# 1080x1920 design coordinate frame. No implicit JS offsets or mixed percent/cqw.
layout={
  'sky':((0,0,1080,1920),0,'scene-sky.webp'),
  'guardian':((18,6,388,495),4,'hero-master.png'),
  'dragon':((380,0,685,280),3,'dragon-master.png'),
  'logo':((362,136,660,264),6,'logo-master.png'),
  'winbanner':((241,428,598,105),9,'win-frame.png'),
  'winamount':((351,439,378,82),12,None),
   'bonuscopy':((223,529,634,25),18,None),
   'reelframe':((28,560,1024,805),16,'reel-frame.png'),
   'reels':((90,580,900,750),14,None),
   'buybtn':((21,1380,501,119),20,'buy-frame.png'),
   'antebtn':((553,1380,506,119),20,'bonus-frame.png'),
   'creditpanel':((28,1511,452,101),19,'credit-frame.png'),
   'credits':((65,1522,370,81),22,None),
   'minusbtn':((526,1514,102,96),22,'minus.png'),
   'betpanel':((630,1511,288,101),19,'bet-frame.png'),
   'betlabel':((655,1522,238,81),22,None),
   'plusbtn':((938,1514,102,96),22,'plus.png'),
   'spinbutton':((414,1628,252,252),25,'spin.png'),
   'autobtn':((217,1681,136,136),24,'auto.png'),
   'turbobtn':((727,1681,136,136),24,'turbo.png'),
  'menubtn':((39,1808,110,110),28,'menu.png'),
  'soundbtn':((810,1808,108,108),28,'sound.png'),
  'infobtn':((943,1808,110,110),28,'info.png'),
  'provider':((290,1889,500,24),30,None),
}
for id,(rect,z,asset) in layout.items():
  lay=layers[id]
  lay.update(dict(zip(['x','y','w','h'],rect)))
  lay.update(z=z,visible=True,locked=False)
  if asset:lay['asset']='legend-v9/'+asset
  elif id in ('winamount','bonuscopy','credits','betlabel','provider'):lay.pop('asset',None)
  lay.pop('crop',None)
layers['hint']['visible']=False
data['ui']['layout']='curated-v9-single-coordinate'
data['ui']['designWidth']=1080
data['ui']['designHeight']=1920
data['presentation']='legend-raster-v2'
P.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf8')

release=ROOT/'release-store.mjs'
body=release.read_text('utf8')
if 'legendV9Assets' not in body:
  token='export const shippedAssets = ['
  assert token in body
  assets=[p['path'] for p in manifest['assets']]
  body=body.replace(token,'export const legendV9Assets = '+json.dumps(assets,ensure_ascii=False,indent=2)+';\n'+token+'  ...legendV9Assets,\n',1)
  release.write_text(body,encoding='utf8')
studio=ROOT/'studio/studio.js'
body=studio.read_text('utf8')
if '...(window.LEGEND_CUTOUT_LIBRARY||[])' in body:
  body=body.replace('...(window.LEGEND_CUTOUT_LIBRARY||[])','...(window.LEGEND_V9_ASSET_LIBRARY||[])',1)
else:
  assert '...(window.LEGEND_V9_ASSET_LIBRARY||[])' in body
body=body.replace("const storageKey='legend-ball-cutout-v7-20261113'","const storageKey='legend-ball-curated-v9-preview'")
body=body.replace("let lastLibraryAsset='legend-cutouts/logo.png'","let lastLibraryAsset='legend-v9/logo-master.png'")
body=body.replace("if(!path.startsWith('legend-cutouts/')&&target&&target.kind==='image')",
                  "if(!path.startsWith('legend-v9/')&&target&&target.kind==='image')")
# V9 addAsset uses existing natural dimensions, and new assets go to separate layers.
studio.write_text(body,encoding='utf8')
html=ROOT/'studio/index.html'
body=html.read_text('utf8')
body=body.replace('assets/legend-cutouts/catalog.js?v=cutout-v8-20261113','assets/legend-v9/catalog.js?v=curated-v9-1')
body=body.replace('studio.js?v=cutout-v8-20261113','studio.js?v=curated-v9-1')
html.write_text(body,encoding='utf8')
play=ROOT/'play/index.html'
body=play.read_text('utf8')
if '<link rel="stylesheet" href="legend/cutout-v7.css?v=cutout-v8-20261113">' in body:
  body=body.replace('<link rel="stylesheet" href="legend/cutout-v7.css?v=cutout-v8-20261113">',
                    '<link rel="stylesheet" href="legend/curated-v9.css?v=v9-preview-1">',1)
else:
  assert 'legend/curated-v9.css?v=v9-preview-1' in body
body=body.replace('<script src="legend/cutout-v7.js?v=cutout-v8-20261113"></script>',
                  '<script src="legend/curated-v9.js?v=v9-preview-1"></script>',1)
# V9 asset versioning stays only on review branch. Production never sees it.
body=body.replace('<link rel="stylesheet" href="legend/approved-master-v5.css?v=locked-1">','',1)
body=body.replace('<meta name="legend-ui-build" content="cutout-v8-20261113">',
                  '<meta name="legend-ui-build" content="curated-v9-review">',1)
# V8 update guard continues to identify *published* live build. Review branch
# uses the same isolated local server only; never deploy this preview as live.
body=body.replace('<script src="legend/update-guard.js?v=cutout-v8-20261113" defer></script>','',1)
# SVG Play glyph is intentionally absent from the game renderer.
play.write_text(body,encoding='utf8')
print('Staged V9 source-of-truth Studio layout with',len(manifest['assets']),'curated candidate assets')