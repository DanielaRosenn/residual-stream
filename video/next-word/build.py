"""Build a Flow Show episode from script.json + episode.html in this folder.

    python build.py tts              voices -> timeline.js + out/narration.m4a (+ voice QA warnings)
    python build.py sheet            one still per scene -> out/stills/ + out/contact.png
    python build.py sheet lines      one still per spoken line -> out/stills/ + out/contact.png
    python build.py stills 5,40,90   PNG previews at those seconds -> out/still_*.png
    python build.py video            frames + narration -> out/<output>.mp4, then extras
    python build.py extras           out/<name>.srt, out/<name>-chapters.txt, out/<name>-thumb.png
    python build.py all              tts, then video

Voices come from edge-tts (Microsoft neural voices; needs internet). Clips are cached in
out/voice/ by a hash of voice, rate, pitch and text, so re-running only regenerates changed lines.

Optional background music: add "music": {"file": "music/bed.mp3", "volume": 0.18} to script.json
(path relative to this folder). It loops to length, fades in and out, and ducks under the voices.
"""
import array
import asyncio
import hashlib
import json
import math
import re
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE / "out"
VOICE_DIR = OUT / "voice"
STILLS = OUT / "stills"
SCRIPT = HERE / "script.json"
PAGE = HERE / "episode.html"
TIMELINE = HERE / "timeline.js"
NARRATION = OUT / "narration.m4a"
SILENT = OUT / "video-silent.mp4"

FPS = 30
LEAD = 0.7      # seconds before the first line of a scene
GAP = 0.4       # seconds between lines
TAIL = 0.9      # seconds after the last line of a scene
ENV_RATE = 8000
MIN_CHAPTER = 10  # YouTube ignores chapter lists with a chapter shorter than this


def run(cmd, **kw):
    return subprocess.run(cmd, check=True, **kw)


def load_script():
    return json.loads(SCRIPT.read_text(encoding="utf-8-sig"))


def final_path():
    return OUT / (load_script().get("output") or f"{HERE.name}.mp4")


def load_timeline():
    if not TIMELINE.exists():
        sys.exit("Run 'python build.py tts' first.")
    return json.loads(re.sub(r"^window\.TL = |;\s*$", "", TIMELINE.read_text(encoding="utf-8")))


def duration(path):
    out = run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
               "-of", "default=nw=1:nk=1", str(path)], capture_output=True, text=True).stdout
    return float(out.strip())


def envelope(path):
    """Per-frame loudness (0-1) of a clip, used to drive the characters' mouths."""
    raw = run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(ENV_RATE),
               "-f", "s16le", "-"], capture_output=True).stdout
    samples = array.array("h", raw)
    step = ENV_RATE // FPS
    rms = []
    for i in range(0, len(samples), step):
        chunk = samples[i:i + step]
        rms.append(math.sqrt(sum(s * s for s in chunk) / max(1, len(chunk))) if chunk else 0.0)
    peak = max(rms) or 1.0
    return [round(min(1.0, (v / peak) * 1.4), 2) for v in rms]


def voice_warnings(scene_id, line, dur, env):
    """Flag clips that look like a failed or garbled synthesis. Spelled acronyms ("A I") and
    deliberate pauses produce mild outliers, so the bounds are wide on purpose."""
    words = len(line["text"].split())
    rate = words / max(dur, 0.01)
    silent = best = 0
    for v in env:
        silent = silent + 1 if v < 0.03 else 0
        best = max(best, silent)
    issues = []
    # short banter lines ("And then?") are naturally quick once silence is trimmed
    if rate < 1.3 or rate > (6.5 if words < 12 else 5.0):
        issues.append(f"{rate:.1f} words/s")
    if best > 1.5 * FPS:
        issues.append(f"{best / FPS:.1f}s of silence inside the clip")
    if issues:
        print(f"  check {scene_id} {line['who']}: {'; '.join(issues)} | {line['text'][:60]}")


async def synth(text, cfg, target):
    import edge_tts
    comm = edge_tts.Communicate(text, cfg["voice"], rate=cfg["rate"], pitch=cfg["pitch"])
    await comm.save(str(target))


def tts():
    VOICE_DIR.mkdir(parents=True, exist_ok=True)
    script = load_script()
    voices = script["voices"]
    clips, scenes, t = [], [], 0.0
    for scene in script["scenes"]:
        start, lt, lines = t, LEAD, []
        for line in scene["lines"]:
            if line["who"] not in voices:
                sys.exit(f"scene {scene['id']}: no voice configured for {line['who']}")
            cfg = voices[line["who"]]
            say = line.get("say", line["text"])
            key = hashlib.sha1(json.dumps([cfg, say]).encode()).hexdigest()[:12]
            raw = VOICE_DIR / f"{scene['id']}_{key}.mp3"
            clip = VOICE_DIR / f"{scene['id']}_{key}.wav"
            if not raw.exists():
                print(f"voice {line['who']}: {say[:60]}", flush=True)
                asyncio.run(synth(say, cfg, raw))
            if not clip.exists():
                trim = "silenceremove=start_periods=1:start_threshold=-45dB"
                run(["ffmpeg", "-v", "error", "-y", "-i", str(raw), "-af",
                     f"{trim},areverse,{trim},areverse", "-ar", "48000", str(clip)])
            d = duration(clip)
            env = envelope(clip)
            voice_warnings(scene["id"], line, d, env)
            lines.append({"who": line["who"], "text": line["text"], "start": round(start + lt, 3),
                          "end": round(start + lt + d, 3), "env": env})
            clips.append((clip, start + lt))
            lt += d + GAP
        end = start + lt - GAP + TAIL
        entry = {"id": scene["id"], "start": round(start, 3), "end": round(end, 3), "lines": lines}
        if "cast" in scene:
            entry["cast"] = scene["cast"]
        scenes.append(entry)
        t = end
    total = round(t, 3)
    timeline = {"total": total, "fps": FPS, "brand": script.get("brand", ""), "scenes": scenes}
    if "cast" in script:
        timeline["cast"] = script["cast"]
    TIMELINE.write_text("window.TL = " + json.dumps(timeline) + ";\n", encoding="utf-8")

    cmd = ["ffmpeg", "-v", "error", "-y"]
    for clip, _ in clips:
        cmd += ["-i", str(clip)]
    delays = "".join(f"[{i}:a]adelay={int(at * 1000)}:all=1[a{i}];" for i, (_, at) in enumerate(clips))
    mix = "".join(f"[a{i}]" for i in range(len(clips)))
    graph = delays + f"{mix}amix=inputs={len(clips)}:normalize=0,apad,atrim=0:{total}"
    music = script.get("music")
    if music:
        track = (HERE / music["file"]).resolve()
        if not track.exists():
            sys.exit(f"music file not found: {track}")
        cmd += ["-stream_loop", "-1", "-i", str(track)]
        m, vol = len(clips), music.get("volume", 0.18)
        graph += (f",asplit=2[v1][v2];[{m}:a]atrim=0:{total},aresample=48000,volume={vol},"
                  f"afade=t=in:d=2,afade=t=out:st={max(0, total - 3)}:d=3[m];"
                  f"[m][v2]sidechaincompress=threshold=0.02:ratio=10:attack=15:release=600[md];"
                  f"[v1][md]amix=inputs=2:normalize=0")
    graph += ",loudnorm=I=-16:TP=-1.5:LRA=11[out]"
    run(cmd + ["-filter_complex", graph, "-map", "[out]", "-ar", "48000",
               "-c:a", "aac", "-b:a", "192k", str(NARRATION)])
    print(f"timeline: {len(scenes)} scenes, {len(clips)} lines, {total:.1f} s" + (" + music" if music else ""))


def open_page(p):
    for channel in ("msedge", "chrome", None):
        try:
            browser = p.chromium.launch(channel=channel) if channel else p.chromium.launch()
            break
        except Exception:
            continue
    else:
        sys.exit("No Chromium-based browser found (tried Edge, Chrome, bundled Chromium).")
    page = browser.new_page(viewport={"width": 1920, "height": 1080}, device_scale_factor=1)
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(PAGE.as_uri() + "?render=1")
    if errors or not page.evaluate("typeof seek === 'function'"):
        browser.close()
        sys.exit("episode.html failed to load:\n  " + "\n  ".join(errors or ["seek() is not defined - was Stage.start() called?"]))
    page.evaluate("document.fonts.ready")
    page.wait_for_function("[...document.images].every(i => i.complete && i.naturalWidth > 0)")
    return browser, page


def stills(seconds):
    from playwright.sync_api import sync_playwright
    OUT.mkdir(exist_ok=True)
    with sync_playwright() as p:
        browser, page = open_page(p)
        for s in seconds:
            page.evaluate(f"seek({s})")
            page.screenshot(path=str(OUT / f"still_{s:05.1f}.png"))
        browser.close()


def sheet(mode="scenes"):
    """Stills tiled into out/contact.png. 'scenes': one per scene just before it ends (everything
    revealed). 'lines': one per spoken line, at the end of that line - catches mid-scene problems
    such as camera moves and elements that overlap only while another is still on screen."""
    from playwright.sync_api import sync_playwright
    shutil.rmtree(STILLS, ignore_errors=True)
    STILLS.mkdir(parents=True)
    tl = load_timeline()
    if mode == "lines":
        shots = [(f"{s['id']}#{i}", min(l["end"] + 0.2, s["end"] - 0.3))
                 for s in tl["scenes"] for i, l in enumerate(s["lines"])]
    else:
        shots = [(s["id"], s["end"] - 0.6) for s in tl["scenes"]]
    with sync_playwright() as p:
        browser, page = open_page(p)
        for i, (label, at) in enumerate(shots):
            page.evaluate(f"seek({at})")
            page.screenshot(path=str(STILLS / f"{i:02d}.png"))
            print(f"still {i:02d} = {label} at {at:.1f}s")
        browser.close()
    cols = 2 if len(shots) <= 6 else (3 if len(shots) <= 15 else 4)
    rows = math.ceil(len(shots) / cols)
    run(["ffmpeg", "-v", "error", "-y", "-framerate", "1", "-i", str(STILLS / "%02d.png"),
         "-vf", f"scale={960 if cols <= 3 else 720}:-1,tile={cols}x{rows}", "-frames:v", "1", str(OUT / "contact.png")])
    print(f"Wrote {OUT / 'contact.png'}")


def stamp(t, srt=False):
    h, rem = divmod(t, 3600)
    m, s = divmod(rem, 60)
    if srt:
        return f"{int(h):02d}:{int(m):02d}:{int(s):02d},{int(round((s % 1) * 1000)) % 1000:03d}"
    return f"{int(h)}:{int(m):02d}:{int(s):02d}" if h else f"{int(m)}:{int(s):02d}"


def extras():
    """Publishing kit next to the video: subtitles, YouTube chapters and a thumbnail."""
    from playwright.sync_api import sync_playwright
    tl = load_timeline()
    base = final_path().with_suffix("")
    cues = [l for s in tl["scenes"] for l in s["lines"]]
    srt = "".join(f"{i}\n{stamp(l['start'], True)} --> {stamp(l['end'], True)}\n{l['who'].title()}: {l['text']}\n\n"
                  for i, l in enumerate(cues, 1))
    Path(f"{base}.srt").write_text(srt, encoding="utf-8")

    with sync_playwright() as p:
        browser, page = open_page(p)
        titles = page.evaluate("""TL.scenes.map(s => {
            const h = document.getElementById(s.id).querySelector('.t-title, .big, .title');
            if (!h) return s.id;
            const c = h.cloneNode(true); c.querySelectorAll('small').forEach(x => x.remove());
            return c.textContent.replace(/\\s+/g, ' ').trim();
        })""")
        first = tl["scenes"][0]
        page.evaluate(f"seek({first['end'] - 0.6}); document.getElementById('cap').style.opacity = 0")
        page.screenshot(path=f"{base}-thumb-full.png")
        browser.close()
    run(["ffmpeg", "-v", "error", "-y", "-i", f"{base}-thumb-full.png", "-vf", "scale=1280:720",
         f"{base}-thumb.png"])
    Path(f"{base}-thumb-full.png").unlink(missing_ok=True)

    # Merge any scene shorter than MIN_CHAPTER into the chapter before it (the first one forward).
    chapters = []
    for s, title in zip(tl["scenes"], titles):
        if chapters and (s["end"] - s["start"] < MIN_CHAPTER or title == chapters[-1][1]):
            continue
        chapters.append([s["start"], title])
    chapters[0][0] = 0
    if len(chapters) > 1 and tl["total"] - chapters[-1][0] < MIN_CHAPTER:
        chapters.pop()
    Path(f"{base}-chapters.txt").write_text("\n".join(f"{stamp(t)} {title}" for t, title in chapters) + "\n",
                                            encoding="utf-8")
    print(f"Wrote {base}.srt, {base}-chapters.txt ({len(chapters)} chapters), {base}-thumb.png")


def video():
    from playwright.sync_api import sync_playwright
    if not TIMELINE.exists() or not NARRATION.exists():
        sys.exit("Run 'python build.py tts' first.")
    final = final_path()
    with sync_playwright() as p:
        browser, page = open_page(p)
        total = page.evaluate("TL.total")
        frames = int(total * FPS)
        enc = subprocess.Popen(
            ["ffmpeg", "-v", "error", "-y", "-f", "image2pipe", "-framerate", str(FPS),
             "-c:v", "mjpeg", "-i", "-", "-c:v", "libx264", "-preset", "slow", "-crf", "18",
             "-pix_fmt", "yuv420p", str(SILENT)],
            stdin=subprocess.PIPE)
        for i in range(frames):
            page.evaluate(f"seek({i / FPS})")
            enc.stdin.write(page.screenshot(type="jpeg", quality=94))
            if i % (FPS * 10) == 0:
                print(f"{i}/{frames} frames", flush=True)
        enc.stdin.close()
        enc.wait()
        browser.close()
    if enc.returncode != 0:
        sys.exit(f"ffmpeg failed with exit code {enc.returncode}")
    run(["ffmpeg", "-v", "error", "-y", "-i", str(SILENT), "-i", str(NARRATION),
         "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "copy", "-shortest",
         "-movflags", "+faststart", str(final)])
    SILENT.unlink(missing_ok=True)
    print(f"Wrote {final} ({total:.1f} s)")
    extras()


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "all"
    if cmd == "tts":
        tts()
    elif cmd == "sheet":
        sheet(sys.argv[2] if len(sys.argv) > 2 else "scenes")
    elif cmd == "stills":
        stills([float(s) for s in sys.argv[2].split(",")])
    elif cmd == "video":
        video()
    elif cmd == "extras":
        extras()
    elif cmd == "all":
        tts()
        video()
    else:
        sys.exit(__doc__)
