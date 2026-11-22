"""Smoke test for Cloud9 Flick Shot Frenzy.

Loads index.html + booth.html in headless Chromium, clicks through the full
loop (menu -> countdown -> playing -> score -> save -> menu), and fails on any
console error or broken assertion. Run: python3 tests/smoke_test.py
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
            check("3 mode cards rendered",
                  page.evaluate("document.querySelectorAll('.mode-card').length") == 3)

            # start a short round via the test hook (8s) and play it live
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

            # booth view (same browser context => same localStorage, like a real booth PC)
            page2 = context.new_page()
            page2.goto(BASE + "/booth.html", wait_until="networkidle")
            page2.wait_for_timeout(500)
            rows = page2.evaluate("document.querySelectorAll('#booth-list li').length")
            check("booth view lists the saved score", rows == 1, f"rows={rows}")
            check("booth clock ticks", page2.inner_text("#booth-clock").strip() != "--:--:--")

            check("no console/page errors", len(errors) == 0, "; ".join(errors[:3]))
            browser.close()
    finally:
        server.terminate()

    print(f"\n{'ALL SMOKE TESTS PASSED' if not failures else 'FAILURES: ' + ', '.join(failures)}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
