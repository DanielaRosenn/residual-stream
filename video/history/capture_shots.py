"""Take the episode's real screenshots of the guide's How it began chapter -> shots/*.png.

    python capture_shots.py

Loads the local index.html (dark theme, Simple mode), opens the chapter's timeline demo on the
"2012-2016: Learning language" and "2017-today: Attention scales" tabs with the page's own buttons,
and saves 1920x1080 frames. Also writes out/shots-data.json with the year, title and text of every
timeline entry shown, so the claims in script.json and episode.html can be checked against the page.
Nothing is downloaded except the site's own web fonts. Re-run after the chapter's demo changes; the
episode reads the PNGs by name.
"""
import json
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent  # the site root: video/history -> residual-stream
SHOTS = HERE / "shots"
DATA = HERE / "out" / "shots-data.json"
# Same framing as the other episodes (video/modern/capture_shots.py): a 1280x720 CSS viewport at
# 1.5x gives a 1920x1080 PNG with the demos large enough to read on video.
VIEW = {"width": 1280, "height": 720}
SCALE = 1.5
LOAD_MS = 1500    # first load: fonts and every chapter's demo
SETTLE_MS = 800   # let a demo redraw or a scroll settle (video/block found a short settle caught a mid-transition frame)
ITEM_TOP = 90     # CSS px between the viewport top and the timeline entry the shot starts at
# The era tabs are built by js/history.js from ERAS[].label; match on the start of the label.
ERA_LANG = "2012"   # "2012–2016: Learning language": word2vec 2013, seq2seq 2014, attention 2014
ERA_SCALE = "2017"  # "2017–today: Attention scales": Attention Is All You Need, then scaling


def pin_item(page, index: int) -> None:
    """Scroll so timeline entry `index` sits ITEM_TOP px below the viewport top."""
    page.evaluate(f"""(() => {{ const li = document.querySelectorAll('#timeline li')[{index}];
        window.scrollTo(0, li.getBoundingClientRect().top + window.scrollY - {ITEM_TOP}); }})()""")
    page.wait_for_timeout(SETTLE_MS)


def shot(page, name: str) -> None:
    page.screenshot(path=str(SHOTS / name))
    print("wrote", name)


def entries(page) -> list:
    """Year, title, body and 'why it mattered' of each entry exactly as the demo shows them."""
    return page.evaluate("""[...document.querySelectorAll('#timeline li')].map(li => ({
        y: li.querySelector('.tl-year').textContent, t: li.querySelector('.tl-title').textContent,
        key: li.classList.contains('key'), b: li.querySelector('.tl-body').textContent,
        w: li.querySelector('.tl-why').textContent }))""")


def open_era(page, prefix: str) -> str:
    page.click(f'#eraTabs button:has-text("{prefix}")')
    page.wait_for_timeout(SETTLE_MS)
    return page.evaluate("document.querySelector('#eraTabs [aria-selected=true]').textContent")


def main() -> None:
    SHOTS.mkdir(exist_ok=True)
    DATA.parent.mkdir(exist_ok=True)
    data = {}
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport=VIEW, device_scale_factor=SCALE, color_scheme="dark")
        ctx.add_init_script("try{localStorage.setItem('rs-mode','simple');localStorage.setItem('rs-mode-hint','0')}catch(e){}")
        page = ctx.new_page()
        page.goto((ROOT / "index.html").as_uri())
        page.wait_for_timeout(LOAD_MS)
        data["mode"] = page.evaluate("document.documentElement.dataset.mode")

        # 01 the chapter's opening: heading, the keyhole paragraph, the era tabs
        page.evaluate("document.querySelector('#history').scrollIntoView({block:'start', behavior:'instant'})")
        page.wait_for_timeout(SETTLE_MS)
        shot(page, "01-chapter-top.png")
        data["keyhole"] = page.evaluate("[...document.querySelectorAll('#history > p.simple-only')].map(p => p.textContent)")
        data["short_version"] = page.evaluate("document.querySelector('#history aside.note.simple-only').textContent")

        # 02 "Learning language": from word2vec (2013) through seq2seq and attention (2014)
        data["era_lang"] = open_era(page, ERA_LANG)
        data["lang_items"] = entries(page)
        pin_item(page, 1)
        shot(page, "02-era-language.png")

        # 03 "Attention scales": the 2017 transformer entry and the scaling years after it
        data["era_scale"] = open_era(page, ERA_SCALE)
        data["scale_items"] = entries(page)
        pin_item(page, 0)
        shot(page, "03-era-scale.png")
        browser.close()
    DATA.write_text(json.dumps(data, indent=1, ensure_ascii=False), encoding="utf-8")
    print("wrote", DATA)


if __name__ == "__main__":
    main()
