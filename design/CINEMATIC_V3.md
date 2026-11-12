# LEGEND BALL X1000: Cinematic Visual Engine V3

Status: **isolated staging preview**, no money/wallet integration, no production clearance. Source: Skygate v0.14.3; all gameplay/math/RNG/settlement files unchanged.

## Three reference backgrounds (staging-only)

| Theme | File | Visual moment |
| --- | --- | --- |
| Ember Warrior | play/assets/legend-cinematics/scene-ember-warrior.webp | Starting world / warm power aura |
| Crimson Dragon | play/assets/legend-cinematics/scene-crimson-dragon.webp | Lightning-cut / multiplier ramp-up |
| Celestial Temple | play/assets/legend-cinematics/scene-celestial-temple.webp | Free Spins / ascension world |

Files are optimized WebP at 720x1280. A manifest stores hashes and explicit rightsReviewRequired and stagingOnly flags. The third-party title on the temple reference was cropped off, but this image is NOT automatically original/licensed. Before public production: replace with newly authored or licensed independent art and review franchise character silhouettes and trademarks.

## Runtime separation

- play/legend/cinematics.js: Presentation-only controller, loads 3 images, cuts between scenes behind the lightning strike, exposes spin/multiplier/bonus/big-win/blast events. No call into Skygate RNG or wallet.
- play/legend/cinematics.css: Bolt, scene stacking, motion blur/speed streaks, Veylorn movement, glowing Scatter/orbs, plasma rays instead of fireworks, logo lighting and control polish.
- play/game.js: Only presentation hooks added at existing Spin/multiplier/bonus/big-win boundaries. play/config.js, play/engine.js, studio/math/engine.js, studio/math/studio_math.js remain source-locked.
- play/reels.js: Adds flags for Scatter/orb lighting and capped eight plasma rings per cascade. No outcome generator/payout modifications.
- studio/project.json and play/legend/default-project.js: Aligned control positions and untouched 6x5 maths.
- Scenes change on every fourth visual Spin or during multiplier/bonus/big win; they never change outcome probabilities. Flash masks the image swap.
- Reduced-motion and battery-saver stop strong flashing and motion; failure to load first WebP keeps the original scene visible.

## Acceptance and protection

- npm test plus cinematic-vfx.test.mjs, cinematic-mobile-browser.mjs (Playwright) on isolated server.
- Mobile 320/390/430, desktop 1440: 30 visible cells in six columns, no broken images or overflow, bounded controls.
- 3 scene image loads and lightning swaps 0 -> 1 -> 2 -> 0 without black frame.
- Motion blur present while reels roll only, settles to clean symbols.
- Multiplier animates Veylorn and lightning, bonus scene transitions.
- Identical Spin outcomes, credits, bonus and RNG hash compared with Skygate.
- Railway Studio public access remains blocked. No production merge until physical device QA, original asset/IP clearance and independent security/game-math gates pass.
