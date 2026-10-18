"""Take the episode's real screenshots of the guide's "Inside the box" chapter -> shots/*.png.

    python capture_shots.py

Loads the local index.html (dark theme), switches to Deep mode (superposition and activation
patching are Deep-only), drives the four demos to the states the episode shows and saves 1920x1080
frames. Also writes out/shots-data.json with what each demo printed (bars, notes, the panel's
position in the shot), so the numbers and camera framing in episode.html can be checked against the
real page. Nothing is downloaded except the site's own web fonts. Re-run after the demos change.
"""
import json
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent  # the site root: video/interp -> residual-stream
SHOTS = HERE / "shots"
DATA = HERE / "out" / "shots-data.json"
# A 1280x720 CSS viewport at 1.5x gives a 1920x1080 PNG (same setting as video/tokens/capture_shots.py).
VIEW = {"width": 1280, "height": 720}
SCALE = 1.5
SETTLE_MS = 600   # let a demo redraw after an interaction
PANEL_TOP = 96    # CSS px between the viewport top and the demo panel, below the sticky header
LENS_LAYER = 12   # the slider's top: the answer is settled
STEER_STRENGTH = 9  # past the guide's "obsessed" threshold (a >= 8 in js/interp.js)
DEEP = '.mode-toggle button[data-mode-set="deep"] >> visible=true'
SUP_PAIR = "#supSeg button:nth-child(3)"   # "code"; "cat" is on by default -> two non-neighbours
PATCH_CELLS = {  # the brief's selector (first match: layer 3, "Mary") and the cell the episode zooms on
    "13-patch-l3": "#patchGrid button[aria-label^='layer 3,']",
    "14-patch-l3-john2": "#patchGrid button[aria-label^='layer 3, John (2nd)']",
}


def bars(page, sel):
    return page.evaluate(f"""[...document.querySelectorAll('{sel} .bar-row')].map(r =>
        [r.querySelector('.w').textContent, r.querySelector('.p').textContent, r.className])""")


def pin(page, sel):
    """Scroll so the demo's panel starts PANEL_TOP CSS px below the viewport top; return its box in shot px.

    Scrolls twice: content above the panel can still change height after the first jump (late layout),
    which left the first shot of a run misplaced.
    """
    for _ in range(2):
        page.evaluate(f"""(() => {{ const p = document.querySelector('{sel}').closest('.panel');
            window.scrollTo({{top: p.getBoundingClientRect().top + window.scrollY - {PANEL_TOP}, behavior: 'instant'}}); }})()""")
        page.wait_for_timeout(SETTLE_MS)
    r = page.evaluate(f"""(() => {{ const b = document.querySelector('{sel}').closest('.panel').getBoundingClientRect();
        return [b.left, b.top, b.width, b.height]; }})()""")
    return [round(v * SCALE) for v in r]


def shot(page, name):
    page.screenshot(path=str(SHOTS / f"{name}.png"))
    print("wrote", name)


def main():
    SHOTS.mkdir(exist_ok=True)
    DATA.parent.mkdir(exist_ok=True)
    data = {}
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport=VIEW, device_scale_factor=SCALE, color_scheme="dark")
        page = ctx.new_page()
        page.add_init_script("try{localStorage.setItem('rs-mode-hint','0')}catch(e){}")
        page.goto((ROOT / "index.html").as_uri())
        page.wait_for_timeout(1500)
        page.click(DEEP)
        page.wait_for_timeout(SETTLE_MS)
        data["mode"] = page.evaluate("document.documentElement.dataset.mode")

        # 10 logit lens at layer 0 and at the top layer
        for layer, name in ((0, "10-lens-0"), (LENS_LAYER, "11-lens-12")):
            page.fill("#lensL", str(layer))
            page.dispatch_event("#lensL", "input")
            page.wait_for_timeout(SETTLE_MS)
            box = pin(page, "#lensL")
            shot(page, name)
            data[name] = {"panel": box, "pick": page.inner_text("#lensPick"),
                          "bars": bars(page, "#lensBars"), "note": page.inner_text("#lensNote")}

        # 12 superposition: cat (default) + code, two features that are not neighbours
        page.click(SUP_PAIR)
        page.wait_for_timeout(SETTLE_MS)
        box = pin(page, "#supSeg")
        shot(page, "12-sup-cat-code")
        data["12-sup-cat-code"] = {"panel": box, "bars": bars(page, "#supBars"), "note": page.inner_text("#supNote"),
                                   "pressed": page.evaluate("[...document.querySelectorAll('#supSeg button')].map(b => [b.textContent, b.getAttribute('aria-pressed')])")}

        # 13/14 activation patching grid
        for name, sel in PATCH_CELLS.items():
            page.click(sel)
            page.wait_for_timeout(SETTLE_MS)
            box = pin(page, "#patchGrid")
            shot(page, name)
            data[name] = {"panel": box, "info": page.inner_text("#patchInfo"),
                          "grid": page.evaluate("(() => { const g = document.querySelector('#patchGrid').getBoundingClientRect(); return [g.left, g.top, g.width, g.height].map(v => Math.round(v * %s)); })()" % SCALE)}

        # 15 steering at 0 and at STEER_STRENGTH
        for a, name in ((0, "15-steer-0"), (STEER_STRENGTH, "16-steer-9")):
            page.fill("#steerA", str(a))
            page.dispatch_event("#steerA", "input")
            page.wait_for_timeout(SETTLE_MS)
            box = pin(page, "#steerA")
            shot(page, name)
            data[name] = {"panel": box, "pick": page.inner_text("#steerPick"),
                          "bars": bars(page, "#steerBars"), "text": page.inner_text("#steerText")}
        browser.close()
    DATA.write_text(json.dumps(data, indent=1, ensure_ascii=False), encoding="utf-8")
    print("wrote", DATA)


if __name__ == "__main__":
    main()
