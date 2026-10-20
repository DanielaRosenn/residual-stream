# EP 11 · Agents (explainer video)

A short narrated explainer for the guide's "Agents" chapter (`index.html`, `id="agents"`): tool use is
still next-token prediction and the loop around it is the agent, the guide's step-through agent run
(context growth, prompt caching, the human-approval gate), compounding errors and workflows vs agents,
and safety in the loop (prompt injection, architectural defences, MCP). Toki asks, Vera explains.
Part of the per-chapter series in `video/`.

## Files

| File | What |
|---|---|
| `script.json` | the dialogue (`text` is the caption, `say` is what the voice reads), voices, output name |
| `episode.html` | the five scenes and their per-frame animation; overrides the engine palette with the site's colours |
| `capture_shots.py` | takes the real 1920x1080 screenshots in `shots/` from the local `index.html` with Playwright |
| `shots/` | `01`-`04` the agent run after 1, 3, 5 and 7 clicks on `#agNext` (gate open at 7), `05` after Reject plus one step, `06` the reliability panel at 95% / 20 steps, `07`-`08` the chapter's Deep-mode text (`05` and `07` are not used in the cut; `05` backs the 5,440-token / 4-call numbers in out/shots-data.json) |
| `engine/`, `build.py` | copied from the `flow-show-video` skill by `new_episode.py`; do not edit here |
| `timeline.js`, `out/` | generated, git-ignored |

## Rebuild

Needs Python with `edge-tts` and `playwright`, `ffmpeg`/`ffprobe` on PATH, and internet for the voices.
Run from this folder:

```powershell
python capture_shots.py        # only if the chapter changed; also writes out/shots-data.json (stats line per step, gate state, slider readout)
python build.py tts            # voices -> out/voice/, timeline.js
python build.py sheet          # out/contact.png, one still per scene
python build.py sheet lines    # one still per spoken line
python build.py video          # out/Residual-Stream-EP11-Agents.mp4 (+ .srt, -chapters.txt, -thumb.png)
```

The render takes several minutes; run it in the background with output to a file.

## Notes from building it (2026-10-18)

- Length budget is 90 s. The first draft ran 103.0 s; five rounds of cuts brought `build.py tts` to 90.1 s
  (the render is 90.13 s by `ffprobe`). "5,160 tokens" is spoken as "over five thousand"; the card shows 5,160.
- Contact-sheet fixes: a scene rule `#s1 .demo svg { position: absolute }` also caught the icon SVGs and blew
  them up over the loop boxes (now scoped to the loop drawing); the injected text in scene 4 started with
  `<!--`, so `typeText` (which sets innerHTML) rendered it as an HTML comment, i.e. nothing; the scene 4
  camera showed a sliver of the neighbouring column, now 2.3x with a pan.
- The run panel is taller than a 1280x720 viewport, so `capture_shots.py` scrolls until the open gate fits
  and uses that one scroll position for every run shot (so the episode can cross-fade between steps).
- Site bug found while capturing: `css/style.css` gives `.ag-gate` `display: flex`, which overrides the
  `hidden` attribute, so the approval box (with its buttons) shows from step 1 although `js/agents.js`
  only un-hides it when the agent asks. `capture_shots.py` hides it with a capture-only style
  (`.ag-gate[hidden] { display: none; }`) so the shots show what the JS intends, and records
  `gate_bug_present` in `out/shots-data.json`. It also hides the fixed top-right corner (mode, language,
  theme) after switching to Deep, because it floats over the run panel. Fix the bug in the site, then
  drop the workaround.

## What is real and what is illustrative

- Real: the agent-run screenshots and their numbers (scene 2: context 1,200 → 1,330 → 3,800 → 5,160 tokens,
  0 → 3 model calls, caching saves 24% then 47%, the approval gate), the reliability panel (scene 3: 95.0%,
  20 steps, 35.8%, shown as ≈36%), the chapter's text on workflows, MCP (open-sourced by Anthropic,
  November 2024) and safety in the loop. The tool call typed in scene 1 is the run's first call.
- Illustrative and labelled on screen: the loop diagram in scene 1, the injected web page in scene 4
  (fictional text, reserved `example.net` domain).
