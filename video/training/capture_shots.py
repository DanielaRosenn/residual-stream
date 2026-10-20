"""Take the episode's real screenshots of the guide's Training chapter -> shots/*.png.

    python capture_shots.py

Loads the local index.html (dark theme, Deep mode, so the captions name the bigram model, the
entropy floor and RLHF / DPO as the episode does), presses Train on the bigram demo and saves the
panel at three moments, then opens the third post-training stage. Also writes out/shots-data.json
with the demo's own `#trainStat` line and sample text for each moment, so every number in
episode.html can be checked against the real demo. Nothing is downloaded except the site's own web
fonts. Re-run after the demo changes; the episode reads the PNGs by name.
"""
import json
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent  # the site root: video/training -> residual-stream
SHOTS = HERE / "shots"
DATA = HERE / "out" / "shots-data.json"
# Same framing as the earlier episodes (video/tokens/capture_shots.py): a 1280x720 CSS viewport at
# 1.5x gives a 1920x1080 PNG with the demos large enough to read on video.
VIEW = {"width": 1280, "height": 720}
SCALE = 1.5
SETTLE_MS = 600        # let a demo redraw after an interaction
PAGE_LOAD_MS = 1500    # fonts and every chapter's demo initialise on load
PANEL_TOP = 110        # CSS px between the viewport top and the training panel, the same in every shot
EARLY_MS = 1000        # first look at the falling curve
TRAIN_MS = 4500        # total training time before the main shot (the brief's "~4.5 s")
STAGE_OPEN = "#stages li:nth-child(3) button"  # "Preference tuning"


def shot(page, name: str) -> None:
    page.screenshot(path=str(SHOTS / name))
    print("wrote", name)


def pin_panel(page) -> None:
    """Same scroll position for every training state, so the episode can cross-fade between them.
    `behavior: 'instant'` because the site scrolls smoothly, which left the first shot mid-scroll."""
    page.evaluate(f"""(() => {{ const p = document.querySelector('#training .panel.wide');
        window.scrollTo({{top: p.getBoundingClientRect().top + window.scrollY - {PANEL_TOP}, behavior: 'instant'}}); }})()""")
    page.wait_for_timeout(SETTLE_MS)


def state(page) -> dict:
    """The demo's stats line, sample text and button label exactly as shown."""
    return page.evaluate("""(() => ({
        stat: document.querySelector('#trainStat').textContent,
        sample: document.querySelector('#trainSample').textContent,
        button: document.querySelector('#trainGo').textContent
    }))()""")


def toggle_training(page) -> None:
    """Press the Train / Pause button."""
    page.click("#trainGo")


def main() -> None:
    SHOTS.mkdir(exist_ok=True)
    DATA.parent.mkdir(exist_ok=True)
    data = {}
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport=VIEW, device_scale_factor=SCALE, color_scheme="dark")
        ctx.add_init_script("try{localStorage.setItem('rs-mode','deep');localStorage.setItem('rs-mode-hint','0')}catch(e){}")
        page = ctx.new_page()
        page.goto((ROOT / "index.html").as_uri())
        page.wait_for_timeout(PAGE_LOAD_MS)

        # 01 before training: uniform weights, loss at ln(V)
        pin_panel(page)
        shot(page, "01-train-start.png")
        data["start"] = state(page)

        # 02 one second in: pause, shoot, resume (pausing keeps the stat line and the picture in step)
        toggle_training(page)
        page.wait_for_timeout(EARLY_MS)
        toggle_training(page)
        pin_panel(page)
        shot(page, "02-train-early.png")
        data["early"] = state(page)

        # 03 the main shot, after about 4.5 s of training in total
        toggle_training(page)
        page.wait_for_timeout(TRAIN_MS - EARLY_MS)
        toggle_training(page)
        pin_panel(page)
        shot(page, "03-train-trained.png")
        data["trained"] = state(page)

        # 04 "From text predictor to assistant": the four stages, the third one opened
        page.click(STAGE_OPEN)
        page.evaluate("document.querySelector('#stages').scrollIntoView({block:'center', behavior:'instant'})")
        page.wait_for_timeout(SETTLE_MS)
        shot(page, "04-stages.png")
        data["stages"] = page.evaluate("[...document.querySelectorAll('#stages li > button')].map(b => b.innerText)")
        data["stage3_body"] = page.evaluate("document.querySelector('#stages li:nth-child(3) .stage-body').innerText")
        browser.close()
    DATA.write_text(json.dumps(data, indent=1, ensure_ascii=False), encoding="utf-8")
    print("wrote", DATA)


if __name__ == "__main__":
    main()
