"""QA for the game page (play.html / he/play.html).

Usage:
  python tests/qa_game.py                                  # English
  python tests/qa_game.py "<file:// uri of he/play.html>" he   # Hebrew

Loads the page at desktop, mobile and dark sizes, plays Level 0 ("The Job") to the end,
checks stars and saved progress survive a reload, visits #chop and #dial (logged, not failed,
if those levels are missing), reports page/console errors and horizontal overflow, and saves
screenshots to tests/screenshots/game_{TAG}_{name}_{view}.png.
"""
import asyncio, sys, pathlib
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = sys.argv[1] if len(sys.argv) > 1 else (ROOT / "play.html").as_uri()
TAG = sys.argv[2] if len(sys.argv) > 2 else "en"
SHOTS = ROOT / "tests" / "screenshots"
SHOTS.mkdir(parents=True, exist_ok=True)
BASE = URL.split("#")[0]


async def overflow(pg):
    return await pg.evaluate("document.documentElement.scrollWidth - innerWidth")


async def main():
    log, fails = [], []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        views = [
            ("desk", {"width": 1440, "height": 900}, "light", "no-preference"),
            ("mob", {"width": 390, "height": 844}, "light", "no-preference"),
            ("dark", {"width": 1280, "height": 900}, "dark", "reduce"),
        ]
        for name, vp, scheme, motion in views:
            ctx = await b.new_context(viewport=vp, color_scheme=scheme, reduced_motion=motion)
            pg = await ctx.new_page()
            errs = []
            pg.on("pageerror", lambda e, n=name: errs.append(f"{n} PAGEERROR: {e}"))
            pg.on("console", lambda m, n=name: errs.append(f"{n} console.{m.type}: {m.text}")
                  if m.type == "error" and "ERR_FAILED" not in m.text else None)
            await pg.route("**/fonts.g*/**", lambda r: r.abort())
            shot_path = lambda tag: str(SHOTS / f"game_{TAG}_{tag}_{name}.png")

            async def snap(tag, pg=pg, shot_path=shot_path):
                # Full-page shots from the top, so the sticky header is drawn where it belongs.
                await pg.evaluate("window.scrollTo({top: 0, behavior: 'instant'})")
                await pg.wait_for_timeout(150)
                await pg.screenshot(path=shot_path(tag), full_page=True)

            # --- route map ---
            await pg.goto(BASE)
            await pg.wait_for_timeout(800)
            hops = await pg.evaluate("document.querySelectorAll('.g-route .g-hop').length")
            levels = await pg.evaluate("[...document.querySelectorAll('.g-hop-card[data-level]')].map(b=>b.dataset.level).join(',')")
            log.append(f"{name} map: {hops} hops, playable/registered: {levels}")
            if hops < 3:
                fails.append(f"{name}: route map has only {hops} hops")
            await snap("map")
            log.append(f"{name} overflow map {await overflow(pg)}")

            # --- Level 0: play to completion ---
            await pg.click(".g-hop-card[data-level='job']")
            await pg.wait_for_timeout(500)
            title = await pg.inner_text("#gLevelTitle")
            log.append(f"{name} level: {title} | focus on {await pg.evaluate('document.activeElement && document.activeElement.id')}")
            for rnd in range(6):
                opts = await pg.query_selector_all(".g-job-opt")
                if len(opts) != 4:
                    fails.append(f"{name}: round {rnd + 1} has {len(opts)} options")
                    break
                await opts[(rnd * 3 + 1) % 4].click()
                await pg.wait_for_timeout(950)
                if rnd == 1:
                    await snap("job_reveal")
                    log.append(f"{name} overflow reveal {await overflow(pg)}")
                    log.append(f"{name} feedback: {(await pg.inner_text('.g-job-feedback'))[:110]}")
                await pg.click(".g-job-nextbtn")
                await pg.wait_for_timeout(300)
            await pg.wait_for_timeout(900)
            res_visible = await pg.is_visible(".g-results")
            stars_on = await pg.evaluate("document.querySelectorAll('.g-results .g-stars.big .g-star.on').length")
            match = await pg.inner_text(".g-match-num") if res_visible else "-"
            summary = await pg.inner_text(".g-summary") if res_visible else "-"
            log.append(f"{name} job finished: results={res_visible} match={match} stars={stars_on} | {summary}")
            if not res_visible or stars_on < 1:
                fails.append(f"{name}: Level 0 did not show stars")
            await snap("job_done")
            log.append(f"{name} overflow done {await overflow(pg)}")

            # --- progress survives a reload ---
            saved = await pg.evaluate("(()=>{try{return localStorage.getItem('rs-game')}catch(e){return 'ERR '+e}})()")
            log.append(f"{name} saved: {saved}")
            await pg.goto(BASE + "#")
            await pg.reload()
            await pg.wait_for_timeout(700)
            restored = await pg.evaluate("document.querySelectorAll(\".g-hop-card[data-level='job'] .g-star.on\").length")
            log.append(f"{name} restored stars on map: {restored}")
            if restored < 1:
                fails.append(f"{name}: progress not restored after reload")
            nxt = await pg.evaluate("(()=>{const h=document.querySelector('.g-hop.is-open');return h?h.dataset.hop:'none'})()")
            log.append(f"{name} next open hop: {nxt}")
            await snap("map_after")

            # --- other levels (built by another agent; tolerate absence) ---
            for lid in ["chop", "dial"]:
                await pg.evaluate(f"location.hash = '#{lid}'")
                await pg.wait_for_timeout(1200)
                present = await pg.evaluate(f"!!document.querySelector(\".g-level[data-level='{lid}']\")")
                stage = await pg.evaluate(f"(()=>{{const s=document.querySelector(\".g-level[data-level='{lid}'] .g-stage\");return s?s.children.length:-1}})()")
                log.append(f"{name} #{lid}: level present={present}, stage children={stage}")
                await snap(lid)
                log.append(f"{name} overflow {lid} {await overflow(pg)}")

            # --- back button returns to the map ---
            await pg.go_back(); await pg.go_back(); await pg.wait_for_timeout(500)
            log.append(f"{name} after back x2: hash='{await pg.evaluate('location.hash')}'")

            log.extend(errs)
            await ctx.close()
        await b.close()
    print("\n".join(log))
    if fails:
        print("\nFAILURES:\n" + "\n".join(fails))
        sys.exit(1)
    print("\nOK")


asyncio.run(main())
