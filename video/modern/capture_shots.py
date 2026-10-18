"""Take the episode's real screenshots of the guide's Modern LLMs chapter -> shots/*.png.

    python capture_shots.py

Loads the local index.html (dark theme), switches to Deep mode with the page's own toggle, steps the
KV-cache demo three times (with and without the cache) and routes one token through the
mixture-of-experts demo, then saves 1920x1080 frames. Also writes out/shots-data.json with the text
the demos printed (the KV count line, the router caption), so the numbers in episode.html can be
checked against the real demo. Nothing is downloaded except the site's own web fonts.
Re-run after the chapter's demos change; the episode reads the PNGs by name.
"""
import json
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent  # the site root: video/modern -> residual-stream
SHOTS = HERE / "shots"
DATA = HERE / "out" / "shots-data.json"
# Same framing as the other episodes (video/next-word/capture_shots.py): a 1280x720 CSS viewport at
# 1.5x gives a 1920x1080 PNG with the demos large enough to read on video.
VIEW = {"width": 1280, "height": 720}
SCALE = 1.5
LOAD_MS = 1500    # first load: fonts and every chapter's demo
SETTLE_MS = 800   # let a demo redraw or a scroll settle (video/block found a short settle caught a mid-transition frame)
KV_STEPS = 3      # the brief: three "Generate next token" clicks -> 7 computations with the cache, 22 without
MOE_TOKEN = "purred"  # the token routed in the MoE shot (one of js/modern.js TOKS; "purred" also appears in the KV demo)
DEEP_TOGGLE = '.mode-toggle button[data-mode-set="deep"] >> visible=true'


def centre(page, selector: str) -> None:
    """Scroll the first element matching `selector` to the middle of the viewport and let it settle."""
    page.evaluate(f"document.querySelector('{selector}').scrollIntoView({{block:'center', behavior:'instant'}})")
    page.wait_for_timeout(SETTLE_MS)


def shot(page, name: str) -> None:
    page.screenshot(path=str(SHOTS / name))
    print("wrote", name)


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

        # Deep mode via the page's own toggle, for the full captions
        centre(page, "#modern")
        page.click(DEEP_TOGGLE)
        page.wait_for_timeout(SETTLE_MS)
        data["mode"] = page.evaluate("document.documentElement.dataset.mode")

        # 01 KV cache after three steps, cache on: one fresh cell per step
        for _ in range(KV_STEPS):
            page.click("#kvStep")
            page.wait_for_timeout(200)
        centre(page, "#kvGrid")
        page.wait_for_timeout(SETTLE_MS)  # one more settle after the first jump into the chapter
        centre(page, "#kvGrid")
        shot(page, "01-kv-cache.png")
        data["kv_cache_on"] = page.evaluate("document.querySelector('#kvStat').textContent")

        # 02 same three steps with the cache off: every cell recomputed
        page.click("#kvOn")
        page.wait_for_timeout(SETTLE_MS)
        shot(page, "02-kv-nocache.png")
        data["kv_cache_off"] = page.evaluate("document.querySelector('#kvStat').textContent")
        page.click("#kvOn")
        page.wait_for_timeout(SETTLE_MS)

        # 03 mixture of experts: route one token
        centre(page, "#moeSvg")
        page.click(f'#moeSeg button:has-text("{MOE_TOKEN}")')
        page.wait_for_timeout(SETTLE_MS)
        centre(page, "#moeSvg")
        shot(page, "03-moe-route.png")
        data["moe_token"] = MOE_TOKEN
        data["moe_info"] = page.evaluate("document.querySelector('#moeInfo').textContent")

        # 04 the deep text: long context / reasoning; 05 RAG and tools / agents
        cols = "#modern .two-col.deep-only"
        page.evaluate(f"document.querySelectorAll('{cols}')[0].scrollIntoView({{block:'center', behavior:'instant'}})")
        page.wait_for_timeout(SETTLE_MS)
        shot(page, "04-long-reasoning.png")
        page.evaluate(f"document.querySelectorAll('{cols}')[1].scrollIntoView({{block:'center', behavior:'instant'}})")
        page.wait_for_timeout(SETTLE_MS)
        shot(page, "05-rag-agents.png")
        browser.close()
    DATA.write_text(json.dumps(data, indent=1, ensure_ascii=False), encoding="utf-8")
    print("wrote", DATA)


if __name__ == "__main__":
    main()
