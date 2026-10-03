(function () {
  // Hand-built 2D toy space. Offsets are consistent on purpose so analogies work exactly.
  const W = {
    man: [-6, -2], woman: [-6, 1.5], king: [-2.5, -2], queen: [-2.5, 1.5],
    boy: [-7.5, -3.5], girl: [-7.5, 0], prince: [-4, -3.5], princess: [-4, 0],
    France: [0.5, -6], Paris: [2.3, -3.8], Spain: [2.5, -9], Madrid: [4.3, -6.8],
    Italy: [5.5, -6], Rome: [7.3, -3.8], Japan: [8.5, -8.5], Tokyo: [10.3, -6.3],
    cat: [3, 4], kitten: [3.8, 6.2], dog: [5.5, 4], puppy: [6.3, 6.2],
    horse: [8, 3.5], foal: [8.8, 5.7], mouse: [1.5, 2.5],
    happy: [-4.5, 7], joyful: [-3.5, 8], sad: [-6.6, 5.2], gloomy: [-8.4, 6.4]
  };
  const CLUSTERS = [
    { t: tr("people and royalty", "אנשים ומלוכה"), x: -9, y: 3.4 },
    { t: tr("countries and capitals", "מדינות ובירות"), x: -0.5, y: -1.8 },
    { t: tr("animals", "בעלי חיים"), x: 1.2, y: 8.4 },
    { t: tr("feelings", "רגשות"), x: -9, y: 8.8 }
  ];
  const PRESETS = [
    ["king", "man", "woman"], ["Paris", "France", "Italy"], ["kitten", "cat", "dog"],
    ["prince", "boy", "girl"], ["Tokyo", "Japan", "Spain"], ["queen", "woman", "man"], ["foal", "horse", "cat"]
  ];
  const names = Object.keys(W);
  const X = x => 30 + (x + 9.5) / 21 * 580;
  const Y = y => 400 - (y + 10) / 19.5 * 380;
  const svg = $("#embSvg");
  const selA = $("#anaA"), selB = $("#anaB"), selC = $("#anaC"), out = $("#anaOut"), info = $("#embInfo");
  [selA, selB, selC].forEach(s => names.forEach(n => s.append(el("option", { value: n, text: n }))));
  let preset = 0, selected = null;

  const nearest = (v, exclude = []) => names.filter(n => !exclude.includes(n))
    .map(n => ({ n, d: Math.hypot(W[n][0] - v[0], W[n][1] - v[1]) })).sort((a, b) => a.d - b.d);

  function draw() {
    const ink = cssVar("--ink"), muted = cssVar("--muted"), cob = cssVar("--cobalt"), amb = cssVar("--amber"), rule = cssVar("--rule");
    svg.innerHTML = "";
    const defs = sv("defs");
    [["arrC", cob], ["arrA", amb]].forEach(([id, c]) => {
      const m = sv("marker", { id, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 11, markerHeight: 11, markerUnits: "userSpaceOnUse", orient: "auto" });
      m.append(sv("path", { d: "M0,0 L10,5 L0,10 z", fill: c }));
      defs.append(m);
    });
    svg.append(defs);
    for (let gx = -8; gx <= 10; gx += 2) svg.append(sv("line", { x1: X(gx), y1: 10, x2: X(gx), y2: 410, stroke: rule, "stroke-width": 0.6 }));
    for (let gy = -10; gy <= 9; gy += 2) svg.append(sv("line", { x1: 20, y1: Y(gy), x2: 630, y2: Y(gy), stroke: rule, "stroke-width": 0.6 }));
    CLUSTERS.forEach(c => svg.append(svgLabel({ x: X(c.x), y: Y(c.y), fill: muted, "font-style": "italic", style: "font-size:12px;cursor:default" }, c.t)));

    const a = selA.value, b = selB.value, c = selC.value;
    const v = [W[a][0] - W[b][0] + W[c][0], W[a][1] - W[b][1] + W[c][1]];
    const res = nearest(v, [a, b, c])[0];
    out.value = res.n;
    // offset arrows: b -> a, then the same offset applied from c
    const arrow = (p, q, color, marker, dash) => {
      const x1 = X(p[0]), y1 = Y(p[1]), x2 = X(q[0]), y2 = Y(q[1]);
      const len = Math.hypot(x2 - x1, y2 - y1) || 1, ux = (x2 - x1) / len, uy = (y2 - y1) / len;
      const attrs = { x1: x1 + ux * 8, y1: y1 + uy * 8, x2: x2 - ux * 9, y2: y2 - uy * 9, stroke: color, "stroke-width": 2.5, "marker-end": `url(#${marker})` };
      if (dash) attrs["stroke-dasharray"] = "6 4";
      svg.append(sv("line", attrs));
    };
    arrow(W[b], W[a], cob, "arrC", true);
    arrow(W[c], v, amb, "arrA", false);
    svg.append(sv("circle", { cx: X(v[0]), cy: Y(v[1]), r: 12, fill: "none", stroke: amb, "stroke-width": 2 }));

    names.forEach(n => {
      const hl = [a, b, c].includes(n) || n === res.n || n === selected;
      const g = sv("g", { class: "pt", tabindex: 0, role: "button", "aria-label": n });
      g.append(sv("circle", { cx: X(W[n][0]), cy: Y(W[n][1]), r: hl ? 5.5 : 4, fill: n === res.n ? amb : hl ? cob : muted }));
      g.append(sv("text", { x: X(W[n][0]), y: Y(W[n][1]) + 19, "text-anchor": "middle", "font-weight": hl ? 700 : 400, fill: ink, stroke: cssVar("--surface"), "stroke-width": 4, "paint-order": "stroke", "stroke-linejoin": "round" }, n));
      const pick = () => { selected = n; describe(n); draw(); };
      g.addEventListener("click", pick);
      g.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } });
      svg.append(g);
    });
    if (!selected) info.textContent = tr(
      `${a} − ${b} + ${c}: the dashed arrow is the direction from “${b}” to “${a}”. Applying the same direction from “${c}” (solid arrow) lands on “${res.n}”. Click any word to inspect it.`,
      `${a} − ${b} + ${c}: החץ המקווקו הוא הכיוון מ־“${b}” אל “${a}”. כשמפעילים את אותו כיוון מ־“${c}” (החץ הרציף), נוחתים על “${res.n}”. לחצו על מילה כדי לבחון אותה.`);
  }
  function describe(n) {
    const nn = nearest(W[n], [n]).slice(0, 3).map(x => `${x.n} (${x.d.toFixed(1)})`).join(", ");
    info.textContent = tr(
      `“${n}” is the vector [${W[n][0]}, ${W[n][1]}]. Closest words by distance: ${nn}. In a real model this vector would have thousands of entries.`,
      `“${n}” הוא הווקטור [${W[n][0]}, ${W[n][1]}]. המילים הקרובות ביותר לפי מרחק: ${nn}. במודל אמיתי לווקטור הזה היו אלפי רכיבים.`);
  }
  function setPreset(i) {
    const [a, b, c] = PRESETS[i];
    selA.value = a; selB.value = b; selC.value = c; selected = null; draw();
  }
  [selA, selB, selC].forEach(s => s.addEventListener("change", () => { selected = null; draw(); }));
  $("#anaShuffle").addEventListener("click", () => { preset = (preset + 1) % PRESETS.length; setPreset(preset); });
  onTheme(draw);
  setPreset(0);
})();
