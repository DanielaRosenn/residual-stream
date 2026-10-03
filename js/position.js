(function () {
  const N = 64;
  const pe = (pos, d) => {
    const v = new Array(d);
    for (let i = 0; i < d; i += 2) {
      const f = Math.pow(10000, -i / d);
      v[i] = Math.sin(pos * f);
      if (i + 1 < d) v[i + 1] = Math.cos(pos * f);
    }
    return v;
  };
  const dimS = $("#peDim"), posS = $("#pePos");

  function drawHeat() {
    const d = +dimS.value, sel = +posS.value;
    const { ctx, w, h } = setupCanvas($("#peCanvas"));
    const cob = cssVar("--cobalt"), amb = cssVar("--amber"), surf = cssVar("--surface"), ink = cssVar("--ink");
    const cw = w / d, ch = h / N;
    for (let p = 0; p < N; p++) {
      const v = pe(p, d);
      for (let i = 0; i < d; i++) {
        const x = v[i];
        ctx.fillStyle = x >= 0 ? mix(surf, cob, x) : mix(surf, amb, -x);
        ctx.fillRect(i * cw, p * ch, Math.ceil(cw), Math.ceil(ch));
      }
    }
    ctx.strokeStyle = ink; ctx.lineWidth = 2;
    ctx.strokeRect(1, sel * ch, w - 2, ch);
  }

  function drawSim() {
    const d = +dimS.value, sel = +posS.value;
    const { ctx, w, h } = setupCanvas($("#peSim"));
    const cob = cssVar("--cobalt"), muted = cssVar("--muted"), rule = cssVar("--rule"), amb = cssVar("--amber");
    const a = pe(sel, d);
    const sims = [...Array(N)].map((_, q) => pe(q, d).reduce((s, x, i) => s + x * a[i], 0));
    const hi = d / 2; // self-similarity: each sin/cos pair contributes 1
    const lo = Math.floor(Math.min(...sims)) - 1;
    const pad = 34, pw = w - pad - 8, ph = h - 40;
    const Yv = v => 10 + ph * (1 - (v - lo) / (hi - lo));
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad, Yv(lo)); ctx.lineTo(pad + pw, Yv(lo)); ctx.stroke();
    ctx.fillStyle = muted; ctx.font = "12px " + cssVar("--f-display");
    ctx.fillText(String(lo), 6, Yv(lo) + 4); ctx.fillText(String(hi), 6, Yv(hi) + 4);
    ctx.fillText(tr("position 0", "מיקום 0"), pad, h - 8); ctx.textAlign = "right"; ctx.fillText("63", pad + pw, h - 8); ctx.textAlign = "left";
    ctx.strokeStyle = cob; ctx.lineWidth = 2.5; ctx.beginPath();
    sims.forEach((s, q) => {
      const x = pad + q / (N - 1) * pw, y = Yv(s);
      q ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.stroke();
    const sx = pad + sel / (N - 1) * pw;
    ctx.fillStyle = amb; ctx.beginPath(); ctx.arc(sx, Yv(hi), 5, 0, Math.PI * 2); ctx.fill();
  }

  function update() {
    $("#peDimOut").value = dimS.value; $("#pePosOut").value = posS.value;
    drawHeat(); drawSim();
  }
  dimS.addEventListener("input", update); posS.addEventListener("input", update);

  // ---- RoPE ----
  const ropeS = $("#ropePos"), svg = $("#ropeSvg");
  const PAIRS = [
    { i: 0, label: tr("fast pair", "זוג מהיר") },
    { i: 8, label: tr("medium pair", "זוג בינוני") },
    { i: 24, label: tr("slow pair", "זוג איטי") }
  ];
  function drawRope() {
    const pos = +ropeS.value;
    $("#ropePosOut").value = pos;
    const cob = cssVar("--cobalt"), amb = cssVar("--amber"), rule = cssVar("--rule"), ink = cssVar("--ink"), muted = cssVar("--muted");
    svg.innerHTML = "";
    PAIRS.forEach((p, k) => {
      const theta = Math.pow(10000, -2 * p.i / 64);
      const ang = pos * theta;
      const cx = 100 + k * 200, cy = 78, r = 52;
      svg.append(sv("circle", { cx, cy, r, fill: "none", stroke: rule, "stroke-width": 2 }));
      svg.append(sv("line", { x1: cx, y1: cy, x2: cx + r, y2: cy, stroke: muted, "stroke-width": 1.5, "stroke-dasharray": "4 3" }));
      const a = ang % (2 * Math.PI);
      const large = a > Math.PI ? 1 : 0;
      if (a > 0.001) {
        const ex = cx + (r - 14) * Math.cos(-a), ey = cy + (r - 14) * Math.sin(-a);
        svg.append(sv("path", { d: `M${cx + r - 14},${cy} A${r - 14},${r - 14} 0 ${large} 0 ${ex},${ey}`, fill: "none", stroke: amb, "stroke-width": 3 }));
      }
      svg.append(sv("line", { x1: cx, y1: cy, x2: cx + r * Math.cos(-a), y2: cy + r * Math.sin(-a), stroke: cob, "stroke-width": 4, "stroke-linecap": "round" }));
      svg.append(sv("circle", { cx, cy, r: 4, fill: ink }));
      svg.append(svgLabel({ x: cx, y: 152, "text-anchor": "middle", fill: ink, style: "font: 600 14px var(--f-display)" }, p.label));
      const deg = (ang * 180 / Math.PI);
      svg.append(svgLabel({ x: cx, y: 171, "text-anchor": "middle", fill: muted, style: "font: 12px var(--f-display)" },
        deg >= 360 ? tr(`${(deg / 360).toFixed(1)} turns total`, `${(deg / 360).toFixed(1)} סיבובים בסך הכול`) : tr(`${deg.toFixed(1)}° total`, `${deg.toFixed(1)}° בסך הכול`)));
    });
  }
  ropeS.addEventListener("input", drawRope);
  onTheme(() => { update(); drawRope(); });
  update(); drawRope();
})();
