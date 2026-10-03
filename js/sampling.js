(function () {
  const CANDS = LANG === "he" ? [
    ["לתרגל", 3.1], ["לקרוא", 2.6], ["ללמד", 2.4], ["לנסות", 2.0], ["לשאול", 1.7], ["לבנות", 1.6],
    ["להיכשל", 1.0], ["לישון", 0.2], ["לרקוד", -0.3], ["להיבהל", -0.8], ["בננה", -2.5]
  ] : [
    ["practice", 3.1], ["read", 2.6], ["teach", 2.4], ["try", 2.0], ["ask", 1.7], ["build", 1.6],
    ["fail", 1.0], ["sleep", 0.2], ["dance", -0.3], ["panic", -0.8], ["banana", -2.5]
  ];
  const sT = $("#sT"), sK = $("#sK"), sP = $("#sP");
  const baseP = softmax(CANDS.map(c => c[1]));

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
  render();
})();
