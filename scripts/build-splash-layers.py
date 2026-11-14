from pathlib import Path
from PIL import Image, ImageFilter, ImageEnhance, ImageDraw
import numpy as np
import cv2, json
root=Path(__file__).resolve().parents[1]
master=Image.open(root/'studio/assets/legend-master/splash-master.jpg').convert('RGB')
W,H=master.size
folder=root/'studio/assets/legend-splash/sources'
folder.mkdir(parents=True,exist_ok=True)

def alpha_layer(name, box, polygon, inner, feather=7):
    x0,y0,x1,y1=box
    region=np.asarray(master.crop(box))
    rw,rh=region.shape[1],region.shape[0]
    mask=np.zeros((rh,rw),np.uint8)
    poly=np.array([[(x-x0,y-y0) for x,y in polygon]],np.int32)
    cv2.fillPoly(mask,poly,cv2.GC_PR_FGD)
    for x,y,r in inner:
        cv2.circle(mask,(x-x0,y-y0),r,cv2.GC_FGD,-1)
    # Outside polygon remains certain background, uncertain pixels near silhouette
    edge=cv2.dilate((mask>0).astype(np.uint8),np.ones((19,19),np.uint8),iterations=1)
    mask[(edge>0)&(mask==0)]=cv2.GC_PR_BGD
    bgModel=np.zeros((1,65),np.float64);fgModel=np.zeros((1,65),np.float64)
    try:
        cv2.grabCut(region,mask,None,bgModel,fgModel,4,cv2.GC_INIT_WITH_MASK)
        alpha=np.where((mask==cv2.GC_FGD)|(mask==cv2.GC_PR_FGD),255,0).astype(np.uint8)
    except cv2.error:
        alpha=(mask>0).astype(np.uint8)*255
    alpha=cv2.GaussianBlur(alpha,(0,0),feather/3)
    rgba=Image.fromarray(np.dstack([region,alpha]),'RGBA')
    rgba.save(folder/(name+'.webp'),'WEBP',quality=82,method=5,exact=True)
    return dict(file='sources/'+name+'.webp',box=box,width=rw,height=rh)

layers={}
layers['logo']=alpha_layer('logo',(0,0,864,385),
    [(0,70),(185,0),(690,0),(864,70),(864,350),(500,385),(140,360),(0,285)],
    [(430,108,65),(440,250,45),(200,215,50),(690,210,55)],8)
layers['dragon']=alpha_layer('dragon',(270,290,864,1040),
    [(320,380),(520,330),(700,320),(860,355),(864,880),(810,1040),(430,1000),(300,790)],
    [(696,572,40),(600,690,55),(770,730,45)],8)
layers['character']=alpha_layer('character',(0,280,800,1300),
    [(0,430),(90,380),(280,300),(460,320),(610,420),(530,610),(630,730),(790,1100),(735,1290),(40,1300),(0,1140)],
    [(280,615,45),(230,850,70),(370,920,70),(90,1100,55)],8)
layers['enter-button']=alpha_layer('enter-button',(85,1200,790,1510),
    [(85,1355),(145,1270),(300,1205),(580,1210),(760,1270),(790,1360),(730,1465),(210,1470)],
    [(430,1350,65),(200,1355,35),(650,1355,35)],5)
# Full-bleed backdrop uses the original reference colours but removes strong
# duplicate silhouettes via a cinematic depth-of-field blur.
background=master.resize((864,1536),Image.Resampling.LANCZOS).filter(ImageFilter.GaussianBlur(26))
background=ImageEnhance.Brightness(background).enhance(.88)
background=ImageEnhance.Color(background).enhance(1.12)
background.save(folder/'background.webp','WEBP',quality=75,method=5)
layers['background']={'file':'sources/background.webp','box':[0,0,W,H],'width':W,'height':H}
# Lightning is separately animatable, with clean alpha and compositing.
th=Image.new('RGBA',(W,H),(0,0,0,0));d=ImageDraw.Draw(th,'RGBA')
segments=[([(0,70),(65,128),(110,118),(170,222),(250,247),(290,310)],(75,175,255)), ([(855,35),(780,110),(735,172),(690,270),(645,318)],(255,141,39)), ([(0,880),(70,933),(110,975),(175,1055)],(75,185,255))]
for pts,col in segments:
    d.line(pts,fill=(*col,240),width=5,joint='curve')
glow=th.filter(ImageFilter.GaussianBlur(16))
glow.alpha_composite(th)
glow.save(folder/'thunder.webp','WEBP',quality=80,method=5)
layers['thunder']={'file':'sources/thunder.webp','box':[0,0,W,H],'width':W,'height':H}
(root/'studio/assets/legend-splash/manifest.json').write_text(json.dumps({'version':'splash-layered-v1','base_size':[W,H],'layers':layers},indent=2))
print('SOURCES',[(k,(folder/(k+'.webp')).stat().st_size) for k in layers])
