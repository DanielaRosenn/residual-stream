import asyncio, sys
from playwright.async_api import async_playwright
import pathlib, os
ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = sys.argv[1] if len(sys.argv)>1 else (ROOT / "index.html").as_uri()
TAG = sys.argv[2] if len(sys.argv)>2 else "en"
async def clip(pg, sid, path, vw):
    box = await pg.evaluate(f"(()=>{{const r=document.getElementById('{sid}').getBoundingClientRect();return [r.top+scrollY, r.height]}})()")
    await pg.screenshot(path=path, full_page=True, clip={"x":0,"y":box[0],"width":vw,"height":min(box[1],4200)})
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
            await pg.click("#agReject"); await pg.click("#agApprove"); await pg.click("#agNext")
            log.append(name+" agent: "+await pg.inner_text("#agStats")+" | btn="+await pg.inner_text("#agNext"))
            await pg.fill("#relN","20"); await pg.dispatch_event("#relN","input")
            log.append(name+" rel: "+await pg.inner_text("#relOut"))
            log.append(name+" hero: "+await pg.inner_text("#heroOut"))
            log.append(name+" bpe: "+(await pg.inner_text("#bpeStats"))[:90])
            log.append(name+" sample: "+(await pg.inner_text("#trainSample"))[:60])
            n = await pg.evaluate("document.querySelectorAll('#quizBox .q-item').length")
            log.append(name+f" quiz items: {n}")
            for sid in ["start","history","tokens","embeddings","position","attention","block","sampling","training","modern","interp","agents","quiz","reading"]:
                await clip(pg, sid, str(SHOTS / f"{TAG}_{name}_{sid}.png"), vp["width"])
            log.append(f"{name} overflow {await pg.evaluate('document.documentElement.scrollWidth - innerWidth')}")
            await ctx.close()
        await b.close(); print("\n".join(log))
asyncio.run(main())
