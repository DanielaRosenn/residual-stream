# EP 01 · How it began ("Making the keyhole wider")

A short narrated explainer for the guide's **How it began** chapter (`index.html`, section `id="history"`),
one episode of The Residual Stream video series. Toki (the token) asks, Vera (the guide) explains: for
decades programs read text through a keyhole, one word at a time, and each step widens it. Word vectors
(2013); sequence-to-sequence translation, which squeezes a sentence into one vector and loses detail on
long inputs (2014); attention, which lets the decoder look back at every word (2014); the transformer,
which drops recurrence and keeps only attention (2017) and kept improving as it was made bigger.

Built with the `flow-show-video` skill's engine (`~/.claude/skills/flow-show-video`).

## Files

| File | What it is |
|---|---|
| `script.json` | Dialogue (`text` is the caption, `say` is what the voice reads), voices (VERA `en-GB-SoniaNeural` +18%, TOKI `en-US-BrianNeural` +20% +4Hz), brand and output name |
| `episode.html` | The six scenes and their per-frame animation; overrides the engine palette with the site's colours |
| `capture_shots.py` | Takes the real screenshots in `shots/` from the local `index.html` (Playwright, dark theme, Simple mode, the timeline's own era tabs) and writes `out/shots-data.json` with every timeline entry the demo showed |
| `shots/` | `01` the chapter's opening (heading, the keyhole paragraph, the era tabs), `02` the "2012–2016: Learning language" tab from word2vec to "Attention is born", `03` the "2017–today: Attention scales" tab from "Attention Is All You Need" |
| `engine/`, `build.py` | Copied from the skill by `new_episode.py`; do not edit here |
| `timeline.js`, `out/` | Generated, git-ignored |

## How to rebuild

Needs Python with `edge-tts` and `playwright`, `ffmpeg`/`ffprobe` on PATH, and internet for the voices.
On Windows set `PYTHONUTF8=1`. Run from this folder:

```powershell
python capture_shots.py      # only if the chapter's timeline changed: refresh shots/ and out/shots-data.json
python build.py tts          # voices -> out/voice/, timeline.js (only changed lines are re-synthesised)
python build.py sheet        # out/contact.png, one still per scene
python build.py sheet lines  # out/contact.png, one still per spoken line
python build.py video        # several minutes; run it in the background with output to a file
```

Output lands in `out/`: `Residual-Stream-EP01-History.mp4`, plus `.srt` subtitles, `-chapters.txt`
(YouTube chapters) and `-thumb.png` (1280x720). To refresh the engine, re-run
`python <skill>/scripts/new_episode.py <this folder>`.

## Notes from building it (2026-10-18)

- First draft (6 scenes, 22 lines) ran 77.4 s with no voice `check` warnings, so no lines were cut.
- The timeline strips frame one entry of the real screenshot at 1:1 pixels (`setCam` zoom 1920/1140), so the
  page's own text is readable on video. The `.hl` boxes over it were placed by eye and needed two rounds of
  `build.py stills` to stop clipping the first letter of the highlighted phrase.
- A scripted find-and-replace that inserted two elements at once silently dropped the second one (the right-hand
  ILLUSTRATIVE tag in the 2017 scene); the per-line contact sheet caught it. Insert one element per edit.

## What is real and what is illustrative

- Real: the three timeline screenshots and the phrases highlighted on them (word2vec's "king − man + woman lands
  near queen", seq2seq's "into a single vector" and "broke down on long inputs", attention's "look back at every
  encoder state", the 2017 entry's "drop recurrence completely" and "trained in parallel on GPUs"). Every spoken
  claim comes from the chapter: the keyhole paragraph and "about sixty years of ideas" (Simple-mode prose), the
  dates and the one-vector squeeze (the "short version" asides), the "T" in ChatGPT and "kept improving as it was
  made bigger" (the Simple aside), "three acts" (the chapter intro), and the timeline entries in `js/history.js`.
- Illustrative and labelled ILLUSTRATIVE on screen: the keyhole walking across "programs read text one word at a
  time", the 2-D man/woman/king/queen map, the encoder → one vector → decoder sketch and the attention lines on the
  sentence "the cat is on the mat" / "le chat est sur le tapis" (the weights are made up: 0.75 on the aligned word,
  0.05 on each other word, labelled "ILLUSTRATIVE WEIGHTS"), and the recurrence-vs-transformer tiles.
