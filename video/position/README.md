# EP 04 · Position (explainer video)

A short narrated explainer (about 90 s) for the guide's "Position" chapter (`index.html`, `id="position"`):
why attention alone cannot see word order, the original sine/cosine pattern, why nearby positions look
alike (distance, not absolute place), RoPE, and one line on stretching position for long contexts.
Toki asks, Vera explains. Part of the per-chapter series in `video/`.

## Files

| File | What |
|---|---|
| `script.json` | the dialogue (`text` is the caption, `say` is what the voice reads), voices, output name |
| `episode.html` | the six scenes and their per-frame animation; overrides the engine palette with the site's colours |
| `capture_shots.py` | takes the real 1920x1080 screenshots in `shots/` from the local `index.html` with Playwright (switches to Deep mode first, since the RoPE panel is deep-only) |
| `shots/` | `01`-`03` the sinusoidal heatmap and similarity curve with "Compare position" at 20, 0 and 45; `04`-`07` the RoPE circles at token position 0, 3, 12 and 40 |
| `engine/`, `build.py` | copied from the `flow-show-video` skill by `new_episode.py`; do not edit here |
| `timeline.js`, `out/` | generated, git-ignored |

## Rebuild

Needs Python with `edge-tts` and `playwright`, `ffmpeg`/`ffprobe` on PATH, and internet for the voices.
Run from this folder:

```powershell
python capture_shots.py        # only if the chapter changed; also writes out/shots-data.json (panel rectangles, similarity values, RoPE angle labels)
python build.py tts            # voices -> out/voice/ + out/narration.m4a, timeline.js
python build.py sheet          # out/contact.png, one still per scene
python build.py sheet lines    # one still per spoken line
python build.py video          # out/Residual-Stream-EP04-Position.mp4 (+ .srt, -chapters.txt, -thumb.png)
```

The render takes several minutes; run it in the background with output to a file.

## What is real and what is illustrative

- Real (labelled REAL DEMO): the heatmap (scene 2), the similarity curves for positions 20 and 45
  (scene 3; the 45 curve is the 20 curve shifted by 25, as `out/shots-data.json` shows), the RoPE
  circles and their angle labels (scene 4).
- Illustrative and labelled on screen: the clock (scene 2), the query/key gap dial (scene 4), the
  stretched wave (scene 5). Scene 1's "dog bites man" tiles are a drawing of the chapter's own example.
