"""Derive a portrait-safe, raster-only UI from the approved master JPEG.
Original approved reference files remain unchanged. Pillow 11.x required."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
import json

ROOT=Path(__file__).resolve().parents[1]
ASSET=ROOT/'studio/assets/legend-master'
RES=Image.Resampling.LANCZOS

def build_backdrop():
    original=Image.open(ASSET/'gameplay-backdrop.webp').convert('RGB')
    width,height=original.size
    assert (width,height)==(1080,1920)
    scene=original.copy()
    # Defocus the original large hero behind a reduced-size composite; no duplicates.
    haze=original.crop((0,0,width,700)).filter(ImageFilter.GaussianBlur(44))
    haze=ImageEnhance.Brightness(haze).enhance(.40)
    scene.paste(haze,(0,0))
    top=original.crop((0,0,width,480))
    scaled=top.resize((round(top.width*.8),round(top.height*.8)),RES)
    mask=Image.new('L',scaled.size)
    a=mask.load()
    for y in range(scaled.height):
        for x in range(scaled.width):
            edge=min(1.,x/32,(scaled.width-1-x)/32,(scaled.height-1-y)/10)
            a[x,y]=max(0,min(255,round(255*edge)))
    scene.paste(scaled,((width-scaled.width)//2,-62),mask)
    # Darken the gap under the scaled artwork, behind the live WIN ornament.
    veil=Image.new('RGB',(width,360),(25,9,35))
    alpha=Image.new('L',(width,360))
    da=alpha.load()
    for y in range(360):
        t=min(1,max(0,(y-0)/180))
        v=int(28+182*t)
        for x in range(width): da[x,y]=v
    scene.paste(veil,(0,350),alpha)
    scene.save(ASSET/'gameplay-square-backdrop.webp',quality=91,method=6)

def build_frame():
    original=Image.open(ASSET/'reel-frame.png').convert('RGBA')
    assert original.size==(921,510)
    w,h=original.size
    new_h=738
    # Stretch ONLY the vertical middle. Gold corner sculpting stays unscaled.
    top_h=96
    bottom_h=92
    result=Image.new('RGBA',(w,new_h),(0,0,0,0))
    result.paste(original.crop((0,0,w,top_h)),(0,0))
    middle=original.crop((0,top_h,w,h-bottom_h))
    result.paste(middle.resize((w,new_h-top_h-bottom_h),RES),(0,top_h))
    result.paste(original.crop((0,h-bottom_h,w,h)),(0,new_h-bottom_h))
    # Cropped screenshot had partial symbols below transparent grid. Remove only
    # these fragments, leaving the original gold rim/corners intact.
    # Transparent center prevents the art image obscuring the live reels.
    pix=result.load()
    for y in range(new_h-92,new_h-18):
        for x in range(58,w-58):
            pix[x,y]=(0,0,0,0)
    result.save(ASSET/'reel-frame-square.png',optimize=True)

def clean_panel(name,rects):
    art=Image.open(ASSET/name).convert('RGBA')
    # Synthesize the original dark enamel center, without frozen JPEG numerals.
    # For each scanline blend clean dark pixels outside the engraved number area.
    px=art.load()
    for x1,y1,x2,y2 in rects:
        for y in range(y1,min(y2,art.height)):
            left=px[max(0,x1-5),y]
            right=px[min(art.width-1,x2+5),y]
            for x in range(x1,min(x2,art.width)):
                t=(x-x1)/max(1,x2-x1)
                c=tuple(int(left[k]*(1-t)+right[k]*t) for k in range(3))
                mix=max(0,min(1,min(x-x1,x2-x)/7))
                old=px[x,y]
                px[x,y]=tuple(round(old[k]*(1-mix)+c[k]*mix) for k in range(3))+(old[3],)
    target=name.replace('.png','-clean.png')
    art.save(ASSET/target,optimize=True)
    return target

def project_layout():
    path=ROOT/'studio/project.json'
    data=json.loads(path.read_text('utf8'))
    layers={x['id']:x for x in data['layers']}
    updates={
      'sky':(0,0,1080,1920),
      'winbanner':(202,354,676,96),'winamount':(276,367,528,70),
      'bonuscopy':(238,454,604,23),
      'reelframe':(12,481,1056,851),
      'reels':(72,510,936,780),
      'buybtn':(20,1333,502,119),'antebtn':(550,1333,510,119),
      'hint':(180,1450,720,22),
      'creditpanel':(33,1463,451,96),'betpanel':(492,1463,557,96),
      'credits':(50,1468,420,84),'betlabel':(638,1468,260,84),
      'minusbtn':(502,1470,96,96),'plusbtn':(936,1470,96,96),
      'spinbutton':(407,1563,266,266),
      'autobtn':(222,1630,137,137),'turbobtn':(722,1630,137,137),
      'menubtn':(36,1778,117,117),'infobtn':(920,1778,117,117),
      'provider':(270,1865,540,26)
    }
    for key,coords in updates.items():
        lay=layers[key]
        lay.update(dict(zip(('x','y','w','h'),coords)))
    layers['sky']['asset']='legend-master/gameplay-square-backdrop.webp'
    layers['reelframe']['asset']='legend-master/reel-frame-square.png'
    layers['buybtn']['asset']='legend-master/buy-panel-clean.png'
    layers['antebtn']['asset']='legend-master/bonus-panel-clean.png'
    layers['creditpanel']['asset']='legend-master/credit-panel-clean.png'
    layers['betpanel']['asset']='legend-master/bet-panel-clean.png'
    data['ui']['layout']='square-6x5-raster-mobile-v6'
    path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf8')

if __name__=='__main__':
    build_backdrop()
    build_frame()
    clean_panel('buy-panel.png',[(105,72,344,119)])
    clean_panel('bonus-panel.png',[(100,60,448,117)])
    clean_panel('credit-panel.png',[(70,68,310,97)])
    clean_panel('bet-panel.png',[(159,73,326,97)])
    project_layout()
    print('Square UI raster artwork generated and Studio geometry updated.')