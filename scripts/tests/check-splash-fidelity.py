"""Compare the iPhone PWA screenshot against the full-bleed approved art.

The screenshot is taken after all layers decode with reduced motion enabled.
The same cover/crop transform as CSS is applied to the original source image.
"""
from pathlib import Path
from PIL import Image, ImageChops, ImageStat
r=Path(__file__).resolve().parents[2]
master=Image.open(r/'studio/assets/legend-splash/sources/background.webp').convert('RGB')
p=r/'qa-artifacts/legend-layered-splash/webkit-iphone-notch-pwa.png'
if not p.exists():
    raise SystemExit('Run LEGEND_CAPTURE_SCREENSHOTS=1 node scripts/tests/legend-layered-splash-browser.mjs first')
image=Image.open(p).convert('RGB')
w,h=image.size
mw,mh=master.size
scale=max(w/mw,h/mh)
sw,sh=round(mw*scale),round(mh*scale)
src=master.resize((sw,sh),Image.Resampling.BICUBIC)
left=(sw-w)//2
top=(sh-h)//2
expected=src.crop((left,top,left+w,top+h))
delta=ImageChops.difference(image,expected)
mae=sum(ImageStat.Stat(delta).mean)/3
print(f'SOURCE_FIDELITY viewport={w}x{h} master={mw}x{mh} cover={sw}x{sh} MAE={mae:.2f}')
assert mae<17, f'Unexpected visual variation, blank bars, or edge seams: MAE={mae:.2f}'
print('PASS approved full-bleed art fidelity')
