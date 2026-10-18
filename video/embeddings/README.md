# EP 03 · Embeddings ("Tokens become vectors")

A 90-second explainer for the guide's **Embeddings** chapter (`index.html`, section `id="embeddings"`),
one episode of The Residual Stream video series. Toki (the token) asks, Vera (the guide) explains:
a token ID is just a row number, the row is a learned vector, similar use ends up nearby, directions
mean things (king − man + woman ≈ queen on the guide's toy map), and similarity is a dot product.

Built with the `flow-show-video` skill's engine (`~/.claude/skills/flow-show-video`).

## Files

| File | What it is |
|---|---|
| `script.json` | Dialogue, voices (VERA `en-GB-SoniaNeural` +18%, TOKI `en-US-BrianNeural` +20% +4Hz), brand and output name |
| `episode.html` | The six scenes and their per-frame animation; overrides the engine palette with the site's colours |
| `capture_shots.py` | Takes the real screenshots in `shots/` from the local `index.html` (Playwright, dark theme, Simple mode) and writes `out/shots-data.json` with what the demo printed |
| `shots/` | 1920x1080 screenshots of the Embeddings demo (toy map, word finder, analogy row) |
| `engine/`, `build.py` | Copied from the skill by `new_episode.py`; do not edit here |
| `timeline.js`, `out/` | Generated, git-ignored |

## How to rebuild

Needs Python with `edge-tts` and `playwright`, `ffmpeg`/`ffprobe` on PATH, and internet for the voices.
On Windows set `PYTHONUTF8=1`.

```bash
python capture_shots.py      # only if the Embeddings demo changed: refresh shots/ and out/shots-data.json
python build.py tts          # voices + timeline.js (only changed lines are re-synthesised)
python build.py sheet        # out/contact.png, one still per scene
python build.py sheet lines  # out/contact.png, one still per spoken line
python build.py video        # several minutes; run in the background
```

Output lands in `out/`: `Residual-Stream-EP03-Embeddings.mp4`, plus `.srt` subtitles,
`-chapters.txt` (YouTube chapters) and `-thumb.png` (1280x720). To refresh the engine, re-run
`python <skill>/scripts/new_episode.py <this folder>`.

## What is real and what is illustrative

- Real: the toy map, the word finder and the analogy row are screenshots of the guide's own demo;
  the vectors and sums on screen (king, man, woman, queen; cat · dog = 32.5, cat · Paris = −8.3) are
  computed from the vectors in `js/embeddings.js`. The map itself is hand-built, and the video says so.
- Illustrative (labelled on screen): the table rows in scene 1 and the training cartoon in scene 2.
  Token ID 69 for "cat" comes from the guide's demo tokenizer (see `video/tokens/out/shots-data.json`).
