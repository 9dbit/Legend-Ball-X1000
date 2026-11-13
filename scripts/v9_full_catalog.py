"""Render every V9 asset at correct alpha onto a grey checkerboard, 20 per board."""
from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
assets=json.loads((root/'studio/assets/legend-v9/manifest.json').read_text('utf8'))['assets']
assert len(assets)==40
fontroot=Path('C:/Windows/Fonts')
font=ImageFont.truetype(str(fontroot/'arial.ttf'),16) if (fontroot/'arial.ttf').exists() else ImageFont.load_default()
bold=ImageFont.truetype(str(fontroot/'arialbd.ttf'),22) if (fontroot/'arialbd.ttf').exists() else font
for sheet in range(2):
  W,H=1500,1580
  canvas=Image.new('RGB',(W,H),'#1c1a2c');draw=ImageDraw.Draw(canvas)
  draw.text((22,14),f'LEGEND BALL V9 | ALPHA ASSET CONTACT SHEET {sheet+1}/2',fill='#fff2be',font=bold)
  draw.text((22,46),'Each tile = real file, checkerboard reveals matte. Amber REVIEW needs sign-off.',fill='#dad6ec',font=font)
  for j,rec in enumerate(assets[sheet*20:sheet*20+20]):
    col=j%4;row=j//4
    x=12+col*373;y=81+row*297;w=355;h=215
    sq=19
    for yy in range(0,h,sq):
      for xx in range(0,w,sq):
        shade='#7d7c8c' if ((xx//sq+yy//sq)%2) else '#dddddd'
        draw.rectangle((x+xx,y+yy,x+min(w,xx+sq)-1,y+min(h,yy+sq)-1),fill=shade)
    art=Image.open(root/'studio/assets'/rec['path']).convert('RGBA')
    sx=min((w-12)/art.width,(h-12)/art.height)
    shot=art.resize((max(1,int(art.width*sx)),max(1,int(art.height*sx))),Image.Resampling.LANCZOS)
    canvas.paste(shot,(x+(w-shot.width)//2,y+(h-shot.height)//2),shot)
    nm=rec['path'].split('/')[-1]
    draw.text((x,y+220),nm,fill='#fff2df',font=bold)
    status=rec['status'].upper()
    draw.text((x,y+252),f'{art.width}x{art.height}  /  {status}',fill='#a6f1c5' if status=='READY' else '#ffd77c',font=font)
    draw.rectangle((x-1,y-1,x+w+1,y+h+1),outline='#898694',width=1)
  out=root/'design'/f'V9_ALL_ASSETS_{sheet+1:02d}.jpg'
  canvas.save(out,quality=92,optimize=True)
  print(out)