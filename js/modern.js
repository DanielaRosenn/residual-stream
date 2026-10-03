(function () {
  /* ---------- KV cache ---------- */
  const PROMPT = ["The", "cat", "sat", "on"];
  const GEN = ["the", "mat", ".", "It", "purred", "softly", "."];
  let s = 0;
  const grid = $("#kvGrid"), on = $("#kvOn");
  function totals(n) {
    // computations of K/V pairs: prefill computes PROMPT.length; each step k adds either 1 (cache) or full context (no cache)
    let withC = PROMPT.length, without = PROMPT.length;
    for (let k = 1; k <= n; k++) { withC += 1; without += PROMPT.length + k; }
    return { withC, without };
  }
  function renderKV() {
    const cache = on.checked;
    grid.innerHTML = "";
    for (let k = 0; k <= s; k++) {
      const row = el("div", { class: "kv-row" }, el("span", { class: "lab", text: k === 0 ? tr("prompt", "prompt") : tr("step ", "צעד ") + k }));
      const ctxToks = PROMPT.concat(GEN.slice(0, k));
      ctxToks.forEach((t, i) => {
        const fresh = k === 0 || !cache || i === ctxToks.length - 1;
        row.append(el("span", { class: "kv-cell" + (fresh ? " fresh" : ""), text: t }));
      });
      grid.append(row);
    }
    const { withC, without } = totals(s);
    $("#kvStat").textContent = tr(
      `Key/value computations so far: ${cache ? withC : without} (${cache ? "without the cache it would be " + without : "with the cache it would be " + withC}).`,
      `חישובי key/value עד עכשיו: ${cache ? withC : without} (${cache ? "בלי ה־cache היו " + without : "עם ה־cache היו " + withC}).`);
    $("#kvStep").disabled = s >= GEN.length;
  }
  $("#kvStep").addEventListener("click", () => { s = Math.min(GEN.length, s + 1); renderKV(); });
  $("#kvReset").addEventListener("click", () => { s = 0; renderKV(); });
  on.addEventListener("change", renderKV);
  renderKV();

  /* ---------- Mixture of experts ---------- */
  const TOKS = ["the", "Paris", "def", "=", "purred", "photosynthesis"];
  const E = 8, TOPK = 2;
  let tok = "Paris";
  const hash = str => [...str].reduce((h, c) => (Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0), 2166136261);
  function route(t) {
    const rng = mulberry32(hash(t));
    const logits = [...Array(E)].map(() => gauss(rng) * 1.4);
    const p = softmax(logits);
    const top = p.map((x, i) => i).sort((a, b) => p[b] - p[a]).slice(0, TOPK);
    const z = top.reduce((a, i) => a + p[i], 0);
    return { p, top, gate: Object.fromEntries(top.map(i => [i, p[i] / z])) };
  }
  const svg = $("#moeSvg");
  function drawMoE() {
    const { p, top, gate } = route(tok);
    const cob = cssVar("--cobalt"), amb = cssVar("--amber"), ink = cssVar("--ink"), muted = cssVar("--muted"), rule = cssVar("--rule"), surf = cssVar("--surface"), soft = cssVar("--amber-soft");
    svg.innerHTML = "";
    const ey = i => 14 + i * 27;
    svg.append(sv("rect", { x: 10, y: 100, width: 130, height: 40, rx: 8, fill: cob }));
    svg.append(sv("text", { x: 75, y: 125, "text-anchor": "middle", fill: surf, "font-weight": 700 }, tok));
    svg.append(sv("line", { x1: 140, y1: 120, x2: 180, y2: 120, stroke: muted, "stroke-width": 2 }));
    svg.append(sv("rect", { x: 180, y: 96, width: 110, height: 48, rx: 8, fill: surf, stroke: ink, "stroke-width": 1.5 }));
    svg.append(sv("text", { x: 235, y: 118, "text-anchor": "middle", fill: ink, "font-weight": 600 }, tr("Router", "Router")));
    svg.append(svgLabel({ x: 235, y: 134, "text-anchor": "middle", fill: muted, style: "font-size:11px" }, tr(`picks top ${TOPK} of ${E}`, `בוחר ${TOPK} מתוך ${E}`)));
    for (let i = 0; i < E; i++) {
      const chosen = top.includes(i);
      svg.append(sv("line", { x1: 290, y1: 120, x2: 440, y2: ey(i) + 10, stroke: chosen ? amb : rule, "stroke-width": chosen ? 3.5 : 1.2 }));
      svg.append(sv("rect", { x: 440, y: ey(i), width: 120, height: 21, rx: 4, fill: chosen ? soft : surf, stroke: chosen ? amb : rule, "stroke-width": chosen ? 2 : 1 }));
      svg.append(sv("text", { x: 452, y: ey(i) + 15, fill: chosen ? ink : muted, "font-weight": chosen ? 700 : 400 }, `Expert ${i + 1}`));
      svg.append(sv("text", { x: 632, y: ey(i) + 15, "text-anchor": "end", fill: chosen ? amb : muted, style: "font: 11px var(--f-mono)" }, `${(p[i] * 100).toFixed(0)}%`));
    }
    const [a, b] = top;
    const ga = (gate[a] * 100).toFixed(0), gb = (gate[b] * 100).toFixed(0);
    $("#moeInfo").textContent = tr(
      `For “${tok}”, the router runs only Expert ${a + 1} and Expert ${b + 1}, blending their outputs ${ga}/${gb} (their router scores, renormalised to sum to 100%). The other ${E - TOPK} experts cost nothing for this token. With ${E} experts and top-${TOPK} routing, the layer holds four times as many parameters as it uses per token. (Router scores here are random but fixed per token; in a real model they are learned, and experts specialise in loose, often surprising ways.)`,
      `עבור “${tok}”, ה־router מפעיל רק את Expert ${a + 1} ואת Expert ${b + 1}, ומשלב את הפלטים שלהם ביחס ${ga}/${gb} (הציונים שלהם מנורמלים מחדש ל־100%). שאר ${E - TOPK} ה־experts לא עולים כלום עבור הטוקן הזה. עם ${E} experts ו־top-${TOPK} routing, בשכבה יש פי ארבעה פרמטרים ממה שהיא מפעילה לכל טוקן. (הציונים כאן אקראיים אבל קבועים לכל טוקן; במודל אמיתי הם נלמדים, וה־experts מתמחים בדרכים רופפות ולעיתים מפתיעות.)`);
  }
  segmented($("#moeSeg"), TOKS.map(t => ({ value: t, label: t })), tok, v => { tok = v; drawMoE(); });
  onTheme(drawMoE);
  drawMoE();
})();
