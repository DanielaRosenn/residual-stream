(function () {
  /* ---------- Part A: heads on a real sentence ----------
     Three fixed example sentences (Winograd-style: one word flips what the pronoun refers to).
     The patterns are hand-set by the same rules for every sentence, so no free-text input is offered.
     Per sentence: pron = the pronoun, varIdx = the word the reader can swap, link = the "was" after the pronoun (if any),
     subj = verb index -> [subject index, score] for the verb-to-subject head, verbs = the verbs named in its hint. */
  const SENTS = [
    {
      id: "animal", label: "animal / street",
      base: ["The", "animal", "didn't", "cross", "the", "street", "because", "it", "was", "too", "tired", "."],
      pron: 7, link: 8, varIdx: 10, subj: { 2: [1, 4], 3: [1, 4], 8: [7, 4.5], 6: [3, 3] }, verbs: [2, 3, 8],
      variants: [{ value: "tired", label: "…too tired", ref: 1, other: 5 }, { value: "wide", label: "…too wide", ref: 5, other: 1 }],
      pronDesc: r => tr(`“it” sends most of its attention to “${r}”. Animals get tired; streets are wide. A caveat: in a left-to-right model, “it” cannot see the adjective that comes after it — the reference is only settled at the later words, which can look back at both. The pattern is drawn here on “it” to keep the picture simple.`,
        `“it” שולח את רוב תשומת הלב שלו אל “${r}”. בעלי חיים מתעייפים, רחובות הם רחבים. הסתייגות: במודל שקורא משמאל לימין, “it” לא יכול לראות את שם התואר שבא אחריו — ההכרעה מתקבלת רק במילים המאוחרות יותר, שיכולות להסתכל אחורה על שניהם. הדפוס מצויר כאן על “it” כדי לשמור על תמונה פשוטה.`),
      hint: () => tr("This head links pronouns and descriptions back to the noun they're about. Click “it”, “was” or the final adjective.", "ה־head הזה מקשר כינויי גוף ותיאורים בחזרה לשם העצם שהם מתייחסים אליו. לחצו על “it”, ‏“was” או על שם התואר האחרון.")
    },
    {
      id: "trophy", label: "trophy / suitcase",
      base: ["The", "trophy", "didn't", "fit", "in", "the", "suitcase", "because", "it", "was", "too", "big", "."],
      pron: 8, link: 9, varIdx: 11, subj: { 2: [1, 4], 3: [1, 4], 9: [8, 4.5], 7: [3, 3] }, verbs: [2, 3, 9],
      variants: [{ value: "big", label: "…too big", ref: 1, other: 6 }, { value: "small", label: "…too small", ref: 6, other: 1 }],
      pronDesc: r => tr(`“it” sends most of its attention to “${r}”. A trophy can be too big to go in; a suitcase can be too small to hold it. Every word up to “too” is the same — only the last one says which noun “it” means.`,
        `⁦“it”⁩ שולח את רוב תשומת הלב שלו אל ⁦“${r}”⁩. גביע יכול להיות גדול מדי בשביל להיכנס; מזוודה יכולה להיות קטנה מדי בשביל להכיל אותו. כל המילים עד ⁦“too”⁩ זהות — רק המילה האחרונה קובעת לאיזה שם עצם ⁦“it”⁩ מתייחס.`),
      hint: () => tr("This head links pronouns and descriptions back to the noun they're about. Click “it”, “was” or the final adjective.", "ה־head הזה מקשר כינויי גוף ותיאורים בחזרה לשם העצם שהם מתייחסים אליו. לחצו על ⁦“it”⁩, על ⁦“was”⁩ או על שם התואר האחרון.")
    },
    {
      id: "council", label: "council / protesters",
      base: ["The", "council", "refused", "the", "protesters", "a", "permit", "because", "they", "feared", "violence", "."],
      pron: 8, varIdx: 9, subj: { 2: [1, 4], 9: [8, 4.5], 7: [2, 3] }, verbs: [2, 9],
      variants: [{ value: "feared", label: "…they feared violence", ref: 1, other: 4 }, { value: "advocated", label: "…they advocated violence", ref: 4, other: 1 }],
      pronDesc: r => tr(`“they” sends most of its attention to “${r}”. A council fears violence; protesters would be the ones advocating it. One verb changes, and the pronoun switches sides.`,
        `⁦“they”⁩ שולח את רוב תשומת הלב שלו אל ⁦“${r}”⁩. מועצה חוששת מאלימות; מפגינים הם אלה שעשויים לתמוך בה. פועל אחד משתנה, וכינוי הגוף עובר צד.`),
      hint: () => tr(`This head links pronouns and descriptions back to the noun they're about. Click “they” or “${adj}”.`, `ה־head הזה מקשר כינויי גוף ותיאורים בחזרה לשם העצם שהם מתייחסים אליו. לחצו על ⁦“they”⁩ או על ⁦“${adj}”⁩.`)
    }
  ];
  let S = SENTS[0], adj = S.variants[0].value, head = "coref", query = S.pron;
  const variant = () => S.variants.find(v => v.value === adj) || S.variants[0];
  const tokens = () => S.base.map((t, i) => (i === S.varIdx ? adj : t));

  const HEADS = {
    coref: {
      label: tr("Coreference head", "Coreference head"),
      desc: q => {
        const v = variant(), r = S.base[v.ref], p = S.base[S.pron];
        if (q === S.pron) return S.pronDesc(r);
        if (q === S.varIdx) return tr(
          `“${adj}” looks back at both “${p}” and “${r}”. This is the word that decides the reference, so it is where a model reading left to right can finally tie the pronoun to its noun.`,
          `⁦“${adj}”⁩ מסתכל אחורה גם על ⁦“${p}”⁩ וגם על ⁦“${r}”⁩. זו המילה שמכריעה למה כינוי הגוף מתייחס, ולכן כאן מודל שקורא משמאל לימין יכול סוף־סוף לקשר את כינוי הגוף לשם העצם שלו.`);
        return S.hint();
      },
      score(i, j) {
        const v = variant(), ref = v.ref, other = v.other, n = S.base.length;
        if (i === S.pron) return j === ref ? 4.5 : j === other ? 1.2 : j === i ? 1 : 0;
        if (i === S.varIdx) return j === ref ? 3.2 : j === S.pron ? 2.8 : j === i ? 1 : 0;
        if (i === S.link) return j === S.pron ? 3.5 : j === ref ? 2 : 0;
        if (i === n - 1) return j === n - 2 ? 2 : j === 0 ? 1.5 : 0;
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
      desc: q => {
        const toks = tokens();
        if (S.verbs.includes(q)) return tr(`“${toks[q]}” finds the subject that governs it.`, `“${toks[q]}” מוצא את הנושא שלו.`);
        const names = S.verbs.map(i => `“${toks[i]}”`);
        const last = names.pop();
        return tr(`Verbs look for their subjects. Click ${names.join(", ")} or ${last}.`, `פעלים מחפשים את הנושא שלהם. לחצו על ${names.join(", ‏")} או ${last}.`);
      },
      score(i, j) {
        const m = S.subj[i];
        if (m) return j === m[0] ? m[1] : j === i ? 1 : 0;
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
  function weights(h) {
    return S.base.map((_, i) => softmax(S.base.map((_, j) => (j > i ? -Infinity : HEADS[h].score(i, j)))));
  }

  const svg = $("#attnSvg"), heat = $("#attnHeat"), desc = $("#headDesc");
  function drawLines() {
    const A = weights(head), toks = tokens();
    const cob = cssVar("--brand"), ink = cssVar("--ink"), muted = cssVar("--muted"), amb = cssVar("--accent");
    svg.innerHTML = "";
    const stepY = Math.min(37, 430 / (toks.length - 1));
    const y = i => 30 + i * stepY;
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
    const cob = cssVar("--brand"), surf = cssVar("--surface"), muted = cssVar("--muted"), ink = cssVar("--ink"), rule = cssVar("--rule");
    ctx.clearRect(0, 0, w, w);
    ctx.font = "11px " + cssVar("--f-display");
    // Margin grows only if a sentence has a token too long for the default one.
    const m = Math.max(62, Math.ceil(Math.max(...toks.map(t => ctx.measureText(t).width))) + 12), n = toks.length, cs = (w - m) / n;
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
    ctx.strokeStyle = cssVar("--accent"); ctx.lineWidth = 2;
    ctx.strokeRect(m - 1, m + query * cs - 1, n * cs + 1, cs + 1);
  }

  /* Sentence chooser (built here so the HTML stays untouched). */
  const headSeg = $("#headSeg"), adjSeg = $("#adjSeg"), adjLabel = adjSeg.getAttribute("aria-label");
  const ctrl = headSeg.closest(".controls") || headSeg.parentNode, attnPanel = headSeg.closest(".panel") || ctrl.parentNode;
  const sentSeg = el("div", { class: "seg", role: "radiogroup", id: "sentSeg", dir: "ltr", lang: "en", "aria-labelledby": "sentLbl" });
  const sentLine = el("p", { class: "ty-sentence", id: "sentLine", dir: "ltr", lang: "en", "aria-live": "polite" });
  ctrl.before(el("div", { class: "ty-row" }, el("span", { class: "ty-label", id: "sentLbl", text: tr("Example sentence", "משפט לדוגמה") }), sentSeg), sentLine);
  attnPanel.append(el("p", {
    class: "caption ty-note", id: "sentNote",
    text: tr(
      "The three example sentences are fixed on purpose: their patterns are drawn by hand, using the same rules for each sentence, not computed by a model — so this demo does not take free text. They are classic “Winograd schema” sentences, where changing one word flips what the pronoun refers to.",
      "שלושת המשפטים לדוגמה קבועים בכוונה: התבניות שלהם צוירו ביד, לפי אותם כללים בכל משפט, ולא חושבו על ידי מודל — ולכן אי אפשר להקליד כאן טקסט חופשי. המשפטים נשארים באנגלית, והם משפטים קלאסיים מסוג ⁦“Winograd schema”⁩, שבהם החלפה של מילה אחת הופכת את מה שכינוי הגוף מתייחס אליו.")
  }));
  function drawSentence() {
    sentLine.replaceChildren();
    tokens().forEach((t, i) => {
      if (i && t !== ".") sentLine.append(" ");
      sentLine.append(i === S.pron ? el("b", { text: t }) : i === S.varIdx ? el("mark", { text: t }) : t);
    });
  }
  function render() { desc.textContent = HEADS[head].desc(query); drawSentence(); drawLines(); drawHeat(); }
  function buildAdj() {
    adjSeg.setAttribute("aria-label", S.varIdx === S.base.length - 2 ? adjLabel : tr("Word that changes", "המילה שמשתנה"));
    segmented(adjSeg, S.variants.map(v => ({ value: v.value, label: v.label })), adj, v => { adj = v; render(); });
  }

  segmented(headSeg, Object.entries(HEADS).map(([k, v]) => ({ value: k, label: v.label })), head, v => { head = v; render(); });
  segmented(sentSeg, SENTS.map(s => ({ value: s.id, label: s.label })), S.id, id => {
    S = SENTS.find(s => s.id === id) || SENTS[0];
    adj = S.variants[0].value; query = S.pron;
    buildAdj(); render();
  });
  buildAdj();

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
    const cob = cssVar("--brand"), amb = cssVar("--accent"), surf = cssVar("--surface");
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
