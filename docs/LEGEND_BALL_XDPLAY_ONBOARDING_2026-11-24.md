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
