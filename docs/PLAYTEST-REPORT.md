# Flick Shot Frenzy — Bot Playtest Report

Generated 2026-11-22 20:13 WIB · 30s tuning rounds · scripted Playwright bots, real mouse clicks, no cheats (bots read the same target positions a player sees and click with human reaction delays).

## Results

| Mode | Profile | Score | Hits | Shots | Acc | Hit-rate | Best combo |
|---|---|---|---|---|---|---|---|
| precision | perfect | 39,773 | 36 | 36 | 100.0% | 100.0% | 36 |
| precision | fast | 36,467 | 35 | 35 | 100.0% | 97.2% | 35 |
| precision | average | 20,696 | 33 | 36 | 91.7% | 94.3% | 17 |
| precision | casual | 3,696 | 18 | 29 | 62.1% | 56.2% | 8 |
| reflex | perfect | 43,119 | 48 | 48 | 100.0% | 100.0% | 48 |
| reflex | fast | 37,969 | 47 | 47 | 100.0% | 97.9% | 47 |
| reflex | average | 14,670 | 39 | 42 | 92.9% | 83.0% | 19 |
| reflex | casual | 2,821 | 10 | 15 | 66.7% | 20.8% | 6 |
| chaos | perfect | 31,625 | 51 | 51 | 100.0% | 86.4% | 51 |
| chaos | fast | 29,875 | 49 | 49 | 100.0% | 84.5% | 49 |
| chaos | average | 13,675 | 37 | 43 | 86.0% | 62.7% | 19 |
| chaos | casual | 3,100 | 21 | 32 | 65.6% | 39.6% | 8 |

## Reading

- **precision**: average player scores 20,696 (acc 91.7%, hit-rate 94.3%, best combo 17); perfect bot 39,773, casual 3,696.
- **reflex**: average player scores 14,670 (acc 92.9%, hit-rate 83.0%, best combo 19); perfect bot 43,119, casual 2,821.
- **chaos**: average player scores 13,675 (acc 86.0%, hit-rate 62.7%, best combo 19); perfect bot 31,625, casual 3,100.

Tuning targets: the **average** profile (320ms reaction, 12px aim noise) is the booth visitor we design for — it should land roughly 55–70% hit-rate and a score in the low thousands per 90s, so a decent player feels good but still has a reason to replay. The **perfect** bot sets the engine ceiling; the **casual** profile (550ms, 22px noise) must still score something, or first-time players walk away.
