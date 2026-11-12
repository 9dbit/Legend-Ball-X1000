"""Build PNG derivatives from the approved concept. Not recovered layered masters."""
from pathlib import Path
import hashlib,json,math
import cv2
import numpy as np
from PIL import Image,ImageDraw,ImageFilter,ImageFont,ImageOps,ImageEnhance
ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'design/references/approved-celestial-concept.png'
EXPECTED='53a1573585a62546b4bfec821c7642697845f395ca017b9eb3f62941356b3ea9'
assert hashlib.sha256(SRC.read_bytes()).hexdigest()==EXPECTED,'Wrong reference image'
im=Image.open(SRC).convert('RGBA')
OUT=ROOT/'studio/assets/legend-raster';OUT.mkdir(parents=True,exist_ok=True)
manifest={'schema':'legend/raster-art-v2','source':str(SRC.relative_to(ROOT)),'sourceSha256':EXPECTED,'provenance':'Crop/mask derivatives of the conversation-approved concept, not recovered PSD or 3D masters. Title updated; stars replaced with six rune marks.','assets':[]}
def save(img,name,note):
 img.save(OUT/name,optimize=True);a=np.array(img.convert('RGBA'))[:,:,3]
 manifest['assets'].append({'name':name,'width':img.width,'height':img.height,'rgba':img.mode=='RGBA','transparentPixels':int((a==0).sum()),'bytes':(OUT/name).stat().st_size,'sha256':hashlib.sha256((OUT/name).read_bytes()).hexdigest(),'note':note})
 return img
def maskcrop(box,points,feather=1.1):
 crop=im.crop(box);m=Image.new('L',crop.size);ImageDraw.Draw(m).polygon([(x-box[0],y-box[1]) for x,y in points],fill=255)
 crop.putalpha(m.filter(ImageFilter.GaussianBlur(feather)));return crop
def rounded(img,radius=12):
 m=Image.new('L',img.size);ImageDraw.Draw(m).rounded_rectangle((2,2,img.width-3,img.height-3),radius=radius,fill=255);img.putalpha(m.filter(ImageFilter.GaussianBlur(.6)));return img
hero_pts=[(145,6),(177,38),(204,11),(283,2),(249,31),(235,67),(271,55),(298,29),(300,62),(339,25),(353,72),(349,115),(382,106),(369,149),(339,174),(354,205),(314,197),(303,239),(274,265),(260,296),(272,349),(278,422),(270,468),(249,521),(246,560),(272,576),(275,611),(333,649),(299,660),(17,660),(31,632),(2,641),(1,583),(25,569),(17,540),(0,516),(0,246),(50,228),(98,240),(107,226),(72,222),(124,209),(78,197),(54,169),(42,143),(88,156),(53,120),(39,61),(66,77),(120,87),(143,84),(137,51)]
hero=maskcrop((0,0,390,670),hero_pts);a=np.array(hero);a[18:46,131:166,3]=0;a[-38:,:,3]=(a[-38:,:,3]*np.linspace(1,0,38)[:,None]).astype('uint8');hero=Image.fromarray(a)
save(hero,'hero.png','Approved anime hero with manual alpha silhouette, no geometric redraw.')
dp=[(1191,0),(1227,23),(1246,5),(1265,29),(1301,7),(1297,36),(1331,52),(1355,70),(1371,86),(1419,77),(1449,89),(1463,114),(1430,139),(1423,163),(1406,183),(1379,189),(1357,174),(1348,166),(1305,167),(1272,183),(1239,184),(1200,204),(1207,204),(1192,185),(1186,166),(1196,149),(1185,135),(1185,118),(1178,92),(1122,78),(1168,64),(1143,40),(1187,44),(1167,22),(1217,40)]
save(maskcrop((1110,0,1475,216),dp),'dragon.png','Approved blue dragon, individually masked.')
W,H=720,1400;y=np.linspace(0,1,H)[:,None,None];top=np.array([54,57,141]);bottom=np.array([13,9,38]);rgb=np.repeat((top*(1-y)+bottom*y).astype('uint8'),W,axis=1)
bg=Image.fromarray(rgb,'RGB').convert('RGBA');scene=im.crop((1458,59,1672,249)).resize((720,639),Image.Resampling.LANCZOS)
ar=np.zeros((scene.height,scene.width),dtype=np.uint8)
for yy in range(scene.height):ar[yy,:]=int(180*min(1,max(0,(scene.height-yy)/170)))
scene.putalpha(Image.fromarray(ar));bg.alpha_composite(scene,(0,0));bg=ImageEnhance.Color(bg).enhance(1.12)
save(bg,'background.png','Approved floating-island atmosphere with a clear dark underlay, no baked gameplay UI.')
frame=im.crop((381,214,1370,764));fm=Image.new('L',frame.size,255);fd=ImageDraw.Draw(fm);fd.rounded_rectangle((28,26,frame.width-27,frame.height-27),radius=10,fill=0);fd.rounded_rectangle((0,0,frame.width-1,frame.height-1),radius=26,outline=0,width=2);frame.putalpha(fm)
save(frame,'reel-frame.png','Original gold rim with transparent reel window.')
panel=im.crop((798,819,1121,908));pa=np.array(panel);pa[12:-13,24:-23,3]=0;pa[:2,:,3]=0;pa[-2:,:,3]=0
outer=Image.new('L',panel.size);ImageDraw.Draw(outer).rounded_rectangle((1,1,panel.width-2,panel.height-2),radius=25,fill=255);pa[:,:,3]=np.minimum(pa[:,:,3],np.array(outer));panel=Image.fromarray(pa)
save(panel,'panel.png','Approved panel rim, baked values removed through alpha; live DOM numbers remain independent.')
boxes={'crown':(735,242,874,366),'hourglass':(421,242,571,365),'ring':(577,494,721,617),'chalice':(418,613,571,736),'ruby':(899,251,1035,367),'amethyst':(1044,244,1184,366),'topaz':(433,508,565,616),'emerald':(1055,508,1188,613),'sapphire':(580,244,720,367),'amber':(1189,242,1344,365),'pearl':(734,615,876,736)}
portraits={'crown','hourglass','ring','chalice','amber','pearl'}
def transparent_icon(crop,portrait=False):
 if portrait:return rounded(crop.copy(),9)
 a=np.array(crop);rgb=a[:,:,:3];v=rgb.max(2)
 cand=((v<115)|((v<155)&(rgb[:,:,2]>rgb[:,:,0]*1.25))).astype('uint8')
 _,labels,_,_=cv2.connectedComponentsWithStats(cand,8);edges=set(np.concatenate([labels[0],labels[-1],labels[:,0],labels[:,-1]]).tolist())-{0};a[:,:,3][np.isin(labels,list(edges))]=0
 out=Image.fromarray(a);out.putalpha(Image.fromarray(a[:,:,3]).filter(ImageFilter.GaussianBlur(.45)));return out
for name,box in boxes.items():
 cut=transparent_icon(im.crop(box),name in portraits);out=Image.new('RGBA',(256,256));fit=ImageOps.contain(cut,(240,240),Image.Resampling.LANCZOS);out.alpha_composite(fit,((256-fit.width)//2,(256-fit.height)//2));save(out,'symbol-'+name+'.png','Individual approved reel artwork crop with masked backdrop or retained portrait frame.')
ball=np.array(im.crop((413,370,576,499)).convert('RGB'));hsv=cv2.cvtColor(ball,cv2.COLOR_RGB2HSV);yy,xx=np.mgrid[:ball.shape[0],:ball.shape[1]]
red=((hsv[:,:,0]<12)|(hsv[:,:,0]>170))&(hsv[:,:,1]>130)&(hsv[:,:,2]<235)&(((xx-81)**2+(yy-64)**2)<36**2)
red=cv2.dilate(red.astype('uint8')*255,np.ones((5,5),np.uint8));clean=cv2.inpaint(ball,red,8,cv2.INPAINT_TELEA)
r=np.sqrt(((xx-81)/77)**2+((yy-64)/64)**2);alpha=np.clip((1.04-r)*255/.14,0,255).astype('uint8');orb=Image.fromarray(np.dstack([clean,alpha])).resize((326,258),Image.Resampling.LANCZOS)
colors=[0,22,93,140,163,35]
runes=[[(158,80),(177,119),(157,115),(139,168),(129,115),(158,80)],[(122,107),(142,92),(164,111),(183,96),(202,108)],[(178,77),(139,124),(165,121),(147,173),(194,111),(164,112),(178,77)],[(164,80),(197,106),(187,150),(162,174),(128,147),(130,108),(164,80)],[(141,88),(124,111),(125,147),(151,168),(178,163),(192,140)],[(164,77),(198,127),(164,176),(129,127),(164,77)]]
for i,hue in enumerate(colors):
 rgb=cv2.cvtColor(np.array(orb)[:,:,:3],cv2.COLOR_RGB2HSV);rgb[:,:,0]=(rgb[:,:,0].astype('int16')+hue)%180;rgb=cv2.cvtColor(rgb,cv2.COLOR_HSV2RGB);b=Image.fromarray(np.dstack([rgb,np.array(orb)[:,:,3]]))
 rune=Image.new('RGBA',b.size);dr=ImageDraw.Draw(rune);pts=runes[i];dr.line(pts,fill=(255,248,208,255),width=7,joint='curve')
 if i==1:dr.line([(x,y+23) for x,y in pts],fill=(235,255,255,255),width=6,joint='curve')
 if i in (3,5):dr.line([(164,82),(164,173)],fill=(255,248,208,255),width=4)
 if i==4:dr.arc((134,94,201,162),70,300,fill=(255,249,215,255),width=5)
 b=Image.alpha_composite(b,rune.filter(ImageFilter.GaussianBlur(4)));b=Image.alpha_composite(b,rune);out=Image.new('RGBA',(336,288));out.alpha_composite(b,(5,12));save(out,'scatter-'+str(i+1)+'.png','Raster energy ball with star removed and unique rune. Visual skin only.')
arr=np.array(orb);hsv=cv2.cvtColor(arr[:,:,:3],cv2.COLOR_RGB2HSV);hsv[:,:,0]=(hsv[:,:,0].astype('int16')+93)%180;arr[:,:,:3]=cv2.cvtColor(hsv,cv2.COLOR_HSV2RGB);out=Image.new('RGBA',(336,288));out.alpha_composite(Image.fromarray(arr),(5,12));save(out,'multiplier.png','Blank raster orb for original engine live multiplier value.')
spin=im.crop((1384,706,1633,939));sm=Image.new('L',spin.size);ImageDraw.Draw(sm).ellipse((5,3,243,230),fill=255);spin.putalpha(sm.filter(ImageFilter.GaussianBlur(1)));save(spin,'spin.png','Approved gold SPIN disc; interactive DOM button remains independent.')
fontpath=Path('/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed-BoldOblique.ttf')
assert fontpath.exists(),'Install fonts-dejavu-core'
def textline(text,size,palette):
 f=ImageFont.truetype(str(fontpath),size);bb=f.getbbox(text,stroke_width=8);w=bb[2]-bb[0]+32;h=bb[3]-bb[1]+32;mask=Image.new('L',(w,h));ImageDraw.Draw(mask).text((16-bb[0],16-bb[1]),text,font=f,fill=255)
 out=Image.new('RGBA',(w+16,h+22));od=ImageDraw.Draw(out)
 for off in range(13,0,-1):od.text((16-bb[0]+off,16-bb[1]+off),text,font=f,fill=(25,6,42,255),stroke_width=9,stroke_fill=(12,4,28,255))
 od.text((16-bb[0],16-bb[1]),text,font=f,fill=(255,230,129),stroke_width=5,stroke_fill=(254,169,60,255));grad=np.zeros((h,w,4),dtype='uint8');anchors=np.linspace(0,h-1,len(palette))
 for c in range(3):grad[:,:,c]=np.interp(np.arange(h),anchors,[p[c] for p in palette])[:,None]
 grad[:,:,3]=np.array(mask);out.alpha_composite(Image.fromarray(grad),(0,0));return out
logo=Image.new('RGBA',(1000,335));one=ImageOps.contain(textline('LEGEND BALL',105,[(255,255,209),(255,214,77),(244,154,28),(183,64,12),(255,205,81)]),(955,170));logo.alpha_composite(one,((1000-one.width)//2,12));two=ImageOps.contain(textline('X1000',110,[(255,255,255),(236,239,255),(149,162,214),(255,255,255),(108,126,194)]),(620,160));logo.alpha_composite(two,((1000-two.width)//2,166));save(logo,'logo.png','Updated raster name lockup with approved gold, red and silver direction.')
icon=Image.new('RGBA',(512,512),(13,6,40,255));icon.alpha_composite(ImageOps.fit(hero,(512,512),Image.Resampling.LANCZOS,centering=(.52,.19)));label=ImageOps.contain(logo,(480,170),Image.Resampling.LANCZOS);icon.alpha_composite(label,((512-label.width)//2,330));save(icon,'app-icon.png','App icon from the same approved hero and title.')
share=ImageOps.fit(bg,(1200,630),Image.Resampling.LANCZOS);share.alpha_composite(ImageOps.contain(hero,(410,620),Image.Resampling.LANCZOS),(10,4));share.alpha_composite(ImageOps.contain(Image.open(OUT/'dragon.png').convert('RGBA'),(480,300),Image.Resampling.LANCZOS),(708,15));share.alpha_composite(ImageOps.contain(logo,(820,300),Image.Resampling.LANCZOS),(365,260));save(share,'open-graph.png','Telegram/Open Graph image derived from the same PNG layers.')
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2))
icons=OUT/'icons';icons.mkdir(exist_ok=True)
for size in (48,180,192,512):icon.resize((size,size),Image.Resampling.LANCZOS).save(icons/f'legend-touch-{size}.png',optimize=True)
maskable=Image.new('RGBA',(512,512),(18,7,39,255));maskable.alpha_composite(icon.resize((400,400),Image.Resampling.LANCZOS),(56,56));maskable.save(icons/'legend-touch-maskable-512.png',optimize=True)
items=[]
for a in manifest['assets']:
 if a['name'] in ('background.png','open-graph.png'):continue
 p=ImageOps.contain(Image.open(OUT/a['name']).convert('RGBA'),(190,180),Image.Resampling.LANCZOS);card=Image.new('RGBA',(220,220),(20,12,45,255));card.alpha_composite(p,((220-p.width)//2,(185-p.height)//2));ImageDraw.Draw(card).text((10,195),a['name'],fill='white');items.append(card)
sheet=Image.new('RGBA',(1100,220*math.ceil(len(items)/5)),(12,7,30,255))
for i,p in enumerate(items):sheet.alpha_composite(p,((i%5)*220,(i//5)*220))
sheet.convert('RGB').save(ROOT/'design/raster-contact-sheet.jpg',quality=90)
print(json.dumps({'assets':len(manifest['assets']),'bytes':sum(a['bytes'] for a in manifest['assets']),'sourceSHA256':EXPECTED}))
