# Cloud9 Flick Shot Frenzy

A mouse-only flick-shot arcade game for Cloud9 event booths — built for the
**Cloud9 x JetBrains: Sky's The Limit Hackathon 2026, Category 3 (Event Mini Game)**.

> The Cloud9 booth aim-trainer. Click the targets. Skip the dark ones.
> 90 seconds. One mouse. No mercy.

**Play it now:** https://farhanstar89-glitch.github.io/cloud9-flick-shot-frenzy/
(open `index.html` — no install, no build step, no account, works fully offline)

## How to play

- **Pick a mode** — Precision, Reflex, or Chaos — then click the targets.
- **Combos:** consecutive hits without a miss raise your multiplier, up to ×5.
- **Golden target:** exactly one appears every round, at a random moment.
  Hit it for 500 points and trigger an 8-second **FRENZY** (double points).
- **Chaos mode:** dark targets with a red ✕ are decoys — clicking one costs
  50 points and breaks your combo.
- **Score screen:** final score, accuracy, best combo, average reaction time,
  and an S/A/B/C rank. Enter your tag to save it on the local leaderboard.

| Mode | The idea | Who it's for |
|---|---|---|
| **Precision** | Big targets, slow drift, shrinking rings. Score rewards dead-center hits. | First-time players, warm-up |
| **Reflex** | Targets vanish in under a second. Score rewards fast flicks. | Reaction-time bragging rights |
| **Chaos** | Many fast drifting targets + decoys. Don't click the dark ones. | The booth crowd, rematches |

A round is 90 seconds plus a 3-2-1 countdown — a full session (menu →
play → score) is under 3 minutes, so the booth line keeps moving.

## Booth setup

Two screens, one machine, zero network needed:

1. **Player screen:** open `index.html` (or the GitHub Pages link above).
2. **Leaderboard screen:** open `booth.html` on the second monitor.
   It shows the live top 10 (overall + per-mode tabs auto-cycling every 8s),
   refreshes from local storage every 2 seconds, and works with no Wi-Fi.

Booth behaviour is built in:

- **Clean reset:** the score screen auto-returns to the menu after 25 s of
  inactivity, ready for the next player.
- **Attract mode:** after 30 s idle on the menu, a pulsing "TAP TO PLAY"
  overlay appears over the animated demo targets.
- **Auto-pause:** the game pauses itself if the window loses focus.
- **Local leaderboard:** scores live in `localStorage` on the booth machine —
  nothing leaves the device, nothing needs an account.

## Run it

No build step, no dependencies, no server required:

```bash
# Option A — just open it
open index.html        # or double-click it in your file manager

# Option B — serve it locally (any static server works)
python3 -m http.server 8000
# then visit http://localhost:8000/
```

Works in any modern desktop browser. Mouse only (touch works too via
Pointer Events). Sound is synthesized with WebAudio — no audio files — and
can be muted from the top bar.

## Files

| File | What it is |
|---|---|
| `index.html` | Game shell: menu, HUD, score screen, attract overlay |
| `style.css` | Cloud9 blue / white / dark navy theme (system fonts only, offline-safe) |
| `game.js` | All game logic: spawning, scoring, combos, frenzy, sounds, states |
| `leaderboard.js` | Local leaderboard storage (shared by game + booth view) |
| `booth.html` / `booth.js` | Second-monitor live top-10 display |
| `tests/smoke_test.py` | Playwright smoke test: full loop, zero console errors |
| `tests/bot_playtest.py` | Scripted bot playtests (4 skill levels × 3 modes) |
| `docs/PLAYTEST-REPORT-FULL90.md` | Bot results from full 90-second rounds |
| `AI_SHOWCASE.md` | AI-powered workflow story (bonus prize entry) |
| `METHODOLOGY.md` | Approach + JetBrains tooling explanation |
| `.idea/` | WebStorm project files (committed as tooling evidence) |
| `.junie/` | Junie guidelines for this project |

## Tuning — measured, not guessed

Difficulty was tuned with scripted bots that play the game with real mouse
clicks at four skill levels (perfect / fast / average / casual — reaction
delay + aim noise + mouse travel time). Full 90-second rounds, 2 repetitions,
averaged (see `docs/PLAYTEST-REPORT-FULL90.md`):

| Mode | Perfect bot | Decent player (avg) | First-timer (casual) |
|---|---|---|---|
| Precision | 103,750 | 49,085 (94% hit rate) | 8,095 (43% hit rate) |
| Reflex | 102,002 | 33,697 (71% hit rate) | 1,018 (7% — the hard mode) |
| Chaos | 75,100 | 47,138 (74% hit rate) | 9,300 (38% hit rate) |

Design calls that came out of the data: exactly one golden target per round
(a random golden lottery swung scores by thousands, so every player gets the
same single jackpot chance); Precision differentiates on center accuracy
rather than hit rate; Reflex stays brutal on purpose — its tagline warns you.

## JetBrains tools

- **WebStorm** (2025.3) — the IDE the project was built and inspected in.
  See `METHODOLOGY.md` for the honest status, and `docs/idea-inspection/`
  for the inspection report.
- **Junie CLI** (26.11.2) — installed; interactive use is blocked until the
  hackathon All Products Pack / AI Ultimate codes arrive (sign-in required).
  See `METHODOLOGY.md`.

## Originality

All art is drawn in code with canvas vector shapes. No Riot Games assets,
names, music, or trademarks are used anywhere; no GRID data is used
(Category 3 does not need it). Cloud9's name and blue are used as the
hackathon's own theme, per the category brief.

## License

MIT — see `LICENSE`. Solo entry by Farhan Montgomery (Indonesia).
