"""Take the episode's real screenshots of the guide's Sampling demo and the game's The Dial -> shots/*.png.

    python capture_shots.py

Loads the local index.html and play.html (dark theme, Simple mode), sets the demo's sliders to a
few telling values and saves 1920x1080 frames. Math.random is replaced by a seeded generator so
the "Sample" buttons give the same picks on every run. Nothing is downloaded except the site's
own web fonts. Re-run after the site's demos change; the episode reads the PNGs by name.
"""
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent  # the site root: video/sampling -> residual-stream
SHOTS = HERE / "shots"
# Same framing as the pilot (video/next-word/capture_shots.py): a 1280x720 CSS viewport at 1.5x
# gives a 1920x1080 PNG with the demos large enough to read on video.
VIEW = {"width": 1280, "height": 720}
SCALE = 1.5
SETTLE_MS = 600      # let a demo redraw after an interaction
GAME_LOAD_MS = 1500  # the game builds its tiny n-gram model on load
GAME_HEADER_PX = 72  # CSS px: the game's sticky top bar (about 56 px) plus a little air above the mission card
# mulberry32 with a fixed seed, so sampled picks are identical run to run.
SEEDED_RANDOM = """(() => { let a = 20261018; Math.random = function () {
  a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })();"""


def centre(page, selector: str) -> None:
    """Scroll the first element matching `selector` to the middle of the viewport and let it settle."""
    page.evaluate(f"document.querySelector('{selector}').scrollIntoView({{block:'center', behavior:'instant'}})")
    page.wait_for_timeout(SETTLE_MS)


def set_range(page, selector: str, value: float) -> None:
    """Set a range input the way a drag would: write the value, then fire `input`."""
    page.evaluate(f"(() => {{ const s = document.querySelector('{selector}'); s.value = '{value}';"
                  " s.dispatchEvent(new Event('input', {bubbles: true})); })()")
    page.wait_for_timeout(SETTLE_MS)


def shot(page, name: str) -> None:
    page.screenshot(path=str(SHOTS / name))
    print("wrote", name)


def main() -> None:
    SHOTS.mkdir(exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport=VIEW, device_scale_factor=SCALE, color_scheme="dark")
        ctx.add_init_script(SEEDED_RANDOM)
        ctx.add_init_script("try{localStorage.setItem('rs-mode','simple');localStorage.setItem('rs-mode-hint','0')}catch(e){}")
        page = ctx.new_page()
        page.goto((ROOT / "index.html").as_uri())
        page.wait_for_timeout(1500)

        # 01 the sampling demo as it loads: temperature 1, nothing cut
        centre(page, "#sampBars")
        shot(page, "01-samp-t100.png")

        # 02 temperature turned down to 0.3: the favourite takes most of the probability
        set_range(page, "#sT", 0.3)
        shot(page, "02-samp-t030.png")

        # 03 temperature 0: greedy, always the top token
        set_range(page, "#sT", 0)
        shot(page, "03-samp-t000.png")

        # 04 temperature turned up to 1.8: the bars flatten
        set_range(page, "#sT", 1.8)
        shot(page, "04-samp-t180.png")
        set_range(page, "#sT", 1)

        # 05 the game's The Dial level: mission card at the top, the live bars below it
        page.goto((ROOT / "play.html").as_uri() + "#dial")
        page.wait_for_timeout(GAME_LOAD_MS)
        page.evaluate("document.querySelector('.gl-mission').scrollIntoView({block:'start', behavior:'instant'});"
                      f"window.scrollBy(0, -{GAME_HEADER_PX})")
        page.wait_for_timeout(SETTLE_MS)
        shot(page, "05-dial.png")
        browser.close()


if __name__ == "__main__":
    main()
