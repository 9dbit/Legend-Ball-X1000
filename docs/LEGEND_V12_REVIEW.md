# Legend Ball X1000 — V12 local implementation

## Requested changes

- Minus, amount and plus are contained by one Total Bet panel. Both the
  native editor and Universal Game Studio move/resize the controls with the
  frame; native export retains the resulting coordinates.
- The gameplay sound button is hidden. The existing Menu sound switch and
  master volume remain functional. The hidden runtime sound node is retained
  because the Play gesture uses it to unlock audio.
- The provider footer layer is hidden and blank; the fallback footer text is
  removed from the gameplay HTML.

## Approved artwork and runtime

WIN, Scatter and reel frames come from the approved transparent Sources sheet.
The HUD sheet was cleaned into empty frames so prices, credit and bet can be
rendered as changing values. The new WebP assets and empty HUD master are in
`studio/assets/legend-v12`. No new video generation was requested or run.

The opaque reel backing sits below the live square 6 x 5 grid. Its border uses
nine-slice scaling, deriving the insets from the frame and grid coordinates.
The lava foreground uses a separate crop of the approved background.

The active catalog contains 34 WebP images and 3 compressed MP4 animations,
4,664,774 bytes combined. Historical assets remain available to older releases;
this number excludes legacy art, splash, PWA icons, audio and application code.

A separate Sources deliverable, `Legend_Ball_X1000_V12_UI_Assets.zip`, contains
9 WebP files (8 skins/layers plus the empty HUD master), 969,041 bytes.
The V12 JPEG remains a static mockup, not a browser screenshot.

## Universal Game Studio

Embedded source: `9dbit/Soft-Tech`, branch
`feat/legend-ball-linked-layout-v10`, commit
`53e44afbfd7657037c4b3cafb78bf6c61824fe64`.

The linked editor uses `/play/assets/legend-v12/manifest.json` and the native
same-origin game renderer. It handles an empty live release and retains an old
release's game settings when preparing the V12 visual draft. The V12 browser
storage key is separate, so old drafts are retained without overriding V12.
Export and existing authenticated Studio publication remain separate actions.
A previously published layout still takes precedence in gameplay until the
new layout is explicitly published; a code deployment alone does not replace it.

## Verification and limits

- Game tests: 125 passed, 0 failed.
- Universal Studio tests: 49 passed, 0 failed.
- Embedded production build: passed.
- Native coordinate grouping, control containment, alpha media inventory,
  catalog hashes, media HTTP routes and menu audio regression: passed within
  the applicable unit/HTTP tests. Browser interaction is not yet verified.
- Compared with the prior local commit: math, tracks, audio, bet, initial credit,
  jackpot and spin settings are unchanged.
- Chromium cannot launch in this runtime (`socket() failed: Operation not
  permitted`); the WebKit executable is absent. No new browser screenshot or
  animation QA is claimed. Prepared CI covers Chromium and WebKit responsive
  rendering, contained controls, menu audio, spinning and editor export.
- Known artwork limitation remains: seven regular illustrations represent nine
  engine outcomes, with I/II/III tier badges on reused hero artwork. This change
  does not create the missing distinct illustrations or modify outcome weights.

## Publication blocker

No remote push, CI run, Railway deployment or live layout publication occurred.
An earlier automatic approval review rejected the two repository pushes because
external publication authorization was not considered explicit. Do not bypass
that rejection through another connector.

After explicit approval: push `feat/unified-assets-layout-v10` to
`9dbit/Legend-Ball-X1000` and `feat/legend-ball-linked-layout-v10` to
`9dbit/Soft-Tech`; run the prepared browser QA, inspect actual screenshots and
motion, fix issues, then deploy the tested commit to the existing Legend Ball
staging service. Publish the V12 layout through the existing authenticated
Studio workflow if staging has an older active snapshot. Preserve the active
snapshot's game settings during the visual migration.
