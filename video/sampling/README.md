# EP 07 · Sampling

Explainer for the guide's Sampling chapter: the model outputs a probability for every next token, and temperature decides how boldly one is picked.

Toki (the token) asks, Vera (the guide) explains. 6 scenes, 27 spoken lines. Output:
`out/Residual-Stream-EP07-Sampling.mp4`, with `.srt` subtitles, `-chapters.txt` and `-thumb.png`.

## Files

| File | What it is |
|---|---|
| `script.json` | Dialogue (`text` is the caption, `say` what the voice reads), voices, brand line and output name |
| `episode.html` | The scenes and their animation, as a pure function of time |
| `capture_shots.py` | Takes the real screenshots in `shots/` from the local guide with Playwright: the sampling demo at temperatures 1.0, 0.3, 0 and 1.8 (seeded so the picks repeat), and the game's The Dial level |
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
