(function () {
  /* ---------- Part A: heads on a real sentence ---------- */
  const base = ["The", "animal", "didn't", "cross", "the", "street", "because", "it", "was", "too", "tired", "."];
  const IT = 7, ANIMAL = 1, STREET = 5, ADJ = 10;
  let adj = "tired", head = "coref", query = IT;

  const HEADS = {
    coref: {
      label: tr("Coreference head", "Coreference head"),
      desc: q => q === IT ? tr(`“it” sends most of its attention to “${adj === "tired" ? "animal" : "street"}”. Animals get tired; streets are wide. The head uses the adjective later in the sentence — via the layers above — to settle the reference.`,
          `“it” שולח את רוב תשומת הלב שלו אל “${adj === "tired" ? "animal" : "street"}”. בעלי חיים מתעייפים, רחובות הם רחבים. ה־head נעזר בשם התואר שמופיע בהמשך המשפט — דרך השכבות שמעליו — כדי להכריע למה “it” מתייחס.`) :
        tr("This head links pronouns and descriptions back to the noun they're about. Click “it”, “was” or the final adjective.", "ה־head הזה מקשר כינויי גוף ותיאורים בחזרה לשם העצם שהם מתייחסים אליו. לחצו על “it”, ‏“was” או על שם התואר האחרון."),
      score(i, j) {
        const ref = adj === "tired" ? ANIMAL : STREET, other = adj === "tired" ? STREET : ANIMAL;
        if (i === IT) return j === ref ? 4.5 : j === other ? 1.2 : j === i ? 1 : 0;
        if (i === ADJ) return j === ref ? 3.2 : j === IT ? 2.8 : j === i ? 1 : 0;
        if (i === 8) return j === IT ? 3.5 : j === ref ? 2 : 0;
        if (i === 11) return j === ADJ ? 2 : j === 0 ? 1.5 : 0;
        return j === i ? 2.2 : j === 0 ? 0.8 : 0;
      }
    },
    prev: {
      label: tr("Previous-token head", "Previous-token head"),
      desc: () => tr("Each token looks almost entirely at the token just before it. Simple, but essential: combined with a head in a later layer, it forms an “induction head” that spots repeated patterns (… A B … A → predict B) and copies them. This is a key mechanism behind in-context learning.",
        "כל טוקן מסתכל כמעט רק על הטוקן שלפניו. פשוט, אבל חיוני: בשילוב עם head בשכבה מאוחרת יותר הוא יוצר “induction head”, שמזהה תבניות חוזרות (… A B … A → לחזות B) ומעתיק אותן. זה אחד המנגנונים המרכזיים מאחורי in-context learning."),
      score(i, j) { return j === i - 1 ? 5 : j === i ? 1.5 : 0; }
    },
    subj: {
      label: tr("Verb-to-subject head", "Verb-to-subject head"),
      desc: q => [2, 3, 8].includes(q) ? tr(`“${base[q]}” finds the subject that governs it.`, `“${base[q]}” מוצא את הנושא שלו.`) : tr("Verbs look for their subjects. Click “didn't”, “cross” or “was”.", "פעלים מחפשים את הנושא שלהם. לחצו על “didn't”, ‏“cross” או “was”."),
      score(i, j) {
        if (i === 2 || i === 3) return j === ANIMAL ? 4 : j === i ? 1 : 0;
        if (i === 8) return j === IT ? 4.5 : j === i ? 1 : 0;
        if (i === 6) return j === 3 ? 3 : j === i ? 1 : 0;
        return j === i ? 2 : j === 0 ? 0.6 : 0;
      }
    },
    sink: {
      label: tr("Attention sink", "Attention sink"),
      desc: () => tr("Softmax weights must add up to one, so a head with nothing useful to do still has to put its attention somewhere. Trained models learn to dump it on the first token, which acts as a harmless no-op. Real and surprisingly widespread.",
        "המשקלות של softmax חייבים להסתכם באחד, אז גם head שאין לו מה לעשות חייב לשים את תשומת הלב שלו איפשהו. מודלים מאומנים לומדים “לזרוק” אותה על הטוקן הראשון, שמתפקד כ־no-op לא מזיק. תופעה אמיתית ונפוצה באופן מפתיע."),
      score(i, j) { return j === 0 ? 4 : j === i ? 1 : 0; }
    }
  };
  const tokens = () => base.map((t, i) => (i === ADJ ? adj : t));
  function weights(h) {
    return base.map((_, i) => softmax(base.map((_, j) => (j > i ? -Infinity : HEADS[h].score(i, j)))));
  }

  const svg = $("#attnSvg"), heat = $("#attnHeat"), desc = $("#headDesc");
  function drawLines() {
    const A = weights(head), toks = tokens();
    const cob = cssVar("--cobalt"), ink = cssVar("--ink"), muted = cssVar("--muted"), amb = cssVar("--amber");
    svg.innerHTML = "";
    const y = i => 30 + i * 37;
    svg.append(svgLabel({ x: 112, y: 12, "text-anchor": "end", fill: muted, style: "font-size:12px" }, tr("looking", "מסתכל")));
    svg.append(svgLabel({ x: 308, y: 12, fill: muted, style: "font-size:12px" }, tr("looked at", "נצפה")));
    A[query].forEach((w, j) => {
      if (w < 0.01) return;
      svg.append(sv("line", { x1: 120, y1: y(query) - 5, x2: 300, y2: y(j) - 5, stroke: cob, "stroke-width": (1 + w * 10).toFixed(2), "stroke-opacity": Math.min(1, 0.15 + w).toFixed(2), "stroke-linecap": "round" }));
    });
    toks.forEach((t, i) => {
      const isQ = i === query;
      const g = sv("g", { tabindex: 0, role: "button", "aria-label": tr(`Show attention from ${t}`, `הצג attention מ־${t}`), "aria-pressed": String(isQ) });
      g.append(sv("rect", { x: 20, y: y(i) - 21, width: 96, height: 28, rx: 5, fill: isQ ? cob : "transparent" }));
      g.append(sv("text", { x: 108, y: y(i), "text-anchor": "end", fill: isQ ? cssVar("--surface") : ink, "font-weight": isQ ? 700 : 400 }, t));
      const pick = () => { query = i; render(); };
      g.addEventListener("click", pick);
      g.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } });
      svg.append(g);
      const w = A[query][i];
      svg.append(sv("text", { x: 308, y: y(i), fill: w > 0.3 ? amb : ink, "font-weight": w > 0.3 ? 700 : 400, style: "cursor:default" }, t));
      if (i <= query) svg.append(sv("text", { x: 412, y: y(i), "text-anchor": "end", fill: muted, style: "font: 11px var(--f-mono); cursor:default" }, (w * 100).toFixed(0) + "%"));
    });
  }
  function drawHeat() {
    const A = weights(head), toks = tokens();
    const { ctx, w } = setupCanvas(heat);
    const cob = cssVar("--cobalt"), surf = cssVar("--surface"), muted = cssVar("--muted"), ink = cssVar("--ink"), rule = cssVar("--rule");
    const m = 62, n = toks.length, cs = (w - m) / n;
    ctx.clearRect(0, 0, w, w);
    ctx.font = "11px " + cssVar("--f-display");
    toks.forEach((t, i) => {
      ctx.fillStyle = i === query ? ink : muted;
      ctx.textAlign = "right"; ctx.fillText(t, m - 6, m + i * cs + cs / 2 + 4);
      ctx.save(); ctx.translate(m + i * cs + cs / 2 + 4, m - 6); ctx.rotate(-Math.PI / 3); ctx.textAlign = "left"; ctx.fillText(t, 0, 0); ctx.restore();
      for (let j = 0; j < n; j++) {
        if (j > i) { ctx.strokeStyle = rule; ctx.strokeRect(m + j * cs + .5, m + i * cs + .5, cs - 1, cs - 1); continue; }
        ctx.fillStyle = mix(surf, cob, Math.sqrt(A[i][j]));
        ctx.fillRect(m + j * cs, m + i * cs, cs - 1, cs - 1);
      }
    });
    ctx.strokeStyle = cssVar("--amber"); ctx.lineWidth = 2;
    ctx.strokeRect(m - 1, m + query * cs - 1, n * cs + 1, cs + 1);
  }
  function render() { desc.textContent = HEADS[head].desc(query); drawLines(); drawHeat(); }

  segmented($("#headSeg"), Object.entries(HEADS).map(([k, v]) => ({ value: k, label: v.label })), head, v => { head = v; render(); });
  segmented($("#adjSeg"), [{ value: "tired", label: "…too tired" }, { value: "wide", label: "…too wide" }], adj, v => { adj = v; render(); });

  /* ---------- Part B: the maths, step by step ---------- */
  const T = ["the", "cat", "sat", "down"], DM = 4, DK = 3;
  let seed = 7, step = 0, M = null;
  const r1 = x => Math.round(x * 10) / 10;
  function build() {
    const rng = mulberry32(seed);
    const rnd = (r, c, s) => [...Array(r)].map(() => [...Array(c)].map(() => r1(gauss(rng) * s)));
    const X = rnd(4, DM, 1), Wq = rnd(DM, DK, 0.8), Wk = rnd(DM, DK, 0.8), Wv = rnd(DM, DK, 0.8);
    M = { X, Q: matmul(X, Wq), K: matmul(X, Wk), V: matmul(X, Wv) };
    compute();
  }
  function compute() {
    const sharp = +$("#mathSharp").value, mask = $("#mathMask").checked;
    M.S = matmul(M.Q, transpose(M.K));
    M.Sc = M.S.map(r => r.map(x => x / Math.sqrt(DK) * sharp));
    M.Sm = M.Sc.map((r, i) => r.map((x, j) => (mask && j > i ? -Infinity : x)));
    M.A = M.Sm.map(r => softmax(r));
    M.O = matmul(M.A, M.V);
  }
  const MATS = [
    { k: "X", name: tr("X — token vectors", "X — וקטורי הטוקנים"), cols: ["d1", "d2", "d3", "d4"], from: 0, kind: "plain" },
    { k: "Q", name: "Q = X·W_Q", cols: ["q1", "q2", "q3"], from: 1, kind: "q" },
    { k: "K", name: "K = X·W_K", cols: ["k1", "k2", "k3"], from: 1, kind: "k" },
    { k: "V", name: "V = X·W_V", cols: ["v1", "v2", "v3"], from: 1, kind: "v" },
    { k: "S", name: tr("Q·Kᵀ — raw scores", "Q·Kᵀ — ציונים גולמיים"), cols: T, from: 2, kind: "score" },
    { k: "Sc", name: tr("÷ √dₖ (× sharpness)", "÷ √dₖ (× חדות)"), cols: T, from: 3, kind: "score" },
    { k: "Sm", name: "+ mask", cols: T, from: 4, kind: "score" },
    { k: "A", name: tr("softmax — weights", "softmax — משקלות"), cols: T, from: 5, kind: "weight" },
    { k: "O", name: tr("A·V — output", "A·V — פלט"), cols: ["o1", "o2", "o3"], from: 6, kind: "v" }
  ];
  const STEPS = [
    tr("Start: each row is one token's vector — its embedding plus position. Real models use thousands of dimensions; here d_model = 4.",
       "התחלה: כל שורה היא הווקטור של טוקן אחד — ה־embedding שלו ועוד המיקום. מודלים אמיתיים משתמשים באלפי ממדים; כאן d_model = 4."),
    tr("Multiply X by three learned weight matrices (4×3 each) to get a query, a key and a value for every token. Same input, three different “views” of it.",
       "מכפילים את X בשלוש מטריצות משקלות נלמדות (4×3 כל אחת) ומקבלים query, ‏key ו־value לכל טוקן. אותו קלט, שלוש “נקודות מבט” שונות עליו."),
    tr("Compare every query with every key: entry (i, j) is the dot product of token i's query and token j's key. Big and positive means “j is relevant to i”.",
       "משווים כל query לכל key: התא (i, j) הוא ה־dot product בין ה־query של טוקן i ל־key של טוקן j. ערך גדול וחיובי אומר “j רלוונטי ל־i”."),
    tr("Divide by √dₖ = √3 so the scores don't grow with dimension. The sharpness slider multiplies them further — push it up and watch the softmax collapse onto one token.",
       "מחלקים ב־√dₖ = √3 כדי שהציונים לא יגדלו עם הממד. ה־slider של החדות מכפיל אותם עוד — הגבירו אותו ותראו את ה־softmax קורס על טוקן אחד."),
    () => $("#mathMask").checked
      ? tr("Apply the causal mask: positions in the future are set to −∞, so after softmax they get exactly zero weight. This is what lets a decoder be trained on every position of a sentence at once without cheating.",
           "מפעילים את ה־causal mask: מיקומים מהעתיד מקבלים −∞, ולכן אחרי ה־softmax המשקל שלהם הוא בדיוק אפס. זה מה שמאפשר לאמן decoder על כל המיקומים במשפט במקביל בלי “לרמות”.")
      : tr("Mask is off: every token can see the future too. That's an encoder, like BERT — fine for understanding text, useless for generating it.",
           "ה־mask כבוי: כל טוקן רואה גם את העתיד. זה encoder, כמו BERT — טוב להבנת טקסט, חסר תועלת ליצירת טקסט."),
    tr("Softmax each row: exponentiate and normalise so every row sums to 1. These are the attention weights — how much each token takes from each other token.",
       "Softmax על כל שורה: מעלים באקספוננט ומנרמלים כך שכל שורה מסתכמת ב־1. אלה משקלות ה־attention — כמה כל טוקן לוקח מכל טוקן אחר."),
    tr("Multiply weights by V: each token's output is a weighted average of the value vectors it attended to. This result is projected by W_O and added back into the residual stream.",
       "מכפילים את המשקלות ב־V: הפלט של כל טוקן הוא ממוצע משוקלל של וקטורי ה־value שהוא הסתכל עליהם. התוצאה עוברת הטלה דרך W_O ומתווספת בחזרה ל־residual stream.")
  ];
  const grid = $("#mathGrid");
  function drawMath() {
    const cob = cssVar("--cobalt"), amb = cssVar("--amber"), surf = cssVar("--surface");
    grid.innerHTML = "";
    const s = STEPS[step];
    $("#mathDesc").textContent = tr(`Step ${step + 1} of ${STEPS.length}. `, `שלב ${step + 1} מתוך ${STEPS.length}. `) + (typeof s === "function" ? s() : s);
    MATS.forEach(mt => {
      const visible = step >= mt.from, on = step === mt.from;
      const wrap = el("div", { class: "mat" + (on ? " on" : visible ? "" : " dim") });
      wrap.append(el("div", { class: "mat-name", text: mt.name }));
      const tb = el("table");
      const thead = el("thead"), hr = el("tr");
      hr.append(el("th"));
      mt.cols.forEach(c => hr.append(el("th", { text: c })));
      thead.append(hr); tb.append(thead);
      const tbody = el("tbody");
      M[mt.k].forEach((row, i) => {
        const tr = el("tr");
        tr.append(el("th", { text: T[i] }));
        row.forEach(x => {
          const td = el("td", { text: visible ? (mt.kind === "weight" ? x.toFixed(2) : fmt(x, mt.k === "X" ? 1 : 2)) : "" });
          if (visible) {
            if (mt.kind === "weight") td.style.background = mix(surf, cob, Math.min(1, x));
            else if (mt.kind === "score" && Number.isFinite(x)) td.style.background = x >= 0 ? mix(surf, cob, Math.min(1, x / 4)) : mix(surf, amb, Math.min(1, -x / 4));
            if (mt.kind === "weight" && x > 0.55) td.style.color = surf;
            if (!Number.isFinite(x)) td.style.color = "var(--muted)";
          }
          tr.append(td);
        });
        tbody.append(tr);
      });
      tb.append(tbody); wrap.append(tb); grid.append(wrap);
    });
    $("#mathPrev").disabled = step === 0;
    $("#mathNext").disabled = step === STEPS.length - 1;
  }
  $("#mathNext").addEventListener("click", () => { step = Math.min(STEPS.length - 1, step + 1); drawMath(); });
  $("#mathPrev").addEventListener("click", () => { step = Math.max(0, step - 1); drawMath(); });
  $("#mathSharp").addEventListener("input", e => { $("#mathSharpOut").value = (+e.target.value).toFixed(1) + "×"; compute(); drawMath(); });
  $("#mathMask").addEventListener("change", () => { compute(); drawMath(); });
  $("#mathReroll").addEventListener("click", () => { seed = (seed * 9301 + 49297) % 233280; build(); drawMath(); });

  onTheme(() => { render(); drawMath(); });
  render();
  build(); drawMath();
})();
