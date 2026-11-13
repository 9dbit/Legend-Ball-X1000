"""Connect the raster-only responsive UI to the existing public game."""
from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[1]
html=ROOT/'play/index.html'
text=html.read_text('utf8')
needle='<link rel="stylesheet" href="legend/approved-master-v5.css?v=locked-1">'
assert needle in text
if 'legend/square-reels.css' not in text:
    text=text.replace(needle,needle+'\n<link rel="stylesheet" href="legend/square-reels.css?v=square-v6-1">')
button_ids='payInfo|betMenu|minus|plus|auto|turbo|menu|sound|help'
pat=re.compile(r'(<button[^>]*id="(?:'+button_ids+r')"[^>]*>)\s*<svg[^>]*>.*?</svg>',re.S)
text,n=pat.subn(r'\1',text)
assert n in (0,9),f'Unexpected SVG control replacements: {n}'
html.write_text(text,encoding='utf8')
release=ROOT/'release-store.mjs'
text=release.read_text('utf8')
newassets=['gameplay-square-backdrop.webp','reel-frame-square.png','buy-panel-clean.png','bonus-panel-clean.png','credit-panel-clean.png','bet-panel-clean.png']
for new in newassets:
    if f'  "legend-master/{new}",' in text: continue
    original={'gameplay-square-backdrop.webp':'gameplay-backdrop.webp','reel-frame-square.png':'reel-frame.png','buy-panel-clean.png':'buy-panel.png','bonus-panel-clean.png':'bonus-panel.png','credit-panel-clean.png':'credit-panel.png','bet-panel-clean.png':'bet-panel.png'}
    predecessor=original.get(new)
    assert predecessor,f'No source for {new}'
    target=f'  "legend-master/{predecessor}",'
    assert target in text
    text=text.replace(target,target+f'\n  "legend-master/{new}",')
release.write_text(text,encoding='utf8')
print(f'Connected square CSS and {n} raster-backed controls; shipped six new assets.')