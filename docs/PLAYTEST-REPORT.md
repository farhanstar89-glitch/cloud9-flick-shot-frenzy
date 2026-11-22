# Flick Shot Frenzy — Bot Playtest Report

Generated 2026-11-22 20:42 WIB · 30s tuning rounds · scripted Playwright bots, real mouse clicks, no cheats (bots read the same target positions a player sees and click with human reaction delays).

## Results

| Mode | Profile | Score | Hits | Shots | Acc | Hit-rate | Best combo | Tracked (s) |
|---|---|---|---|---|---|---|---|---|
| precision | perfect | 39,233 | 35 | 35 | 100.0% | 100.0% | 35 | 0.0 |
| precision | fast | 34,546 | 35 | 35 | 100.0% | 100.0% | 35 | 0.0 |
| precision | average | 18,284 | 31 | 39 | 79.5% | 88.6% | 18 | 0.0 |
| precision | casual | 2,344 | 13 | 27 | 48.1% | 40.6% | 4 | 0.0 |
| reflex | perfect | 40,309 | 48 | 48 | 100.0% | 100.0% | 48 | 0.0 |
| reflex | fast | 27,025 | 46 | 47 | 97.9% | 95.8% | 28 | 0.0 |
| reflex | average | 6,414 | 29 | 39 | 74.4% | 65.9% | 12 | 0.0 |
| reflex | casual | 607 | 2 | 12 | 16.7% | 4.2% | 1 | 0.0 |
| chaos | perfect | 34,100 | 52 | 52 | 100.0% | 85.2% | 52 | 0.0 |
| chaos | fast | 26,150 | 51 | 52 | 98.1% | 85.0% | 27 | 0.0 |
| chaos | average | 9,350 | 34 | 39 | 87.2% | 58.6% | 10 | 0.0 |
| chaos | casual | 1,975 | 16 | 27 | 59.3% | 30.2% | 5 | 0.0 |
| track | perfect | 2,038 | 5 | 6 | 83.3% | 83.3% | 5 | 7.2 |
| track | fast | 1,913 | 5 | 6 | 83.3% | 83.3% | 5 | 6.7 |
| track | average | 2,038 | 5 | 6 | 83.3% | 83.3% | 5 | 6.3 |
| track | casual | 563 | 3 | 4 | 75.0% | 75.0% | 3 | 5.8 |

## Reading

- **precision**: average player scores 18,284 (acc 79.5%, hit-rate 88.6%, best combo 18); perfect bot 39,233, casual 2,344.
- **reflex**: average player scores 6,414 (acc 74.4%, hit-rate 65.9%, best combo 12); perfect bot 40,309, casual 607.
- **chaos**: average player scores 9,350 (acc 87.2%, hit-rate 58.6%, best combo 10); perfect bot 34,100, casual 1,975.
- **track**: average player scores 2,038 (acc 83.3%, hit-rate 83.3%, best combo 5); on-target 6.3s; perfect bot 2,038, casual 563.

Tuning targets: the **average** profile (320ms reaction, 12px aim noise) is the booth visitor we design for — it should land roughly 55–70% hit-rate and a score in the low thousands per 90s, so a decent player feels good but still has a reason to replay. The **perfect** bot sets the engine ceiling; the **casual** profile (550ms, 22px noise) must still score something, or first-time players walk away.
