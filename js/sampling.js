(function () {
  /* Hand-set prompts: each has 11 candidate next words with illustrative logits, sorted from highest to lowest.
     The first prompt is the default and its sentence text comes from the HTML. */
  const PROMPTS = LANG === "he" ? [
    { label: "הדרך הטובה ביותר ללמוד משהו חדש היא…", text: null, cands: [
      ["לתרגל", 3.1], ["לקרוא", 2.6], ["ללמד", 2.4], ["לנסות", 2.0], ["לשאול", 1.7], ["לבנות", 1.6],
      ["להיכשל", 1.0], ["לישון", 0.2], ["לרקוד", -0.3], ["להיבהל", -0.8], ["בננה", -2.5]] },
    { label: "האוכל האהוב עליי הוא…", text: "האוכל האהוב עליי הוא", cands: [
      ["פיצה", 3.0], ["פסטה", 2.7], ["סושי", 2.4], ["שוקולד", 2.2], ["חומוס", 1.8], ["מרק", 1.5],
      ["סלט", 1.1], ["לחם", 0.7], ["ברוקולי", 0.0], ["חצץ", -1.4], ["מקלדת", -2.5]] },
    { label: "הסוד של ישיבה טובה הוא…", text: "הסוד של ישיבה טובה הוא", cands: [
      ["הכנה", 3.0], ["הקשבה", 2.6], ["תמציתיות", 2.4], ["קפה", 2.1], ["מיקוד", 1.8], ["כיבוד", 1.5],
      ["אמון", 1.2], ["שקט", 0.5], ["מזל", -0.2], ["ביטול", -0.6], ["לווייתנים", -2.5]] },
    { label: "בשבת בבוקר הכי כיף…", text: "בשבת בבוקר הכי כיף", cands: [
      ["לישון", 3.2], ["לקרוא", 2.6], ["לרוץ", 2.4], ["לבשל", 2.0], ["לנוח", 1.8], ["לטייל", 1.6],
      ["לשחות", 1.1], ["לנקות", 0.3], ["לעבוד", -0.4], ["להתווכח", -1.0], ["להתאדות", -2.5]] },
    { label: "בירת צרפת היא…", text: "בירת צרפת היא", cands: [
      ["פריז", 6.2], ["העיר", 2.2], ["עיר", 1.8], ["כמובן", 1.6], ["ליון", 1.2], ["אחת", 1.0],
      ["מרסיי", 0.7], ["גם", 0.3], ["לונדון", -0.2], ["ברלין", -0.6], ["בננה", -3.0]] }
  ] : [
    { label: "The best way to learn something new is to…", text: null, cands: [
      ["practice", 3.1], ["read", 2.6], ["teach", 2.4], ["try", 2.0], ["ask", 1.7], ["build", 1.6],
      ["fail", 1.0], ["sleep", 0.2], ["dance", -0.3], ["panic", -0.8], ["banana", -2.5]] },
    { label: "My favourite food is…", text: "My favourite food is", cands: [
      ["pizza", 3.0], ["pasta", 2.7], ["sushi", 2.4], ["chocolate", 2.2], ["curry", 1.8], ["soup", 1.5],
      ["salad", 1.1], ["bread", 0.7], ["broccoli", 0.0], ["gravel", -1.4], ["homework", -2.5]] },
    { label: "The secret to a good meeting is…", text: "The secret to a good meeting is", cands: [
      ["preparation", 3.0], ["listening", 2.6], ["brevity", 2.4], ["coffee", 2.1], ["focus", 1.8], ["snacks", 1.5],
      ["trust", 1.2], ["silence", 0.5], ["luck", -0.2], ["cancelling", -0.6], ["whales", -2.5]] },
    { label: "On Saturday morning I like to…", text: "On Saturday morning I like to", cands: [
      ["sleep", 3.2], ["read", 2.6], ["run", 2.4], ["cook", 2.0], ["relax", 1.8], ["walk", 1.6],
      ["swim", 1.1], ["clean", 0.3], ["work", -0.4], ["argue", -1.0], ["evaporate", -2.5]] },
    { label: "The capital of France is…", text: "The capital of France is", cands: [
      ["Paris", 6.2], ["the", 2.2], ["a", 1.8], ["located", 1.6], ["Lyon", 1.2], ["called", 1.0],
      ["known", 0.7], ["also", 0.3], ["London", -0.2], ["Berlin", -0.6], ["banana", -3.0]] }
  ];
  let CANDS = PROMPTS[0].cands;
  const sT = $("#sT"), sK = $("#sK"), sP = $("#sP");
  let baseP = softmax(CANDS.map(c => c[1]));

  function dist() {
    const T = +sT.value, k = +sK.value, p = +sP.value;
    let probs = T < 0.01
      ? CANDS.map((_, i) => (i === 0 ? 1 : 0)) // greedy: logits are already sorted, index 0 is the max
      : softmax(CANDS.map(c => c[1]), T);
    const order = probs.map((x, i) => i).sort((a, b) => probs[b] - probs[a]);
    const keep = new Set();
    let cum = 0;
    for (const i of order.slice(0, k)) { if (cum >= p && keep.size) break; keep.add(i); cum += probs[i]; }
    const kept = probs.map((x, i) => (keep.has(i) ? x : 0));
    const s = kept.reduce((a, b) => a + b, 0) || 1;
    return { final: kept.map(x => x / s), keep };
  }

  const bars = $("#sampBars");
  function render() {
    $("#sTOut").value = (+sT.value).toFixed(2) + (+sT.value < 0.01 ? tr(" (greedy)", " (greedy)") : "");
    $("#sKOut").value = sK.value; $("#sPOut").value = (+sP.value).toFixed(2);
    const { final, keep } = dist();
    bars.innerHTML = "";
    const max = Math.max(...final, ...baseP);
    CANDS.forEach(([w], i) => {
      const cut = !keep.has(i);
      bars.append(el("div", { class: "bar-row" + (cut ? " cut" : "") },
        el("span", { class: "w", text: w }),
        el("div", { class: "bar-track" },
          el("div", { class: "bar-fill", style: `width:${(final[i] / max * 100).toFixed(1)}%` }),
          el("div", { class: "ghost-fill", style: `width:${(baseP[i] / max * 100).toFixed(1)}%` })),
        el("span", { class: "p", text: cut ? tr("removed", "הוסר") : `${(final[i] * 100).toFixed(1)}%` })));
    });
    const H = -final.reduce((s, x) => s + (x > 0 ? x * Math.log2(x) : 0), 0);
    $("#sEntropy").textContent = tr(
      `Entropy ${H.toFixed(2)} bits — ${keep.size} of ${CANDS.length} candidates allowed. Dashed lines show the untouched distribution at temperature 1.`,
      `Entropy של ${H.toFixed(2)} ביטים — ${keep.size} מתוך ${CANDS.length} מועמדים מותרים. הקווים המקווקווים מראים את ההתפלגות המקורית ב־temperature 1.`);
    return final;
  }
  function sampleOnce() {
    const f = render();
    const i = sampleFrom(f);
    $("#sampPick").textContent = CANDS[i][0];
    return i;
  }
  $("#sOne").addEventListener("click", () => { sampleOnce(); $("#sampTally").textContent = ""; });
  $("#sMany").addEventListener("click", () => {
    const f = render();
    const counts = new Array(CANDS.length).fill(0);
    for (let n = 0; n < 200; n++) counts[sampleFrom(f)]++;
    const top = counts.map((c, i) => [CANDS[i][0], c]).filter(x => x[1]).sort((a, b) => b[1] - a[1]);
    $("#sampPick").textContent = top[0][0];
    $("#sampTally").textContent = tr("200 samples: ", "200 דגימות: ") + top.map(([w, c]) => `${w} ×${c}`).join(", ");
  });
  [sT, sK, sP].forEach(s => s.addEventListener("input", () => { render(); $("#sampTally").textContent = ""; }));

  /* ---------- Choose the sentence being completed ---------- */
  const pick = $("#sampPick"), line = pick.parentNode, panel = pick.closest(".panel") || line.parentNode;
  // The sentence is the text node just before the pick span; create one if the markup has none.
  let lead = pick.previousSibling;
  if (!lead || lead.nodeType !== 3) { lead = document.createTextNode(""); line.insertBefore(lead, pick); }
  PROMPTS[0].text = lead.nodeValue.trim() || PROMPTS[0].label.replace(/…$/, "");
  const sel = el("select", { id: "sampPrompt", class: "ty-select" });
  PROMPTS.forEach((p, i) => sel.append(el("option", { value: String(i), text: p.label })));
  sel.addEventListener("change", () => {
    const p = PROMPTS[+sel.value] || PROMPTS[0];
    CANDS = p.cands;
    baseP = softmax(CANDS.map(c => c[1]));
    lead.nodeValue = p.text + " ";
    pick.textContent = "…";
    $("#sampTally").textContent = "";
    render();
  });
  line.before(el("div", { class: "ty-row ty-prompt" },
    el("label", { class: "ty-label", for: "sampPrompt", text: tr("Sentence to complete", "המשפט להשלמה") }), sel));
  pick.setAttribute("aria-live", "polite");
  // Illustrative demo: make sure the panel says the numbers are hand-set.
  const says = $$(".caption", panel).some(c => /hand-?set|hand-?picked|illustrat|נקבעו ביד|ידנית|להמחשה/i.test(c.textContent));
  if (!says) panel.append(el("p", {
    class: "caption ty-note", id: "sampNote",
    text: tr(
      "These sentences, candidate words and scores are hand-set for illustration — no model is running here. A real model scores every token in its vocabulary (tens of thousands), not eleven. The temperature, top-k and top-p arithmetic is computed for real on these numbers.",
      "המשפטים, המילים המועמדות והציונים כאן נקבעו ביד לצורך המחשה — לא רץ כאן מודל. מודל אמיתי נותן ציון לכל טוקן באוצר המילים שלו (עשרות אלפים), לא לאחד־עשר. החישוב של temperature, ‏top-k ו־top-p נעשה באמת על המספרים האלה.")
  }));

  render();
})();
