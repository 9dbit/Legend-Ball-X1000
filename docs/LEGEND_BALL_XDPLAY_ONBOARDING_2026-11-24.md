# Legend Ball X1000 / XDPLAY demo onboarding checkpoint

**Date:** 2026-11-24 (Asia/Jakarta)  
**Requested canonical runtime:** `https://legendballx.xd-play.com`  
**XDPLAY launcher:** `https://xd-play.com/games/legend-ball-x1000/play`  
**Mode:** isolated virtual-credit demonstration. No money wallet, payment gateway, deposits, or withdrawals.

## Source of truth
- Game repo: `9dbit/Legend-Ball-X1000`
- Approved V13 parent: `f50948e47a9ffd46ef42bb6386dfbf827696554e`
- Candidate: `security/legendballx-demo-production-20261124`
- Portal repo: `9dbit/Soft-Tech`, deployment baseline branch `rebrand/xdplay-public-20261112` at `95494199f8d4885155d2117f5586c9e3d2692fd4`.
- Portal candidate: `release/legendballx-demo-portal-20261124`, changes limited to LEGEND BALL registry entry and onboarding checks.

## Root cause
- Existing runtime sends `/` to Studio and requires Studio Basic authentication in production.
- No Studio password on staging means a deliberate HTTP 503 at root, not a game outage.
- New `LEGEND_PUBLIC_DEMO=true` redirects `/` to public `/play/`, while Studio/editor/Studio API remain password-guarded (503 without credentials; 401/200 with configured Basic credentials).

## Runtime isolation
- Staging project: `7acb5534-6785-4046-8dfb-e556b4aace76`, environment `d9ab3ae1-e7de-4529-86b1-1ca982d1248b`, service `dcb16f8f-e11d-44b7-bb55-10aa9d5d3ae1`; do not modify its variables/volumes.
- Production project: `467970bf-1be7-4e9b-88aa-a39ae69cef55`, environment `4fa24fdf-721e-4206-9918-6e0d2fc5d858`, service `71ba10d1-bd26-48dc-9f61-3a917aac200f`.
- Production release volume: `d7fedfcf-1494-4042-9505-b68a08440e70` at `/data` (1024 MB). No database, cross-environment session store, or shared volume exists in this game runtime.
- Production Studio credentials must be distinct; `SKYGATE_STUDIO_PUBLIC_TESTING` is explicitly ignored when demo mode is on.
- Never enable `GAMEOPS_BRIDGE_ENABLED` in this standalone demo. Public game uses browser-local synthetic credits.

## Security gates
- Strict host check for the custom host and its Railway service domain.
- `/play/` HTML: CSP `frame-ancestors https://xd-play.com`, no contradictory X-Frame-Options. All Studio/API HTML and other routes: X-Frame-Options SAMEORIGIN and `frame-ancestors 'none'`.
- No cross-site credentials or wallet cookies created; no CORS wildcard. Studio writes retain same-origin Origin and CSRF-token checks.
- Keep XDPLAY launch `staging_only` until DNS ownership, TLS, deployed HEAD/GET, live browser QA, and portal build are all PASS.

## Rollback
- Game: revert or redeploy approved parent commit `f50948e47a9ffd46ef42bb6386dfbf827696554e`, but on production only with Studio guard and demo mode disabled; alternatively remove public domain binding to close public reachability immediately. Do not attach production domain to staging.
- Portal: restore baseline pinned portal commit `95494199f8d4885155d2117f5586c9e3d2692fd4` or set only LEGEND BALL registry `publicLaunch` back to `staging_only`; leave all other game entries untouched.
- Preserve production volume; never roll data back using staging content.

## Evidence log
- Baseline game CI: V13 workflow run `43740807380` SUCCESS.
- Staging DNS: `staging-legend-ball.xd-play.com` VERIFIED with valid TLS and CNAME `8ew8vcia.up.railway.app`.
- Production and portal domain/CI/live browser gate: pending evidence; do not report as PASS until measured.

## 2026-11-24 verification addendum
- Production service's first build completed SUCCESS at Railway deployment `aa7ac898-a9ea-4f0a-a0b5-65a9096c73b2`, but live fallback-host QA exposed HTTP 421. A narrowly scoped explicit fallback host allowlist was added, without a wildcard or cross-domain trust.
- Corrected production build `452810f8-eee5-4717-97fb-93f4793d2aac` is SUCCESS with source commit `3aa6c1e0e31bf6fdd5cb66461f6ebca05c9fd69b`; `LEGEND_FALLBACK_HOST=legendballx-demo-web-production.up.railway.app` configured. No changes to game math or approved assets.
- Production game route unit tests: 127 checks passed in CI. Production-mode Playwright safe-area 20/20, menus 4/4, splash Chromium/WebKit passed; generic Studio iframe QA was separated because a public demo intentionally does not offer an unauthenticated Studio iframe. The public-only lifecycle suite is part of current CI.
- Exact fallback HTTPS verification run `45375550357` was re-run **after** the corrected Railway deployment; see workflow result before marking live host PASS.
- Corrected public demo CI workflow latest source: `security/legendballx-demo-production-20261124`; parent approved V13 `f50948e47a9ffd46ef42bb6386dfbf827696554e`; source pin is explicit and not the shared staging branch.
- Production game custom domain DNS last checked as **not verified**; TLS `CERTIFICATE_STATUS_TYPE_VALIDATING_OWNERSHIP`. DNS provider writes not performed. Actual CNAME/TXT values above remain unchanged.
- Portal PR: `https://github.com/9dbit/Soft-Tech/pull/15`, canonical rename only, release still `staging_only`; all Skygate, Mahjong, UNO and portal-specific LegendBallX CI passed at `49129e3d06c9ecbe9a7f47be1ea300623257f667`.
- XDPLAY production shared service has an unrelated pending 24-change Railway patch. It was **not accepted/deployed**. The current public launcher must remain closed until DNS and portal production safe-deploy gates pass.
- Studio credentials are distinct and configured on production only. Rotate on first use. No credential values in Git, logs, or this checkpoint.
- Blocking steps: create/verify Cloudflare CNAME and TXT, wait for Railway SSL VALID; rerun live custom-host HTTP and in-portal iframe mobile/desktop input, audio, fullscreen and resume; deploy only the scoped portal release after reconciling its unrelated staged patch.

## Verified production live QA
- **SUCCESS** GitHub Actions run `https://github.com/9dbit/Legend-Ball-X1000/actions/runs/45375703868`, job `138381308804`. Both steps succeeded: (1) HTTPS routes, ownership-independent Railway origin, Studio/CSRF security response, CSP-only gameplay framing and assets; (2) **actual live** Chromium/WebKit responsive/PWA and System/Autoplay/Turbo/Rules interactive smoke. See the run's `legendballx-live-smoke` artifact for screenshots.
- Production Railway running commit `3aa6c1e0e31bf6fdd5cb66461f6ebca05c9fd69b`, deployment `452810f8-eee5-4717-97fb-93f4793d2aac` SUCCESS. The live acceptance source adds only QA/workflow changes beyond the running app.
- Railway HTTP logs for production show 200 on tested HTML, CSS, JS, WebP and MP3 assets.
- The remaining **hard release blocker** is Cloudflare CNAME/TXT. Railway currently reports `verified=false`, certificate `CERTIFICATE_STATUS_TYPE_VALIDATING_OWNERSHIP`. Neither custom-domain live browser QA nor actual XDPLAY iframe can pass before that ownership gate. Portal launcher remains `staging_only`.
