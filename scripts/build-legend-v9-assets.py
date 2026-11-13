"""Legend Ball V9 curated raster assets, independent transparent alpha.
No source originals or live snapshot are modified.
Requires Pillow, numpy, OpenCV. Intended for manual visual review before release.
"""
from pathlib import Path
import hashlib, json, math, shutil
import cv2, numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageEnhance

ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'studio/assets/legend-cutouts'
ALT=ROOT/'studio/assets/legend-raster'
MASTER=ROOT/'studio/assets/legend-master'
DEST=ROOT/'studio/assets/legend-v9'
DEST.mkdir(parents=True,exist_ok=True)
RES=Image.Resampling.LANCZOS
ITEMS=[]
def save(name,image,label,origin,group,status='candidate'):
    if not image.mode=='RGBA' and name.endswith('.png'):image=image.convert('RGBA')
    path=DEST/name
    if path.suffix=='.webp':image.save(path,'WEBP',quality=92,method=6)
    else:image.save(path,'PNG',optimize=True)
    a=np.array(image.getchannel('A')) if image.mode=='RGBA' else None
    if a is not None:
        assert int(a.min())==0,f'{name} has no transparent exterior'
    corner=max(2,round(min(image.width,image.height)*.06)) if a is not None else 0
    corners=np.concatenate([a[:corner,:corner].ravel(),a[:corner,-corner:].ravel(),
      a[-corner:,:corner].ravel(),a[-corner:,-corner:].ravel()]) if a is not None else None
    ITEMS.append(dict(path='legend-v9/'+name,label=label,group=group,source=origin,
        alphaCornerFraction=round(float(np.mean(corners>25)),4) if corners is not None else 0,
        width=image.width,height=image.height,transparent=bool(a is not None),
        alphaEdgeCoverage=round(float(np.mean(np.concatenate([
          a[:3,:].ravel(),a[-3:,:].ravel(),a[:,:3].ravel(),a[:,-3:].ravel()])>25)),4) if a is not None else 0,
        sha256=hashlib.sha256(path.read_bytes()).hexdigest(),status=status))
    return image

def cut_src(name):return Image.open(SRC/name).convert('RGBA')
def make_hero():
    src=cut_src('hero.png')
    arr=np.asarray(src).copy()
    h,w=arr.shape[:2]
    alpha=arr[:,:,3].copy()
    # The source alpha still kept bright sky around the figure. A color mask
    # rejects the cyan/purple scenery while retaining orange armor, skin
    # and black hair (including low-luma spikes).
    r,g,b=[arr[:,:,k].astype(np.float32) for k in range(3)]
    hsv=cv2.cvtColor(arr[:,:,:3],cv2.COLOR_RGB2HSV)
    hue,sat,val=[hsv[:,:,k] for k in range(3)]
    y,x=np.indices((h,w))
    blue=(hue>=91)&(hue<=145)&(sat>=58)&(b>r*1.09)&(val>55)
    # Large blue lightning / sky insets between hair spikes are background.
    # Keep dark hair cores and direct orange ball / jersey highlights.
    blue=blue & ~((y<200)&(r<84)&(g<85)&(b<104))
    solid=np.uint8((~blue)&(alpha>20))*255
    # Critical: remove stray logo ornament and baked WIN panel below body.
    mask=np.zeros((h,w),np.uint8)
    contour=np.array([
      (159,0),(228,0),(300,15),(365,28),(392,58),
      (397,118),(382,163),(334,198),(332,234),(313,255),
      (343,290),(355,325),(354,355),(373,390),(380,425),
      (362,453),(362,481),(337,508),(304,531),(265,541),
      (198,535),(130,533),(95,521),(55,518),(25,493),
      (4,445),(2,399),(4,369),(22,350),(22,318),
      (40,268),(65,237),(88,204),(78,178),(47,155),
      (16,119),(30,87),(67,52),(101,25)
    ],np.int32)
    cv2.fillPoly(mask,[contour],255)
    # Avoid the original gold WIN border at the very bottom of source.
    solid[y>=540]=0
    solid=cv2.bitwise_and(solid,mask)
    # Retain naturally colored hair strokes: grow slightly around bright edges.
    solid=cv2.morphologyEx(solid,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
    solid=cv2.GaussianBlur(solid,(0,0),.95)
    alpha=np.minimum(alpha,solid)
    alpha[:2,:]=0;alpha[-2:,:]=0;alpha[:,:2]=0;alpha[:,-2:]=0
    arr[:,:,3]=alpha
    return Image.fromarray(arr,'RGBA')

def make_dragon():
    src=cut_src('dragon.png')
    arr=np.asarray(src).copy();h,w=arr.shape[:2]
    a=arr[:,:,3].copy()
    r,g,b=[arr[:,:,k].astype(np.float32) for k in range(3)]
    hsv=cv2.cvtColor(arr[:,:,:3],cv2.COLOR_RGB2HSV)
    hue,sat,val=[hsv[:,:,k] for k in range(3)]
    yy,xx=np.indices((h,w))
    # Filter bright saturated background blues; dragon is mostly dark
    # blue scales / gold edge trim and orange eyes, scales.
    sky=(hue>=94)&(hue<=145)&(val>125)&(b>r*1.19)&(b>g*1.12)
    # Preserve blue horns and tips where close to dragon head.
    sky &= ~((xx>380)&(yy<90))
    a=np.where(sky,0,a).astype(np.uint8)
    # Remove loose sky outside an anatomically guided dragon silhouette.
    poly=np.array([
      (28,0),(498,0),(554,24),(601,38),(638,60),
      (648,105),(635,148),(594,199),(557,217),
      (513,202),(477,185),(425,183),(399,157),(346,149),
      (274,148),(215,165),(151,155),(98,137),(51,106),
      (3,69),(0,28)
    ],np.int32)
    m=np.zeros((h,w),np.uint8);cv2.fillPoly(m,[poly],255)
    a=cv2.bitwise_and(a,m)
    a=cv2.GaussianBlur(a,(0,0),1.0)
    a[:2,:]=0;a[-2:,:]=0;a[:,:2]=0;a[:,-2:]=0
    arr[:,:,3]=a
    return Image.fromarray(arr,'RGBA')

def make_logo():
    src=cut_src('logo.png')
    arr=np.asarray(src).copy();alpha=arr[:,:,3]
    h,w=alpha.shape
    y,x=np.indices((h,w))
    # Discard noisy detached fragments left/top and right/bottom,
    # preserving the central approved winged lettering.
    alpha[(x<35)&(y<128)]=0
    alpha[(x>556)&(y>212)]=0
    alpha[(x<84)&(y>229)]=0
    alpha[(y>280)]=0
    # Keep sufficiently large connected gold/silver wordmark areas;
    # very small isolated sky specks are removed.
    binary=np.uint8(alpha>40)
    n,lab,stats,_=cv2.connectedComponentsWithStats(binary,8)
    keep=np.zeros_like(binary)
    for i in range(1,n):
        if stats[i,cv2.CC_STAT_AREA]>=55:keep[lab==i]=1
    keep=cv2.dilate(keep,np.ones((3,3),np.uint8),iterations=1)
    alpha=np.where(keep,alpha,0).astype(np.uint8)
    alpha=cv2.GaussianBlur(alpha,(0,0),.7)
    alpha[:2,:]=0;alpha[-2:,:]=0;alpha[:,:2]=0;alpha[:,-2:]=0
    arr[:,:,3]=alpha
    return Image.fromarray(arr,'RGBA')

def scale_poly(points,k):return [(int(x*k),int(y*k)) for x,y in points]
def plaque(name, w,h, main=(26,10,49), accent=(251,188,72), label='Panel', wing=False):
    # Fully rasterized metallic bevel frame: it is generated as a real
    # transparent PNG, not a masked rectangular screenshot crop.
    k=3;W=w*k;H=h*k
    image=Image.new('RGBA',(W,H),(0,0,0,0))
    outer=[(25,6),(w-26,6),(w-5,h//2),(w-24,h-7),(25,h-7),(5,h//2)]
    middle=[(33,11),(w-34,11),(w-12,h//2),(w-31,h-12),(33,h-12),(12,h//2)]
    inner=[(39,17),(w-40,17),(w-18,h//2),(w-37,h-19),(39,h-19),(18,h//2)]
    # Glowing edge with soft alpha; no rectangular pixel background.
    glow=Image.new('RGBA',(W,H),(0,0,0,0));g=ImageDraw.Draw(glow)
    g.line(scale_poly(outer,k)+[tuple(int(q*k) for q in outer[0])],fill=accent+(170,),width=8*k,joint='curve')
    glow=glow.filter(ImageFilter.GaussianBlur(6*k))
    image=Image.alpha_composite(image,glow)
    d=ImageDraw.Draw(image)
    d.polygon(scale_poly(outer,k),fill=(48,22,45,252),outline=(255,206,101,255),width=2*k)
    d.line(scale_poly(outer,k)+[scale_poly(outer,k)[0]],fill=(255,220,131,250),width=2*k,joint='curve')
    d.polygon(scale_poly(middle,k),fill=(71,37,49,255),outline=(131,55,27,255),width=2*k)
    d.polygon(scale_poly(inner,k),fill=main+(247,),outline=(233,145,62,220),width=k)
    # metallic top/highlight and bottom shade
    d.line([(38*k,16*k),((w-38)*k,16*k)],fill=(255,220,160,165),width=k)
    d.line([(39*k,(h-17)*k),((w-39)*k,(h-17)*k)],fill=accent+(120,),width=k)
    if wing:
      # Stylized side fins from the approved dragon-gold art direction.
      for flip in (False,True):
        for s in range(3):
          pts=[(8+s*4,h//2),(18+s*4,23-s*2),(38+s*5,12+s*3),
               (22+s*2,h//2-2)]
          if flip:pts=[(w-x,y) for x,y in pts]
          d.polygon(scale_poly(pts,k),fill=(161+20*s,82+14*s,31,250))
          d.line(scale_poly(pts+[pts[0]],k),fill=(255,185,83,225),width=2*k)
    return image.resize((w,h),RES)

def make_buttons():
    for val in ('minus','plus'):
      W=114;H=96;k=3
      im=Image.new('RGBA',(W*k,H*k),(0,0,0,0))
      p=[(11,10),(W-19,10),(W-4,H//2),(W-19,H-9),(11,H-9),(2,H//2)]
      d=ImageDraw.Draw(im)
      d.polygon(scale_poly(p,k),fill=(102,16,28,240),outline=(251,189,71,255),width=3*k)
      d.line(scale_poly([(19,17),(W-25,17),(W-13,H//2)],k),fill=(255,135,62,210),width=3*k)
      d.line(scale_poly([(W-25,H-16),(20,H-16),(12,H//2)],k),fill=(144,52,28,255),width=3*k)
      cx=W//2;cy=H//2;tw=25;th=5
      d.rounded_rectangle(((cx-tw)*k,(cy-th)*k,(cx+tw)*k,(cy+th)*k),radius=2*k,fill=(255,231,157,255))
      if val=='plus':
        d.rounded_rectangle(((cx-th)*k,(cy-tw)*k,(cx+th)*k,(cy+tw)*k),radius=2*k,fill=(255,231,157,255))
      save(val+'.png',im.resize((W,H),RES),val.upper()+' independent icon','vector-raster procedural approved palette','buttons','ready')

def frame_nine_slice(src,tw=1024,th=805):
    # Preserve the original top, bottom, and four ornate corners at native size.
    # The transparent opening is stretched, not its decorative corner motifs.
    iw,ih=src.size;L=112;R=112;T=105;B=105
    out=Image.new('RGBA',(tw,th),(0,0,0,0))
    xs=[(0,L,0,L),(L,iw-R,L,tw-R),(iw-R,iw,tw-R,tw)]
    ys=[(0,T,0,T),(T,ih-B,T,th-B),(ih-B,ih,th-B,th)]
    for x1,x2,u1,u2 in xs:
      for y1,y2,v1,v2 in ys:
        patch=src.crop((x1,y1,x2,y2))
        if (x2-x1,y2-y1)!=(u2-u1,v2-v1):
          patch=patch.resize((u2-u1,v2-v1),RES)
        out.paste(patch,(u1,v1),patch)
    # Strict transparent center. Never paint a rectangular image over game reels.
    a=np.asarray(out.getchannel('A')).copy()
    a[94:th-94,94:tw-94]=0
    a[:2,:]=0;a[-2:,:]=0;a[:,:2]=0;a[:,-2:]=0
    out.putalpha(Image.fromarray(a,'L'))
    return out

def sound_png():
    k=3;w=112;h=112
    im=Image.new('RGBA',(w*k,h*k),(0,0,0,0))
    d=ImageDraw.Draw(im)
    p=[(25,7),(87,7),(107,32),(107,81),(87,105),(25,105),(5,81),(5,32)]
    d.polygon(scale_poly(p,k),fill=(25,19,52,242),outline=(255,190,79,255),width=3*k)
    d.polygon(scale_poly([(26,45),(38,45),(51,31),(51,82),(38,68),(26,68)],k),
              fill=(255,227,160,255))
    for rad in (18,25):
      d.arc((int((46-rad)*k),int((56-rad)*k),int((46+rad)*k),int((56+rad)*k)),
            start=-58,end=58,fill=(255,218,144,255),width=3*k)
    return im.resize((w,h),RES)

def main():
  save('scene-sky.webp',Image.open(SRC/'scene-sky.webp').convert('RGB'),'Clean celestial background','V7 seamless base','background','ready')
  save('hero-master.png',make_hero(),'Hero | curated black-hair mask','Approved JPEG via V7 crop + curated alpha','characters','review')
  save('dragon-master.png',make_dragon(),'Dragon | curated alpha','Approved JPEG via V7 crop + curated alpha','characters','review')
  save('logo-master.png',make_logo(),'Legend Ball premium logo','Approved JPEG via V7 color mask + cleanup','branding','review')
  # Alternative native source art is already more clean but not master-matching.
  for name in ['hero','dragon','logo','reel-frame']:
    im=Image.open(ALT/(name+'.png')).convert('RGBA')
    save(name+'-alternate.png',im,'Alternate original '+name,'Original legend-raster/'+name+'.png','alternatives','review')
  save('win-frame.png',plaque('win',571,117,(29,6,52),(255,186,79),'WIN',True),'WIN gold winged panel','Rasterized new bevel','panels','ready')
  save('reel-frame.png',frame_nine_slice(Image.open(ALT/'reel-frame.png').convert('RGBA')),
       'Nine-slice gold reel frame','Original legend-raster/reel-frame.png (corner-preserving)','frames','ready')
  save('buy-frame.png',plaque('buy',428,123,(36,9,47),(252,181,80)),'BUY SPIN gold panel','Rasterized new bevel','panels','ready')
  save('bonus-frame.png',plaque('bonus',490,123,(15,23,67),(80,168,255)),'Bonus blue panel','Rasterized new bevel','panels','ready')
  save('credit-frame.png',plaque('credit',380,97,(36,9,53),(251,189,86)),'Virtual credit panel','Rasterized new bevel','panels','ready')
  save('bet-frame.png',plaque('bet',270,97,(35,9,53),(244,172,81)),'Total bet center-only panel','Rasterized new bevel','panels','ready')
  make_buttons()
  save('sound.png',sound_png(),'Audio toggle independent raster','Procedural raster gold plaque','buttons','ready')
  for src,name in [('spin.png','spin.png'),('auto.png','auto.png'),('turbo.png','turbo.png'),('menu.png','menu.png'),('info.png','info.png')]:
    save(name,cut_src(src),'Approved '+name,'V7 cutout '+src,'buttons','review')
  for original in sorted(SRC.glob('symbol-*.png'))+sorted(SRC.glob('scatter-*.png'))+[SRC/'multiplier.png']:
    save(original.name,Image.open(original).convert('RGBA'),original.stem,'V7 symbol (original master)','reels','review')
  manifest={'schema':'legend/curated-v9','status':'VISUAL_REVIEW_REQUIRED','activeProduction':False,
   'originalMasterSha256':hashlib.sha256((MASTER/'gameplay-approved-reference.jpg').read_bytes()).hexdigest(),
   'designSize':[1080,1920],'assets':ITEMS,
   'limitations':['Hero, dragon and premium logo derived from flat JPEG','Needs manual matte boundary review on real handset','Not for production/commercial use without artwork rights clearance']}
  (DEST/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
  catalog=[dict(id='v9-'+x['path'].split('/')[-1].replace('.','-'),path=x['path'],label=x['label'],
      group=x['group'],kind='symbol' if x['group']=='reels' else 'image',naturalWidth=x['width'],
      naturalHeight=x['height'],transparent=x['transparent'],quality=x['status']) for x in ITEMS]
  (DEST/'catalog.js').write_text('window.LEGEND_V9_ASSET_LIBRARY='+json.dumps(catalog,ensure_ascii=False)+';\n',encoding='utf8')
  print('V9 candidate assets:',len(ITEMS),'manifest',DEST/'manifest.json')

if __name__=='__main__':main()