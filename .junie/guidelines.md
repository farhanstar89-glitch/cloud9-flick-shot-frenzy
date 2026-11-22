# Junie guidelines — Cloud9 Flick Shot Frenzy

## What this project is

A static HTML5/Canvas browser game (no build step, no dependencies, no
server). Category 3 entry for the Cloud9 x JetBrains hackathon. It must run
by opening `index.html` and work fully offline at an event booth.

## Rules for working in this repo

- **Vanilla JS only.** No frameworks, no bundler, no npm dependencies.
  `game.js`, `leaderboard.js`, `booth.js` are classic scripts, not modules
  (so `file://` keeps working).
- **System fonts only.** No webfonts — the booth may have no Wi-Fi.
- **No external assets.** All art is canvas vector shapes. Never add Riot
  Games assets, names, music, or trademarks. Never add GRID data.
- **Game feel is the score.** Any tuning change to spawn cadence, target
  size/lifetime, or scoring must be validated with
  `tests/bot_playtest.py` (scripted Playwright bots) and the results
  recorded in `docs/PLAYTEST-REPORT*.md`. Don't tune by gut feel.
- **Keep the loop complete.** Start → play → score screen must always work;
  verify with `tests/smoke_test.py` (14 checks, must all pass).
- **Booth behaviour is a feature.** Auto-reset after 25 s idle on the score
  screen, attract mode after 30 s idle on the menu, auto-pause on window
  blur, local leaderboard in `localStorage` — never break these.
- **Test hook:** `window.FLICK` is a deliberate debug API used by the bot
  tests. Keep it working.
- **English only** in code, comments, and docs (Devpost requires it).

## How to verify

```bash
node --check game.js leaderboard.js booth.js
python3 tests/smoke_test.py        # needs the Playwright venv + browsers
python3 tests/bot_playtest.py      # 30 s tuning rounds, 12 bots
```
