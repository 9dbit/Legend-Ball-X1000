# Legend Ball X1000 V12 | Seamless splash sources

Master visual reference: `studio/assets/legend-master/splash-master.jpg`.

The screenshot reviewed on iPhone revealed visible rectangular crop edges and
an overly blurred plate. Version 2 keeps the **full-resolution approved master**
as the live, sharp foundation, then animates soft-edged, source-aligned WebP
motion mattes over it. The RGB pixels of each motion matte originate from the
same master at exactly the same 864 x 1536 coordinates. No older alternate
hero or dragon design is substituted.

## Six source layers

- `sources/background.webp`: full-detail unblurred master source backup.
  The live stage uses `legend-master/splash-master.jpg` directly for fidelity.
- `sources/character.webp`: soft-edged foreground motion matte.
- `sources/dragon.webp`: separate soft-edged dragon motion matte.
- `sources/logo.webp`: stationary title layer.
- `sources/enter-button.webp`: touch-feedback layer.
- `sources/thunder.webp`: blinking transparent energy accents.

These layers are optimized for *subpixel* parallax, not large displacements.
The approved master underneath prevents voids or exposed inpainting patches.
The transparent edges are intentionally feathered, so these mattes are not
general-purpose isolated character/dragon silhouettes.

`manifest.json` lists the source dimensions and alpha extents.
`scripts/build-splash-layers.py` generates the assets reproducibly using
Pillow. `release-store.mjs` registers them in `shippedAssets`; the
`npm run prepare:play` step copies them to the published game assets.

## QA

- `npm test`: unit and engine regressions
- `node scripts/tests/legend-layered-splash-browser.mjs`: iPhone, Android,
  and landscape safe-area layout plus ENTER interaction in Chromium/WebKit
- `node scripts/tests/legend-splash-motion-browser.mjs`: independent motions,
  stationary logo, press visual, and game transition
- `python scripts/tests/check-splash-fidelity.py`: screenshot-to-master
  image comparison; run after the layered browser suite

The original poster remains the fail-safe when optional layers do not decode.
No changes are made to payout mathematics or game state.
