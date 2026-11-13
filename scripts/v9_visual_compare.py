from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
root=Path(__file__).resolve().parents[1]
pairs=[('V8 | deployed staging',root/'qa-artifacts/ios-ui-v8-webkit/fresh-v8-390.png'),
       ('V9 | curated draft (not deployed)',root/'qa-artifacts/curated-v9-webkit/game-390.png')]
pics=[]
for name,p in pairs:
 if not p.exists():
   print('MISSING',p)
   continue
 img=Image.open(p).convert('RGB')
 pics.append((name,img))
assert len(pics)==2,'Both V8 and V9 QA screenshots required'
W=800;pad=10;H=888
out=Image.new('RGB',(W,H),(12,11,31))
d=ImageDraw.Draw(out)
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',14)
bold=ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf',17)
for i,(name,im) in enumerate(pics):
 x=pad+i*400;y=48
 im.thumbnail((380,790))
 out.paste(im,(x,y))
 d.text((x,12),name,fill='#ffe2a4',font=bold)
d.text((14,853),'V8: clipped art, panel residue, mixed scaling  |  V9: independent raster, unified 1080x1920 staging plane',fill='#dad2e7',font=font)
out.save(root/'design/V8_V9_VISUAL_COMPARE.jpg',quality=90)
print('Rendered 390px comparison with both real browser captures')