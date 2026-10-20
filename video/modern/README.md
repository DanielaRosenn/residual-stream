# EP 09 · Modern LLMs ("What changed since 2017")

A short narrated explainer for the guide's **Modern LLMs** chapter (`index.html`, section `id="modern"`),
one episode of The Residual Stream video series. Toki (the token) asks, Vera (the guide) explains:
the 2017 recipe is still underneath but tuned almost everywhere; the KV cache (and prompt caching, and
its GPU-memory catch); mixture of experts (Kimi K2: about 1 trillion parameters, 32 billion active per
token); long context and reasoning / test-time compute; RAG, tools and the agent loop (teaser for EP 11).

Built with the `flow-show-video` skill's engine (`~/.claude/skills/flow-show-video`).

## Files

| File | What it is |
|---|---|
| `script.json` | Dialogue (`text` is the caption, `say` is what the voice reads), voices (VERA `en-GB-SoniaNeural` +18%, TOKI `en-US-BrianNeural` +20% +4Hz), brand and output name |
| `episode.html` | The six scenes and their per-frame animation; overrides the engine palette with the site's colours |
| `capture_shots.py` | Takes the real screenshots in `shots/` from the local `index.html` (Playwright, dark theme, Deep mode via the page's own toggle) and writes `out/shots-data.json` with what the demos printed |
| `shots/` | `01` KV cache after three "Generate next token" clicks, `02` the same with the cache off, `03` the MoE router on "purred", `04`/`05` the chapter's Deep-mode text (captured for reference, not used in the episode) |
| `engine/`, `build.py` | Copied from the skill by `new_episode.py`; do not edit here |
| `timeline.js`, `out/` | Generated, git-ignored |

## How to rebuild

Needs Python with `edge-tts` and `playwright`, `ffmpeg`/`ffprobe` on PATH, and internet for the voices.
On Windows set `PYTHONUTF8=1`. Run from this folder:

```powershell
python capture_shots.py      # only if the chapter's demos changed: refresh shots/ and out/shots-data.json
python build.py tts          # voices -> out/voice/, timeline.js (only changed lines are re-synthesised)
python build.py sheet        # out/contact.png, one still per scene
python build.py sheet lines  # out/contact.png, one still per spoken line
python build.py video        # several minutes; run it in the background with output to a file
```

Output lands in `out/`: `Residual-Stream-EP09-Modern.mp4`, plus `.srt` subtitles, `-chapters.txt`
(YouTube chapters) and `-thumb.png` (1280x720). To refresh the engine, re-run
`python <skill>/scripts/new_episode.py <this folder>`.

## Notes from building it (2026-10-18)

- The 90 s budget is tight for five ideas. The first draft (7 scenes, 31 lines) ran 123.7 s; long context
  and reasoning were merged into one two-card scene and lines were cut to fit. The technique names
  (RoPE scaling, FlashAttention, grouped-query attention, hybrid designs), "chain-of-thought, 2022" and
  "trained with RL" are on screen only, not spoken.

## What is real and what is illustrative

- Real: the KV-cache grid and its count line ("Key/value computations so far: 7 (without the cache it
  would be 22).", read back from the page into `out/shots-data.json`), and the MoE router screenshot
  (the demo itself says its router scores are random but fixed per token, so the video labels it
  "REAL DEMO · ILLUSTRATIVE ROUTING"). Numbers come from the guide's text: 512-token context in the
  original GPT, a million and more today, chain-of-thought 2022, Kimi K2 (July 2025) with about a
  trillion parameters and 32 billion active per token.
- Illustrative and labelled on screen: the "fading middle pages" strip, the written-out sum
  (17 × 24 = 408), and the accuracy-vs-thinking-time curve (shape only, no numbers). The parameter bars
  in the MoE scene are drawn to the 32 / 1000 ratio; the 512-token bar is drawn at a minimum visible width.
