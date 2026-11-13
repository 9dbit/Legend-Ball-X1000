Latest local UI revision: see [LEGEND_V12_REVIEW.md](LEGEND_V12_REVIEW.md).

# Legend Ball X1000 — unified layout review

## Result

The 1080 × 1920 game layout uses 29 native layers and 38 optimized media files
(35 WebP and 3 MP4, 4,201,720 bytes total). The header combines the clean hero,
dragon, logo, temple, cloud veil and lightning. Reels remain 6 × 5 with square
cells. HUD values and controls remain live DOM elements. Existing source
archives and original images are retained outside this runtime selection.

Hero and dragon loops use a WebGL black-matte compositor over static posters.
The energy loop sits behind the SPIN artwork. Videos start from Play and pause
for reduced motion, battery mode and hidden documents. Gyroscope permission is
requested from the Play gesture; desktop pointer parallax affects scenery only.
Motion quality and device compatibility still require browser verification.

## Universal Game Studio

The actual Universal Game Studio build is embedded at
`/studio/universal/?game=legend-ball-x1000` behind the existing Studio access
rules. Source: `9dbit/Soft-Tech`, branch `feat/legend-ball-linked-layout-v10`,
commit `9ae12d8b4e2d1d2f1595b51f9ce90c64ad351bc8`.

The adapter opens a published V10 project when available, otherwise the bundled
V10 layout. It uses the game's own renderer through a same-origin iframe.
Position, size, visibility and opacity edits update that renderer. The export
is a native game project, preserving engine rules, paytable, weights and motion
metadata. Drafts remain in the browser. Export the native JSON and use the
existing game Studio release workflow to publish a layout; edits do not
automatically change the live release.

The seven regular symbol illustrations available in the new sheet cover nine
existing engine outcomes. Reused hero illustrations carry tier badges I/II/III;
outcome identities and probabilities have not been changed to fit the artwork.

## Verification

- Game suite: 120 passed, 0 failed.
- Universal Studio suite: 46 passed, 0 failed.
- Universal Studio production build: passed.
- Native coordinate round trip, square reels, unchanged math and retained
  motion metadata: passed.
- Engine/configuration sources: unchanged.
- Browser/device rendering and video playback: pending. Local Chromium could
  not launch, and the shared browser could not reach the local preview server.
- CI workflow `.github/workflows/unified-v10-qa.yml` is prepared for Chromium
  and WebKit at 320, 390, 430 and 1440 widths, controls/spin, and Studio edit/export.
  It has not run remotely.

`Legend_Ball_X1000_Layout_V10.webp` is a static composition from the layout JSON,
not a browser screenshot. Saved preview ID:
`libfile_490e4f5d906c819187797e0264c01d36`.

## Publication state and next authorized step

Local game branch: `feat/unified-assets-layout-v10` in
`9dbit/Legend-Ball-X1000`. Local Studio branch:
`feat/legend-ball-linked-layout-v10` in `9dbit/Soft-Tech`.

Automatic approval review rejected both pushes because external publication
authorization was not considered explicit. Neither branch was pushed; neither
Railway service was changed. Do not work around that rejection using another
connector or remote upload.

After explicit user approval: push these two branches, run the prepared browser
QA, review its screenshots and motion, fix any failures, then deploy the tested
game commit to the existing Legend Ball staging service. The embedded Studio is
part of that deployment; the separate Universal Studio service is unaffected.

Existing Legend staging URL: https://legend-ball-web-staging.up.railway.app
Railway project: `7acb5534-6785-4046-8dfb-e556b4aace76`.
Staging environment: `d9ab3ae1-e7de-4529-86b1-1ca982d1248b`.
Service: `dcb16f8f-e11d-44b7-bb55-10aa9d5d3ae1`.
