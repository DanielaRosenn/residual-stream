(function () {
  /* ---------- Block walkthrough ---------- */
  const rng = mulberry32(42);
  const D = 8, H = 32;
  const x0 = [...Array(D)].map(() => gauss(rng) * 0.9);
  const rms = v => { const r = Math.sqrt(v.reduce((s, x) => s + x * x, 0) / v.length + 1e-6); return v.map(x => x / r); };
  const attnOut = [...Array(D)].map(() => gauss(rng) * 0.6);
  const W1 = [...Array(D)].map(() => [...Array(H)].map(() => gauss(rng) / Math.sqrt(D)));
  const W2 = [...Array(H)].map(() => [...Array(D)].map(() => gauss(rng) / Math.sqrt(H) * 0.8));
  const gelu = x => 0.5 * x * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * x ** 3)));
  const n1 = rms(x0);
  const x1 = x0.map((x, i) => x + attnOut[i]);
  const n2 = rms(x1);
  const hidden = matmul([n2], W1)[0].map(gelu);
  const mlpOut = matmul([hidden], W2)[0];
  const x2 = x1.map((x, i) => x + mlpOut[i]);

  const STAGES = [
    { id: "in", t: tr("A token's vector arrives", "הווקטור של טוקן נכנס"), v: x0, g: null, branch: false,
      p: tr("This is the residual stream for one token: its embedding plus position, or the output of the block below. It flows straight up. Everything in the block is a detour that reads from it and adds back to it.",
            "זה ה־residual stream של טוקן אחד: ה־embedding שלו ועוד המיקום, או הפלט של ה־block שמתחתיו. הוא זורם ישר למעלה. כל מה שיש ב־block הוא מעקף שקורא ממנו ומוסיף אליו בחזרה.") },
    { id: "n1", t: tr("Normalise a copy", "נרמול של עותק"), v: n1, g: x0, branch: true,
      p: tr("A copy of the stream is rescaled to a standard size (RMSNorm divides by the root-mean-square). The stream itself is untouched. This keeps attention's input stable no matter how large the stream has grown.",
            "עותק של ה־stream עובר נרמול לגודל סטנדרטי (RMSNorm מחלק בשורש הממוצע של הריבועים). ה־stream עצמו לא משתנה. כך הקלט ל־attention נשאר יציב, לא משנה כמה ה־stream גדל.") },
    { id: "attn", t: tr("Multi-head attention", "Multi-head attention"), v: attnOut, g: null, branch: true,
      p: tr("Attention gathers information from earlier tokens — the pronoun's referent, the verb's subject, a pattern seen before — and produces a vector of what it found.",
            "ה־attention אוסף מידע מטוקנים קודמים — למה כינוי הגוף מתייחס, מי הנושא של הפועל, תבנית שהופיעה קודם — ומפיק וקטור של מה שמצא.") },
    { id: "plus1", t: tr("Add it to the stream", "הוספה ל־stream"), v: x1, g: x0, branch: false,
      p: tr("The attention result is added to the stream, not swapped in. The original information is still there, plus what was gathered. Compare with the faint bars: every value moved a little.",
            "התוצאה של ה־attention מתווספת ל־stream ולא מחליפה אותו. המידע המקורי עדיין שם, ועוד מה שנאסף. השוו לעמודות החיוורות: כל ערך זז קצת.") },
    { id: "n2", t: tr("Normalise again", "נרמול נוסף"), v: n2, g: x1, branch: true,
      p: tr("Another normalised copy, this time for the MLP.", "עוד עותק מנורמל, הפעם בשביל ה־MLP.") },
    { id: "mlp", t: tr("The MLP", "ה־MLP"), v: mlpOut, g: null, branch: true,
      p: tr(`Expand to ${H} dimensions (four times wider), apply a nonlinearity (GELU here; SwiGLU in most current models), project back to ${D}. This is a real computation on the vector above. The MLP acts on this token alone — think of it as a giant learned lookup that recalls associations.`,
            `הרחבה ל־${H} ממדים (פי ארבעה), הפעלת פונקציה לא־לינארית (כאן GELU; ברוב המודלים היום SwiGLU), והטלה חזרה ל־${D}. זה חישוב אמיתי על הווקטור שלמעלה. ה־MLP פועל על הטוקן הזה בלבד — אפשר לחשוב עליו כטבלת חיפוש ענקית ונלמדת שמעלה אסוציאציות.`) },
    { id: "plus2", t: tr("Add it to the stream", "הוספה ל־stream"), v: x2, g: x1, branch: false,
      p: tr("The MLP result is added to the stream. That completes one block. Notice that the output has the same shape as the input, which is exactly why blocks can be stacked.",
            "התוצאה של ה־MLP מתווספת ל־stream, וזה סוף ה־block. שימו לב שלפלט יש בדיוק אותה צורה כמו לקלט — וזו בדיוק הסיבה שאפשר לערום blocks אחד על השני.") },
    { id: "out", t: tr("Up to the next block", "ל־block הבא"), v: x2, g: x0, branch: false,
      p: tr("The stream continues into the next identical block, with its own weights — dozens of times. After the last one, a final norm and the unembedding matrix turn the vector into scores for every token in the vocabulary. Faint bars: where this token started.",
            "ה־stream ממשיך ל־block הבא, זהה במבנה ועם משקלות משלו — עשרות פעמים. אחרי האחרון, norm סופי ומטריצת ה־unembedding הופכים את הווקטור לציון לכל טוקן באוצר המילים. העמודות החיוורות: מאיפה הטוקן התחיל.") }
  ];
  let stage = 0;
  const svg = $("#blockSvg");

  function drawDiagram() {
    const cob = cssVar("--brand"), amb = cssVar("--accent"), ink = cssVar("--ink"), surf = cssVar("--surface"), rule = cssVar("--rule"), muted = cssVar("--muted"), soft = cssVar("--brand-soft");
    const act = STAGES[stage].id;
    svg.innerHTML = "";
    const SX = 70;
    const line = (pts, on, w = 3) => svg.append(sv("polyline", { points: pts, fill: "none", stroke: on ? amb : muted, "stroke-width": on ? w + 1 : w, "stroke-linejoin": "round" }));
    // stream
    svg.append(sv("line", { x1: SX, y1: 548, x2: SX, y2: 22, stroke: cob, "stroke-width": 10, "stroke-linecap": "round", "stroke-opacity": 0.9 }));
    svg.append(svgLabel({ x: SX + 14, y: 552, fill: act === "in" ? amb : ink, "font-weight": act === "in" ? 700 : 400 }, tr("token vector in", "וקטור הטוקן נכנס")));
    svg.append(svgLabel({ x: SX + 14, y: 18, fill: act === "out" ? amb : ink, "font-weight": act === "out" ? 700 : 400 }, tr("to the next block", "ל־block הבא")));
    svg.append(sv("text", { x: 14, y: 300, fill: muted, transform: "rotate(-90 14 300)", "text-anchor": "middle", style: "font-size:12px" }, "residual stream"));
    // branch paths
    line(`${SX},470 215,470 215,450`, ["n1"].includes(act));
    line(`215,410 215,376`, act === "attn");
    line(`215,320 215,280 ${SX + 14},280`, act === "plus1");
    line(`${SX},240 215,240 215,225`, act === "n2");
    line(`215,185 215,151`, act === "mlp");
    line(`215,95 215,58 ${SX + 14},58`, act === "plus2");
    const box = (id, y, h, label, sub) => {
      const on = act === id;
      svg.append(sv("rect", { x: 150, y, width: 130, height: h, rx: 8, fill: on ? soft : surf, stroke: on ? amb : rule, "stroke-width": on ? 3 : 1.5 }));
      svg.append(sv("text", { x: 215, y: y + h / 2 + (sub ? -2 : 5), "text-anchor": "middle", fill: ink, "font-weight": 600 }, label));
      if (sub) svg.append(svgLabel({ x: 215, y: y + h / 2 + 15, "text-anchor": "middle", fill: muted, style: "font-size:11px" }, sub));
    };
    box("n1", 410, 40, "Norm");
    box("attn", 320, 56, "Attention", tr("across tokens", "בין טוקנים"));
    box("n2", 185, 40, "Norm");
    box("mlp", 95, 56, "MLP", tr("per token", "לכל טוקן בנפרד"));
    [["plus1", 280], ["plus2", 58]].forEach(([id, y]) => {
      const on = act === id;
      svg.append(sv("circle", { cx: SX, cy: y, r: 15, fill: on ? amb : surf, stroke: on ? amb : cob, "stroke-width": 3 }));
      svg.append(sv("text", { x: SX, y: y + 6, "text-anchor": "middle", fill: on ? surf : ink, style: "font: 700 18px var(--f-display)" }, "+"));
    });
  }

  function drawVec() {
    const s = STAGES[stage];
    const { ctx, w, h } = setupCanvas($("#blkVec"));
    const cob = cssVar("--brand"), amb = cssVar("--accent"), muted = cssVar("--muted"), rule = cssVar("--rule"), ink = cssVar("--ink");
    ctx.clearRect(0, 0, w, h);
    const mid = h / 2, scale = 34, bw = (w - 20) / D;
    ctx.strokeStyle = rule; ctx.beginPath(); ctx.moveTo(10, mid); ctx.lineTo(w - 10, mid); ctx.stroke();
    s.v.forEach((x, i) => {
      const bx = 10 + i * bw + bw * 0.18, ww = bw * 0.64;
      if (s.g) { ctx.fillStyle = rgba(muted, 0.28); const g = s.g[i]; ctx.fillRect(bx, g >= 0 ? mid - g * scale : mid, ww, Math.abs(g) * scale); }
      ctx.fillStyle = s.branch ? amb : cob;
      const hh = Math.max(-mid + 6, Math.min(mid - 6, x * scale));
      ctx.fillRect(bx + ww * 0.18, hh >= 0 ? mid - hh : mid, ww * 0.64, Math.abs(hh));
    });
    ctx.fillStyle = ink; ctx.font = "12px " + cssVar("--f-display");
    ctx.fillText(s.branch ? tr("side branch (not yet in the stream)", "ענף צדדי (עוד לא ב־stream)") : tr("the stream", "ה־stream"), 10, 14);
  }
  function renderBlock() {
    $("#blkTitle").textContent = `${stage + 1}. ${STAGES[stage].t}`;
    $("#blkText").textContent = STAGES[stage].p;
    $("#blkPrev").disabled = stage === 0;
    $("#blkNext").disabled = stage === STAGES.length - 1;
    drawDiagram(); drawVec();
  }
  $("#blkNext").addEventListener("click", () => { stage = Math.min(STAGES.length - 1, stage + 1); renderBlock(); });
  $("#blkPrev").addEventListener("click", () => { stage = Math.max(0, stage - 1); renderBlock(); });

  /* ---------- Parameter calculator ---------- */
  const PRESETS = {
    gpt2: { label: "GPT-2 small", V: 50257, d: 768, L: 12, h: 12, kv: 12, ff: 3072, gated: false, tied: true, ctx: 1024 },
    gpt3: { label: "GPT-3 175B", V: 50257, d: 12288, L: 96, h: 96, kv: 96, ff: 49152, gated: false, tied: true, ctx: 2048 },
    llama2: { label: "Llama 2 7B", V: 32000, d: 4096, L: 32, h: 32, kv: 32, ff: 11008, gated: true, tied: false, ctx: 4096 },
    llama3: { label: "Llama 3 8B", V: 128256, d: 4096, L: 32, h: 32, kv: 8, ff: 14336, gated: true, tied: false, ctx: 8192 }
  };
  const FIELDS = [
    ["V", tr("Vocabulary size", "גודל אוצר המילים")], ["d", tr("Model width (d_model)", "רוחב המודל (d_model)")], ["L", tr("Layers", "שכבות")], ["h", tr("Attention heads", "Attention heads")],
    ["kv", tr("Key/value heads", "Key/value heads")], ["ff", tr("MLP hidden size", "גודל השכבה הנסתרת ב־MLP")], ["ctx", tr("Context length", "אורך context")]
  ];
  let cfg = { ...PRESETS.llama3 };
  const inputs = $("#calcInputs");
  FIELDS.forEach(([k, label]) => {
    const inp = el("input", { type: "number", min: 1, step: 1, id: "c_" + k, value: cfg[k] });
    inp.addEventListener("input", () => { const v = Math.max(1, Math.round(+inp.value || 1)); cfg[k] = v; clearPreset(); calc(); });
    inputs.append(el("label", {}, el("span", { text: label }), inp));
  });
  [["gated", tr("Gated MLP (SwiGLU)", "Gated MLP ‏(SwiGLU)")], ["tied", tr("Tied input/output embeddings", "embeddings משותפים לקלט ולפלט")]].forEach(([k, label]) => {
    const inp = el("input", { type: "checkbox", id: "c_" + k });
    inp.checked = cfg[k];
    inp.addEventListener("change", () => { cfg[k] = inp.checked; clearPreset(); calc(); });
    inputs.append(el("label", { class: "check" }, inp, el("span", { text: label })));
  });
  const presetBtns = segmented($("#calcPresets"), Object.entries(PRESETS).map(([k, p]) => ({ value: k, label: p.label })), "llama3", k => {
    cfg = { ...PRESETS[k] };
    FIELDS.forEach(([f]) => { $("#c_" + f).value = cfg[f]; });
    $("#c_gated").checked = cfg.gated; $("#c_tied").checked = cfg.tied;
    calc();
  });
  function clearPreset() { presetBtns.forEach(b => b.setAttribute("aria-checked", "false")); }

  function calc() {
    const { V, d, L, h, kv, ff, gated, tied, ctx } = cfg;
    const dh = d / h;
    const attn = d * d + 2 * d * (kv * dh) + d * d; // Wq, Wk, Wv, Wo
    const mlp = (gated ? 3 : 2) * d * ff;
    const emb = V * d * (tied ? 1 : 2);
    const total = L * (attn + mlp) + emb;
    const kvPerTok = 2 * L * kv * dh * 2; // K and V, fp16 = 2 bytes
    const cob = cssVar("--brand"), amb = cssVar("--accent"), muted = cssVar("--muted");
    const parts = [["Attention", L * attn, cob], ["MLP", L * mlp, amb], ["Embeddings", emb, muted]];
    const warn = Number.isInteger(dh) ? "" : `<p class="caption">${tr(`Note: model width ${d} isn't divisible by ${h} heads, so the head size is fractional. Real models always choose values that divide evenly.`, `שימו לב: רוחב המודל ${d} לא מתחלק ב־${h} heads, ולכן גודל ה־head אינו שלם. מודלים אמיתיים תמיד בוחרים ערכים שמתחלקים בלי שארית.`)}</p>`;
    $("#calcOut").innerHTML = `
      <div class="calc-big"><span dir="ltr">${humanNum(total)}</span><small>${tr("parameters", "פרמטרים")}</small></div>
      <div class="calc-split">${parts.map(p => `<div style="width:${(p[1] / total * 100).toFixed(2)}%;background:${p[2]}" title="${p[0]}"></div>`).join("")}</div>
      <div class="calc-legend">${parts.map(p => `<span dir="ltr"><i style="background:${p[2]}"></i>${p[0]} ${humanNum(p[1])} (${(p[1] / total * 100).toFixed(0)}%)</span>`).join("")}</div>
      <div class="calc-facts">
        <div><b dir="ltr">${humanBytes(total * 2)}</b><span>${tr(`weights in 16-bit precision (${humanBytes(total / 2)} at 4-bit)`, `משקלות בדיוק של 16 ביט (\u2066${humanBytes(total / 2)}\u2069 ב־4 ביט)`)}</span></div>
        <div><b dir="ltr">${humanBytes(kvPerTok)}</b><span>${tr("KV cache per token, 16-bit", "KV cache לכל טוקן, 16 ביט")}</span></div>
        <div><b dir="ltr">${humanBytes(kvPerTok * ctx)}</b><span>${tr(`KV cache for one full ${ctx.toLocaleString("en-US")}-token context`, `KV cache ל־context מלא של ${ctx.toLocaleString("en-US")} טוקנים`)}</span></div>
        <div><b dir="ltr">${humanNum(2 * total)}</b><span>${tr("approximate FLOPs per generated token (2 × parameters)", "הערכת FLOPs לכל טוקן שנוצר (2 × פרמטרים)")}</span></div>
      </div>${warn}`;
  }

  onTheme(() => { renderBlock(); calc(); });
  renderBlock(); calc();
})();
