/* RSCore — the real computations the game scores against. Pure functions, no DOM.
   Needs util.js (mulberry32, softmax, sampleFrom) loaded first. */
const RSCore = (function () {
  const B = "▁"; // word-start marker, as in js/tokenizer.js (SentencePiece convention)
  const LETTERS = /[^a-zא-ת]/g;

  /* Deterministic RNG. Numbers are used as-is; strings are hashed (FNV-1a). */
  function hashString(s) {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return h >>> 0;
  }
  function rng(seed) {
    let n;
    if (typeof seed === "string") n = hashString(seed);
    else if (Number.isFinite(seed)) n = Math.floor(seed) >>> 0;
    else n = (Date.now() ^ Math.floor(Math.random() * 4294967296)) >>> 0;
    return mulberry32(n);
  }

  /* Lowercase words, sentence-final "." kept as its own token (as in js/hero.js). */
  function words(text) {
    return String(text || "").toLowerCase()
      .replace(/[^a-zא-ת\s.]/g, " ")
      .replace(/\./g, " .")
      .split(/\s+/).filter(Boolean);
  }

  /* Trigram model with backoff to bigram, then unigram (same behaviour as the hero demo). */
  const ngramCache = new Map();
  function ngram(text) {
    if (ngramCache.has(text)) return ngramCache.get(text);
    const ws = words(text);
    const tri = new Map(), bi = new Map(), uni = new Map();
    const bump = (m, k, w) => { if (!m.has(k)) m.set(k, new Map()); const x = m.get(k); x.set(w, (x.get(w) || 0) + 1); };
    for (let i = 0; i < ws.length; i++) {
      uni.set(ws[i], (uni.get(ws[i]) || 0) + 1);
      if (i >= 1) bump(bi, ws[i - 1], ws[i]);
      if (i >= 2) bump(tri, ws[i - 2] + " " + ws[i - 1], ws[i]);
    }
    const vocab = [...uni.keys()];
    function table(ctx) {
      ctx = ctx || [];
      const a = ctx[ctx.length - 2], b = ctx[ctx.length - 1];
      if (a && b && tri.has(a + " " + b)) return { t: tri.get(a + " " + b), order: 3 };
      if (b && bi.has(b)) return { t: bi.get(b), order: 2 };
      return { t: uni, order: 1 };
    }
    function next(ctx) {
      const { t } = table(ctx);
      let total = 0;
      t.forEach(c => { total += c; });
      // Ties broken by first appearance in the text so the order is stable.
      const rank = new Map(vocab.map((w, i) => [w, i]));
      return [...t.entries()].map(([w, c]) => ({ w, p: c / total }))
        .sort((x, y) => y.p - x.p || rank.get(x.w) - rank.get(y.w));
    }
    /* Extra (not required by callers): 3 = trigram used, 2 = backed off to bigram, 1 = unigram. */
    function order(ctx) { return table(ctx).order; }
    const model = { vocab, words: ws, next, order };
    ngramCache.set(text, model);
    return model;
  }

  const sm = (logits, T = 1) => softmax(logits, T);
  const sample = (probs, r) => sampleFrom(probs, r || Math.random);

  /* Byte-pair encoding, same conventions as js/tokenizer.js:
     words = lowercase letter runs, each split into [▁, ...chars]; ties go to the smaller "a\0b" key. */
  function bpe(text) {
    const freq = new Map();
    String(text || "").toLowerCase().split(/\s+/).forEach(w => {
      w = w.replace(LETTERS, "");
      if (w) freq.set(w, (freq.get(w) || 0) + 1);
    });

    function start() {
      return { words: [...freq.entries()].map(([w, f]) => ({ w, sym: [B, ...w], freq: f })), merges: [] };
    }
    function pairCounts(state) {
      const pairs = new Map();
      state.words.forEach(({ sym, freq: f }) => {
        for (let i = 0; i < sym.length - 1; i++) {
          const k = sym[i] + "\u0000" + sym[i + 1];
          pairs.set(k, (pairs.get(k) || 0) + f);
        }
      });
      return [...pairs.entries()]
        .sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0))
        .map(([k, count]) => { const [a, b] = k.split("\u0000"); return { a, b, count }; });
    }
    function mergeSym(sym, a, b) {
      const out = [];
      for (let i = 0; i < sym.length; i++) {
        if (i < sym.length - 1 && sym[i] === a && sym[i + 1] === b) { out.push(a + b); i++; }
        else out.push(sym[i]);
      }
      return out;
    }
    function merge(state, a, b) {
      return {
        words: state.words.map(x => ({ ...x, sym: mergeSym(x.sym, a, b) })),
        merges: [...state.merges, [a, b]],
      };
    }
    function tokenCount(state) {
      return state.words.reduce((s, x) => s + x.sym.length * x.freq, 0);
    }
    function greedy(n) {
      let s = start();
      for (let i = 0; i < n; i++) {
        const top = pairCounts(s)[0];
        if (!top) break;
        s = merge(s, top.a, top.b);
      }
      return s;
    }
    /* Apply merges by rank (earliest learned first), like tokenizer.js encodeWord. */
    function encode(word, merges) {
      const w = String(word || "").toLowerCase().replace(LETTERS, "");
      if (!w) return [];
      const rank = new Map((merges || []).map((m, i) => [m[0] + "\u0000" + m[1], i]));
      const sym = [B, ...w];
      for (;;) {
        let bi = -1, br = Infinity;
        for (let i = 0; i < sym.length - 1; i++) {
          const r = rank.get(sym[i] + "\u0000" + sym[i + 1]);
          if (r !== undefined && r < br) { br = r; bi = i; }
        }
        if (bi < 0) return sym;
        sym.splice(bi, 2, sym[bi] + sym[bi + 1]);
      }
    }
    return { marker: B, start, pairCounts, merge, tokenCount, greedy, encode };
  }

  return { rng, hashString, words, ngram, softmax: sm, sample, bpe, MARKER: B };
})();
