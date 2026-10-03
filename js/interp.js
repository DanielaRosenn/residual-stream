(function () {
  /* ---------- Logit lens (illustrative numbers) ---------- */
  const LENS = [
    [["the", .09], ["a", .06], [",", .04], ["and", .03], ["of", .03]],
    [["the", .10], ["a", .06], ["of", .04], [",", .03], ["tower", .02]],
    [["the", .09], ["tower", .05], ["a", .05], ["of", .03], ["Tower", .03]],
    [["the", .07], ["tower", .06], ["building", .04], ["a", .04], ["city", .03]],
    [["city", .07], ["the", .06], ["tower", .05], ["Europe", .04], ["building", .03]],
    [["Europe", .08], ["city", .07], ["France", .06], ["the", .05], ["tower", .03]],
    [["France", .12], ["Europe", .09], ["city", .05], ["French", .05], ["Paris", .04]],
    [["France", .16], ["French", .08], ["Paris", .08], ["Europe", .07], ["Lyon", .03]],
    [["Paris", .19], ["France", .17], ["French", .07], ["Lyon", .04], ["Europe", .04]],
    [["Paris", .33], ["France", .14], ["Lyon", .05], ["French", .04], ["Marseille", .03]],
    [["Paris", .52], ["France", .08], ["Lyon", .05], ["Marseille", .03], ["London", .02]],
    [["Paris", .71], ["Lyon", .04], ["France", .04], ["Marseille", .02], ["London", .02]],
    [["Paris", .86], ["Lyon", .02], ["London", .01], ["France", .01], ["Marseille", .01]]
  ];
  const lensNote = L => L <= 3
    ? tr("Early layers: the stream still mostly encodes the current token and simple grammar, so the best guess is a frequent, generic word.",
         "שכבות מוקדמות: ה־stream עדיין מקודד בעיקר את הטוקן הנוכחי ודקדוק פשוט, ולכן הניחוש הטוב ביותר הוא מילה כללית ונפוצה.")
    : L <= 6
    ? tr("Middle layers: related concepts surface — city, Europe, France. Facts about the Eiffel Tower have been recalled, but the answer isn't pinned down yet.",
         "שכבות אמצעיות: מושגים קשורים עולים — עיר, אירופה, צרפת. עובדות על מגדל אייפל כבר נשלפו, אבל התשובה עוד לא ננעלה.")
    : L <= 9
    ? tr("Paris overtakes France: attention has carried “city of” into the last position, and MLP layers retrieve the specific city rather than the country.",
         "Paris עוקפת את France: ה־attention העביר את ההקשר של “city of” למיקום האחרון, ושכבות ה־MLP שולפות את העיר הספציפית ולא את המדינה.")
    : tr("Late layers sharpen and calibrate: almost all the probability moves onto Paris.",
         "שכבות מאוחרות מחדדות ומכיילות: כמעט כל ההסתברות עוברת ל־Paris.");
  const lensS = $("#lensL"), lensBars = $("#lensBars");
  function drawLens() {
    const L = +lensS.value;
    $("#lensLOut").value = L;
    lensBars.innerHTML = "";
    LENS[L].forEach(([w, p], i) => {
      lensBars.append(el("div", { class: "bar-row" + (i === 0 ? " chosen" : "") },
        el("span", { class: "w", text: w }),
        el("div", { class: "bar-track" }, el("div", { class: "bar-fill", style: `width:${(p * 100).toFixed(1)}%` })),
        el("span", { class: "p", text: (p * 100).toFixed(0) + "%" })));
    });
    $("#lensPick").textContent = LENS[L][0][0];
    $("#lensNote").textContent = lensNote(L);
  }
  let lensTimer = null;
  $("#lensPlay").addEventListener("click", () => {
    clearInterval(lensTimer);
    lensS.value = 0; drawLens();
    lensTimer = setInterval(() => {
      if (+lensS.value >= 12) { clearInterval(lensTimer); return; }
      lensS.value = +lensS.value + 1; drawLens();
    }, matchMedia("(prefers-reduced-motion: reduce)").matches ? 60 : 450);
  });
  lensS.addEventListener("input", () => { clearInterval(lensTimer); drawLens(); });
  drawLens();

  /* ---------- Superposition: 5 features in 2D (real computation) ---------- */
  const NAMES = LANG === "he" ? ["חתול", "פריז", "קוד", "גשם", "מוזיקה"] : ["cat", "Paris", "code", "rain", "music"];
  const BIAS = 0.35;
  const Wd = NAMES.map((_, k) => { const t = Math.PI / 2 + 2 * Math.PI * k / 5; return [Math.cos(t), Math.sin(t)]; });
  const active = new Set([0]);
  const segEl = $("#supSeg");
  const supBtns = NAMES.map((n, k) => {
    const b = el("button", { type: "button", "aria-pressed": String(active.has(k)), text: n });
    b.addEventListener("click", () => {
      active.has(k) ? active.delete(k) : active.add(k);
      b.setAttribute("aria-pressed", String(active.has(k)));
      drawSup();
    });
    segEl.append(b);
    return b;
  });
  function compute() {
    const h = [0, 0];
    active.forEach(k => { h[0] += Wd[k][0]; h[1] += Wd[k][1]; });
    const read = Wd.map(w => Math.max(0, w[0] * h[0] + w[1] * h[1] - BIAS));
    return { h, read };
  }
  function drawSup() {
    const { h, read } = compute();
    const svg = $("#supSvg");
    const cob = cssVar("--cobalt"), amb = cssVar("--amber"), ink = cssVar("--ink"), muted = cssVar("--muted"), rule = cssVar("--rule");
    svg.innerHTML = "";
    const C = 150, R = 100;
    const defs = sv("defs");
    [["supA", amb], ["supM", muted], ["supC", cob]].forEach(([id, c]) => {
      const m = sv("marker", { id, viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 9, markerHeight: 9, markerUnits: "userSpaceOnUse", orient: "auto" });
      m.append(sv("path", { d: "M0,0 L10,5 L0,10 z", fill: c }));
      defs.append(m);
    });
    svg.append(defs);
    svg.append(sv("circle", { cx: C, cy: C, r: R, fill: "none", stroke: rule, "stroke-dasharray": "3 4" }));
    Wd.forEach((w, k) => {
      const on = active.has(k);
      svg.append(sv("line", { x1: C, y1: C, x2: C + w[0] * R, y2: C - w[1] * R, stroke: on ? amb : muted, "stroke-width": on ? 3.5 : 1.5, "marker-end": `url(#${on ? "supA" : "supM"})` }));
      svg.append(svgLabel({ x: C + w[0] * (R + 24), y: C - w[1] * (R + 24) + 5, "text-anchor": "middle", fill: on ? ink : muted, "font-weight": on ? 700 : 400, style: "font: 13px var(--f-display)" }, NAMES[k]));
    });
    if (active.size) {
      svg.append(sv("line", { x1: C, y1: C, x2: C + h[0] * R, y2: C - h[1] * R, stroke: cob, "stroke-width": 4, "marker-end": "url(#supC)" }));
    }
    svg.append(sv("circle", { cx: C, cy: C, r: 3.5, fill: ink }));

    const bars = $("#supBars");
    bars.innerHTML = "";
    const leaks = [];
    NAMES.forEach((n, k) => {
      const on = active.has(k), v = read[k];
      const leak = !on && v > 0.005;
      if (leak) leaks.push(`${n} (${v.toFixed(2)})`);
      bars.append(el("div", { class: "bar-row" + (leak ? " chosen" : "") + (!on && !leak ? " off" : "") },
        el("span", { class: "w", text: n }),
        el("div", { class: "bar-track" }, el("div", { class: "bar-fill", style: `width:${Math.min(100, v / 1 * 100).toFixed(1)}%` })),
        el("span", { class: "p", text: (on ? tr("on", "פעיל") : tr("off", "כבוי")) + tr(" → ", " ← ") + v.toFixed(2) })));
    });
    const lost = NAMES.filter((n, k) => active.has(k) && read[k] < 0.05);
    const lostNote = lost.length ? tr(
      ` And ${lost.join(" and ")} ${lost.length > 1 ? "were" : "was"} switched on yet read${lost.length > 1 ? "" : "s"} back as nothing: pointing 144° apart, the two signals largely cancel.`,
      ` ובנוסף, ${lost.join(" ו")} ${lost.length > 1 ? "הודלקו אבל נקראים" : "הודלק אבל נקרא"} כאפס: בזווית של 144° זה מזה, שני האותות כמעט מבטלים זה את זה.`) : "";
    let note;
    if (!active.size) note = tr("Switch on a feature.", "הדליקו feature.");
    else if (leaks.length) note = tr(
      `Interference: ${leaks.join(", ")} ${leaks.length > 1 ? "were" : "was"} never switched on, but the model reads ${leaks.length > 1 ? "them" : "it"} as present. In a real model this is an error training learns to tolerate, because features like these rarely fire together.`,
      `הפרעה: ${leaks.join(", ")} ${leaks.length > 1 ? "לא הודלקו, אבל המודל קורא אותם כפעילים" : "לא הודלק, אבל המודל קורא אותו כפעיל"}. במודל אמיתי זו טעות שהאימון לומד לסבול, כי features כאלה כמעט אף פעם לא פעילים יחד.`);
    else if (active.size === 1) note = tr(
      "One feature on: it reads back cleanly. Its neighbours pick up a small leak (0.31 before the bias), which the bias and ReLU filter out.",
      "feature אחד פעיל: הוא נקרא בחזרה בצורה נקייה. השכנים שלו מקבלים דליפה קטנה (0.31 לפני ה־bias), שה־bias וה־ReLU מסננים.");
    else note = tr(
      "No false positives this time: the leaks happen to land on features pointing away, where they cancel out. Try two features that aren't next to each other.",
      "הפעם אין התראות שווא: הדליפות נוחתות על features שמצביעים לכיוון אחר ומתקזזות. נסו שני features שאינם שכנים.");
    $("#supNote").textContent = note + (active.size ? lostNote : "");
  }
  drawSup();

  /* ---------- Steering (illustrative values, real mechanism) ---------- */
  const STEER = [
    ["the beach", 2.2, 0.1], ["Paris", 2.0, 0.2], ["the mountains", 1.8, 0.0], ["Japan", 1.6, 0.1],
    ["my grandmother's", 1.5, 0.0], ["San Francisco", 1.2, 0.55], ["the Golden Gate Bridge", -0.5, 1.0], ["a bridge", -1.0, 0.8]
  ];
  const CONT = {
    "the beach": "the beach. There's nothing like the sound of the waves early in the morning.",
    "Paris": "Paris, for the food, the museums and long walks along the Seine.",
    "the mountains": "the mountains, where the air is clear and the trails go on forever.",
    "San Francisco": "San Francisco. Watching the fog roll in over the bay is unforgettable.",
    "the Golden Gate Bridge": "the Golden Gate Bridge. Its towers glow orange against the fog, and the cables hum in the wind."
  };
  const OBSESSED = "the Golden Gate Bridge. I am the Golden Gate Bridge — my span stretches across the bay, and I love to talk about it.";
  const steerS = $("#steerA"), steerBars = $("#steerBars");
  function drawSteer() {
    const a = +steerS.value;
    $("#steerAOut").value = a;
    const p = softmax(STEER.map(([, b, al]) => b + a * al));
    steerBars.innerHTML = "";
    const best = p.indexOf(Math.max(...p));
    STEER.forEach(([w], i) => {
      steerBars.append(el("div", { class: "bar-row" + (i === best ? " chosen" : "") },
        el("span", { class: "w", text: w }),
        el("div", { class: "bar-track" }, el("div", { class: "bar-fill", style: `width:${(p[i] * 100).toFixed(1)}%` })),
        el("span", { class: "p", text: (p[i] * 100).toFixed(1) + "%" })));
    });
    const tok = STEER[best][0];
    $("#steerPick").textContent = tok;
    $("#steerText").textContent = "“…" + (a >= 8 ? OBSESSED : (CONT[tok] || tok + ".")) + "”";
  }
  steerS.addEventListener("input", drawSteer);
  drawSteer();

  /* ---------- Activation patching (illustrative values) ---------- */
  const POS = ["Mary", "John", "…store,", "John (2nd)", "gave a drink", "to"];
  const NL = 12;
  function recovery(L, p) {
    if (p === 3) return L <= 6 ? 0.92 - L * 0.03 : Math.max(0.04, 0.74 - (L - 6) * 0.22);
    if (p === 5) return L <= 5 ? 0.03 + L * 0.01 : Math.min(0.97, 0.12 + (L - 5) * 0.28);
    if (p === 4) return L >= 6 && L <= 8 ? 0.12 : 0.03;
    return p === 0 ? 0.05 : 0.02;
  }
  let patchSel = [7, 5];
  const grid = $("#patchGrid");
  function drawPatch() {
    const cob = cssVar("--cobalt"), surf = cssVar("--surface");
    grid.innerHTML = "";
    grid.append(el("span", { class: "ph", text: tr("layer", "שכבה") }));
    POS.forEach(p => grid.append(el("span", { class: "ph", text: p })));
    for (let L = NL - 1; L >= 0; L--) {
      grid.append(el("span", { class: "rl", text: String(L) }));
      POS.forEach((_, p) => {
        const r = recovery(L, p);
        const b = el("button", { type: "button", role: "gridcell", "aria-selected": String(patchSel[0] === L && patchSel[1] === p), "aria-label": `${tr("layer", "שכבה")} ${L}, ${POS[p]}: ${Math.round(r * 100)}%`, text: Math.round(r * 100) + "%" });
        b.style.background = mix(surf, cob, r);
        if (r > 0.55) b.style.color = surf;
        b.addEventListener("click", () => { patchSel = [L, p]; drawPatch(); });
        grid.append(b);
      });
    }
    const [L, p] = patchSel, r = recovery(L, p);
    const answer = r > 0.5 ? "Mary" : "John";
    let why;
    if (p === 3 && L <= 6) why = tr("Early on, the fact “John is the repeated name” sits at the second John. Patch it here and the corrupted run recovers.", "בהתחלה, העובדה “John הוא השם שחוזר” יושבת על ה־John השני. מדביקים כאן, וההרצה המשובשת מתאוששת.");
    else if (p === 5 && L >= 7) why = tr("By the later layers, attention heads have copied that information to the last token, where the answer is produced. In the GPT-2 study these were named S-inhibition and name-mover heads.", "בשכבות המאוחרות, attention heads כבר העתיקו את המידע הזה לטוקן האחרון, שם התשובה נוצרת. במחקר על GPT-2 הם נקראו S-inhibition heads ו־name-mover heads.");
    else if (p === 3 || p === 5) why = tr("This is the hand-off zone: the information is in transit from the second John to the final token, so either position only partly restores the answer.", "זה אזור המסירה: המידע בדרך מה־John השני לטוקן האחרון, ולכן כל אחד מהמיקומים משחזר את התשובה רק בחלקה.");
    else why = tr("Patching here does almost nothing: this position doesn't carry the information that decides the answer.", "הדבקה כאן כמעט לא משנה כלום: המיקום הזה לא נושא את המידע שקובע את התשובה.");
    $("#patchInfo").textContent = tr(`Patch layer ${L} at “${POS[p]}”: ${Math.round(r * 100)}% of the clean answer restored → the model now says “${answer}”. `, `הדבקה בשכבה ${L} במיקום \u2066“${POS[p]}”\u2069: ‏${Math.round(r * 100)}% מהתשובה הנקייה שוחזרו ← המודל אומר עכשיו \u2066“${answer}”\u2069. `) + why;
  }
  drawPatch();

  onTheme(() => { drawLens(); drawSup(); drawSteer(); drawPatch(); });
})();
