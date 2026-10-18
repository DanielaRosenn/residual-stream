import asyncio, sys
from playwright.async_api import async_playwright
import pathlib, os
ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = sys.argv[1] if len(sys.argv)>1 else (ROOT / "index.html").as_uri()
TAG = sys.argv[2] if len(sys.argv)>2 else "en"
SECTIONS = ["start","history","tokens","embeddings","position","attention","paper","block","sampling","training","modern","interp","agents","playground","quiz","reading"]
async def clip(pg, sid, path, vw):
    box = await pg.evaluate(f"(()=>{{const e=document.getElementById('{sid}');if(!e)return null;const r=e.getBoundingClientRect();return [r.top+scrollY, r.height]}})()")
    if not box or box[1] < 1: return False
    await pg.screenshot(path=path, full_page=True, clip={"x":0,"y":box[0],"width":vw,"height":min(box[1],9000)})
    return True
async def set_mode(pg, mode):
    # Click whichever copy of the Simple/Deep toggle is visible at this viewport (topbar on mobile, corner on desktop).
    await pg.locator(f'.mode-toggle button[data-mode-set="{mode}"] >> visible=true').first.click()
    await pg.wait_for_timeout(300)
    return await pg.evaluate("document.documentElement.dataset.mode")
SHOTS = ROOT / "tests" / "screenshots"
SHOTS.mkdir(parents=True, exist_ok=True)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); log=[]
        for name,vp,scheme in [("desk",{"width":1440,"height":900},"light"),("mob",{"width":390,"height":844},"light"),("dark",{"width":1280,"height":900},"dark")]:
            ctx = await b.new_context(viewport=vp, color_scheme=scheme); pg = await ctx.new_page()
            pg.on("pageerror", lambda e, n=name: log.append(f"{n} PAGEERROR: {e}"))
            pg.on("console", lambda m, n=name: log.append(f"{n} {m.type}: {m.text}") if m.type=="error" and "ERR_FAILED" not in m.text else None)
            await pg.route("**/fonts.g*/**", lambda r: r.abort())
            await pg.goto(URL); await pg.wait_for_timeout(1000)
            # ---- Simple mode (the default): screenshots + overflow, before anything is clicked ----
            log.append(f"{name} default mode: {await pg.evaluate('document.documentElement.dataset.mode')}")
            for sid in SECTIONS:
                if not await clip(pg, sid, str(SHOTS / f"{TAG}_{name}_simple_{sid}.png"), vp["width"]): log.append(f"{name} simple: no section #{sid}")
            log.append(f"{name} simple overflow {await pg.evaluate('document.documentElement.scrollWidth - innerWidth')}")
            hidden = await pg.evaluate("Array.from(document.querySelectorAll('section.chapter')).filter(s=>{const p=s.querySelector('.panel');return p&&p.getClientRects().length===0}).map(s=>s.id).join(',')")
            log.append(f"{name} simple: sections whose first panel is hidden: [{hidden}]")
            # Scroll anchoring: switching mode mid-chapter must keep that chapter's top where it was.
            await pg.evaluate("document.getElementById('sampling').scrollIntoView({behavior:'instant'})"); await pg.wait_for_timeout(200)
            y0 = await pg.evaluate("document.getElementById('sampling').getBoundingClientRect().top")
            # ---- Deep mode: every demo is visible; the existing interactions run here ----
            log.append(f"{name} mode after toggle: {await set_mode(pg, 'deep')}")
            y1 = await pg.evaluate("document.getElementById('sampling').getBoundingClientRect().top")
            log.append(f"{name} anchor drift simple->deep: {round(y1-y0)}px")
            # interactions
            await pg.click("#trainGo"); await pg.wait_for_timeout(4500)
            log.append(name+" train: "+await pg.inner_text("#trainStat"))
            await pg.fill("#sT","0"); await pg.dispatch_event("#sT","input")
            log.append(name+" T0: "+await pg.inner_text("#sEntropy"))
            await pg.fill("#sT","1"); await pg.dispatch_event("#sT","input")
            await pg.fill("#sP","0.5"); await pg.dispatch_event("#sP","input")
            await pg.click("#sMany"); log.append(name+" topp: "+await pg.inner_text("#sampTally"))
            for _ in range(3): await pg.click("#mathNext")
            for _ in range(5): await pg.click("#blkNext")
            await pg.click("#adjSeg button:nth-child(2)")
            log.append(name+" attn: "+await pg.inner_text("#headDesc"))
            await pg.click("#quizBox .q-item:first-child .q-opts button:first-child")
            log.append(name+" quiz: "+await pg.inner_text("#quizScore"))
            for _ in range(3): await pg.click("#kvStep")
            log.append(name+" kv: "+await pg.inner_text("#kvStat"))
            await pg.click("#stages li:nth-child(3) button")
            await pg.fill("#lensL","12"); await pg.dispatch_event("#lensL","input")
            log.append(name+" lens: "+await pg.inner_text("#lensPick"))
            await pg.click("#supSeg button:nth-child(3)")
            log.append(name+" sup: "+await pg.inner_text("#supNote"))
            await pg.fill("#steerA","9"); await pg.dispatch_event("#steerA","input")
            log.append(name+" steer: "+await pg.inner_text("#steerText"))
            await pg.fill("#steerA","4"); await pg.dispatch_event("#steerA","input")
            log.append(name+" steer4: "+await pg.inner_text("#steerPick"))
            await pg.click("#patchGrid button[aria-label^='"+("שכבה" if TAG=="he" else "layer")+" 3,']")
            log.append(name+" patch: "+(await pg.inner_text("#patchInfo"))[:120])
            for _ in range(8): await pg.click("#agNext") if not await pg.is_disabled("#agNext") else None
            log.append(name+" gate visible: "+str(await pg.is_visible("#agGate")))
            await pg.click("#agReject")
            log.append(name+" gate visible after reject (expect False): "+str(await pg.is_visible("#agGate")))
            await pg.click("#agNext"); await pg.click("#agApprove"); await pg.click("#agNext")
            log.append(name+" agent: "+await pg.inner_text("#agStats")+" | btn="+await pg.inner_text("#agNext"))
            await pg.fill("#relN","20"); await pg.dispatch_event("#relN","input")
            log.append(name+" rel: "+await pg.inner_text("#relOut"))
            log.append(name+" hero: "+await pg.inner_text("#heroOut"))
            log.append(name+" bpe: "+(await pg.inner_text("#bpeStats"))[:90])
            log.append(name+" sample: "+(await pg.inner_text("#trainSample"))[:60])
            n = await pg.evaluate("document.querySelectorAll('#quizBox .q-item').length")
            log.append(name+f" quiz items: {n}")
            # ---- Try-it features: sentence chooser, word finder, extra attention sentences, challenge cards, playground ----
            try:
                await pg.select_option("#sampPrompt","4"); await pg.click("#sMany")
                log.append(name+" samp prompt 4: "+(await pg.inner_text("#sampTally"))[:60]); await pg.select_option("#sampPrompt","0")
                await pg.fill("#embFind","zebra"); await pg.press("#embFind","Enter")
                log.append(name+f" emb not-found chips: {await pg.locator('#embFindMsg .ty-chip').count()}")
                await pg.fill("#embFind","Queen"); await pg.click("#embFindGo")
                log.append(name+" emb find: "+(await pg.inner_text("#embInfo"))[:50])
                await pg.click("#sentSeg button:nth-child(2)"); log.append(name+" attn sentence 2: "+(await pg.inner_text("#headDesc"))[:70])
                await pg.click("#sentSeg button:nth-child(1)")
                await pg.click("#ch-tokens-guess .ch-opt[data-i='1']"); await pg.click("#ch-agents-check .ch-opt[data-i='0']")
                log.append(name+f" challenges: {await pg.locator('.ch-card').count()} cards | "+await pg.inner_text("#ch-progress .ch-progress-text"))
                for f in ("#pgFact0","#pgFact1","#pgFact2"): await pg.check(f)
                await pg.click("#pgRole button[data-value=friendly]")
                await pg.wait_for_selector("#pgAnswer[data-typing=false]", timeout=20000)
                log.append(name+" playground: made="+str(await pg.get_attribute("#pgHint","data-made"))+" score="+str(await pg.get_attribute("#pgHint","data-score"))+" | "+(await pg.inner_text("#pgAnswer"))[:70])
                # Video cards: count them, open one, and check the player points at the release and the local subtitles.
                vids = await pg.locator(".vid-card").count()
                await pg.click("#vid-tokens .vid-play")
                src = await pg.get_attribute("#vid-tokens video source", "src")
                trk = await pg.get_attribute("#vid-tokens video track", "src")
                await pg.evaluate("document.querySelector('#vid-tokens video').pause()")
                log.append(f"{name} videos: {vids} cards | {src} | {trk}")
            except Exception as e: log.append(f"{name} TRYIT ERROR: {str(e)[:300]}")
            for sid in SECTIONS:
                if not await clip(pg, sid, str(SHOTS / f"{TAG}_{name}_{sid}.png"), vp["width"]): log.append(f"{name} deep: no section #{sid}")
            log.append(f"{name} overflow {await pg.evaluate('document.documentElement.scrollWidth - innerWidth')}")
            # ---- Back to Simple via the keyboard (radio group: arrow key), then a teaser button back to Deep ----
            await pg.locator('.mode-toggle button[data-mode-set="deep"] >> visible=true').first.focus()
            await pg.keyboard.press("ArrowLeft" if TAG!="he" else "ArrowRight"); await pg.wait_for_timeout(300)
            log.append(f"{name} mode after arrow key: {await pg.evaluate('document.documentElement.dataset.mode')}")
            log.append(f"{name} simple overflow (after interactions) {await pg.evaluate('document.documentElement.scrollWidth - innerWidth')}")
            t = pg.locator("#attention .mode-teaser .mode-jump"); await t.scroll_into_view_if_needed()
            ty = await pg.evaluate("document.querySelector('#attention .mode-teaser').getBoundingClientRect().top")
            await t.click(); await pg.wait_for_timeout(300)
            hy = await pg.evaluate("document.querySelector('#attention .mode-teaser').nextElementSibling.getBoundingClientRect().top")
            log.append(f"{name} teaser -> mode {await pg.evaluate('document.documentElement.dataset.mode')}, landing drift {round(hy-ty)}px, saved={await pg.evaluate('localStorage.getItem(String.fromCharCode(114,115,45,109,111,100,101))')}")
            await ctx.close()
        await b.close(); print("\n".join(log))
asyncio.run(main())
