# EP 10 · Inside the box ("Looking inside the box")

A 90-second explainer for the guide's **Inside the box** chapter (`index.html`, section `id="interp"`),
one episode of The Residual Stream video series. Toki (the token) asks, Vera (the guide) explains:
we can see every multiplication but not why it produces the behaviour; the logit lens; superposition;
sparse autoencoders and steering ("Golden Gate Claude"); activation patching; and the honest limits
(a model's account of its own reasoning is generated text, and interpretability is young).

Built with the `flow-show-video` skill's engine (`~/.claude/skills/flow-show-video`).

## Files

| File | What it is |
|---|---|
| `script.json` | Dialogue, voices (VERA `en-GB-SoniaNeural` +18%, TOKI `en-US-BrianNeural` +20% +4Hz), brand and output name |
| `episode.html` | The seven scenes and their per-frame animation; overrides the engine palette with the site's colours |
| `capture_shots.py` | Takes the real screenshots in `shots/` from the local `index.html` (Playwright, dark theme, Deep mode) and writes `out/shots-data.json` with what each demo printed |
| `shots/` | 1920x1080 screenshots: logit lens at layers 0 and 12, superposition with cat + code on, the patching grid (layer 3 at "Mary" and at "John (2nd)"), steering at strength 0 and 9 |
| `engine/`, `build.py` | Copied from the skill by `new_episode.py`; do not edit here |
| `timeline.js`, `out/` | Generated, git-ignored |

## How to rebuild

Needs Python with `edge-tts` and `playwright`, `ffmpeg`/`ffprobe` on PATH, and internet for the voices.
On Windows set `PYTHONUTF8=1`.

```bash
python capture_shots.py      # only if the chapter's demos changed: refresh shots/ and out/shots-data.json
python build.py tts          # voices + timeline.js (only changed lines are re-synthesised)
python build.py sheet        # out/contact.png, one still per scene
python build.py sheet lines  # out/contact.png, one still per spoken line
python build.py video        # several minutes; run in the background
```

Output lands in `out/`: `Residual-Stream-EP10-Interp.mp4`, plus `.srt` subtitles, `-chapters.txt`
(YouTube chapters) and `-thumb.png` (1280x720). To refresh the engine, re-run
`python <skill>/scripts/new_episode.py <this folder>`.

## What is real and what is illustrative

The chapter's own captions decide this, and the video labels each demo the same way.

- **Real computation:** the superposition demo (5 features in 2 dimensions, read-back =
  ReLU(Wᵀ·hidden − 0.35), `js/interp.js`). With cat and code on, Paris reads back 0.27 though it is
  off. Labelled "REAL DEMO · REAL MATHS".
- **Real mechanism, made-up numbers:** the steering dial. The formula (logit = base + strength ×
  alignment) is the one the guide uses; base logits, alignments and the sample sentences are made up.
  Labelled "REAL DEMO · MADE-UP BASE NUMBERS", and Vera says so.
- **Illustrative:** the logit-lens numbers (shaped like published GPT-2-sized results; Vera says
  "illustrative numbers") and the activation-patching grid (modelled on the published GPT-2 small
  indirect-object analysis; labelled on screen). The number block in scene 1 and the SAE cartoon in
  scene 4 are drawings, not data.
- **Research claims** come from the chapter's text and are credited on screen: Anthropic,
  "Scaling Monosemanticity" (2024; Claude 3 Sonnet, Golden Gate Bridge feature, Golden Gate Claude)
  and Anthropic's attribution graphs (2025; Claude 3.5 Haiku, the arithmetic example, insight on
  about a quarter of prompts tried).
