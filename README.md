# The Residual Stream

An interactive guide to how transformers and large language models work — from the 1943 artificial neuron to today's reasoning models. Available in English (`/`) and Hebrew (`/he/`). On the Hebrew page the in-browser models (text generator, BPE tokenizer, training demo) train on Hebrew text.

Every demo runs in the browser. No build step, no dependencies, no backend.

## What's inside

| Chapter | Interactive part |
|---|---|
| Start | A tiny n-gram language model trained in the browser, generating text live with next-word probabilities |
| How it began | Timeline in three acts, 1943 → 2026 |
| Tokens | Real BPE trained on sample text; slide the number of merges |
| Embeddings | 2D vector map with working analogy arithmetic |
| Position | Sinusoidal encoding heatmap, similarity curve, RoPE rotation |
| Attention | Pronoun resolution across four heads; step-by-step Q·Kᵀ/√d → mask → softmax → ·V with real numbers |
| The block | Animated residual stream walk-through; parameter / memory / KV-cache calculator (GPT-2, GPT-3, Llama 2 7B, Llama 3 8B presets) |
| Sampling | Temperature, top-k, top-p on a live distribution |
| Training | A character bigram network trained by gradient descent, with loss curve and learned matrix |
| Modern LLMs | KV cache step-through, mixture-of-experts router |
| Inside the box | Logit lens across layers, interactive activation patching (IOI-style), a real 5-features-in-2D superposition model, feature steering (Golden Gate style); circuits, SAEs, attribution graphs and their limits |
| Agents | Step-through agent run with growing context, billed tokens with/without prompt caching, a human-approval gate; compounding-error calculator; workflows vs agents, MCP, context engineering, prompt injection |
| Check yourself | 14-question quiz |

## Deploy to GitHub Pages

1. Create a new repository and push the contents of this folder to the `main` branch (keep `.nojekyll`).
   ```bash
   git init
   git add .
   git commit -m "The Residual Stream"
   git branch -M main
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```
2. In the repository: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, branch `main`, folder `/ (root)`.
3. After a minute the site is live at `https://<you>.github.io/<repo>/`, and the Hebrew version at `.../he/`.

To preview locally, open `index.html` directly or run `python3 -m http.server` in this folder.

## Structure

```
index.html        English page
he/index.html     Hebrew page (RTL)
css/style.css     All styles, light and dark themes, logical properties for RTL
js/util.js        Helpers and the sample corpus the in-browser models train on
js/i18n.js        tr(en, he) — picks the string by <html lang>
js/*.js           One file per chapter
```

Fonts load from Google Fonts (Bricolage Grotesque, Source Serif 4, JetBrains Mono; Rubik and Frank Ruhl Libre for Hebrew) with system fallbacks.
