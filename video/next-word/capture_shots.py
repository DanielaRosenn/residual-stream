"""Take the episode's real screenshots of the guide's own demos -> shots/*.png (1920x1080).

    python capture_shots.py

Loads the local index.html and play.html (dark theme, Simple mode), drives each demo into a
telling state and saves a 1920x1080 frame. Nothing is downloaded except the site's own web fonts.
Re-run after the site's demos change; the episode reads the PNGs by name.
"""
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent  # the site root: video/next-word -> residual-stream
SHOTS = HERE / "shots"
# A 1280x720 CSS viewport at 1.5x gives a 1920x1080 PNG with the demos large enough to read on video.
VIEW = {"width": 1280, "height": 720}
SCALE = 1.5
SETTLE_MS = 600      # let a demo redraw after an interaction
TRAIN_MS = 6000      # the in-browser training demo needs a few seconds to bring the loss down


def centre(page, selector):
    page.evaluate(f"document.querySelector('{selector}').scrollIntoView({{block:'center', behavior:'instant'}})")
    page.wait_for_timeout(SETTLE_MS)


def shot(page, name):
    page.screenshot(path=str(SHOTS / name))
    print("wrote", name)


def main():
    SHOTS.mkdir(exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport=VIEW, device_scale_factor=SCALE, color_scheme="dark")
        page = ctx.new_page()
        page.add_init_script("try{localStorage.setItem('rs-mode','simple');localStorage.setItem('rs-mode-hint','0')}catch(e){}")
        page.goto((ROOT / "index.html").as_uri())
        page.wait_for_timeout(1500)

        # 01 the live next-word demo at the top of the page
        page.click("#heroGo")
        page.wait_for_timeout(2500)
        centre(page, ".hero-demo")
        shot(page, "01-hero.png")

        # 02 the real BPE tokenizer
        page.fill("#bpeMerges", "200")
        page.dispatch_event("#bpeMerges", "input")
        centre(page, "#bpeChips")
        shot(page, "02-tokens.png")

        # 03 the toy embedding map with king - man + woman
        for sel, word in (("#anaA", "king"), ("#anaB", "man"), ("#anaC", "woman")):
            page.select_option(sel, word)
        page.wait_for_timeout(SETTLE_MS)
        centre(page, "#embSvg")
        shot(page, "03-embeddings.png")

        # 04 attention lines for "it" (pronoun head)
        centre(page, "#attnSvg")
        page.evaluate("""(() => {
            const t = [...document.querySelectorAll('#attnSvg text')].find(e => e.textContent.trim() === 'it');
            if (t) (t.closest('g') || t).dispatchEvent(new MouseEvent('click', {bubbles: true}));
        })()""")
        page.wait_for_timeout(SETTLE_MS)
        shot(page, "04-attention.png")

        # 05 the residual stream walk-through, at "add it to the stream"
        for _ in range(3):
            page.click("#blkNext")
        centre(page, "#blockSvg")
        shot(page, "05-block.png")

        # 06 sampling bars after 200 draws
        page.click("#sMany")
        centre(page, "#sampBars")
        shot(page, "06-sampling.png")

        # 07 training: a real bigram model trained in the browser
        page.click("#trainGo")
        page.wait_for_timeout(TRAIN_MS)
        centre(page, "#trainGo")
        shot(page, "07-training.png")

        # 08 the game's route map
        page.goto((ROOT / "play.html").as_uri())
        page.wait_for_timeout(1500)
        shot(page, "08-game.png")
        browser.close()


if __name__ == "__main__":
    main()
