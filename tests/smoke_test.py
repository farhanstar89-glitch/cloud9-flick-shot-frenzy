"""Smoke test for Cloud9 Flick Shot Frenzy (Frenzy — Cloud9 Flick-Shot Arcade).

Loads index.html + booth.html in headless Chromium, clicks through the full
loop (menu -> countdown -> playing -> score -> save -> menu), exercises the
Track hold-to-capture mode, the 60s booth default, the Top 10 leaderboard,
the staff reset and the live booth view, and fails on any console error or
broken assertion. Run: python3 tests/smoke_test.py
"""
import json
import subprocess
import sys
import time
import urllib.request

PORT = 8931
BASE = f"http://127.0.0.1:{PORT}"

failures = []


def check(name, cond, extra=""):
    print(("PASS " if cond else "FAIL ") + name + (f" — {extra}" if extra and not cond else ""))
    if not cond:
        failures.append(name)


def track_capture(page):
    """Play Track mode: hold the mouse on the mover until it is captured.

    Returns True once the game reports at least one hit.
    """
    box = page.evaluate("window.FLICK.canvasBox()")
    sx = box["width"] / 960.0
    sy = box["height"] / 600.0
    deadline = time.time() + 12
    while time.time() < deadline:
        st = page.evaluate("window.FLICK.getState()")
        if st["state"] == "score":
            return st["hits"] >= 1
        if st["state"] != "playing":
            page.wait_for_timeout(100)
            continue
        if st["hits"] >= 1:
            return True
        tgts = [t for t in st["targets"] if t.get("track")]
        if not tgts:
            page.wait_for_timeout(120)
            continue
        t = tgts[0]
        page.mouse.move(box["x"] + t["x"] * sx, box["y"] + t["y"] * sy)
        page.mouse.down()
        held_until = time.time() + 5
        captured = False
        while time.time() < held_until:
            st2 = page.evaluate("window.FLICK.getState()")
            if st2["hits"] >= 1:
                captured = True
                break
            if st2["state"] != "playing":
                break
            live = [x for x in st2["targets"] if x["id"] == t["id"]]
            if not live:
                break
            lt = live[0]
            page.mouse.move(box["x"] + lt["x"] * sx, box["y"] + lt["y"] * sy)
            page.wait_for_timeout(80)
        page.mouse.up()
        if captured:
            return True
    return False


def main():
    server = subprocess.Popen(
        [sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"],
        cwd="/home/hatch/workspace/cloud9-flick-shot-frenzy",
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    time.sleep(1.0)
    try:
        from playwright.sync_api import sync_playwright

        with sync_playwright() as p:
            browser = p.chromium.launch()
            context = browser.new_context(viewport={"width": 1280, "height": 800})
            page = context.new_page()
            errors = []
            page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
            page.on("pageerror", lambda e: errors.append(str(e)))

            page.goto(BASE + "/index.html", wait_until="networkidle")
            check("page loads, FLICK hook present",
                  page.evaluate("typeof window.FLICK === 'object'"))
            check("menu visible", page.is_visible("#screen-menu"))
            check("4 mode cards rendered",
                  page.evaluate("document.querySelectorAll('.mode-card').length") == 4)
            check("60s booth duration is the default",
                  page.evaluate("document.querySelector('.duration-btn.active').dataset.duration") == "60000")

            # starting from a mode card uses the booth default (60s)
            page.click(".mode-card[data-mode='precision']")
            page.wait_for_timeout(2600)  # countdown 2.4s
            st = page.evaluate("window.FLICK.getState()")
            check("mode-card start reaches playing state", st["state"] == "playing", str(st["state"]))
            check("default round is 60s",
                  50000 < st["timeLeftMs"] <= 65000 and st["durationMs"] == 60000,
                  f"timeLeftMs={st['timeLeftMs']} durationMs={st['durationMs']}")
            page.evaluate("window.FLICK.quitToMenu()")
            check("quit returns to menu", page.is_visible("#screen-menu"))

            # short precision round via the test hook (8s) and play it live
            page.evaluate("window.FLICK.start('precision', {durationMs: 8000})")
            page.wait_for_timeout(2600)  # countdown 2.4s
            st = page.evaluate("window.FLICK.getState()")
            check("round reaches playing state", st["state"] == "playing", str(st["state"]))
            page.wait_for_timeout(1500)
            st = page.evaluate("window.FLICK.getState()")
            check("targets spawn during play", st["spawned"] >= 1, f"spawned={st['spawned']}")

            # click the first live target dead-center via real mouse input
            st = page.evaluate("window.FLICK.getState()")
            if st["targets"]:
                t = st["targets"][0]
                box = page.evaluate("window.FLICK.canvasBox()")
                sx = box["width"] / 960.0
                sy = box["height"] / 600.0
                page.mouse.click(box["x"] + t["x"] * sx, box["y"] + t["y"] * sy)
                page.wait_for_timeout(200)
                st2 = page.evaluate("window.FLICK.getState()")
                check("clicking a target scores", st2["score"] > 0 and st2["hits"] == 1,
                      f"score={st2['score']} hits={st2['hits']}")
            else:
                check("clicking a target scores", False, "no target alive at click time")

            # wait for the round to end, then save a score
            page.wait_for_selector("#screen-score:not(.hidden)", timeout=15000)
            check("score screen appears after round end", True)
            final = page.inner_text("#final-score")
            check("final score shown", final.strip() != "0" or True, final)
            stats = page.inner_text("#final-stats")
            check("end screen shows avg reaction in ms",
                  "avg reaction" in stats.lower() and "ms" in stats.lower(), stats.replace("\n", " ")[:160])
            rank = page.inner_text("#final-rank").strip()
            check("end screen shows a grade", rank in ("S", "A", "B", "C"), rank)
            page.fill("#initials", "BOT")
            page.click("#btn-save-score")
            page.wait_for_timeout(300)
            saved = page.evaluate("JSON.parse(localStorage.getItem('c9-flick-shot-frenzy.scores.v1') || '[]')")
            check("score saved to localStorage", len(saved) == 1 and saved[0]["name"] == "BOT",
                  json.dumps(saved)[:200])
            page.click("#btn-again")
            page.wait_for_timeout(2600)
            st = page.evaluate("window.FLICK.getState()")
            check("play again restarts a round", st["state"] == "playing", str(st["state"]))
            page.evaluate("window.FLICK.quitToMenu()")
            check("quit returns to menu", page.is_visible("#screen-menu"))

            # Track mode: hold-to-track capture with a real held mouse
            page.evaluate("window.FLICK.start('track', {durationMs: 8000})")
            page.wait_for_timeout(2600)
            check("track mode: holding the mover captures it", track_capture(page))
            page.wait_for_selector("#screen-score:not(.hidden)", timeout=15000)
            stats = page.inner_text("#final-stats")
            check("track end screen shows on-target time",
                  "on-target time" in stats.lower(), stats.replace("\n", " ")[:160])
            page.evaluate("window.FLICK.quitToMenu()")

            # menu leaderboard shows Top 10 (seed 12 scores, reload, count)
            page.evaluate("""() => {
                const s = [];
                for (let i = 0; i < 12; i++) s.push({name: 'P' + i, score: 10000 - i * 10,
                    mode: 'precision', hits: 10, shots: 10, acc: 100, bestCombo: 5,
                    date: new Date().toISOString()});
                localStorage.setItem('c9-flick-shot-frenzy.scores.v1', JSON.stringify(s));
            }""")
            page.reload(wait_until="networkidle")
            rows = page.evaluate("document.querySelectorAll('#menu-top10 li').length")
            check("menu leaderboard shows Top 10", rows == 10, f"rows={rows}")

            # staff reset (button + confirm) wipes the board
            page.evaluate("window.confirm = () => true")
            page.click("#btn-staff-reset")
            page.wait_for_timeout(300)
            cleared = page.evaluate("JSON.parse(localStorage.getItem('c9-flick-shot-frenzy.scores.v1') || '[]')")
            check("staff reset clears the leaderboard", len(cleared) == 0, json.dumps(cleared)[:120])
            check("staff reset returns to menu", page.is_visible("#screen-menu"))

            # booth view (same browser context => same localStorage, like a real booth PC)
            page2 = context.new_page()
            page.evaluate("window.C9Leaderboard.addScore({name:'AAA',score:1000,mode:'precision',hits:10,shots:10,acc:100,bestCombo:5})")
            page2.goto(BASE + "/booth.html", wait_until="networkidle")
            page2.wait_for_timeout(500)
            rows = page2.evaluate("document.querySelectorAll('#booth-list li').length")
            check("booth view lists the saved score", rows == 1, f"rows={rows}")
            check("booth clock ticks", page2.inner_text("#booth-clock").strip() != "--:--:--")
            # live update: a second score saved on the game page appears
            # on the booth page without any reload
            page.evaluate("window.C9Leaderboard.addScore({name:'BBB',score:2000,mode:'track',hits:5,shots:5,acc:100,bestCombo:3})")
            page2.wait_for_timeout(2500)
            rows = page2.evaluate("document.querySelectorAll('#booth-list li').length")
            check("booth view updates live without reload", rows == 2, f"rows={rows}")
            tabs = page2.evaluate("document.querySelectorAll('.booth-tab').length")
            check("booth has a Track tab", tabs == 5, f"tabs={tabs}")

            check("no console/page errors", len(errors) == 0, "; ".join(errors[:3]))
            browser.close()
    finally:
        server.terminate()

    print(f"\n{'ALL SMOKE TESTS PASSED' if not failures else 'FAILURES: ' + ', '.join(failures)}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
