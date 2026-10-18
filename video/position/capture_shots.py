"""Take the episode's real screenshots of the guide's Position chapter -> shots/*.png.

    python capture_shots.py

Loads the local index.html (dark theme), switches the page to Deep mode (the RoPE panel is
deep-only; the sinusoidal heatmap panel shows in both modes), drives the two demos' sliders and
saves 1920x1080 frames. Also writes out/shots-data.json with each panel's on-screen rectangle (in
screenshot pixels, for placing highlights in episode.html) and the demo's own numbers for each
state (slider values, the RoPE angle labels, the similarity curve recomputed with the demo's
formula), so the episode's claims can be checked against the real demo.
Nothing is downloaded except the site's own web fonts. Re-run after the demo changes.
"""
import json
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent  # the site root: video/position -> residual-stream
SHOTS = HERE / "shots"
DATA = HERE / "out" / "shots-data.json"
# A 1280x720 CSS viewport at 1.5x gives a 1920x1080 PNG with the demos large enough to read on video
# (same setting as video/tokens/capture_shots.py).
VIEW = {"width": 1280, "height": 720}
SCALE = 1.5
SETTLE_MS = 600  # let a demo redraw after an interaction
PANEL_TOP = 40  # CSS px between the viewport top and the demo panel, so the whole panel fits
DEEP_BUTTON = '.mode-toggle button[data-mode-set="deep"] >> visible=true'
PE_PANEL = "#position .panel.wide"
ROPE_PANEL = "#position .panel.deep-only"
# Sinusoidal demo: the slider's default (20), the start (0) and a far position (45) whose similarity
# curve has the same shape as 20's, only shifted - the "distance, not absolute place" point.
PE_POSITIONS = (20, 0, 45)
# RoPE demo: from no rotation to the slider's maximum (40).
ROPE_POSITIONS = (0, 3, 12, 40)


def pin(page, selector):
    """Same scroll position for every slider state, so the episode can cross-fade between them."""
    page.evaluate(f"""(() => {{ const p = document.querySelector('{selector}');
        window.scrollTo(0, p.getBoundingClientRect().top + window.scrollY - {PANEL_TOP}); }})()""")
    page.wait_for_timeout(SETTLE_MS)


def set_slider(page, selector, value):
    page.fill(selector, str(value))
    page.dispatch_event(selector, "input")
    page.wait_for_timeout(SETTLE_MS)


def rects(page, selectors):
    """Bounding boxes in screenshot pixels (CSS px x SCALE), rounded."""
    out = {}
    for sel in selectors:
        r = page.evaluate(f"(() => {{ const b = document.querySelector('{sel}').getBoundingClientRect();"
                          " return [b.left, b.top, b.width, b.height]; })()")
        out[sel] = [round(v * SCALE) for v in r]
    return out


def shot(page, name):
    page.screenshot(path=str(SHOTS / name))
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
        page.click(DEEP_BUTTON)
        page.wait_for_timeout(SETTLE_MS)
        data["mode"] = page.evaluate("document.documentElement.dataset.mode")

        # 01-03 the sinusoidal heatmap and similarity curve at a few positions
        for i, pos in enumerate(PE_POSITIONS):
            set_slider(page, "#pePos", pos)
            pin(page, PE_PANEL)
            shot(page, f"0{i + 1}-pe-pos{pos}.png")
            data[f"pe_pos{pos}"] = page.evaluate("""(() => {
                const d = +document.querySelector('#peDim').value, sel = +document.querySelector('#pePos').value;
                const pe = (pos) => { const v = []; for (let i = 0; i < d; i += 2) { const f = Math.pow(10000, -i / d);
                    v.push(Math.sin(pos * f), Math.cos(pos * f)); } return v; };
                const a = pe(sel);
                const sims = [...Array(64)].map((_, q) => +pe(q).reduce((s, x, i) => s + x * a[i], 0).toFixed(2));
                return { dim: d, pos: sel, sims };
            })()""")
        data["pe_rects"] = rects(page, [PE_PANEL, "#peCanvas", "#peSim", "#pePos"])
        data["pe_captions"] = page.evaluate(
            "[...document.querySelectorAll('#position .pe-grid figcaption .deep-only')].map(e => e.textContent)")

        # 04-07 the RoPE circles from position 0 to the slider's maximum
        for i, pos in enumerate(ROPE_POSITIONS):
            set_slider(page, "#ropePos", pos)
            pin(page, ROPE_PANEL)
            shot(page, f"0{i + 4}-rope-{pos}.png")
            data[f"rope_{pos}"] = page.evaluate(
                "[...document.querySelectorAll('#ropeSvg text')].map(t => t.textContent)")
        data["rope_rects"] = rects(page, [ROPE_PANEL, "#ropeSvg", "#ropePos"])
        data["rope_max"] = page.evaluate("+document.querySelector('#ropePos').max")
        browser.close()
    DATA.write_text(json.dumps(data, indent=1, ensure_ascii=False), encoding="utf-8")
    print("wrote", DATA)


if __name__ == "__main__":
    main()
