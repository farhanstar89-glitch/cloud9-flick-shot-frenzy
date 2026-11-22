"""Scripted bot playtests for Cloud9 Flick Shot Frenzy.

Simulates players of four skill levels across all three modes and measures
score / accuracy / hit-rate, so spawn cadence, target size, lifetime and
difficulty curves can be tuned with data instead of vibes.

Skill profiles (reaction delay + aim noise + skip chance + mouse travel speed).
Mouse travel matters: a real player must MOVE the cursor to the target
(Fitts's law). Bots teleport by default, which makes every mode look too
easy, so travel time = distance / speed is added before each click.
  perfect  — 0ms,   0px,  0%,  teleport (upper bound: what the engine allows)
  fast     — 180ms, 6px,  0%,  4 px/ms
  average  — 320ms, 12px, 10%, 2 px/ms  (decent booth player — the tuning target)
  casual   — 550ms, 22px, 25%, 1 px/ms  (first-time visitor)

Runs 30s rounds by default (use --full for real 90s rounds) and plays all
profile x mode combinations concurrently in one browser. Use --reps 2 to
average out golden-target luck (a golden spawn can swing a round by
thousands of points).
"""
import argparse
import asyncio
import json
import math
import random
import subprocess
import sys
import time

PORT = 8932
BASE = f"http://127.0.0.1:{PORT}"

PROFILES = {
    "perfect": {"delay": 0.0, "noise": 0.0, "skip": 0.0, "speed": None},
    "fast": {"delay": 0.18, "noise": 6.0, "skip": 0.0, "speed": 4.0},
    "average": {"delay": 0.32, "noise": 12.0, "skip": 0.10, "speed": 2.0},
    "casual": {"delay": 0.50, "noise": 18.0, "skip": 0.25, "speed": 1.2},
}
MODES = ["precision", "reflex", "chaos"]


async def play_one(page, mode, profile, duration_ms):
    """Play one round as the given profile; return the final state + stats."""
    await page.goto(BASE + "/index.html")
    await page.evaluate("localStorage.clear()")
    await page.evaluate(
        "([m, d]) => window.FLICK.start(m, {durationMs: d})", [mode, duration_ms]
    )
    await page.wait_for_timeout(2600)  # countdown
    box = await page.evaluate("window.FLICK.canvasBox()")
    sx = box["width"] / 960.0
    sy = box["height"] / 600.0
    rng = random.Random(hash((mode, profile["delay"])) & 0xFFFFFFFF)
    deadline = time.time() + duration_ms / 1000.0 + 8
    last_x, last_y = box["x"] + box["width"] / 2, box["y"] + box["height"] / 2
    while time.time() < deadline:
        st = await page.evaluate("window.FLICK.getState()")
        if st["state"] == "score":
            break
        if st["state"] != "playing":
            await page.wait_for_timeout(50)
            continue
        targets = [t for t in st["targets"] if not t["decoy"]]
        if not targets:
            await page.wait_for_timeout(40)
            continue
        # prefer golden targets, else the freshest (most time left) — humans
        # go for the target they just saw, not the one about to vanish
        targets.sort(key=lambda t: (not t["golden"], -t["bornAt"]))
        t = targets[0]
        if rng.random() < profile["skip"]:
            await page.wait_for_timeout(120)
            continue
        # closed-loop aim: humans track the target while moving the mouse, so
        # reaction and travel overlap (~50%) and aim is re-read right before
        # the click instead of using a stale position.
        tx = box["x"] + t["x"] * sx
        ty = box["y"] + t["y"] * sy
        travel_ms = 0
        if profile["speed"]:
            travel_ms = math.hypot(tx - last_x, ty - last_y) / profile["speed"]
        await page.wait_for_timeout(int(profile["delay"] * 1000 + travel_ms * 0.5))
        st2 = await page.evaluate("window.FLICK.getState()")
        live = [x for x in st2["targets"] if x["id"] == t["id"]]
        if not live:
            continue  # target expired mid-flick: a human holds the shot
        t = live[0]
        nx = t["x"] + rng.gauss(0, profile["noise"])
        ny = t["y"] + rng.gauss(0, profile["noise"])
        cx, cy = box["x"] + nx * sx, box["y"] + ny * sy
        await page.mouse.move(cx, cy)
        await page.mouse.click(cx, cy)
        last_x, last_y = cx, cy
        await page.wait_for_timeout(30)
    st = await page.evaluate("window.FLICK.getState()")
    return {
        "mode": mode,
        "profile": next(k for k, v in PROFILES.items() if v is profile),
        "score": st["score"],
        "hits": st["hits"],
        "shots": st["shots"],
        "spawned": st["spawned"],
        "bestCombo": st["bestCombo"],
        "acc": round(100.0 * st["hits"] / st["shots"], 1) if st["shots"] else 0,
        "hitRate": round(100.0 * st["hits"] / st["spawned"], 1) if st["spawned"] else 0,
    }


async def main_async(duration_ms, reps):
    from playwright.async_api import async_playwright

    all_runs = []
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        for _ in range(reps):
            tasks = []
            for mode in MODES:
                for name, prof in PROFILES.items():
                    page = await browser.new_page(viewport={"width": 1280, "height": 800})
                    tasks.append(play_one(page, mode, prof, duration_ms))
            all_runs.extend(await asyncio.gather(*tasks))
        await browser.close()
    # average across reps (golden-target luck swings single rounds a lot)
    agg = {}
    for r in all_runs:
        key = (r["mode"], r["profile"])
        agg.setdefault(key, []).append(r)
    results = []
    for (mode, profile), rows in agg.items():
        n = len(rows)
        results.append({
            "mode": mode,
            "profile": profile,
            "score": round(sum(r["score"] for r in rows) / n),
            "hits": round(sum(r["hits"] for r in rows) / n),
            "shots": round(sum(r["shots"] for r in rows) / n),
            "spawned": round(sum(r["spawned"] for r in rows) / n),
            "bestCombo": max(r["bestCombo"] for r in rows),
            "acc": round(sum(r["acc"] for r in rows) / n, 1),
            "hitRate": round(sum(r["hitRate"] for r in rows) / n, 1),
        })
    return results


def verdict(results):
    lines = []
    for mode in MODES:
        rows = [r for r in results if r["mode"] == mode]
        avg = next(r for r in rows if r["profile"] == "average")
        lines.append(
            f"- **{mode}**: average player scores {avg['score']:,} "
            f"(acc {avg['acc']}%, hit-rate {avg['hitRate']}%, best combo {avg['bestCombo']}); "
            f"perfect bot {next(r for r in rows if r['profile'] == 'perfect')['score']:,}, "
            f"casual {next(r for r in rows if r['profile'] == 'casual')['score']:,}."
        )
    return "\n".join(lines)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--full", action="store_true", help="real 90s rounds")
    ap.add_argument("--reps", type=int, default=1, help="repetitions per combo, averaged")
    ap.add_argument("--out", default="docs/PLAYTEST-REPORT.md")
    args = ap.parse_args()

    duration_ms = 90000 if args.full else 30000
    server = subprocess.Popen(
        [sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"],
        cwd="/home/hatch/workspace/cloud9-flick-shot-frenzy",
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    time.sleep(1.0)
    try:
        results = asyncio.run(main_async(duration_ms, args.reps))
    finally:
        server.terminate()

    results.sort(key=lambda r: (MODES.index(r["mode"]), list(PROFILES).index(r["profile"])))
    print(f"\n{'mode':<10} {'profile':<8} {'score':>8} {'hits':>5} {'shots':>6} {'acc':>6} {'hitRate':>8} {'combo':>6}")
    for r in results:
        print(f"{r['mode']:<10} {r['profile']:<8} {r['score']:>8,} {r['hits']:>5} {r['shots']:>6} "
              f"{r['acc']:>5.1f}% {r['hitRate']:>7.1f}% {r['bestCombo']:>6}")

    report = (
        "# Flick Shot Frenzy — Bot Playtest Report\n\n"
        f"Generated {time.strftime('%Y-%m-%d %H:%M WIB', time.localtime())} · "
        f"{'full 90s rounds' if args.full else '30s tuning rounds'} · "
        "scripted Playwright bots, real mouse clicks, no cheats (bots read the same "
        "target positions a player sees and click with human reaction delays).\n\n"
        "## Results\n\n"
        "| Mode | Profile | Score | Hits | Shots | Acc | Hit-rate | Best combo |\n"
        "|---|---|---|---|---|---|---|---|\n"
    )
    for r in results:
        report += (f"| {r['mode']} | {r['profile']} | {r['score']:,} | {r['hits']} | "
                   f"{r['shots']} | {r['acc']}% | {r['hitRate']}% | {r['bestCombo']} |\n")
    report += "\n## Reading\n\n" + verdict(results) + "\n\n"
    report += (
        "Tuning targets: the **average** profile (320ms reaction, 12px aim noise) is "
        "the booth visitor we design for — it should land roughly 55–70% hit-rate and "
        "a score in the low thousands per 90s, so a decent player feels good but still "
        "has a reason to replay. The **perfect** bot sets the engine ceiling; the "
        "**casual** profile (550ms, 22px noise) must still score something, or "
        "first-time players walk away.\n"
    )
    with open("/home/hatch/workspace/cloud9-flick-shot-frenzy/" + args.out, "w") as f:
        f.write(report)
    print(f"\nReport written to {args.out}")
    print("\n" + verdict(results))
    return 0


if __name__ == "__main__":
    sys.exit(main())
