from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json, numpy as np
root=Path(__file__).resolve().parents[1]
base=root/'studio/assets/legend-v9'
assets=json.loads((base/'manifest.json').read_text('utf8'))['assets']
paths=['hero-master.png','hero-alternate.png','dragon-master.png','dragon-alternate.png',
       'logo-master.png','logo-alternate.png','win-frame.png','reel-frame.png',
       'buy-frame.png','bonus-frame.png','credit-frame.png','bet-frame.png',
       'minus.png','plus.png','spin.png','symbol-ruby.png']
W,H=1280,1152; cols=4;rows=4;cw=W//cols;ch=(H-45)//rows
out=Image.new('RGB',(W,H),'#13101e')
font=ImageFont.truetype('arial.ttf',15) if Path('C:/Windows/Fonts/arial.ttf').exists() else ImageFont.load_default()
bold=ImageFont.truetype('arialbd.ttf',24) if Path('C:/Windows/Fonts/arialbd.ttf').exists() else font
draw=ImageDraw.Draw(out)
draw.text((15,11),'V9 | CURATED ASSET LIBRARY  (CHECKERBOARD ALPHA QA)',fill='#fff3c9',font=bold)
for i,name in enumerate(paths):
  x=(i%cols)*cw;y=45+(i//cols)*ch
  margin=12
  im=Image.open(base/name).convert('RGBA')
  iw,ih=im.size
  available_w=cw-2*margin;available_h=ch-57
  sx=min(available_w/iw, available_h/ih)
  scaled=im.resize((int(iw*sx),int(ih*sx)),Image.Resampling.LANCZOS)
  bx=x+margin;by=y+margin
  size=18
  for yy in range(0,available_h,size):
    for xx in range(0,available_w,size):
      shade='#e1e1e8' if (yy//size+xx//size)%2 else '#6a6978'
      draw.rectangle((bx+xx,by+yy,bx+min(available_w,xx+size)-1,by+min(available_h,yy+size)-1),fill=shade)
  image_x=bx+(available_w-scaled.width)//2
  image_y=by+(available_h-scaled.height)//2
  out.paste(scaled,(image_x,image_y),scaled)
  draw.text((bx,y+ch-44),name,fill='#fff1d8',font=font)
  record=next(a for a in assets if a['path'].endswith('/'+name))
  status=record['status'].upper()
  color='#ffc75c' if status=='REVIEW' else '#a7efbd'
  draw.text((bx,y+ch-24),status+' | '+str(iw)+'x'+str(ih),fill=color,font=font)
  draw.rectangle((x,y,x+cw-1,y+ch-1),outline='#353448',width=1)
target=root/'design/V9_CANDIDATE_CONTACT_SHEET.jpg'
out.save(target,quality=90,optimize=True)
print('CONTACT SHEET',target,out.size)