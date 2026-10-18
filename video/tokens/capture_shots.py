"""Take the episode's real screenshots of the guide's Tokens chapter and the game's Chop Shop -> shots/*.png.

    python capture_shots.py

Loads the local index.html and play.html (dark theme, Simple mode), drives the BPE demo to a few
merge counts and saves 1920x1080 frames. Also writes out/shots-data.json with the demo's own chips
and stats line for each state, so the numbers in episode.html can be checked against the real demo.
Nothing is downloaded except the site's own web fonts. Re-run after the demo changes.
"""
import json
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent  # the site root: video/tokens -> residual-stream
SHOTS = HERE / "shots"
DATA = HERE / "out" / "shots-data.json"
# A 1280x720 CSS viewport at 1.5x gives a 1920x1080 PNG with the demos large enough to read on video
# (same setting as video/next-word/capture_shots.py).
VIEW = {"width": 1280, "height": 720}
SCALE = 1.5
SETTLE_MS = 600  # let a demo redraw after an interaction
MERGE_STEPS = (0, 60)  # the demo's start and its default; the slider's max is read from the page
PANEL_TOP = 150  # CSS px between the viewport top and the demo panel in the slider shots
# Chop Shop sits after "The Job" on the route map; a first-time visitor who jumps straight to it sees
# a "you skipped ahead" note. Seed The Job as played once so the shot shows the level itself.
GAME_PROGRESS = '{"v":1,"levels":{"job":{"stars":1,"best":0.5}}}'  # js/game/shell.js loadProgress format
TOP_PAIR = 'button[aria-label="Glue word-start  and t"]'  # turn 1's most common pair (merge rule 1, x87)


def centre(page, selector):
    page.evaluate(f"document.querySelector('{selector}').scrollIntoView({{block:'center', behavior:'instant'}})")
    page.wait_for_timeout(SETTLE_MS)


def shot(page, name):
    page.screenshot(path=str(SHOTS / name))
    print("wrote", name)


def pin_panel(page):
    """Same scroll position for every slider state, so the episode can cross-fade between them."""
    page.evaluate(f"""(() => {{ const p = document.querySelector('#tokens .panel.wide');
        window.scrollTo(0, p.getBoundingClientRect().top + window.scrollY - {PANEL_TOP}); }})()""")
    page.wait_for_timeout(SETTLE_MS)


def set_merges(page, n):
    page.fill("#bpeMerges", str(n))
    page.dispatch_event("#bpeMerges", "input")
    page.wait_for_timeout(SETTLE_MS)


def demo_state(page):
    """The chips (text, id) and the stats line exactly as the demo shows them."""
    return page.evaluate("""(() => ({
        merges: document.querySelector('#bpeMerges').value,
        text: document.querySelector('#bpeInput').value,
        chips: [...document.querySelectorAll('#bpeChips .chip')].map(c => [c.querySelector('span').textContent, c.querySelector('small').textContent]),
        stats: document.querySelector('#bpeStats').textContent
    }))()""")


def main():
    SHOTS.mkdir(exist_ok=True)
    DATA.parent.mkdir(exist_ok=True)
    data = {}
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport=VIEW, device_scale_factor=SCALE, color_scheme="dark")
        page = ctx.new_page()
        page.add_init_script("try{localStorage.setItem('rs-mode','simple');localStorage.setItem('rs-mode-hint','0')}catch(e){}")
        page.goto((ROOT / "index.html").as_uri())
        page.wait_for_timeout(1500)

        top = page.evaluate("+document.querySelector('#bpeMerges').max")
        for i, n in enumerate(MERGE_STEPS + (top,)):
            set_merges(page, n)
            pin_panel(page)
            shot(page, f"0{i + 1}-bpe-{n}.png")
            data[f"merges_{n}"] = demo_state(page)

        # the first learned merge rules, for checking the episode's claims (no screenshot)
        page.evaluate("document.querySelector('#tokens details').open = true")
        page.wait_for_timeout(SETTLE_MS)
        data["merge_rules"] = page.evaluate("[...document.querySelectorAll('#bpeList li')].slice(0, 12).map(li => li.textContent)")
        page.evaluate("document.querySelector('#tokens details').open = false")

        # 05 the chapter's "why you should care" / "why chatbots stumble on spelling" text
        centre(page, "#tokens .two-col.simple-only")
        shot(page, "05-why-care.png")

        # 07 the game's Chop Shop level: turn 1 after gluing the top pair
        page.evaluate(f"localStorage.setItem('rs-game', '{GAME_PROGRESS}')")
        page.goto((ROOT / "play.html").as_uri() + "#chop")
        page.wait_for_timeout(1500)
        page.click(TOP_PAIR)
        page.wait_for_timeout(1200)
        centre(page, ".gl-pairs")
        shot(page, "07-chop-glued.png")
        data["chop_feedback"] = page.evaluate("document.querySelector('.gl-feedback') && document.querySelector('.gl-feedback').textContent")
        browser.close()
    DATA.write_text(json.dumps(data, indent=1, ensure_ascii=False), encoding="utf-8")
    print("wrote", DATA)


if __name__ == "__main__":
    main()
