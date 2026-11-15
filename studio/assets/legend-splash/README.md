# Legend Ball X1000 | Full-bleed adaptive splash

Approved generated artwork: `originals/legend-ball-storm-of-legends-approved.png` (941 × 1672).
The approved 941 × 1672 composition is pasted pixel-for-pixel into the
941 × 2160 canvas **before WebP compression**. Only the atmosphere above and
below the artwork is extended from sky and volcanic edge details, without
duplicating the logo, character, dragon, or ENTER button.

## Source layers

`sources/background.webp`: sharp full-bleed approved master plus sky extension.
`sources/character.webp`: soft motion matte registered to the same master.
`sources/dragon.webp`: independent motion matte on the identical pixel grid.
`sources/logo.webp`: static, no animation.
`sources/enter-button.webp`: touch feedback on the approved ENTER plate.
`sources/thunder.webp`: transparent blinking electricity.
`sources/landscape-atmosphere.webp`: only sky and lava texture for wide viewports,
to prevent a duplicate character/logo in landscape browser/desktop.

`manifest.json` declares dimensions, source and padding. Regenerate using
`python3 scripts/build-fullbleed-splash.py` (Pillow required), then run
`npm run prepare:play` to publish the WebP assets. The legacy
`scripts/build-splash-layers.py` forwards to that canonical generator.

## Responsive behavior

In portrait, the approved composition uses CSS **cover** on the complete
viewport, with its content and clickable ENTER target locked to the same
941 × 2160 source grid. Browsers mask the overscan to their *visual viewport*;
standalone iOS/Android PWAs use the available physical/standalone height
provided by `--sg-pwa-full-height`. On desktop/landscape, the portrait
composition is centered on an atmospheric wide-fill without duplicate logo.
The logo stays fixed; character and dragon use subtle GPU-composited motion.
On tap, ENTER scales and brightens before opening gameplay.

The original 864 × 1536 poster remains as the loading fallback until all six
layer images decode. Existing gameplay, payouts, and Studio scene layout
are untouched by the splash changes.

## Verification

- `npm test`
- `node scripts/tests/legend-layered-splash-browser.mjs`
- `node scripts/tests/legend-safe-area-browser.mjs`
- `node scripts/tests/legend-splash-motion-browser.mjs`
- `LEGEND_CAPTURE_SCREENSHOTS=1 node scripts/tests/legend-layered-splash-browser.mjs`
- `python3 scripts/tests/check-splash-fidelity.py`
