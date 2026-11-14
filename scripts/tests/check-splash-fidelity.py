"""Visual regression: rendered iPhone splash vs approved source master.
Requires Pillow and numpy. The screenshot is the WebKit 393 x 852 PWA case
with stage at x=0, y=89 and height=699.
"""
from pathlib import Path
from PIL import Image
import numpy as np
r=Path(__file__).resolve().parents[2]
master=Image.open(r/'studio/assets/legend-master/splash-master.jpg').convert('RGB')
image=Image.open(r/'qa-artifacts/legend-layered-splash/webkit-iphone-notch.png').convert('RGB')
# Derive safe frame dimensions from CSS ratio and simulated iPhone viewport.
w,h=image.size
frame_w=min(w,int(round((h-59-34-20)*9/16)))
frame_h=round(frame_w*16/9)
x=(w-frame_w)//2
y=round((h+(59-34))/2-frame_h/2)
got=np.asarray(image.crop((x,y,x+frame_w,y+frame_h)),dtype=np.int16)
ref=np.asarray(master.resize((frame_w,frame_h),Image.Resampling.BICUBIC),dtype=np.int16)
err=np.abs(got-ref)
mean=float(err.mean())
p95=float(np.percentile(err,95))
n20=float(np.mean(err>20))
print(f'SOURCE_FIDELITY frame={frame_w}x{frame_h} x={x} y={y} MAE={mean:.2f} P95={p95:.2f} fraction_above_20={n20:.3f}')
# Higher thresholds allow JPEG vs WebP resampling but reject large blur
# and hard rectangular seams seen in previous deployment.
assert mean<12, f'Splash diverged from approved source: MAE={mean:.2f}'
assert n20<0.16, f'Excessive misaligned or blurred pixels: {n20:.3f}'
print('PASS approved design fidelity and seam regression')
