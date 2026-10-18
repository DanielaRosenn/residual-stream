# Explainer videos

One short narrated episode per guide chapter. Toki (a token, the learner) asks; Vera (the guide)
explains. Each episode is 60 to 130 seconds, in English, with subtitles. The guide shows a
"Watch" card at the top of each chapter that has one (`js/videos.js`).

| Episode | Folder | Chapter (`id` in `index.html`) |
|---|---|---|
| EP 00 · Start | `next-word/` | `start` |
| EP 01 · How it began | `history/` | `history` |
| EP 02 · Tokens | `tokens/` | `tokens` |
| EP 03 · Embeddings | `embeddings/` | `embeddings` |
| EP 04 · Position | `position/` | `position` |
| EP 05 · Attention | `attention/` | `attention` |
| EP 06 · The block | `block/` | `block` |
| EP 07 · Sampling | `sampling/` | `sampling` |
| EP 08 · Training | `training/` | `training` |
| EP 09 · Modern LLMs | `modern/` | `modern` |
| EP 10 · Inside the box | `interp/` | `interp` |
| EP 11 · Agents | `agents/` | `agents` |

## How an episode is built

Each folder is built with the `flow-show-video` skill's engine (`~/.claude/skills/flow-show-video`),
copied into the folder as `engine/` and `build.py` by the skill's `new_episode.py`:

- `script.json`: the dialogue, voices, brand line and output file name.
- `episode.html`: the scenes; animation is a pure function of time, tied to the dialogue.
- `capture_shots.py`: takes the real screenshots in `shots/` from the local guide with Playwright.
- `README.md` in the folder (where present): what is real and what is illustrative, and build notes.

Needs Python with `edge-tts` and `playwright`, `ffmpeg`/`ffprobe` on PATH, and internet for the
voices. On Windows set `PYTHONUTF8=1`. From an episode folder:

```powershell
python build.py tts          # voices and timeline.js
python build.py sheet lines  # out/contact.png, one still per spoken line, to review the layout
python build.py video        # out/<name>.mp4 with .srt, -chapters.txt and -thumb.png; several minutes
```

`out/` and `timeline.js` are generated and git-ignored.

## Publishing

The MP4s are too large for the repo. They are assets of the GitHub release `media-v1` on
`DanielaRosenn/residual-stream`, and the page streams them from there:

```powershell
gh release upload media-v1 video/<folder>/out/<name>.mp4 --repo DanielaRosenn/residual-stream --clobber
python video/publish_media.py
```

`publish_media.py` (the script that generates these files) writes:

- `media/<name>.vtt`: subtitles, converted from the build's `.srt`.
- `media/<name>.jpg`: a 960 px poster from the build's thumbnail.
- `js/videos-data.js`: the list of episodes the guide shows.

It only lists an episode whose MP4 is already on the release, so the page never links a missing
file. `--offline` skips that check. Commit the regenerated `media/` files and `js/videos-data.js`
together, then run `tests/qa.py` on both languages.

## Known limits

- The narration is synthetic (Microsoft neural voices via `edge-tts`). Pronunciation was checked
  by reading timings and subtitles, not by listening.
- The Hebrew guide shows the same English videos, and its card says so.
- Subtitles are same-origin files. They load on GitHub Pages or a local server, but not when
  `index.html` is opened straight from disk (`file://`), because browsers block tracks there.
