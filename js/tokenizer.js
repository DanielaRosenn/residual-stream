(function () {
  const MAX_MERGES = 300;
  const B = "▁"; // word-start marker, as in SentencePiece

  // ---- Train BPE on the corpus ----
  const freq = new Map();
  CORPUS.toLowerCase().split(/\s+/).forEach(w => {
    w = w.replace(/[^a-z\u05D0-\u05EA]/g, "");
    if (w) freq.set(w, (freq.get(w) || 0) + 1);
  });
  const splits = new Map([...freq.keys()].map(w => [w, [B, ...w]]));
  const base = new Set([B, ".", ",", "!", "?", "'", "-"]);
  freq.forEach((_, w) => [...w].forEach(c => base.add(c)));
  const merges = []; // [a, b]
  for (let m = 0; m < MAX_MERGES; m++) {
    const pairs = new Map();
    splits.forEach((sym, w) => {
      const f = freq.get(w);
      for (let i = 0; i < sym.length - 1; i++) {
        const k = sym[i] + "\u0000" + sym[i + 1];
        pairs.set(k, (pairs.get(k) || 0) + f);
      }
    });
    let best = null, bestN = 1;
    pairs.forEach((n, k) => { if (n > bestN || (n === bestN && best !== null && k < best)) { best = k; bestN = n; } });
    if (!best) break;
    const [a, b] = best.split("\u0000");
    merges.push([a, b, bestN]);
    splits.forEach((sym, w) => {
      const out = [];
      for (let i = 0; i < sym.length; i++) {
        if (i < sym.length - 1 && sym[i] === a && sym[i + 1] === b) { out.push(a + b); i++; }
        else out.push(sym[i]);
      }
      splits.set(w, out);
    });
  }
  const baseList = [...base].sort();
  const slider = $("#bpeMerges");
  slider.max = merges.length;
  if (+slider.value > merges.length) slider.value = merges.length;

  // ---- Encode text with the first k merges ----
  function encodeWord(sym, rank) {
    sym = sym.slice();
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
  function encode(text, k) {
    const rank = new Map(merges.slice(0, k).map((m, i) => [m[0] + "\u0000" + m[1], i]));
    const lower = text.toLowerCase();
    const sameLen = lower.length === text.length;
    const src = lower;
    const re = /[a-z\u05D0-\u05EA]+|[^\sa-z\u05D0-\u05EA]/g;
    const toks = [];
    let m;
    while ((m = re.exec(src))) {
      const piece = m[0];
      const spaced = m.index === 0 || /\s/.test(src[m.index - 1]);
      const isWord = /^[a-z\u05D0-\u05EA]+$/.test(piece);
      const sym = (isWord && spaced) ? [B, ...piece] : [...piece];
      const enc = isWord ? encodeWord(sym, rank) : sym;
      let pos = m.index;
      enc.forEach(t => {
        const len = t.startsWith(B) ? t.length - 1 : t.length;
        const shown = sameLen ? text.substr(pos, len) : t.replace(B, "");
        toks.push({ t, shown, space: t.startsWith(B) });
        pos += len;
      });
    }
    return toks;
  }

  const vocabIndex = k => {
    const v = new Map(baseList.map((s, i) => [s, i]));
    merges.slice(0, k).forEach(m => { const s = m[0] + m[1]; if (!v.has(s)) v.set(s, v.size); });
    return v;
  };

  const input = $("#bpeInput"), chips = $("#bpeChips"), stats = $("#bpeStats"), listEl = $("#bpeList");
  function render() {
    const k = +slider.value;
    $("#bpeMergesOut").value = k;
    const v = vocabIndex(k);
    const toks = encode(input.value, k);
    chips.innerHTML = "";
    toks.forEach(tk => {
      const id = v.get(tk.t);
      const known = id !== undefined;
      const c = el("span", { class: `chip c${known ? id % 4 : "x"}${tk.space ? " sp" : ""}`, title: known ? `token ${id}: "${tk.t}"` : tr("not in the vocabulary", "לא קיים באוצר המילים") },
        tk.space ? el("span", { text: "␣" + tk.shown }) : el("span", { text: tk.shown }),
        el("small", { text: known ? id : "?" }));
      chips.append(c);
    });
    const chars = input.value.length;
    const unk = toks.filter(t => !v.has(t.t)).length;
    const cpt = (chars / Math.max(1, toks.length)).toFixed(2);
    stats.textContent = tr(
      `${chars} characters became ${toks.length} tokens (${cpt} characters per token). Vocabulary: ${v.size} tokens.` +
        (unk ? ` ${unk} piece${unk > 1 ? "s are" : " is"} outside the vocabulary — real byte-level tokenizers never have this problem.` : "") +
        " ␣ marks a token that starts a new word.",
      `${chars} תווים הפכו ל־${toks.length} טוקנים (${cpt} תווים לטוקן). אוצר מילים: ${v.size} טוקנים.` +
        (unk ? ` ${unk} חלקים לא קיימים באוצר המילים — tokenizers אמיתיים שעובדים ברמת bytes לא נתקלים בבעיה הזו.` : "") +
        " ␣ מסמן טוקן שפותח מילה חדשה.");
  }
  listEl.innerHTML = "";
  merges.forEach((m, i) => listEl.append(el("li", { text: `${m[0]} + ${m[1]} → ${m[0] + m[1]}  (×${m[2]})` })));
  slider.addEventListener("input", render);
  input.addEventListener("input", render);
  render();
})();
