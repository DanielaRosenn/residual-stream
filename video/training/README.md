# EP 08 · Training ("How it learns")

A short narrated explainer for the guide's **Training** chapter (`index.html`, section `id="training"`),
one episode of The Residual Stream video series. Toki (the token) asks, Vera (the guide) explains:
the objective is next-token prediction scored by the loss (the surprise at the real next token,
−log p, cross-entropy); backpropagation and gradient descent nudge every knob and the loop repeats for
trillions of tokens; the guide's real bigram network trains in the browser; a transformer has far more
context and knobs, so it can push the loss much lower and has to learn grammar, facts and reasoning
patterns to get there; scaling laws (2020) and Chinchilla (2022, about 20 tokens per parameter); and
post-training turns the autocomplete into an assistant (example chats, preference tuning with RLHF / DPO,
RL with verifiable rewards from 2024).

Built with the `flow-show-video` skill's engine (`~/.claude/skills/flow-show-video`).

## Files

| File | What it is |
|---|---|
| `script.json` | Dialogue (`text` is the caption, `say` is what the voice reads), voices (VERA `en-GB-SoniaNeural` +18%, TOKI `en-US-BrianNeural` +20% +4Hz), brand and output name |
| `episode.html` | The seven scenes and their per-frame animation; overrides the engine palette with the site's colours |
| `capture_shots.py` | Takes the real screenshots in `shots/` from the local `index.html` (Playwright, dark theme, Deep mode via `rs-mode`) and writes `out/shots-data.json` with the demo's own `#trainStat` line, sample text and the stage labels |
| `shots/` | `01` the training panel at step 0, `02` after about 1 s of training (step 132), `03` after about 4.5 s (step 586), `04` the "From text predictor to assistant" stages with "Preference tuning" open |
| `engine/`, `build.py` | Copied from the skill by `new_episode.py`; do not edit here |
| `timeline.js`, `out/` | Generated, git-ignored |

## How to rebuild

Needs Python with `edge-tts` and `playwright`, `ffmpeg`/`ffprobe` on PATH, and internet for the voices.
On Windows set `PYTHONUTF8=1`. Run from this folder:

```powershell
python capture_shots.py      # only if the Training demo changed: refresh shots/ and out/shots-data.json
python build.py tts          # voices -> out/voice/, timeline.js (only changed lines are re-synthesised)
python build.py sheet        # out/contact.png, one still per scene
python build.py sheet lines  # out/contact.png, one still per spoken line
python build.py video        # several minutes; run it in the background with output to a file
```

Output lands in `out/`: `Residual-Stream-EP08-Training.mp4`, plus `.srt` subtitles, `-chapters.txt`
(YouTube chapters; the 7th scene is under 10 s and folds into the 6th) and `-thumb.png` (1280x720).
To refresh the engine, re-run `python <skill>/scripts/new_episode.py <this folder>`.

## Notes from building it (2026-10-18)

- The first draft (7 scenes, 27 lines) ran 100.6 s; three rounds of line cuts brought it to 89.8 s. The
  floor value 1.961, the 676 weights, "not one character" and the base model's "three more questions"
  are on screen only, not spoken.
- The shots are taken in Deep mode (earlier episodes used Simple mode) because the Deep captions are the
  ones that say "bigram", "the entropy of the data itself" and "RLHF, Constitutional AI, DPO", which the
  episode names. The training panel itself is the same in both modes.
- `capture_shots.py` scrolls with `behavior: 'instant'`: the site scrolls smoothly, and the first capture
  came out mid-scroll otherwise.
- The step count after a fixed wait depends on the browser's frame rate (two steps per animation frame),
  so a new capture can show a different step and loss; update the scene-3 cards from `out/shots-data.json`.
- The first full render timed out in `page.goto` while the machine was running several renders at once;
  re-running `build.py video` alone worked with no change.

## What is real and what is illustrative

- Real (labelled REAL DEMO / THE GUIDE): the loss curve, the next-character grid and the stats line are
  screenshots of the guide's own network (`js/training.js`: one 26 × 26 weight matrix, softmax, trained by
  gradient descent in the browser). The scene-3 cards are read from the demo: start 3.258 (ln 26, a
  uniform guess over 26 characters), 2.008 after 586 steps, floor 1.961 ("best possible", the bigram
  entropy of the guide's text). The outro shows the chapter's stages list.
- From the guide's text: trillions of tokens; grammar, facts and patterns of reasoning; scaling laws 2020;
  Chinchilla 2022 and roughly 20 tokens per parameter; brilliant autocomplete that may add three more
  questions; supervised fine-tuning, preference tuning (RLHF, InstructGPT 2022; DPO 2023), RL with
  verifiable rewards (maths, code, tool use; reasoning models from 2024).
- Illustrative and labelled on screen: the "the cat sat on the ___" probabilities in scene 1 (the loss
  values 0.92 and 3.91 are computed from them with the real formula, natural log), the knobs and valley
  in scene 2, the context strip in scene 4, the scaling curve in scene 5 (shape only, no data), the
  "1 billion parameters → about 20 billion tokens" example (arithmetic from the 20:1 rule) and the base
  model's continuation in scene 6.
