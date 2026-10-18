"""Take the episode's real screenshots of the guide's "Agents" chapter -> shots/*.png.

    python capture_shots.py

Loads the local index.html (dark theme), switches to Deep mode with the page's own mode toggle
(the agent run and the reliability panel show in both modes; Deep adds the full captions and the
workflow / MCP / safety text), then:
  01-04  the agent run after 1, 3, 5 and 7 clicks on #agNext (same scroll position); at 7 the
         human-approval gate #agGate is open
  05     the same run after Reject and one more step: the reviewer's note and the revised draft,
         gate open again
  The run panel is taller than the viewport, so 01-05 are scrolled until the open gate fits.
  The page's CSS shows the approval box even while it is `hidden` (a site bug); this script hides it
  until the agent asks, as js/agents.js intends, and records in shots-data.json whether the bug remains.
  It also hides the fixed top-right corner (mode, language and theme buttons) after switching to Deep.
  06     the reliability panel with #relP = 95 and #relN = 20
  07     the deep text "Workflows or agents?" / "MCP: a standard plug for tools"
  08     the deep text "Context engineering" / "Safety in the loop"
Also writes out/shots-data.json with the stats line, the log length and the gate state for every
shot, and the reliability readout, so the numbers in episode.html can be checked against the page.
Nothing is downloaded except the site's own web fonts. Re-run after the chapter changes.
"""
import json
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent  # the site root: video/agents -> residual-stream
SHOTS = HERE / "shots"
DATA = HERE / "out" / "shots-data.json"
# A 1280x720 CSS viewport at 1.5x gives a 1920x1080 PNG (same setting as video/tokens/capture_shots.py).
VIEW = {"width": 1280, "height": 720}
SCALE = 1.5
SETTLE_MS = 600  # let a demo redraw after an interaction
FIRST_ARRIVAL_MS = 2000  # first jump into the chapter: lazy reveals settle (see video/block/README.md)
GATE_MARGIN = 10  # CSS px left below the approval gate: the run panel is taller than the viewport, so the
                  # run shots are scrolled until the open gate (step 7) fits, cutting a little off the panel top
CLICK_SHOTS = (1, 3, 5, 7)  # #agNext clicks per shot; START in js/agents.js has 7 messages, the 7th opens the gate
REL_P, REL_N = "95", "20"  # the guide's own example: 95% per step over 20 steps
DEEP_TOGGLE = '.mode-toggle button[data-mode-set="deep"] >> visible=true'
RUN_PANEL = "#agents .panel.wide"
# capture-only CSS, see main(): hide the approval box while it is `hidden` (site bug), and the fixed
# Simple/Deep + language + theme corner, which floats over the right edge of the run panel
CAPTURE_CSS = ".ag-gate[hidden] { display: none; } .corner { visibility: hidden; }"


def shot(page, name):
    page.screenshot(path=str(SHOTS / name))
    print("wrote", name)


def scroll_to(page, selector, top):
    """Jump (not smooth-scroll) so the element sits `top` CSS px below the viewport top."""
    page.evaluate(f"""(() => {{ const p = document.querySelector('{selector}');
        window.scrollTo({{top: p.getBoundingClientRect().top + window.scrollY - {top}, behavior: 'instant'}}); }})()""")
    page.wait_for_timeout(SETTLE_MS)


def run_state(page):
    """The run exactly as the page shows it: stats line, messages, gate."""
    return page.evaluate("""(() => ({
        stats: document.querySelector('#agStats').textContent,
        messages: [...document.querySelectorAll('#agLog li')].map(li => li.querySelector('.ag-role').textContent + ' ' + li.querySelector('.ag-tok').textContent),
        gate_open: !document.querySelector('#agGate').hidden,
        gate_text: document.querySelector('#agGateText').textContent,
        next_button: document.querySelector('#agNext').textContent,
        caching: document.querySelector('#agCache').checked
    }))()""")


def main():
    SHOTS.mkdir(exist_ok=True)
    DATA.parent.mkdir(exist_ok=True)
    data = {"run": {}}
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
        # Site bug (css/style.css, 2026-10-18): `.ag-gate { display: flex }` overrides the `hidden`
        # attribute, so the approval box shows from step 1 although js/agents.js hides it until the
        # agent asks. Record whether the bug is still there, then hide it here only, as the JS intends.
        data["gate_bug_present"] = page.evaluate(
            "(() => { const g = document.querySelector('#agGate'); return g.hidden && getComputedStyle(g).display !== 'none'; })()")
        page.add_style_tag(content=CAPTURE_CSS)  # after the Deep click: the toggle lives in .corner
        scroll_to(page, RUN_PANEL, 20)
        page.wait_for_timeout(FIRST_ARRIVAL_MS)

        # measure once: the scroll position where the open gate sits GATE_MARGIN above the viewport bottom
        for _ in range(max(CLICK_SHOTS)):
            page.click("#agNext")
        page.wait_for_timeout(SETTLE_MS)
        run_y = page.evaluate(f"""(() => {{ const g = document.querySelector('#agGate').getBoundingClientRect();
            return Math.round(g.bottom + window.scrollY - window.innerHeight + {GATE_MARGIN}); }})()""")
        page.click("#agReset")
        page.wait_for_timeout(SETTLE_MS)
        data["run_scroll_y"] = run_y

        def pin_run():
            page.evaluate(f"window.scrollTo({{top: {run_y}, behavior: 'instant'}})")
            page.wait_for_timeout(SETTLE_MS)

        # 01-04 the agent run, step by step (same scroll position, so the episode can cross-fade)
        clicks = 0
        for i, n in enumerate(CLICK_SHOTS):
            while clicks < n:
                page.click("#agNext")
                clicks += 1
                page.wait_for_timeout(SETTLE_MS)
            pin_run()
            name = f"0{i + 1}-run-{n}.png"
            shot(page, name)
            data["run"][name] = run_state(page)

        # 05 a human rejects the first draft; one more step and the agent revises and asks again
        page.click("#agReject")
        page.wait_for_timeout(SETTLE_MS)
        page.click("#agNext")
        page.wait_for_timeout(SETTLE_MS)
        pin_run()
        shot(page, "05-run-rejected.png")
        data["run"]["05-run-rejected.png"] = run_state(page)

        # 06 compounding errors at the guide's example
        for sel, val in (("#relP", REL_P), ("#relN", REL_N)):
            page.fill(sel, val)
            page.dispatch_event(sel, "input")
        page.wait_for_timeout(SETTLE_MS)
        scroll_to(page, "#relP", 260)
        shot(page, "06-reliability.png")
        data["reliability"] = page.evaluate("""(() => ({
            p: document.querySelector('#relPOut').value, n: document.querySelector('#relNOut').value,
            out: document.querySelector('#relOut').textContent }))()""")

        # 07-08 the chapter's deep text
        cols = page.query_selector_all("#agents .two-col.deep-only")
        data["deep_text"] = [c.inner_text() for c in cols]
        page.evaluate("document.querySelectorAll('#agents .two-col.deep-only')[0].scrollIntoView({block:'center', behavior:'instant'})")
        page.wait_for_timeout(SETTLE_MS)
        shot(page, "07-workflows-mcp.png")
        page.evaluate("document.querySelectorAll('#agents .two-col.deep-only')[1].scrollIntoView({block:'center', behavior:'instant'})")
        page.wait_for_timeout(SETTLE_MS)
        shot(page, "08-safety.png")
        browser.close()
    DATA.write_text(json.dumps(data, indent=1, ensure_ascii=False), encoding="utf-8")
    print("wrote", DATA)


if __name__ == "__main__":
    main()
