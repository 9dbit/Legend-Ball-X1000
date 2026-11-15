#!/usr/bin/env python3
"""Build the approved Legend Ball X1000 full-bleed portrait and motion mattes.

Preserves the approved generated image exactly in the center and synthesizes
atmospheric top/bottom extensions. Foreground WebPs use pixel-aligned soft mattes.
Run with: python3 scripts/build-fullbleed-splash.py
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
import json, math

repo=Path(__file__).resolve().parents[1]
folder=repo/'studio/assets/legend-splash'
source=folder/'originals/legend-ball-storm-of-legends-approved.png'
raw=Image.open(source).convert('RGB')
w,h=raw.size
assert (w,h)==(941,1672), f'Unexpected approved artwork size {(w,h)}'
top,bottom=258,230
height=h+top+bottom
whole=Image.new('RGB',(w,height))
whole.paste(raw,(0,top))

# Only use the extreme cloud/sky or volcanic bottom border: do not mirror
# the logo, dragon, warrior or ENTER button into the extension.
for y in range(top):
    rem=top-y-1
    idx=min(76,round((rem/top)**.85*76))
    band=raw.crop((0,idx,w,idx+1))
    brightness=1-.20*(rem/max(1,top))**1.4
    if brightness<.997: band=ImageEnhance.Brightness(band).enhance(brightness)
    whole.paste(band,(0,y))
for y in range(bottom):
    idx=max(0,h-1-round((y/max(1,bottom))**.85*100))
    band=raw.crop((0,idx,w,idx+1))
    brightness=1-.16*(y/max(1,bottom))**1.4
    if brightness<.997: band=ImageEnhance.Brightness(band).enhance(brightness)
    whole.paste(band,(0,top+h+y))

assets=folder/'sources'
assets.mkdir(parents=True,exist_ok=True)
whole.save(assets/'background.webp','WEBP',quality=91,method=6)
layers={'background':{'file':'sources/background.webp','box':[0,0,w,height],
                      'size':[w,height],'source':'pixel-preserved approved image with atmospheric extensions'}}
def mask_webp(name, polygons, feather):
    mask=Image.new('L',(w,height),0)
    draw=ImageDraw.Draw(mask)
    for polygon in polygons:
        draw.polygon([(x,y+top) for x,y in polygon],fill=255)
    mask=mask.filter(ImageFilter.GaussianBlur(feather))
    img=whole.convert('RGBA')
    img.putalpha(mask)
    img.save(assets/(name+'.webp'),'WEBP',quality=85,method=6,exact=True)
    layers[name]={'file':'sources/'+name+'.webp','box':[0,0,w,height],
                  'size':[w,height],'alpha_bbox':list(mask.getbbox()),'feather':feather}
    return img

mask_webp('character',[
    [(5,570),(70,465),(180,397),(300,383),(410,410),(520,495),
     (570,660),(650,850),(785,1050),(765,1280),(680,1390),
     (255,1430),(10,1370)]
],38)
mask_webp('dragon',[
    [(341,413),(465,386),(606,379),(786,423),(932,482),
     (940,875),(895,1038),(780,1108),(600,1020),
     (499,911),(388,710)]
],38)
mask_webp('logo',[
    [(80,111),(270,90),(695,90),(895,155),(932,305),(870,444),
     (390,465),(85,435),(20,275)]
],21)
mask_webp('enter-button',[
    [(130,1170),(815,1170),(910,1290),(933,1400),(785,1515),
     (208,1515),(37,1428),(25,1336)]
],20)

# Transparent-only flashing energy strokes, kept behind static logo.
fx=Image.new('RGBA',(w,height),(0,0,0,0))
t=ImageDraw.Draw(fx)
bolts=[
    ([(5,21),(78,90),(120,116),(165,190),(215,240)],(92,192,255,190),6),
    ([(940,24),(887,77),(849,115),(816,156)],(255,160,71,180),5),
    ([(6,980),(58,1032),(91,1105),(152,1190)],(92,170,255,175),4)
]
for coords,color,stroke in bolts:
    t.line([(x,y+top) for x,y in coords],fill=color,width=stroke,joint='curve')
blur=fx.filter(ImageFilter.GaussianBlur(17))
blur.alpha_composite(fx)
blur.save(assets/'thunder.webp','WEBP',quality=86,method=6)
layers['thunder']={'file':'sources/thunder.webp','box':[0,0,w,height],
                  'size':[w,height],'alpha':'transparent'}
# Atmospheric wide fill for landscape/desktop: use ONLY sky/volcanic border
# pixels, never duplicate the character or logo behind the portrait focal art.
wide_w,wide_h=1600,900
sky=raw.crop((0,0,w,100)).resize((wide_w,wide_h),Image.Resampling.BICUBIC)
lava=raw.crop((0,h-100,w,h)).resize((wide_w,wide_h),Image.Resampling.BICUBIC)
gradient=Image.new('L',(wide_w,wide_h),0)
gd=ImageDraw.Draw(gradient)
for yy in range(wide_h):
    t=max(0,min(1,(yy-190)/540))
    t=t*t*(3-2*t)  # continuous smoothstep: no horizontal seam
    gd.line((0,yy,wide_w,yy),fill=round(255*t))
wide=Image.composite(lava,sky,gradient)
wide=wide.filter(ImageFilter.GaussianBlur(9))
wide=ImageEnhance.Brightness(wide).enhance(.72)
wide.save(assets/'landscape-atmosphere.webp','WEBP',quality=80,method=5)
layers['landscape-atmosphere']={'file':'sources/landscape-atmosphere.webp',
    'box':[0,0,wide_w,wide_h],'size':[wide_w,wide_h],
    'purpose':'sidefill with only sky and volcanic clouds, no duplicated logo or character'}

manifest={'version':'splash-fullbleed-v3','base_size':[w,height],
          'approved_reference':'originals/legend-ball-storm-of-legends-approved.png',
          'original_size':[w,h],'extension':{'top_px':top,'bottom_px':bottom},
          'rules':{'display':'background art full-bleed with cover, centered',
                   'foreground':'source-aligned soft mattes, micro-motion',
                   'logo':'static','enter':'touch press feedback'},
          'layers':layers}
(folder/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
for key in layers:
    print(key,(assets/(key+'.webp')).stat().st_size)
print('full-bleed',whole.size,'approved reference',raw.size)
