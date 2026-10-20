# EP 00 · Start

The series opener for the guide's Start section: a language model writes one token at a time, and this episode walks the whole pipeline once (tokens, embeddings, attention, the block, sampling, training) and points to the game. It began as the pilot and credits Andrej Karpathy's and 3Blue1Brown's explainers as inspiration. Rebranded from "EP 01 · The next word" to EP 00 on 2026-10-18.

Toki (the token) asks, Vera (the guide) explains. 8 scenes, 31 spoken lines. Output:
`out/Residual-Stream-EP00-Start.mp4`, with `.srt` subtitles, `-chapters.txt` and `-thumb.png`.

## Files

| File | What it is |
|---|---|
| `script.json` | Dialogue (`text` is the caption, `say` what the voice reads), voices, brand line and output name |
| `episode.html` | The scenes and their animation, as a pure function of time |
| `capture_shots.py` | Takes the real screenshots in `shots/` from the local guide with Playwright: the hero demo, the Tokens, Embeddings, Attention, block, Sampling and Training demos, and the game (`play.html`) |
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
