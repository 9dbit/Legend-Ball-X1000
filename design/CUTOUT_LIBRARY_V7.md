# LEGEND BALL X1000 | Cutout Asset Library V7

2026-11-13. Staging virtual-credit preview only.

## Motivation

The V6 gameplay background contained baked hero, dragon and logo composites. The panel PNG files also carried rectangular opaque background and stale currency digits. Static CSS overrides prevented inspector coordinates from controlling the published renderer.

## Source-of-truth

* Master approved splash and gameplay JPEG files are unchanged and SHA-locked.
* 35 derived files live in studio/assets/legend-cutouts, with a manifest.json containing source provenance, sizes, alpha transparency and SHA256 checksums.
* catalog.js makes each cutout available in the Studio Asset Library.
* studio/project.json defines all live layer geometry. npm run prepare:play synchronizes Studio and public game.
* New cutout-v7.js uses source layer coordinates; the 6x5 reel alone enforces height=width*5/6 to guarantee physically square cells.

## Using the editor

1. Open /studio/ with authorized access; click Edit (or Edit Live to import a published snapshot).
2. Open Asset Library, tap an asset, and it creates a new independent layer without replacing another.
3. Switch to Layout & Layers. Use the Inspector X, Y, Width, Height, Opacity, Rotation, Z-index, Visible and Lock settings. The shared /play/ renderer updates to reflect the saved layer changes.
4. Use Export changes ZIP to back up both project settings and custom uploaded artwork. Publish only after reviewing the preview.
5. Master scenes, characters, wordmark, reel bezel, win bezel, all credit/action panels, plus/minus, Spin/Auto/Turbo/Menu/Info, and reel symbols are separately listed.

## Rebuild extracted assets when necessary

python -m pip install -r scripts/requirements-legend-cutouts.txt
python scripts/extract-legend-v7.py
npm run prepare:play

The extraction is based on a flattened approved JPEG, not a recovered multilayer PSD. It is not a substitute for licensed source illustrations.

## QA

npm test
node --test scripts/tests/approved-master-v5.test.mjs
node scripts/tests/approved-master-v5-browser.mjs
node scripts/tests/cutout-v7-browser.mjs
LEGEND_BROWSER=webkit node scripts/tests/cutout-v7-browser.mjs
node scripts/tests/cutout-v7-studio.mjs

Staging only. Third-party anime-inspired artwork must pass rights review prior to commercial production. Slot math is virtual-credit research, not certified real-money RTP.
