"""Export individually positionable RGBA cutouts from the locked approved artwork.
This script NEVER rewrites master JPEGs or any game/settlement source.
Pillow + OpenCV; outputs versioned assets for the editable Game Studio library."""
from pathlib import Path
import hashlib, json, math, shutil
import numpy as np, cv2
from PIL import Image,ImageDraw,ImageFilter,ImageEnhance

ROOT=Path(__file__).resolve().parents[1]
MASTER=ROOT/'studio/assets/legend-master'
DEST=ROOT/'studio/assets/legend-cutouts'
DEST.mkdir(exist_ok=True)
SOURCE=Image.open(MASTER/'gameplay-approved-reference.jpg').convert('RGB')
SOURCE_ARR=np.asarray(SOURCE)
RES=Image.Resampling.LANCZOS
CATALOG=[]

def register(name, category, label, source, obj, role='art'):
    path=DEST/name
    if name.endswith('.webp'):
        obj.convert('RGB').save(path,'WEBP',quality=91,method=6)
    else:
        obj.save(path,'PNG',optimize=True)
    im=Image.open(path)
    alpha=im.getchannel('A') if im.mode=='RGBA' else None
    info={'path':'legend-cutouts/'+name,'label':label,'group':category,'kind':role,
          'size':list(im.size),'alpha':bool(alpha),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),
          'bytes':path.stat().st_size,'source':source}
    if alpha:
        info['alphaExtrema']=list(alpha.getextrema())
        info['opaqueFraction']=round(float(np.count_nonzero(np.asarray(alpha)==255))/np.asarray(alpha).size,4)
        if not alpha.getextrema()[0] == 0:
            raise ValueError(name+' missing transparent exterior')
    CATALOG.append(info)
    return im

def mask_poly(size, points, blur=1.2):
    # Soft alpha anti-aliasing, no rectangular cut/visible cut-lines.
    m=Image.new('L',size,0)
    ImageDraw.Draw(m).polygon(points,fill=255)
    return m.filter(ImageFilter.GaussianBlur(blur)) if blur else m

def crop_rgba(source, box, mask):
    base=source.crop(box).convert('RGBA')
    base.putalpha(mask)
    return base

def rgba_from_cv(src_arr, box, mask):
    x1,y1,x2,y2=box
    image=Image.fromarray(src_arr[y1:y2,x1:x2]).convert('RGBA')
    image.putalpha(Image.fromarray(mask[y1:y2,x1:x2],'L'))
    return image

def make_grabcut(name,box,broad,inside):
    # Source remains unmodified. Probable/definite foreground seeds
    # allow complex hair spikes and dragon contours to be segmented.
    h,w=SOURCE_ARR.shape[:2]
    mask=np.full((h,w),cv2.GC_BGD,np.uint8)
    cv2.fillPoly(mask,[np.array(broad,np.int32)],cv2.GC_PR_FGD)
    cv2.fillPoly(mask,[np.array(inside,np.int32)],cv2.GC_FGD)
    # reliable BGD samples around the polygon / distinct foreground seeds.
    cv2.grabCut(cv2.cvtColor(SOURCE_ARR,cv2.COLOR_RGB2BGR),mask,None,
                np.zeros((1,65),np.float64),np.zeros((1,65),np.float64),5,cv2.GC_INIT_WITH_MASK)
    binary=np.isin(mask,[cv2.GC_FGD,cv2.GC_PR_FGD]).astype('uint8')*255
    binary=cv2.morphologyEx(binary,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
    binary=cv2.GaussianBlur(binary,(0,0),1.3)
    return rgba_from_cv(SOURCE_ARR,box,binary)

def make_logo():
    # Alpha extracted from foreground gold/silver lettering, wing, and fire,
    # with a soft chromatic glow. Irregular silhouette, not a cropped JPEG rectangle.
    box=(305,184,907,477)
    y1,y2=box[1],box[3]
    src=SOURCE_ARR[y1:y2,box[0]:box[2]]
    r,g,b=[src[:,:,k].astype(np.float32) for k in range(3)]
    hsv=cv2.cvtColor(src,cv2.COLOR_RGB2HSV)
    sat=hsv[:,:,1]
    val=hsv[:,:,2]
    gold=(r>116)&(g>62)&(r>b*1.08)&(sat>55)
    silver=(r>84)&(g>106)&(b>119)&(val>125)&(sat<195)
    flame=(r>166)&(g>89)&(sat>75)
    colored=((gold|silver|flame).astype(np.uint8)*255)
    w,h=src.shape[1],src.shape[0]
    silhouette=mask_poly((w,h),[
        (16,87),(121,78),(170,55),(211,25),(296,5),(379,37),
        (425,62),(553,75),(598,161),(528,205),(513,255),
        (422,266),(301,283),(119,270),(45,239),(1,189)
    ],blur=2)
    constrained=np.asarray(silhouette)>50
    colored=np.where(constrained,colored,0).astype('uint8')
    # Keep dark sculpted edges near high-luminance foreground, but not blue sky.
    colored=cv2.morphologyEx(colored,cv2.MORPH_CLOSE,np.ones((5,5),np.uint8))
    colored=cv2.dilate(colored,np.ones((8,8),np.uint8),iterations=1)
    colored=cv2.GaussianBlur(colored,(0,0),2.7)
    colored=np.minimum(colored,np.asarray(silhouette)).astype('uint8')
    # Source sky/hero fragments at the far-left of the wordmark are not logo art.
    colored[:,0:23]=0
    colored[0:76,0:96]=0
    return rgba_from_cv(SOURCE_ARR,box,np.pad(colored,((y1,SOURCE_ARR.shape[0]-y2),(box[0],SOURCE_ARR.shape[1]-box[2]))))

def sky():
    # Replace baked characters/logo behind the UI with an unbranded,
    # smooth celestial atmosphere. Preserve lava/rocks at bottom.
    raw=Image.open(MASTER/'gameplay-backdrop.webp').convert('RGB')
    w,h=raw.size
    base=raw.copy()
    top=raw.crop((0,0,w,800)).filter(ImageFilter.GaussianBlur(90))
    top=ImageEnhance.Brightness(top).enhance(.58)
    # Remove all sharp silhouettes: gradient dark violet/blue atmospheric field
    arr=np.asarray(top).astype(np.float32)
    yy=np.linspace(0,1,800,dtype=np.float32)[:,None,None]
    xs=np.linspace(-1,1,w,dtype=np.float32)[None,:,None]
    tint=np.zeros_like(arr)
    tint[:,:,:]=np.array([13,13,43],dtype=np.float32)
    tint[:,:,2]+=12*np.maximum(0,1-np.abs(xs[:,:,0]))
    tint[:,:,0]+=16*yy[:,:,0]
    smooth=np.uint8(np.clip(arr*.39+tint*.61,0,255))
    # Smoother edge at y 520-850; no hard horizontal seam.
    top_out=Image.fromarray(smooth)
    trans=Image.new('L',(w,800))
    a=np.asarray(trans).copy()
    for y in range(800):
        weight=1.0 if y<510 else max(0,(800-y)/290)
        a[y,:]=int(weight*255)
    trans=Image.fromarray(a,'L').filter(ImageFilter.GaussianBlur(12))
    base.paste(top_out,(0,0),trans)
    # fade lower source with a softly varying dark field below header
    return base

def enamel_panel(name, outer, inner, fill1, fill2, feather=1.4):
    original=Image.open(MASTER/name).convert('RGBA')
    w,h=original.size
    # A true transparent polygonal plaque. Only its outer thin metallic rim
    # retains the approved JPEG pixels; the *entire* core is freshly enameled.
    # This removes both the stale 200.00/99,997.10 and inset dark rectangles.
    alpha=np.asarray(mask_poly((w,h),outer,feather)).copy()
    inside=np.asarray(mask_poly((w,h),inner,0)).copy()
    dist=cv2.distanceTransform((alpha>115).astype('uint8'),cv2.DIST_L2,5)
    source=np.asarray(original).copy()
    ys=np.arange(h,dtype=np.float32)[:,None,None]/max(1,h-1)
    base=np.array(fill1,dtype=np.float32)[None,None,:]*(1-ys)+np.array(fill2,dtype=np.float32)[None,None,:]*ys
    base=np.tile(base,(1,w,1))
    # Outer 13-pixel relief is preserved. Beyond it, no original baked text.
    preserve=np.clip((23-dist)/13,0,1)[:,:,None]
    if name=='win-panel.png':
        yy=np.arange(h)[:,None]
        xx=np.arange(w)[None,:]
        # WIN engraving + dragon heads are integral gilded parts of source art.
        art=((yy<40)&(np.abs(xx-w*.5)<125))|(xx<122)|(xx>w-122)
        preserve=np.maximum(preserve,art[:,:,None].astype('float32'))
    xx=np.arange(w)[None,:]; yy=np.arange(h)[:,None]
    # Old price glyphs were printed near the *bottom* of the supplied panels.
    # Do not retain them, even when close to the edge-relief sample band.
    if name=='buy-panel.png':
        preserve=np.where(((yy>=82)&(yy<119)&(xx>110)&(xx<324))[:,:,None],0,preserve)
    elif name=='bonus-panel.png':
        preserve=np.where(((yy>=80)&(yy<116)&(xx>113)&(xx<425))[:,:,None],0,preserve)
    elif name=='credit-panel.png':
        preserve=np.where(((yy>=68)&(yy<96)&(xx>78)&(xx<301))[:,:,None],0,preserve)
    elif name=='bet-panel.png':
        preserve=np.where(((yy>=68)&(yy<96)&(xx>145)&(xx<342))[:,:,None],0,preserve)
    result=np.uint8(np.clip(source[:,:,:3].astype('float32')*preserve+base*(1-preserve),0,255))
    if name=='win-panel.png':
        col=result.astype('float32')
        gilded=(col[:,:,0]>115)&(col[:,:,1]>60)&(col[:,:,0]>col[:,:,2]*1.10)
        alpha=np.where((yy<28)&~gilded,0,alpha).astype('uint8')
    rgba=np.dstack([result,alpha])
    return Image.fromarray(rgba,'RGBA')

def polygon_cut(filename,src_name,box,points,category,label):
    src=Image.open(MASTER/src_name).convert('RGBA')
    cropped=src.crop(box)
    return register(filename,category,label,src_name,cropped if points is None else crop_rgba(src,box,mask_poly(cropped.size,points,1.4)))

def main():
    s=sky()
    register('scene-sky.webp','01 · Background','Seamless celestial / lava background','gameplay-backdrop.webp',s)
    hero=make_grabcut('hero',(0,0,398,560),
        [(25,0),(323,0),(375,40),(385,99),(405,147),(336,215),(344,295),(385,415),(372,520),(250,567),(92,563),(0,515),(0,362),(23,278),(22,214),(0,119)],
        [(104,89),(220,39),(262,111),(272,193),(315,264),(354,396),(287,482),(131,488),(29,422),(95,319),(104,231)])
    register('hero.png','02 · Character','Main hero transparent cutout','gameplay-approved-reference.jpg',hero)
    dragon=make_grabcut('dragon',(281,0,930,256),
        [(275,0),(765,0),(823,32),(911,75),(930,119),(868,214),(817,235),(747,172),(623,176),(548,170),(432,165),(357,138),(313,76)],
        [(404,20),(688,9),(778,65),(832,95),(847,151),(767,153),(677,117),(574,102),(478,90),(418,70)])
    # Clip stray background sky beyond the dragon muzzle and frilled neck.
    contour=[(0,0),(483,0),(552,32),(606,66),(619,102),(599,135),(573,157),
             (552,192),(526,216),(498,215),(480,181),(437,172),(352,181),
             (250,177),(145,160),(73,139),(16,109),(0,80)]
    dragon.putalpha(Image.fromarray(np.minimum(np.asarray(dragon.getchannel('A')),
                     np.asarray(mask_poly(dragon.size,contour,4.0))).astype('uint8'),'L'))
    register('dragon.png','02 · Character','Dragon transparent cutout','gameplay-approved-reference.jpg',dragon)
    register('logo.png','03 · Branding','LEGEND BALL X1000 wordmark','gameplay-approved-reference.jpg',make_logo())
    # gold ornament artwork cuts: outer mask excises source rectangular backdrops.
    win=enamel_panel('win-panel.png',
        [(0,40),(33,14),(113,13),(165,16),(237,8),(359,8),(442,13),(512,10),(568,38),(569,89),(543,114),(17,114)],
        [(103,51),(141,31),(467,31),(506,60),(474,104),(118,104),(90,75)],
        (32,7,38),(29,9,44))
    register('win-frame.png','04 · Ornamental Frames','WIN golden dragons bezel','win-panel.png',win)
    reel=Image.open(MASTER/'reel-frame-square.png').convert('RGBA')
    # Preserve original alpha and golden ornament while removing bottom stale
    # screenshot symbols: produce ornament-only silhouette across outer rims.
    img=np.asarray(reel).copy()
    h,w=img.shape[:2]
    y=np.arange(h)[:,None]
    x=np.arange(w)[None,:]
    rgb=img[:,:,:3].astype(np.float32)
    bgr=cv2.cvtColor(img[:,:,:3],cv2.COLOR_RGB2HSV)
    gold=(rgb[:,:,0]>130)&(rgb[:,:,1]>56)&(rgb[:,:,0]>rgb[:,:,2]*.92)
    bright=(rgb.max(2)>200)&(bgr[:,:,1]>85)
    rim=(x<45)|(x>w-45)|(y<63)|(y>h-64)
    # center *must* remain completely transparent
    alpha=img[:,:,3]
    alpha=np.where(rim & (gold|bright),alpha,0).astype(np.uint8)
    alpha=cv2.GaussianBlur(alpha,(0,0),1.0)
    img[:,:,3]=alpha
    register('reel-bezel.png','04 · Ornamental Frames','6x5 golden reel transparent bezel','reel-frame-square.png',Image.fromarray(img,'RGBA'))
    specs=[
      ('buy-panel.png','buy-frame.png','05 · Action Panels','BUY SPIN enamel / gold shell',
       [(72,4),(392,4),(427,54),(417,96),(390,121),(43,120),(0,67),(35,18)],
       [(107,42),(341,42),(367,66),(343,109),(105,109),(83,68)],(33,8,43),(46,11,54)),
      ('bonus-panel.png','booster-frame.png','05 · Action Panels','Bonus Booster blue/gold shell',
       [(64,10),(412,9),(479,61),(436,119),(48,119),(0,64)],
       [(112,37),(395,37),(436,65),(399,109),(105,109),(82,64)],(11,23,60),(20,35,79)),
      ('credit-panel.png','credit-frame.png','06 · Wallet Panels','KREDIT VIRTUAL enamel / gold shell',
       [(41,3),(337,3),(377,48),(339,96),(39,96),(0,49)],
       [(71,21),(306,21),(331,49),(303,89),(70,89),(48,51)],(31,9,45),(39,13,59)),
    ]
    for src,out,group,label,outer,inner,c1,c2 in specs:
        register(out,group,label,src,enamel_panel(src,outer,inner,c1,c2))
    bet=enamel_panel('bet-panel.png',
       [(120,6),(370,6),(395,48),(365,95),(123,95),(92,50)],
       [(128,25),(365,25),(383,47),(358,88),(134,88),(113,52)],
       (39,11,47),(42,13,61))
    register('bet-frame.png','06 · Wallet Panels','TOTAL BET independent panel','bet-panel.png',bet)
    bet_raw=Image.open(MASTER/'bet-panel.png').convert('RGBA')
    minus_box=(1,10,133,97)
    minus=crop_rgba(bet_raw,minus_box,mask_poly((132,87),
       [(3,44),(25,10),(95,10),(128,44),(98,85),(27,85)],1.5))
    register('minus.png','07 · Bet Controls','Decrease bet (gold/red cutout)','bet-panel.png',minus)
    plus_box=(358,10,489,97)
    plus=crop_rgba(bet_raw,plus_box,mask_poly((131,87),
       [(1,44),(29,10),(101,10),(129,44),(102,85),(24,85)],1.5))
    register('plus.png','07 · Bet Controls','Increase bet (gold/red cutout)','bet-panel.png',plus)
    # Native artworks already have alpha; trim backdrop outside the designed
    # central plaque/coin without painting fresh SVG iconography.
    for original,name,label in [
        ('spin.png','spin.png','SPIN orbital coin cutout'),
        ('auto.png','auto.png','AUTO cutout'),
        ('turbo.png','turbo.png','TURBO cutout'),
        ('menu.png','menu.png','MENU cutout'),
        ('rules.png','info.png','INFO cutout')
    ]:
        base=Image.open(MASTER/original).convert('RGBA')
        w,h=base.size
        if original=='spin.png':
            ma=Image.new('L',(w,h),0)
            ImageDraw.Draw(ma).ellipse((4,4,w-4,h-4),fill=255)
            ma=ma.filter(ImageFilter.GaussianBlur(2.0))
        else:
            ma=mask_poly((w,h),[
                (w*.25,h*.09),(w*.77,h*.09),(w*.94,h*.25),
                (w*.94,h*.79),(w*.76,h*.98),(w*.23,h*.98),
                (w*.08,h*.79),(w*.08,h*.25)],2.1)
        alpha=Image.fromarray(np.minimum(np.asarray(ma),np.asarray(base.getchannel('A'))).astype('uint8'))
        base.putalpha(alpha)
        register(name,'08 · Gameplay Buttons',label,original,base)
    # Existing reel symbols from approved reference are already separated RGBA.
    for original in sorted(MASTER.glob('symbol-*.png')):
        src=Image.open(original).convert('RGBA')
        register(original.name,'09 · Reel Symbols',original.stem.replace('-',' ').title(),original.name,src,'symbol')
    for original in sorted(MASTER.glob('scatter-*.png')):
        src=Image.open(original).convert('RGBA')
        register(original.name,'09 · Reel Symbols',original.stem.replace('-',' ').title(),original.name,src,'symbol')
    src=Image.open(MASTER/'multiplier.png').convert('RGBA')
    register('multiplier.png','09 · Reel Symbols','Multiplier orb', 'multiplier.png',src,'symbol')
    manifest={'schema':'legend/cutout-library-v7','stage':[1080,1920],
      'source_sha256':hashlib.sha256((MASTER/'gameplay-approved-reference.jpg').read_bytes()).hexdigest(),
      'master_sha_lock_unchanged':True,'assets':CATALOG,
      'note':'Derived preview cutouts from approved flattened gameplay JPEG. Transparent assets are NOT originally supplied layered source files. Rights approval needed for production.'}
    (DEST/'manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n',encoding='utf8')
    catalog=[{'id':'v7-'+x['path'].split('/')[-1].replace('.','-'),'path':x['path'],'group':x['group'],
              'kind':x['kind'],'naturalWidth':x['size'][0],'naturalHeight':x['size'][1],
              'label':x['label'],'transparent':x['alpha']} for x in CATALOG]
    (DEST/'catalog.js').write_text('window.LEGEND_CUTOUT_LIBRARY = '+json.dumps(catalog,ensure_ascii=False)+';\n',encoding='utf8')
    # inspect RGBA on a checkerboard; visual QA only.
    thumb=Image.new('RGB',(1000,1320),(27,22,37))
    draw=ImageDraw.Draw(thumb)
    picked=['hero.png','dragon.png','logo.png','win-frame.png','reel-bezel.png','buy-frame.png',
            'booster-frame.png','credit-frame.png','bet-frame.png','minus.png','plus.png','spin.png','auto.png']
    y=10
    for name in picked:
        im=Image.open(DEST/name).convert('RGBA')
        scale=min(1.0,670/im.width,145/im.height)
        im=im.resize((round(im.width*scale),round(im.height*scale)),RES)
        draw.text((8,y+4),name,fill='#fff3ce')
        board=Image.new('RGB',im.size)
        d=ImageDraw.Draw(board)
        step=16
        for yy in range(0,im.height,step):
            for xx in range(0,im.width,step):
                d.rectangle((xx,yy,xx+step-1,yy+step-1),fill='#454050' if (xx//step+yy//step)%2 else '#242234')
        board.paste(im,(0,0),im)
        thumb.paste(board,(248,y))
        y+=min(157,im.height+10)
        if y>1300:break
    thumb.save(ROOT/'design/cutouts-checker-v7.jpg',quality=93)
    print('Exported',len(CATALOG),'cutouts to',DEST)
if __name__=='__main__':main()
