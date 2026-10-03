(function () {
  const text = CORPUS.toLowerCase().replace(/[^a-z\u05D0-\u05EA. ]/g, "");
  const chars = [...new Set(text)].sort();
  const V = chars.length, idx = new Map(chars.map((c, i) => [c, i]));
  const N = [...Array(V)].map(() => new Float64Array(V));
  for (let i = 0; i < text.length - 1; i++) N[idx.get(text[i])][idx.get(text[i + 1])]++;
  const rowN = N.map(r => r.reduce((a, b) => a + b, 0));
  const total = rowN.reduce((a, b) => a + b, 0);
  // Entropy of the data under the best possible bigram model (the loss floor).
  let floor = 0;
  N.forEach((r, i) => r.forEach(c => { if (c) floor -= (c / total) * Math.log(c / rowN[i]); }));
  const start = Math.log(V);

  let W, P, losses, steps, running = false, raf = null;
  function reset() {
    W = [...Array(V)].map(() => new Float64Array(V));
    losses = []; steps = 0;
    forward();
    losses.push(lossNow());
  }
  function forward() { P = W.map(r => softmax(Array.from(r))); }
  function lossNow() {
    let L = 0;
    for (let i = 0; i < V; i++) for (let j = 0; j < V; j++) if (N[i][j]) L -= N[i][j] * Math.log(P[i][j] + 1e-12);
    return L / total;
  }
  function step(lr) {
    for (let i = 0; i < V; i++) {
      if (!rowN[i]) continue;
      for (let j = 0; j < V; j++) W[i][j] -= lr * (rowN[i] * P[i][j] - N[i][j]) / total;
    }
    forward();
    steps++;
    losses.push(lossNow());
  }
  function sample(len = 90) {
    const rng = mulberry32(1234 + steps);
    let c = idx.get(text[0]), s = text[0];
    for (let n = 0; n < len; n++) { c = sampleFrom(P[c], rng); s += chars[c]; }
    return s;
  }

  function drawLoss() {
    const { ctx, w, h } = setupCanvas($("#lossCanvas"));
    const cob = cssVar("--cobalt"), amb = cssVar("--amber"), muted = cssVar("--muted"), rule = cssVar("--rule");
    ctx.clearRect(0, 0, w, h);
    const pl = 40, pr = 10, pt = 12, pb = 26;
    const xmax = Math.max(300, steps), ymin = Math.floor((floor - 0.2) * 10) / 10, ymax = Math.ceil((start + 0.1) * 10) / 10;
    const X = s => pl + s / xmax * (w - pl - pr), Y = v => pt + (1 - (v - ymin) / (ymax - ymin)) * (h - pt - pb);
    ctx.font = "11px " + cssVar("--f-display"); ctx.fillStyle = muted; ctx.strokeStyle = rule; ctx.lineWidth = 1;
    for (let v = Math.ceil(ymin * 2) / 2; v <= ymax; v += 0.5) {
      ctx.beginPath(); ctx.moveTo(pl, Y(v)); ctx.lineTo(w - pr, Y(v)); ctx.stroke();
      ctx.fillText(v.toFixed(1), 6, Y(v) + 4);
    }
    ctx.fillText(tr("step 0", "צעד 0"), pl, h - 8);
    ctx.textAlign = "right"; ctx.fillText(String(xmax), w - pr, h - 8); ctx.textAlign = "left";
    ctx.setLineDash([6, 4]); ctx.strokeStyle = amb; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(pl, Y(floor)); ctx.lineTo(w - pr, Y(floor)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = amb; ctx.fillText(tr(`best possible ${floor.toFixed(3)}`, `הטוב ביותר האפשרי ${floor.toFixed(3)}`), pl + 6, Y(floor) - 6);
    ctx.strokeStyle = cob; ctx.lineWidth = 2.5; ctx.beginPath();
    losses.forEach((l, s) => (s ? ctx.lineTo(X(s), Y(l)) : ctx.moveTo(X(s), Y(l))));
    ctx.stroke();
  }
  function drawW() {
    const { ctx, w } = setupCanvas($("#wCanvas"));
    const cob = cssVar("--cobalt"), surf = cssVar("--surface"), muted = cssVar("--muted");
    ctx.clearRect(0, 0, w, w);
    const m = 16, cs = (w - m) / V;
    ctx.font = "9px " + cssVar("--f-mono"); ctx.fillStyle = muted; ctx.textAlign = "center";
    chars.forEach((c, i) => {
      const lab = c === " " ? "␣" : c;
      ctx.fillText(lab, m + i * cs + cs / 2, 10);
      ctx.fillText(lab, 7, m + i * cs + cs / 2 + 3);
    });
    for (let i = 0; i < V; i++) for (let j = 0; j < V; j++) {
      ctx.fillStyle = mix(surf, cob, Math.min(1, Math.sqrt(P[i][j])));
      ctx.fillRect(m + j * cs, m + i * cs, cs - 0.5, cs - 0.5);
    }
  }
  function renderAll() {
    const L = losses[losses.length - 1];
    $("#trainStat").textContent = tr(
      `Step ${steps}. Loss ${L.toFixed(3)} (started at ln ${V} = ${start.toFixed(3)}, a uniform guess over ${V} characters).`,
      `צעד ${steps}. Loss ${L.toFixed(3)} (התחיל ב־ln ${V} = ${start.toFixed(3)}, ניחוש אחיד בין ${V} תווים).`);
    $("#trainSample").textContent = sample();
    drawLoss(); drawW();
  }
  function loop() {
    const lr = +$("#trainLr").value;
    for (let k = 0; k < 2; k++) step(lr);
    const n = losses.length;
    renderAll();
    const done = steps >= 4000 || (n > 50 && Math.abs(losses[n - 1] - losses[n - 41]) < 2e-5);
    if (done) { stop(); $("#trainStat").textContent += tr(" Converged.", " התכנס."); return; }
    raf = requestAnimationFrame(loop);
  }
  function stop() { running = false; cancelAnimationFrame(raf); $("#trainGo").textContent = tr("Train", "אמן"); }
  $("#trainGo").addEventListener("click", () => {
    if (running) { stop(); return; }
    running = true; $("#trainGo").textContent = tr("Pause", "השהה"); loop();
  });
  $("#trainReset").addEventListener("click", () => { stop(); reset(); renderAll(); });
  $("#trainLr").addEventListener("input", e => { $("#trainLrOut").value = e.target.value; });
  onTheme(renderAll);
  reset(); renderAll();
})();
