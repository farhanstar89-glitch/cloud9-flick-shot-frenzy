# Judge-Path Test — 30-Second Booth Test

**Purpose:** a Devpost judge (or a booth visitor) opening the live Pages link in
a clean browser should understand "this is a booth game" and reach PLAY
within seconds, with zero console errors.

**Setup:** fresh Playwright Chromium, clean profile (no storage/cookies),
viewport 1280×720, live link
https://farhanstar89-glitch.github.io/cloud9-flick-shot-frenzy/
(and, for the post-fix run, the same files served locally).
Measured: seconds from navigation start until `#screen-menu` is visible,
whether the page needs scrolling, whether all four mode cards (the PLAY
affordance) are inside the viewport, and the exact console-error count.

## Run 1 — live Pages, before the fix (2026-11-23)

- Page load: **0.69 s**; menu visible: **0.80 s**; settled: **1.30 s**
- Menu title reads "FRENZY / FLICK-SHOT ARCADE"; no scrolling needed
  (`scrollHeight` 720 = viewport 720)
- All four mode cards visible without scrolling (top 309, bottom 434)
- **Console errors: 1** — `Failed to load resource: the server responded
  with a status of 404 ()`. No failed request surfaced in the page's
  request log, but neither `index.html` nor `booth.html` declared a
  favicon, so the browser's automatic `/favicon.ico` request 404s on
  GitHub Pages. That is the error.

## Fix

Added one inline SVG favicon (Cloud9 blue `#0090ff` square, white "9",
data URI — no extra file, still fully offline) to `index.html` and
`booth.html`. No layout or gameplay change.

## Run 2 — local server, after the fix (2026-11-23)

- Page load: **0.90 s**; menu visible: **1.29 s**; settled: **1.79 s**
  (local `python -m http.server`, slightly slower than Pages)
- No scrolling needed; all four mode cards visible (top 309, bottom 434)
- **Console errors: 0**; failed requests: none

## Run 3 — live Pages, after the fix (2026-11-23)

- *(filled in after the push — see commit history)*
