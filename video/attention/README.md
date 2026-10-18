# EP 05 · Attention

Explainer for the guide's Attention chapter: how each token looks back at earlier ones to decide what matters, what attention heads specialise in, and the causal mask and softmax.

Toki (the token) asks, Vera (the guide) explains. 7 scenes, 26 spoken lines. Output:
`out/Residual-Stream-EP05-Attention.mp4`, with `.srt` subtitles, `-chapters.txt` and `-thumb.png`.

## Files

| File | What it is |
|---|---|
| `script.json` | Dialogue (`text` is the caption, `say` what the voice reads), voices, brand line and output name |
| `episode.html` | The scenes and their animation, as a pure function of time |
| `capture_shots.py` | Takes the real screenshots in `shots/` from the local guide with Playwright: the "it was tired" sentence demo, head patterns, and the Deep-mode maths (mask, softmax) |
| `shots/` | Those screenshots, read by `episode.html` by name |
| `engine/`, `build.py` | Copied from the `flow-show-video` skill by `new_episode.py`; do not edit here |
| `timeline.js`, `out/` | Generated, git-ignored |

## How to rebuild

See [video/README.md](../README.md) for requirements and publishing. From this folder:

```powershell
python capture_shots.py      # only if the chapter's demos changed
python build.py tts
python build.py sheet lines  # review out/contact.png
python build.py video
```

Screens labelled REAL DEMO are screenshots of the guide's own demos. Anything drawn by hand is labelled
ILLUSTRATIVE on screen.
