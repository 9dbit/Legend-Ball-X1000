# Legend Ball X1000 V12 | Layered splash sources

Original artwork reference: `studio/assets/legend-master/splash-master.jpg`.
These six WEBP layers are extracted from that approved image, not from the older alternate hero/dragon art.

- `sources/background.webp`: full-bleed, atmospheric extension.
- `sources/character.webp`: foreground warrior, subtle breathing motion.
- `sources/dragon.webp`: independently moving dragon, behind the warrior.
- `sources/logo.webp`: static logo, positioned below the device notch.
- `sources/enter-button.webp`: matching original ENTER art, with press feedback.
- `sources/thunder.webp`: independent blinking lightning overlay.

`manifest.json` lists source image boxes and dimensions.
The generator is `scripts/build-splash-layers.py`, using Pillow, numpy, and OpenCV.
Published assets are registered in `release-store.mjs` and copied by `npm run prepare:play`.
The splash remains backed by the original approved master JPEG when a layer fails to decode.
The game engine and virtual-credit mathematics are unchanged.

QA: `node scripts/tests/legend-layered-splash-browser.mjs`.
