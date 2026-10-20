# EP 06 · The block (explainer video)

A short narrated explainer for the guide's "The block" chapter (`index.html`, `id="block"`):
one block stacked many times, the residual stream (read, compute, add back), attention as the only
place tokens interact, the MLP, why residual connections and norms matter, and the parameter
calculator. Toki asks, Vera explains. Part of the per-chapter series in `video/`.

## Files

| File | What |
|---|---|
| `script.json` | the dialogue (`text` is the caption, `say` is what the voice reads), voices, output name |
| `episode.html` | the seven scenes and their per-frame animation; overrides the engine palette with the site's colours |
| `capture_shots.py` | takes the real 1920x1080 screenshots in `shots/` from the local `index.html` with Playwright |
| `shots/` | `01`-`08` the block walkthrough stages (clicking `#blkNext`), `09` the calculator on Llama 3 8B (Deep mode), `10` the chapter's deep text |
| `engine/`, `build.py` | copied from the `flow-show-video` skill by `new_episode.py`; do not edit here |
| `timeline.js`, `out/` | generated, git-ignored |

## Rebuild

Needs Python with `edge-tts` and `playwright`, `ffmpeg`/`ffprobe` on PATH, and internet for the voices.
Run from this folder:

```powershell
python capture_shots.py        # only if the chapter changed; also writes out/shots-data.json (stage titles, calculator output)
python build.py tts            # voices -> out/voice/, timeline.js
python build.py sheet          # out/contact.png, one still per scene
python build.py sheet lines    # one still per spoken line
python build.py video          # out/Residual-Stream-EP06-Block.mp4 (+ .srt, -chapters.txt, -thumb.png)
```

The render takes several minutes; run it in the background with output to a file.

## Notes from building it (2026-10-18)

- Length budget is 90 s. The first draft ran 108.5 s; spelled acronyms ("G P T two") add pauses, so the
  lines were cut until `build.py tts` reported 88.8 s.
- `capture_shots.py` must wait after its first jump to the chapter: with only a short settle the first
  walkthrough shot caught the page mid-transition and showed the previous chapter instead.

## What is real and what is illustrative

- Real: the walkthrough screenshots (scene 2, the MLP stage in scene 4), the calculator screenshot and its
  numbers (scene 6: 8.03B total; attention 1.34B, MLP 5.64B, embeddings 1.05B), the layer counts
  (GPT-2 small 12, GPT-3 96, the calculator's own presets).
- Illustrative and labelled on screen: the attention pattern in scene 3, the 8 → 32 → 8 drawing in
  scene 4 (sizes from the guide's demo), the replace-vs-add bars in scene 5.
