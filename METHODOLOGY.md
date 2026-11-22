# Methodology — Frenzy (Cloud9 Flick-Shot Arcade)

## The problem (Category 3: Event Mini Game)

A Cloud9 event booth needs a game that a stranger can understand in five
seconds, finish in under three minutes, and immediately want to replay —
while the line behind them keeps moving. It must survive a whole day of
repeated play on a booth PC with unreliable Wi-Fi, and it must give the
crowd something to compete over.

## The approach

**One input, one verb.** The whole game is "click the targets". No tutorial,
no keys, no account, no loading. The menu explains the game in one sentence,
and the first target appears 2.4 seconds after you pick a mode.

**A real gamer skill, not a toy.** Flick shots are the core mechanic of
tactical FPS aim — the category brief explicitly suggests "a creative
aim-trainer, a flick-shot tester, or a reaction-time drill". Four modes
share one engine but train different slices of that skill:

- **Precision** — big, slow, shrinking targets; score rewards dead-center
  hits. This is the on-ramp: everyone hits, the best players score 2× more.
- **Reflex** — sub-second targets; score rewards fast flicks. The hard mode.
- **Chaos** — many drifting targets plus decoys; target selection under
  pressure, with a real cost for clicking the wrong thing.
- **Track** — one roaming mover; score rewards steady cursor tracking, a
  genuinely different skill from flicking. The mover steers smoothly (its
  velocity eases toward each new heading instead of snapping), the capture
  ring forgives a few pixels of wobble, and the ring drains at half the
  fill rate — so a brief slip costs time but never wipes the attempt.

**The booth is the product, not an afterthought.** Rounds default to 60
seconds (the field's near-standard for booth throughput; a 90s classic round
is one tap away on the menu). The score screen auto-resets to the attract
screen after 15 s idle, the menu has a 30 s attract mode, the game
auto-pauses if the window loses focus, a staff reset (button or `R` key)
wipes the local leaderboard, and the leaderboard is a separate
second-monitor view (`booth.html`) that reads the same local storage and
updates the instant a score is saved (BroadcastChannel + `storage` event,
2 s poll as fallback) — no server, no Wi-Fi, no account, nothing to break
at an event.

**Tuning with data, not vibes.** Difficulty was set by scripted bots that
play the game with real mouse clicks at four skill levels (reaction delay +
aim noise + mouse-travel time, including the lesson that bots must track a
moving target the way humans do — an open-loop bot that aims at a stale
position misses everything). Full 90-second rounds, 2 repetitions, averaged
(`docs/PLAYTEST-REPORT-FULL90.md`, `tests/bot_playtest.py`). Two design calls
came directly out of the data:

1. **Exactly one golden target per round.** A random golden lottery swung
   scores by thousands of points between identical runs. Every player now
   gets the same single jackpot chance at a random moment; skill decides
   whether they cash it in.
2. **Precision differentiates on accuracy, not hit rate.** A decent player
   hits 94% of Precision targets — so the mode scores center accuracy
   (up to +100 per hit) instead of pretending to be hard to hit.
3. **Track must forgive, or nobody finishes a capture.** The first Track
   bot run showed even a perfect bot stalling: the ring drained twice as
   fast as it filled and the mover snapped to new headings. The fix was
   threefold — slower mover (70–120 px/s), smooth steering (velocity eases
   between headings), a 10 px grace ring, and half-rate drain — plus a bot
   fix (a two-read follow loop lagged ~250 ms per step; a single-read loop
   follows like a human). After that the skill curve went monotonic
   (perfect > fast > average > casual) with a first-timer still scoring.

## JetBrains tools used (honest status, 23 Nov 2026)

| Tool | Status |
|---|---|
| **WebStorm 2025.3** (`WebStorm-263.7307.202`) | **Installed and used.** Downloaded from JetBrains (data.services.jetbrains.com), extracted, launched on this Linux VM under Xvfb. The GUI needed `libXtst.so.6` and friends, installed via apt. The project was opened in WebStorm (`.idea/` committed as evidence) and the built-in code inspection was run from the IDE's `inspect.sh` CLI — report in `docs/idea-inspection/`. |
| **Junie CLI 26.11.2** | **Installed, not yet usable.** `curl -fsSL https://junie.jetbrains.com/install.sh \| bash` succeeded and `junie --version` reports 26.11.2. Running a task requires sign-in (JetBrains account, API key, or BYOK) — no account or key was created for this project, and the hackathon's All Products Pack / AI Ultimate codes (which unlock AI features) arrive by email within ~5 business days of registration (registered 23 Nov 2026). Junie will be used for a review pass once the codes arrive; nothing about Junie is claimed beyond the install. |
| **JetBrains Air** | Not used. The project is a static site with no build step; there was nothing for Air to do, and claiming otherwise would be dishonest. |

The game itself was written by an AI coding agent (Muse, Meta's agent —
see `AI_SHOWCASE.md`), with WebStorm as the project IDE and its inspector
as the static-analysis step. No JetBrains tool was faked: the `.idea/`
folder was generated by opening the project in WebStorm, and the
inspection report is the real output of `inspect.sh`.

## What is still to do before submission

- Demo video (≤ 3 min, YouTube) — record a real play session + booth view.
  NOTE: a v1 video was recorded 23 Nov 2026 03:35 from the pre-upgrade
  build (3 modes, 90 s rounds). It MUST be re-recorded after the Track /
  60 s-booth upgrade lands — the submitted video has to show the game
  judges will actually play.
- Submit on Devpost (Category 3) with this repo, the GitHub Pages link,
  the video, this write-up, and the tooling explanation above.
- Optional: run Junie `/review` on the codebase once the AI codes arrive,
  and fold any real findings into the repo.
