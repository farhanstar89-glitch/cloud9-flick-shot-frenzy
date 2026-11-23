# Cloud9 x JetBrains — Devpost Submission Draft v2
## Frenzy — Cloud9 Flick-Shot Arcade

Prepared 2026-11-23. Status: **SUBMITTED 2026-11-23 05:01 WIB — submission
ID 1316594, public page https://devpost.com/software/frenzy-cloud9-flick-shot-arcade.**
This v2 is a proposed text refresh for the Devpost project page (paste by hand —
nothing here touches Devpost). Category 3 — Event Mini Game; bonus prize Yes +
AI_SHOWCASE.md URL; Junie utilization answered "No" (CLI installed, interactive
use awaits AI codes); marketing unticked. Editable until 13 Jan 2027 02:00 WIB.
Judging 27 Jan – 3 Feb 2027; winners ~9 Feb 2027.

## Basics (unchanged)
- **Title:** Frenzy — Cloud9 Flick-Shot Arcade
- **Tagline:** Track the mover. Flick the targets. Skip the dark ones. 60 seconds. One mouse. No mercy.
- **Category:** 3 — Event Mini Game
- **Playable link:** https://farhanstar89-glitch.github.io/cloud9-flick-shot-frenzy/
- **Repo:** https://github.com/farhanstar89-glitch/cloud9-flick-shot-frenzy (public, MIT)
- **Demo video:** https://youtu.be/AkBgX2FqG9A (public, channel gondaL, 77.32 s, <3 min ✓)
- **Built by:** Farhan Montgomery (solo, Indonesia)
- **Bonus prize:** Best AI-Powered Workflow Story (see AI_SHOWCASE.md in repo)

## Description (for Devpost project text)

**Frenzy** is a mouse-only flick-shot arcade game built for the Cloud9 event
booth — and its headline mode is **Track**: one target roams the arena, and
you press and HOLD your mouse on it until its ring fills to capture it. It
trains tracking, not just flicking — a genuinely different skill from the
flick-shot modes around it, and the reason the game has four modes instead
of one mechanic four times over.

**How it plays**
- Pick a mode — Precision, Reflex, Chaos, or Track — and play. Rounds are
  60 seconds by default (the booth standard); a 90-second classic round is
  one tap away.
- Combos: consecutive hits without a miss raise your multiplier, up to ×5.
- Golden target: exactly one appears every round. Hit it for 500 points and
  trigger an 8-second FRENZY (double points).
- Chaos mode: dark decoy targets with a red ✕ — clicking one costs 50 points
  and breaks your combo.
- Track mode: one roaming mover — hold your cursor on it till the ring fills.
  Slip off and the ring drains. Captures score by hold accuracy and
  on-target time.
- Score screen: final score, accuracy, best combo, average reaction time in
  ms, on-target time (Track), and an S/A/B/C rank. Enter your tag to save it
  on the local Top 10 leaderboard.

| Mode | The idea | Who it's for |
|---|---|---|
| Precision | Big targets, slow drift, shrinking rings. Score rewards dead-center hits. | First-time players, warm-up |
| Reflex | Targets vanish in under a second. Score rewards fast flicks. | Reaction-time bragging rights |
| Chaos | Many fast drifting targets + decoys. Don't click the dark ones. | The booth crowd, rematches |
| Track | One roaming mover — hold your cursor on it till the ring fills. | Aim-trainer purists, leaderboard grinders |

**Built for a real booth — mapped to the Category 3 brief**
- **Session under 3 minutes:** a round is 60 seconds plus a 3-2-1 countdown —
  a full session (menu → play → score) is under 2 minutes, so the booth line
  keeps moving.
- **Mouse-only, no tutorial needed:** one input, one screen of instructions
  on the menu ("HOW TO PLAY"), nothing to learn before the first click.
- **Clean reset between players:** the score screen auto-returns to the
  attract screen after 15 s idle, ready for the next player. Staff can force
  it with the STAFF RESET button (top bar) or the `R` key — confirm-guarded,
  and it clears the local leaderboard.
- **Fully offline:** no build step, no dependencies, no external assets, no
  account, no Wi-Fi. Sound is synthesized with WebAudio. Nothing leaves the
  booth machine — scores live in `localStorage`.
- **Second-monitor leaderboard:** `booth.html` on the second monitor shows
  the live Top 10 (overall + per-mode tabs auto-cycling every 8 s). It
  updates the moment a score is saved — `BroadcastChannel` + native
  `storage` event (2 s poll only as fallback). No refresh, no reload.
- **Original assets:** all art is drawn in code with canvas vector shapes.
  No Riot Games assets, names, music, or trademarks; no GRID data (Category 3
  does not need it). Cloud9's name and blue are the hackathon's own theme.
- **Booth-tested:** attract mode after 30 s idle, auto-pause on window blur,
  and a 30-second judge-path test (clean browser, 1280×720) in
  `docs/JUDGE-PATH-TEST.md` — menu visible in under a second, PLAY visible
  without scrolling, zero console errors.

**Tuned with data, not guesses**
Difficulty was tuned with scripted bots playing full 90-second rounds with
real mouse clicks at four skill levels (perfect / fast / average / casual).
Full results in `docs/PLAYTEST-REPORT-FULL90.md`. Average (decent booth)
players hit **Precision 94%, Reflex 71%, Chaos 74%** — first-timers still
score in every mode, while Reflex stays brutal on purpose (its tagline warns
you). Design calls from the data: exactly one golden target per round (a
random golden lottery swung scores by thousands, so every player gets the
same single jackpot chance); Precision differentiates on center accuracy
rather than hit rate.

**JetBrains tools used**
- **WebStorm 2026.3** — the IDE the project was built and inspected in.
  Headless inspection: **0 errors across 199 findings** (38 warnings, 146
  weak warnings, 7 style suggestions — all non-blocking); report in
  `docs/WEBSTORM-INSPECTION.md`, `.idea/` committed as evidence.
- **Junie CLI (26.11.2)** — installed; interactive use awaits the hackathon
  All Products Pack / AI Ultimate codes (see METHODOLOGY.md for the honest
  status).
- The full AI-powered workflow story is in `AI_SHOWCASE.md` (bonus prize entry).

**Originality**
All art is drawn in code with canvas vector shapes. No Riot Games assets,
names, music, or trademarks are used anywhere; no GRID data is used
(Category 3 does not need it). Cloud9's name and blue are used as the
hackathon's own theme, per the category brief. MIT license.

## What changed vs v1 (SUBMISSION-DRAFT.md)
- Headline leads with Track ("trains tracking, not just flicking").
- Features mapped one-by-one to the Category 3 requirements.
- Average-player hit rates quoted (Precision 94%, Reflex 71%, Chaos 74%).
- WebStorm section with the 0-errors inspection result (correct version
  2026.3, correct report path `docs/WEBSTORM-INSPECTION.md`).
- Judge-path test cited (`docs/JUDGE-PATH-TEST.md`); gameplay GIF added to
  the README top.
- No "only one" / "satu-satunya" claims anywhere — the rival gallery is
  unverified.
