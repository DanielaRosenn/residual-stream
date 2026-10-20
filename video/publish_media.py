"""Prepare the rendered episodes for the guide: subtitles, posters and the list the page reads.

    python video/publish_media.py            # checks the GitHub release, then writes the files
    python video/publish_media.py --offline  # skip the release check (the guide may link a missing video)

For every episode in EPISODES whose MP4 exists in video/<folder>/out/, this writes:
  media/<stem>.vtt    WebVTT subtitles converted from the build's .srt
  media/<stem>.jpg    a 960x540 poster from the build's -thumb.png
and then js/videos-data.js, the list js/videos.js turns into a "Watch" card per chapter.

The MP4s themselves are not in the repo: they are assets of the GitHub release RELEASE_TAG
(see video/README.md). Without --offline, an episode is only listed when its MP4 is also on the
release, so the page never links a video that would 404. Needs ffmpeg/ffprobe on PATH and, without
--offline, the gh CLI logged in with access to the repo. Output is deterministic for the same inputs.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent  # video/ -> site root
MEDIA = ROOT / "media"
DATA_JS = ROOT / "js" / "videos-data.js"
REPO = "DanielaRosenn/residual-stream"
RELEASE_TAG = "media-v1"
RELEASE_URL = f"https://github.com/{REPO}/releases/download/{RELEASE_TAG}/"
POSTER_WIDTH = 960  # half of the 1920 px render: sharp on a chapter card, about 60 KB as JPEG
POSTER_QUALITY = 4  # ffmpeg mjpeg -q:v scale, 2 (best) .. 31 (worst); 4 keeps the captions readable

# Episode order follows the guide's layers. `section` is the chapter's id in index.html and
# he/index.html; `stem` is the build's output name (script.json "output") without ".mp4".
EPISODES: list[dict[str, str]] = [
    {"ep": "00", "folder": "next-word", "section": "start", "stem": "Residual-Stream-EP00-Start"},
    {"ep": "01", "folder": "history", "section": "history", "stem": "Residual-Stream-EP01-History"},
    {"ep": "02", "folder": "tokens", "section": "tokens", "stem": "Residual-Stream-EP02-Tokens"},
    {"ep": "03", "folder": "embeddings", "section": "embeddings", "stem": "Residual-Stream-EP03-Embeddings"},
    {"ep": "04", "folder": "position", "section": "position", "stem": "Residual-Stream-EP04-Position"},
    {"ep": "05", "folder": "attention", "section": "attention", "stem": "Residual-Stream-EP05-Attention"},
    {"ep": "06", "folder": "block", "section": "block", "stem": "Residual-Stream-EP06-Block"},
    {"ep": "07", "folder": "sampling", "section": "sampling", "stem": "Residual-Stream-EP07-Sampling"},
    {"ep": "08", "folder": "training", "section": "training", "stem": "Residual-Stream-EP08-Training"},
    {"ep": "09", "folder": "modern", "section": "modern", "stem": "Residual-Stream-EP09-Modern"},
    {"ep": "10", "folder": "interp", "section": "interp", "stem": "Residual-Stream-EP10-Interp"},
    {"ep": "11", "folder": "agents", "section": "agents", "stem": "Residual-Stream-EP11-Agents"},
]

SRT_TIME = re.compile(r"(\d\d:\d\d:\d\d),(\d\d\d)")


def srt_to_vtt(srt: str) -> str:
    """Return WebVTT text for an SRT file: header added, cue numbers dropped, commas in times -> dots."""
    out = ["WEBVTT", ""]
    for block in re.split(r"\r?\n\r?\n", srt.strip()):
        lines = block.splitlines()
        if lines and lines[0].strip().isdigit():
            lines = lines[1:]
        if not lines:
            continue
        lines[0] = SRT_TIME.sub(r"\1.\2", lines[0])
        out.extend(lines)
        out.append("")
    return "\n".join(out)


def duration_seconds(mp4: Path) -> float:
    """Return the container duration of `mp4` in seconds, as reported by ffprobe."""
    res = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(mp4)],
        capture_output=True, text=True, check=True,
    )
    return float(res.stdout.strip())


def make_poster(thumb: Path, dest: Path) -> None:
    """Write a POSTER_WIDTH-wide JPEG of `thumb` to `dest` (bit-exact flags keep reruns identical)."""
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-i", str(thumb), "-vf", f"scale={POSTER_WIDTH}:-2",
         "-q:v", str(POSTER_QUALITY), "-fflags", "+bitexact", "-flags:v", "+bitexact",
         "-map_metadata", "-1", str(dest)],
        check=True,
    )


def release_assets() -> set[str]:
    """Return the file names on the GitHub release RELEASE_TAG (raises if gh cannot reach it)."""
    res = subprocess.run(
        ["gh", "release", "view", RELEASE_TAG, "--repo", REPO, "--json", "assets", "--jq", ".assets[].name"],
        capture_output=True, text=True,
    )
    if res.returncode != 0:
        raise RuntimeError(f"gh release view failed ({res.returncode}): {res.stderr.strip()[:300]}")
    return set(res.stdout.split())


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--offline", action="store_true", help="do not check the GitHub release")
    args = parser.parse_args()

    on_release = None if args.offline else release_assets()
    MEDIA.mkdir(exist_ok=True)
    listed = []
    for ep in EPISODES:
        out = ROOT / "video" / ep["folder"] / "out"
        mp4 = out / f"{ep['stem']}.mp4"
        if not mp4.exists():
            print(f"skip EP {ep['ep']}: no {mp4.relative_to(ROOT)}")
            continue
        if on_release is not None and mp4.name not in on_release:
            print(f"skip EP {ep['ep']}: {mp4.name} is not on release {RELEASE_TAG} yet")
            continue
        srt = out / f"{ep['stem']}.srt"
        thumb = out / f"{ep['stem']}-thumb.png"
        (MEDIA / f"{ep['stem']}.vtt").write_text(srt_to_vtt(srt.read_text(encoding="utf-8")), encoding="utf-8", newline="\n")
        make_poster(thumb, MEDIA / f"{ep['stem']}.jpg")
        listed.append({"ep": ep["ep"], "section": ep["section"], "stem": ep["stem"],
                       "seconds": round(duration_seconds(mp4), 1)})
        print(f"EP {ep['ep']}: {ep['stem']} ({listed[-1]['seconds']} s)")

    body = json.dumps(listed, indent=2, ensure_ascii=False)
    DATA_JS.write_text(
        "// Generated by video/publish_media.py. Do not edit by hand; re-run the script.\n"
        f"// Videos are assets of the GitHub release {RELEASE_TAG}; subtitles and posters are in media/.\n"
        f"window.RS_VIDEO_BASE = {json.dumps(RELEASE_URL)};\n"
        f"window.RS_VIDEOS = {body};\n",
        encoding="utf-8", newline="\n",
    )
    print(f"wrote {DATA_JS.relative_to(ROOT)} with {len(listed)} episodes")
    return 0


if __name__ == "__main__":
    sys.exit(main())
