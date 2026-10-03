# The Residual Stream — project notes for Claude Code

Static, interactive learning site about transformers and LLMs. English at `/index.html`, Hebrew (RTL) at `/he/index.html`. Hosted on GitHub Pages from the repo root. No build step, no framework, no dependencies — plain HTML/CSS/JS loaded with `<script>` tags in a fixed order.

## Structure
- `index.html`, `he/index.html` — all prose lives here. Each `<section class="chapter" data-title="…">` becomes a node on the left rail automatically (`js/nav.js`).
- `css/style.css` — one stylesheet. Colour tokens on `:root`, dark theme via `prefers-color-scheme` and `[data-theme]`. Use logical properties (`margin-inline-start`, `inset-inline-start`, `border-inline-end`) so RTL works; wide panels have explicit `[dir="rtl"]` centring overrides.
- `js/util.js` — helpers (`el`, `sv`, `svgLabel`, `softmax`, `setupCanvas`, `cssVar`, seeded RNG) and `CORPUS` (English or Hebrew, chosen by `<html lang>`).
- `js/i18n.js` — `LANG` and `tr(english, hebrew)`. Every user-facing string generated in JS goes through `tr()`.
- One JS file per chapter: hero, history, tokenizer, embeddings, position, attention, block, sampling, training, modern, interp, agents, playground, quiz.
- Reading modes: `<html data-mode="simple|deep">` (default simple, saved as `rs-mode`). Put `class="simple-only"` / `class="deep-only"` directly on elements — never wrap `.panel.wide` or `.two-col`. The first `.panel` of each chapter stays visible in both modes. `js/mode.js`, `css/mode.css`.
- `js/challenges.js` inserts a "guess first" card before each chapter's first `.panel` and a "quick check" at its end; progress is saved as `rs-progress`.
- Feature styles live in their own files (`css/mode.css`, `tryit.css`, `challenges.css`, `playground.css`, `essay.css`); colour tokens stay in `css/style.css` (`--brand`, `--accent`, `--on-brand` … — the Cato Networks palette).
- The game "Be the Model": `play.html`, `he/play.html`, `css/game.css` (shell, `g-`), `css/game-levels.css` (levels, `gl-`), `js/game/core.js` (`RSCore`: real n-gram, BPE, softmax on `CORPUS`), `js/game/shell.js` (`RSGame.registerLevel`, route map, stars, `rs-game` storage), one file per level in `js/game/levels/`. Levels score the player against the real computation; a level that is not real must set `real: false`.

## Conventions
- Any new UI text: add both languages. Prose in the two HTML files, generated text via `tr()`. Technical terms stay in English inside Hebrew text.
- Hebrew page: mark English/maths islands with `dir="ltr"` or `class="ltr-island"`; use `svgLabel()` for SVG text that may contain Hebrew; isolate quoted English inside Hebrew strings with `\u2066…\u2069`.
- Canvases: always go through `setupCanvas()` (DPR scaling, text direction). Re-read colours with `cssVar()` and register a redraw with `onTheme()`.
- Demos that are illustrative (hand-set numbers) must say so in a caption. Demos labelled as real must compute for real.
- Keep it dependency-free and self-contained so GitHub Pages serves it as-is.

## QA — run before every commit
```bash
pip install playwright && playwright install chromium   # once
python3 tests/qa.py                                    # English
python3 tests/qa.py "$(python3 -c 'import pathlib;print((pathlib.Path("he/index.html").resolve()).as_uri())')" he   # Hebrew
```
It loads the page at desktop, mobile and dark sizes, exercises every interactive demo, reports JS errors and horizontal overflow (must be 0), and saves section screenshots to `tests/screenshots/` for visual review. Also run `node --check js/*.js`.

The game has its own script with the same arguments: `python3 tests/qa_game.py` (English) and `python3 tests/qa_game.py <file URI of he/play.html> he`. On Windows use `python`, set `PYTHONUTF8=1` and redirect the output to a file.

## Ideas not yet built
- Game hops still marked "coming soon": Hot and Cold (embeddings), Stamp the Order (position), Spotlight (attention), The Notepad (residual stream), Downhill Blind (training), The Desk (context window), Confident Nonsense (hallucination), Gatekeeper (prompt injection); then a daily puzzle.
- Evals chapter (how models and agents are measured)
- Fine-tuning / LoRA chapter
