# Legend Ball X1000: iPhone stale UI / cutout V8

Date: 2026-11-13. Staging, fictional virtual credits only.

## Observed issue

iPhone in-app browser continued showing V5/V6 artwork (flattened atmospheric JPEG, old hex +/- buttons and stale panel layout) even though Railway was already serving V7 commit 409cabb. Production staging showed GET /play/release.json = null, ruling out an active published snapshot override at inspection time. The server still replied Cache-Control: no-cache for HTML and public, max-age=3600 for JavaScript/CSS, leaving older Safari tabs or resource caches able to reuse the old interface.

## Repair

- Game HTML, JS/CSS, scene manifest, and derived legend-cutouts assets now return no-store, no-cache, must-revalidate. Immutable, versioned published media are unchanged.
- New public /play/ui-version.json endpoint returns cutout-v8-20261113 with no-store. It never exposes game credentials or changes a user's round.
- Add a cache-busted new version to every relevant gameplay and Studio asset/script URL.
- The new update-guard.js changes legacy ?square=v6 and ?art=cutout-v7 bookmarks to ?ui=cutout-v8-20261113 in page history once the new source is loaded, checks version when Safari resumes, and shows a user-triggered reload control on mismatch. It never discards a spin or credits by auto reloading.
- ?verify=1 shows a tiny UI V8 CUTOUT marker, giving users a visible way to distinguish new source from a cached old tab.
- Studio Live link now targets the V8 URL.

## QA

- 119 ordinary engine/Studio/security regression tests passed.
- 5 approved-source/math and 6x5 visual source-lock tests passed.
- Chromium and WebKit iPhone tests passed: old ?square=v6, old ?art=cutout-v7, and new ?ui=cutout-v8 routes; all show 35 independent cutout assets, 6x5 physically square tiles, 0 SVG control icons, working +/- bet and spin; no broken images or overflow.
- Page update version-mismatch guard test passed with a simulated future build without forcing navigation.
- Existing approved splash and seeded gameplay test passed with the new server on 3118.
- Release snapshot API was observed null on staging before patch.

Use this **new URL** rather than the existing in-app browser tab:
https://legend-ball-web-staging.up.railway.app/play/?ui=cutout-v8-20261113&verify=1

## Limits

No code can replace an already running V6 tab if it never makes another server request. A fresh versioned link or browser reload is required once. The brand/character cutouts remain derived from flattened approved imagery; source rights review is required before a commercial release.
