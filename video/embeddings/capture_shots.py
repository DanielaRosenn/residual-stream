"""Take the episode's real screenshots of the guide's Embeddings chapter -> shots/*.png.

    python capture_shots.py

Loads the local index.html (dark theme, Simple mode), drives the toy map's analogy selects
(#anaA/#anaB/#anaC) and the word finder (#embFind + #embFindGo), and saves 1920x1080 frames.
Also writes out/shots-data.json with what the demo itself printed in each state (the analogy
result, the caption, the finder's message and neighbour chips, element rectangles in screenshot
pixels), so the words, vectors and coordinates in episode.html can be checked against the real
demo. Nothing is downloaded except the site's own web fonts. Re-run after the demo changes.
"""
import json
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent  # the site root: video/embeddings -> residual-stream
SHOTS = HERE / "shots"
DATA = HERE / "out" / "shots-data.json"
# A 1280x720 CSS viewport at 1.5x gives a 1920x1080 PNG (same setting as video/tokens/capture_shots.py).
VIEW = {"width": 1280, "height": 720}
SCALE = 1.5
SETTLE_MS = 600  # let the demo redraw after an interaction
SCROLL_TRIES = 5  # scroll_to retries; two are normally enough
MAP_TOP = 12  # CSS px between the viewport top and the map's <svg> in the map shots
FIND_TOP = 70  # CSS px between the viewport top and the analogy row in the finder/analogy shots
# the words the episode quotes vectors for (each one is looked up with the finder and its caption kept)
VECTOR_WORDS = ("king", "man", "woman", "queen", "cat", "dog", "Paris", "puppy", "kitten")


def rect(page, selector):
    """The element's box in screenshot pixels (CSS px x SCALE), for placing highlights."""
    r = page.evaluate(f"(() => {{ const b = document.querySelector('{selector}').getBoundingClientRect();"
                      " return [b.left, b.top, b.width, b.height]; })()")
    return [round(v * SCALE) for v in r]


def scroll_to(page, selector, top):
    """Put the element `top` CSS px below the viewport top, so shots of the same state line up.

    The site scrolls smoothly and the Find button's focus scrolls too, so one scrollTo can land short;
    repeat (instant) until the element is where it should be."""
    for _ in range(SCROLL_TRIES):
        off = page.evaluate(f"""(() => {{ const e = document.querySelector('{selector}');
            const d = e.getBoundingClientRect().top - {top};
            window.scrollTo({{top: window.scrollY + d, behavior: 'instant'}}); return d; }})()""")
        page.wait_for_timeout(SETTLE_MS)
        if abs(off) < 1:
            return
    raise RuntimeError(f"could not scroll {selector} to {top}px (last offset {off:.1f}px)")


def set_analogy(page, a, b, c):
    for sel, v in (("#anaA", a), ("#anaB", b), ("#anaC", c)):
        page.select_option(sel, v)
    page.wait_for_timeout(SETTLE_MS)


def find(page, word):
    page.fill("#embFind", word)
    page.click("#embFindGo")
    page.wait_for_timeout(SETTLE_MS)


def state(page):
    """What the demo shows right now, as text, plus where its parts are on screen."""
    s = page.evaluate("""(() => ({
        analogy: ['#anaA', '#anaB', '#anaC'].map(q => document.querySelector(q).value),
        result: document.querySelector('#anaOut').value,
        caption: document.querySelector('#embInfo').textContent,
        find_msg: document.querySelector('#embFindMsg p') ? document.querySelector('#embFindMsg p').textContent : '',
        chips: [...document.querySelectorAll('#embFindMsg .ty-chip')].map(c => c.textContent),
        words_on_map: document.querySelectorAll('#embSvg g.pt').length
    }))()""")
    s["rects"] = {k: rect(page, q) for k, q in (("panel", "#embeddings .panel.wide"), ("controls", "#embeddings .controls.analogy"),
                                                 ("find", "#embFindForm"), ("svg", "#embSvg"), ("caption", "#embInfo"))}
    return s


def shot(page, name, data):
    page.screenshot(path=str(SHOTS / name))
    data[name] = state(page)
    print("wrote", name)


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

        # 01 the whole toy map on its default analogy: king - man + woman
        set_analogy(page, "king", "man", "woman")
        scroll_to(page, "#embSvg", MAP_TOP)
        shot(page, "01-map-king.png", data)

        # 02 the finder: "cat" circled, its neighbours listed (same scroll as 01, so the map lines up)
        find(page, "cat")
        scroll_to(page, "#embSvg", MAP_TOP)
        shot(page, "02-map-cat.png", data)

        # 03 the analogy row and the finder with "cat", seen from the top of the panel
        scroll_to(page, "#embeddings .controls.analogy", FIND_TOP)
        shot(page, "03-find-cat.png", data)

        # 04 puppy - dog + cat (Toki's own analogy at the end), top of the panel
        find(page, "")  # an empty search clears the message
        page.evaluate("document.querySelector('#embFindMsg').replaceChildren()")
        set_analogy(page, "puppy", "dog", "cat")
        scroll_to(page, "#embeddings .controls.analogy", FIND_TOP)
        shot(page, "04-ana-puppy.png", data)
        scroll_to(page, "#embSvg", MAP_TOP)
        shot(page, "05-map-puppy.png", data)

        # 06 the analogy row back on king - man + woman, top of the panel (no word circled)
        set_analogy(page, "king", "man", "woman")
        scroll_to(page, "#embeddings .controls.analogy", FIND_TOP)
        shot(page, "06-ana-king.png", data)

        # vectors as the demo's caption prints them, for the claims list (no screenshot)
        data["vectors"] = {}
        for w in VECTOR_WORDS:
            find(page, w)
            data["vectors"][w] = page.evaluate("document.querySelector('#embInfo').textContent")
        # a word that is not on the toy map: what the finder says
        find(page, "pizza")
        data["not_found"] = page.evaluate("document.querySelector('#embFindMsg p').textContent")
        browser.close()
    DATA.write_text(json.dumps(data, indent=1, ensure_ascii=False), encoding="utf-8")
    print("wrote", DATA)


if __name__ == "__main__":
    main()
