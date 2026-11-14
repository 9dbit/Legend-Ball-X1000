"""Create seamless source-aligned splash motion mattes from the approved raster.

The sharp approved master remains the visible background. Each foreground image
uses the same pixel grid and a generously feathered, nonrectangular matte.
Subpixel animation preserves continuity without exposing inpainted voids.
Do not substitute the older alternate hero/dragon assets.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import json

root=Path(__file__).resolve().parents[1]
master_path=root/'studio/assets/legend-master/splash-master.jpg'
master=Image.open(master_path).convert('RGB')
w,h=master.size
assert (w,h)==(864,1536), f'Unexpected master size: {(w,h)}'
folder=root/'studio/assets/legend-splash/sources'
folder.mkdir(parents=True,exist_ok=True)

def motion_layer(name, polygons, feather=20, quality=89):
    matte=Image.new('L',(w,h),0)
    draw=ImageDraw.Draw(matte)
    for outline in polygons:
        draw.polygon(outline,fill=255)
    matte=matte.filter(ImageFilter.GaussianBlur(feather))
    # Every layer shares the exact same canvas/pixel positions as master.
    layer=master.convert('RGBA')
    layer.putalpha(matte)
    target=folder/(name+'.webp')
    layer.save(target,'WEBP',quality=quality,method=5,exact=True)
    alpha=layer.getchannel('A')
    return {'file':f'sources/{name}.webp','box':[0,0,w,h],
            'width':w,'height':h,'alpha_bbox':alpha.getbbox(),
            'edge':'soft-feather','feather_px':feather}

# Hero: restrict motion matte to the figure, never a full rectangular crop.
# Original background remains visible underneath at all times.
character_regions=[
 [(5,520),(90,435),(190,355),(340,350),(458,410),(520,510),
  (565,730),(640,875),(700,1045),(665,1170),(490,1250),
  (170,1245),(15,1180)],
]
dragon_regions=[
 [(352,445),(465,390),(610,380),(770,410),(847,482),
  (852,670),(790,818),(825,990),(785,1180),(674,1170),
  (563,1060),(500,900),(406,735)],
]
logo_regions=[
 [(55,38),(235,10),(615,10),(810,64),(850,190),
  (820,330),(600,383),(230,380),(25,305),(8,146)],
]
button_regions=[
 [(110,1260),(235,1202),(620,1202),(750,1255),(837,1350),
  (756,1466),(624,1510),(210,1510),(42,1440),(28,1365)],
]

layers={}
# Crisp, unmodified, approved 9:16 art. No baked Gaussian blur anywhere.
background=folder/'background.webp'
master.save(background,'WEBP',quality=94,method=6)
layers['background']={'file':'sources/background.webp','box':[0,0,w,h],
                      'width':w,'height':h,'render':'sharp original master'}
for name,shape,feather in [
    ('character',character_regions,30),
    ('dragon',dragon_regions,34),
    ('logo',logo_regions,15),
    ('enter-button',button_regions,22),
]:
    layers[name]=motion_layer(name,shape,feather)

# Animated light accents only, drawn separately on fully transparent canvas.
thunder=Image.new('RGBA',(w,h),(0,0,0,0))
d=ImageDraw.Draw(thunder)
for coords,color,thickness in [
    ([(0,70),(65,128),(110,118),(170,222),(250,247),(290,310)],(75,185,255,230),5),
    ([(861,40),(780,110),(735,172),(690,270),(645,318)],(255,153,46,230),5),
    ([(0,880),(70,933),(110,975),(175,1055)],(75,185,255,215),4),
]:
    d.line(coords,fill=color,width=thickness,joint='curve')
glow=thunder.filter(ImageFilter.GaussianBlur(13))
glow.alpha_composite(thunder)
glow.save(folder/'thunder.webp','WEBP',quality=85,method=5)
layers['thunder']={'file':'sources/thunder.webp','box':[0,0,w,h],
                   'width':w,'height':h}
manifest={'version':'splash-layered-v2-sharp','base_size':[w,h],
          'composition':'pixel-aligned feathered mattes over pristine master',
          'layers':layers}
(root/'studio/assets/legend-splash/manifest.json').write_text(
    json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print('Sharp original + feathered layers:')
for name in layers:
    filename=folder/(name+'.webp')
    print(f'  {name:12} {filename.stat().st_size:>8} bytes',layers[name].get('alpha_bbox',''))
