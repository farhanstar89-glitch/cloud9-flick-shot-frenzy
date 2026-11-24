# AI-Powered Workflow Story — Frenzy (Cloud9 Flick-Shot Arcade)

*Bonus prize entry: Best AI-Powered Workflow Story — a short case study of
how AI accelerated this build. Everything below is what actually happened;
nothing is embellished.*

## The setup

One solo entrant, one night, one goal: a booth-ready mini game for Category 3.
The entrant (Farhan, Indonesia) does not write code — his AI agent does the
building end to end, including all the English, while he decides. The agent
is Muse (Meta's personal AI agent), working on a Linux VM.

## What the AI did

**1. Rules first, code second.** The agent read the Devpost rules and
submission-specifics pages before writing anything, and pulled out the
constraints that shaped the whole build: session under 3 minutes, mouse-only
controls, clean reset between players, local leaderboard on a second monitor
with no Wi-Fi, original art only, and a JetBrains tool in the loop. The
game's feature list is a direct translation of that page — nothing in the
game is there by accident.

**2. Built the game in one pass, then tested it like a player.** The full
game (menu → countdown → 60-second booth round → score screen, four modes, combo
system, golden-target frenzy, synthesized sound, local Top 10 leaderboard, booth
display view) was written as a static site with no build step — the agent
chose that deliberately so judges can open the GitHub Pages link and play
instantly, with zero install friction.

**3. Tuned difficulty with bot players.** Instead of guessing whether the
game was too easy or too hard, the agent wrote a Playwright bot that plays
with real mouse clicks at four skill levels (reaction delay + aim noise +
mouse-travel time). Three rounds of measurement, each followed by a retune:

- *Round 1:* the "average" bot hit 100% of targets in Precision — too easy.
- *Round 2:* adding mouse-travel time exposed a modelling bug (an open-loop
  bot aims at a stale position and misses everything). The agent fixed the
  bot to track targets the way humans do — closed-loop aim, re-reading the
  target position right before the click.
- *Round 3:* with a fair model, the numbers landed where a booth game needs
  them (full 90 s rounds: decent player 94% hit rate in Precision, 71% in
  Reflex, 74% in Chaos; first-timer still scores in every mode except
  Reflex, which is the hard mode by design).

- *Round 4 (rival-gap upgrade):* a fourth mode, **Track**, was added to
  close the gap to the best Category 3 rivals — a genuinely different skill
  (hold-to-track, not another click variant). The first bot run exposed two
  real bugs: the ring drained twice as fast as it filled, so even a perfect
  bot stalled; and the bot's own two-read follow loop lagged ~250 ms per
  step. The agent retuned the game (slower mover, smooth steering that
  eases between headings instead of snapping, a grace ring, half-rate
  drain) and fixed the bot to a single-read follow loop — after which the
  skill curve went cleanly monotonic across all four bot skill levels
  (see docs/PLAYTEST-REPORT-FULL90.md for the numbers).

Two design decisions came out of the data, not out of opinion: exactly one
golden target per round (a random golden lottery swung identical runs by
thousands of points), and Precision scoring center accuracy instead of
pretending to be hard to hit.

**4. Verified the loop end to end.** A smoke test clicks through the entire
flow in a real browser — menu → play → score → save → play again → Track
capture → Top 10 → staff reset → live booth view — and fails on any console
error. 27/27 checks pass.

**5. Shipped the repo.** Public GitHub repo, MIT license, GitHub Pages
deployment, README with run instructions — all created and pushed by the
agent through the project's normal git credential flow.

## Where JetBrains tools fit

- **WebStorm** is the project IDE: installed on the VM, project opened in
  it (`.idea/` committed), and its built-in code inspection run over the
  codebase (`docs/idea-inspection/`). The GUI needed a missing system
  library (`libXtst.so.6`); the agent diagnosed that from the launch log
  and installed it via apt.
- **Junie** (JetBrains AI agent) ran a full review pass on 24 Nov 2026
  01:45 WIB, once the All Products Pack / AI Ultimate codes had landed and
  the licenses were redeemed: 12 P2 + 10 P3 findings, no P1. Every finding
  was fixed in commit `0f2ba90` (pause fairness, leaderboard honesty, Track
  golden/combo, keyboard + accessibility polish), and the smoke test passed
  27/27 with 14/14 fix checks. Junie was used for review, not for writing
  the game — the case study does not claim Junie work that did not happen.

## What AI did not do

- It did not fake JetBrains usage, invent playtest numbers, or claim a
  tool was used when it was only installed.
- It did not submit anything: no Devpost submission, no video upload.
  Those need the entrant's decisions and his YouTube channel.
- The game design, mode names, and tuning targets were the agent's
  proposals; the entrant approved the concept and the "build it now, chase
  top 1" direction.

## The one-line version

An AI agent read the rules, built a complete booth game, taught itself to
play it with bots at four skill levels, retuned it four times from the
numbers, verified it in a real browser, and shipped it — in one night,
with WebStorm as its IDE and an honest paper trail for every claim.
