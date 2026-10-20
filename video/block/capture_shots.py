"""Take the episode's real screenshots of the guide's "The block" chapter -> shots/*.png.

    python capture_shots.py

Loads the local index.html (dark theme), switches to Deep mode by clicking the page's own mode
toggle (the parameter calculator is deep-only), steps the block walkthrough through all eight
stages with #blkNext and screenshots each at the same scroll position, then screenshots the
calculator on its Llama 3 8B preset and the chapter's deep-mode text. Also writes
out/shots-data.json with each stage's title and the calculator's own output text for every
preset, so the numbers in episode.html can be checked against the real page.
Nothing is downloaded except the site's own web fonts. Re-run after the chapter changes.
"""
import json
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent  # the site root: video/block -> residual-stream
SHOTS = HERE / "shots"
DATA = HERE / "out" / "shots-data.json"
# A 1280x720 CSS viewport at 1.5x gives a 1920x1080 PNG (same setting as video/tokens/capture_shots.py).
VIEW = {"width": 1280, "height": 720}
SCALE = 1.5
SETTLE_MS = 600  # let a demo redraw after an interaction
FIRST_ARRIVAL_MS = 2000  # first jump into the chapter: lazy reveals and layout shifts above it settle
PANEL_TOP = 40  # CSS px between the viewport top and the walkthrough panel, so the whole panel fits
STAGES = 8  # STAGES.length in js/block.js
DEEP_TOGGLE = '.mode-toggle button[data-mode-set="deep"] >> visible=true'
PRESETS = ("gpt2", "gpt3", "llama2", "llama3")  # PRESETS keys in js/block.js


def shot(page, name):
    page.screenshot(path=str(SHOTS / name))
    print("wrote", name)


def scroll_to(page, selector, top):
    """Jump (not smooth-scroll) so the element sits `top` CSS px below the viewport top, then let
    the page redraw. main() also waits FIRST_ARRIVAL_MS after the first jump: with only SETTLE_MS
    the first walkthrough shot caught the page mid-transition, showing an earlier chapter."""
    page.evaluate(f"""(() => {{ const p = document.querySelector('{selector}');
        window.scrollTo({{top: p.getBoundingClientRect().top + window.scrollY - {top}, behavior: 'instant'}}); }})()""")
    page.wait_for_timeout(SETTLE_MS)


def calc_state(page):
    return page.evaluate("""(() => ({
        preset: [...document.querySelectorAll('#calcPresets [aria-checked="true"]')].map(b => b.textContent).join(),
        layers: document.querySelector('#c_L').value,
        big: document.querySelector('#calcOut .calc-big').textContent,
        legend: [...document.querySelectorAll('#calcOut .calc-legend span')].map(s => s.textContent),
        facts: [...document.querySelectorAll('#calcOut .calc-facts div')].map(d => d.textContent)
    }))()""")


def main():
    SHOTS.mkdir(exist_ok=True)
    DATA.parent.mkdir(exist_ok=True)
    data = {"stages": [], "calc": {}}
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport=VIEW, device_scale_factor=SCALE, color_scheme="dark")
        page = ctx.new_page()
        page.add_init_script("try{localStorage.setItem('rs-mode-hint','0')}catch(e){}")
        page.goto((ROOT / "index.html").as_uri())
        page.wait_for_timeout(1500)
        page.click(DEEP_TOGGLE)
        page.wait_for_timeout(SETTLE_MS)
        data["mode"] = page.evaluate("document.documentElement.dataset.mode")
        scroll_to(page, "#block .panel.wide", PANEL_TOP)  # arrive once and let reveal effects run
        page.wait_for_timeout(FIRST_ARRIVAL_MS)

        # 01-08 the block walkthrough, one shot per stage, same scroll position
        for i in range(STAGES):
            if i:
                page.click("#blkNext")
                page.wait_for_timeout(SETTLE_MS)
            scroll_to(page, "#block .panel.wide", PANEL_TOP)
            shot(page, f"0{i + 1}-stage-{i + 1}.png")
            data["stages"].append(page.evaluate("document.querySelector('#blkTitle').textContent"))

        # the calculator's output for every preset (for checking claims), shot on Llama 3 8B
        calc = "#block .panel.wide.deep-only"
        for key in PRESETS:
            page.click(f'#calcPresets [role="radio"]:nth-child({PRESETS.index(key) + 1})')
            page.wait_for_timeout(SETTLE_MS)
            data["calc"][key] = calc_state(page)
        scroll_to(page, calc, 120)
        shot(page, "09-calc-llama3.png")

        # 10 the chapter's deep text: attention moves information / the MLP stores knowledge / why residuals
        scroll_to(page, "#block .two-col.deep-only", 150)
        shot(page, "10-deep-text.png")
        browser.close()
    DATA.write_text(json.dumps(data, indent=1, ensure_ascii=False), encoding="utf-8")
    print("wrote", DATA)


if __name__ == "__main__":
    main()
