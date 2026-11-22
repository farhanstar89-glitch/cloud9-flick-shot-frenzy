# Frenzy — Bot Playtest Report

Generated 2026-11-23 03:51 WIB (Precision/Reflex/Chaos measured 2026-11-22;
Track measured 2026-11-23 after the rival-gap upgrade) · full 90s rounds ·
scripted Playwright bots, real mouse clicks, no cheats (bots read the same
target positions a player sees and click with human reaction delays; the
Track bot holds and follows the mover the way a human does).

## Results

| Mode | Profile | Score | Hits | Shots | Acc | Hit-rate | Best combo | Tracked (s) |
|---|---|---|---|---|---|---|---|---|
| precision | perfect | 103,750 | 100 | 100 | 100.0% | 100.0% | 104 | — |
| precision | fast | 91,844 | 100 | 100 | 100.0% | 100.0% | 104 | — |
| precision | average | 49,085 | 95 | 106 | 90.1% | 94.1% | 33 | — |
| precision | casual | 8,095 | 42 | 91 | 46.0% | 42.5% | 9 | — |
| reflex | perfect | 102,002 | 136 | 136 | 100.0% | 99.7% | 144 | — |
| reflex | fast | 87,096 | 134 | 135 | 99.6% | 98.8% | 143 | — |
| reflex | average | 33,697 | 97 | 122 | 79.3% | 70.8% | 46 | — |
| reflex | casual | 1,018 | 9 | 36 | 26.1% | 6.8% | 3 | — |
| chaos | perfect | 75,100 | 136 | 136 | 100.0% | 82.7% | 139 | — |
| chaos | fast | 74,225 | 141 | 142 | 99.7% | 85.2% | 142 | — |
| chaos | average | 47,138 | 122 | 130 | 93.9% | 74.4% | 76 | — |
| chaos | casual | 9,300 | 60 | 94 | 64.8% | 37.7% | 10 | — |
| track | perfect | 50,654 | 67 | 68 | 98.5% | 98.5% | 79 | 62.4 |
| track | fast | 42,404 | 56 | 58 | 98.2% | 98.2% | 65 | 52.9 |
| track | average | 28,110 | 38 | 40 | 97.4% | 97.4% | 43 | 35.6 |
| track | casual | 2,984 | 10 | 10 | 90.3% | 90.3% | 11 | 8.8 |

## Reading

- **precision**: average player scores 49,085 (acc 90.1%, hit-rate 94.1%, best combo 33); perfect bot 103,750, casual 8,095.
- **reflex**: average player scores 33,697 (acc 79.3%, hit-rate 70.8%, best combo 46); perfect bot 102,002, casual 1,018.
- **chaos**: average player scores 47,138 (acc 93.9%, hit-rate 74.4%, best combo 76); perfect bot 75,100, casual 9,300.
- **track**: average player scores 28,110 (acc 97.4%, hit-rate 97.4%, best combo 43); on-target 35.6s; perfect bot 50,654, casual 2,984.

Tuning targets: the **average** profile (320ms reaction, 12px aim noise) is
the booth visitor we design for — it should land roughly 55–70% hit-rate and
a score in the low thousands per 90s, so a decent player feels good but still
has a reason to replay. The **perfect** bot sets the engine ceiling; the
**casual** profile (550ms, 22px noise) must still score something, or
first-time players walk away.

Track reads differently from the click modes: its accuracy counts hold
attempts vs captures, so it runs high by construction (a hold that starts
on the mover usually ends in a capture) — the real differentiator is
on-target time and score. The curve is cleanly monotonic (perfect 50,654 >
fast 42,404 > average 28,110 > casual 2,984), and the S-grade par for
Track is 30,000 at 90s (scaled by round length, so a 60s booth round
grades the same skill). Track's casual still scores 2,984 with 8.8s
on-target — a first-timer walks away with points, not a zero.
