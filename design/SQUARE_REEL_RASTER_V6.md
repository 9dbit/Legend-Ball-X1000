# LEGEND BALL X1000: square reel / raster panel V6
Date: 2026-11-13
Environment: isolated staging preview, virtual credits only.

## Scope
- Preserve original locked master splash JPEG and approved gameplay reference JPEG. Both original SHA-256 values remain unchanged.
- Derive `gameplay-square-backdrop.webp` from approved raster with the hero and title at **80% scale** and vertically refit them above the WIN / reel controls.
- Keep the same real **6 columns x 5 rows**, make the physical reel area height `width * 5 / 6`, so every tile is a square on any portrait viewport.
- Extend the reel frame in its undecorated vertical middle rather than stretching corner ornaments; clear stray screenshot symbol fragments under the new fifth row.
- Reduce the Spin button from 296 to 266 design pixels, **minus 10%**, with its approved static PNG.
- Keep Buy Spin, Bonus Booster, Virtual Credit and Total Bet as real DOM values. Use cleaned copies of the same screenshot-derived PNG frames. Blank frozen JPEG numbers behind the live values.
- Use the JPEG-raster-native red minus / plus images already in the bet panel, with transparent native hit targets, not SVG icons.
- Remove nine inline SVGs formerly used for rendered button icons. Auto / Turbo / Menu / Info remain bound to native HTML buttons and their original PNG artwork.

## Preserved engine and source
No changes to `play/config.js`, `play/engine.js`, `studio/math/engine.js`, `studio/math/studio_math.js`, `play/reels.js` or `play/game.js`.
Studio and public play are synchronized through `studio/project.json`, `studio/project-data.js` and `play/legend/default-project.js`.
Original approved artwork is preserved and remains SHA-locked. New files have separate names; do not overwrite reference assets.

## Verification
- `npm test`: 118 regression tests pass.
- `node --test scripts/tests/approved-master-v5.test.mjs`: 4 tests pass, including canonical Git SHA and unmodified math.
- `node scripts/tests/square-reels-mobile-browser.mjs`: 320x568, 390x844, 430x932, 864x1536 viewports, 6x5 grid, 1:1 tiles, 0 SVG button icons, no broken images or overflow; Spin and bet +/- settle correctly.
- Browser evidence saved under `qa-artifacts/square-reels-v6-*/` and in CI artifact storage.

## Release boundaries
These visual changes are for **staging**. The master manifest expressly requires review of rights for anime-inspired artwork before any commercial production use.
The virtual-credit preview is not an RTP-certified game and must not be represented as a regulated real-money game.
