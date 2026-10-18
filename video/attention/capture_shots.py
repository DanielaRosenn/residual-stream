"""Take the episode's real screenshots of the guide's Attention chapter -> shots/*.png (1920x1080).

    python capture_shots.py

Loads the local index.html (dark theme), drives the attention demos into the states the episode
talks about and saves 1920x1080 frames. Nothing is downloaded except the site's own web fonts.
Re-run after the Attention chapter's demos change; the episode reads the PNGs by name.
"""
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent  # the site root: video/attention -> residual-stream
SHOTS = HERE / "shots"
# Same capture settings as the pilot (video/next-word/capture_shots.py): a 1280x720 CSS viewport at
# 1.5x gives a 1920x1080 PNG with the demos large enough to read on video.
VIEW = {"width": 1280, "height": 720}
SCALE = 1.5
SETTLE_MS = 600      # let a demo redraw after an interaction
MATH_MASK_STEP = 4   # zero-based step of the maths walkthrough that applies the causal mask
MATH_SOFTMAX_STEP = 5  # zero-based step that shows the softmax weights


def top_at(page, selector, offset=12):
    """Scroll so the element's top edge sits `offset` CSS px below the top of the viewport."""
    page.evaluate(f"""(() => {{
        const r = document.querySelector('{selector}').getBoundingClientRect();
        window.scrollBy({{top: r.top - {offset}, behavior: 'instant'}});
    }})()""")
    page.wait_for_timeout(SETTLE_MS)


def shot(page, name):
    page.screenshot(path=str(SHOTS / name))
    print("wrote", name)


def click_seg(page, seg_id, value):
    """Click the segmented-control option of `seg_id` whose value or label matches."""
    page.evaluate(f"""(() => {{
        const seg = document.querySelector('#{seg_id}');
        const b = [...seg.querySelectorAll('button,[role=radio]')].find(e =>
            (e.dataset.value || e.value || '') === '{value}' || e.textContent.includes('{value}'));
        if (!b) throw new Error('no option {value} in #{seg_id}');
        b.click();
    }})()""")
    page.wait_for_timeout(SETTLE_MS)


def click_token(page, word):
    """Click a token on the left of the attention-lines SVG (the 'looking' column)."""
    page.evaluate(f"""(() => {{
        const g = [...document.querySelectorAll('#attnSvg g[role=button]')].find(e => e.textContent.trim() === '{word}');
        if (!g) throw new Error('no token {word}');
        g.dispatchEvent(new MouseEvent('click', {{bubbles: true}}));
    }})()""")
    page.wait_for_timeout(SETTLE_MS)


def main():
    SHOTS.mkdir(exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport=VIEW, device_scale_factor=SCALE, color_scheme="dark")
        page = ctx.new_page()
        page.add_init_script("try{localStorage.setItem('rs-mode','simple');localStorage.setItem('rs-mode-hint','0')}catch(e){}")
        page.goto((ROOT / "index.html").as_uri())
        page.wait_for_timeout(1500)

        # The demo's default state: coreference head, "...too tired", "it" selected.
        top_at(page, "#headSeg")
        click_token(page, "it")
        shot(page, "01-it-tired.png")

        # Flip the last word: the pattern jumps to "street".
        click_seg(page, "adjSeg", "wide")
        click_token(page, "it")
        shot(page, "02-it-wide.png")

        # Back to "tired"; the final adjective is where a left-to-right model can settle the reference.
        click_seg(page, "adjSeg", "tired")
        click_token(page, "tired")
        shot(page, "03-tired-looks-back.png")

        # Other heads on the same sentence, for the many-heads scene.
        click_seg(page, "headSeg", "Previous-token")
        click_token(page, "street")
        shot(page, "04-head-prev.png")
        click_seg(page, "headSeg", "Verb-to-subject")
        click_token(page, "cross")
        shot(page, "05-head-subj.png")

        # Deep mode: the maths walkthrough, at the causal-mask step and at the softmax step.
        page.locator('.mode-toggle button[data-mode-set="deep"]').filter(visible=True).first.click()
        page.wait_for_timeout(SETTLE_MS)
        for _ in range(MATH_MASK_STEP):
            page.click("#mathNext")
        top_at(page, "#mathDesc", 60)
        shot(page, "06-math-mask.png")
        for _ in range(MATH_SOFTMAX_STEP - MATH_MASK_STEP):
            page.click("#mathNext")
        page.wait_for_timeout(SETTLE_MS)
        shot(page, "07-math-softmax.png")
        browser.close()


if __name__ == "__main__":
    main()
