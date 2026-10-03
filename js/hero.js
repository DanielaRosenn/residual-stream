(function () {
  const words = CORPUS.replace(/\./g, " .").split(/\s+/).filter(Boolean);
  const tri = new Map(), bi = new Map(), uni = new Map();
  const bump = (m, k, w) => { if (!m.has(k)) m.set(k, new Map()); const x = m.get(k); x.set(w, (x.get(w) || 0) + 1); };
  for (let i = 0; i < words.length; i++) {
    uni.set(words[i], (uni.get(words[i]) || 0) + 1);
    if (i >= 1) bump(bi, words[i - 1], words[i]);
    if (i >= 2) bump(tri, words[i - 2] + " " + words[i - 1], words[i]);
  }

  function distribution(ctx) {
    const a = ctx[ctx.length - 2], b = ctx[ctx.length - 1];
    let table = null, level = "";
    if (a && b && tri.has(a + " " + b)) { table = tri.get(a + " " + b); level = tr(`after “${a} ${b}”`, `אחרי \u2066“${a} ${b}”\u2069`); }
    else if (b && bi.has(b)) { table = bi.get(b); level = tr(`after “${b}” (backed off to one word)`, `אחרי \u2066“${b}”\u2069 (נסיגה למילה אחת בלבד)`); }
    else { table = uni; level = tr("unseen context — falling back to overall word frequency", "הקשר שלא הופיע בטקסט — נסיגה לשכיחות הכללית של המילים"); }
    const total = [...table.values()].reduce((s, c) => s + c, 0);
    const list = [...table.entries()].map(([w, c]) => ({ w, p: c / total })).sort((x, y) => y.p - x.p);
    return { list, level };
  }

  const out = $("#heroOut"), bars = $("#heroBars"), seedIn = $("#heroSeed"), go = $("#heroGo");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let timer = null, ctx = [], count = 0;

  function renderText(freshIdx) {
    out.innerHTML = "";
    ctx.forEach((w, i) => {
      const txt = (w === "." ? "." : (i ? " " : "") + w);
      out.append(el("span", { class: "tok" + (i === freshIdx ? " fresh" : ""), text: txt }));
    });
    out.append(el("span", { class: "cursor", "aria-hidden": "true" }));
  }

  function renderBars(list, level, chosen) {
    bars.innerHTML = "";
    bars.append(el("div", { class: "caption", text: tr("Next-word probabilities ", "הסתברויות למילה הבאה ") + level, dir: "auto" }));
    const top = list.slice(0, 6);
    if (chosen && !top.some(t => t.w === chosen.w)) top[top.length - 1] = chosen;
    const max = top[0].p;
    top.forEach(t => {
      const row = el("div", { class: "bar-row" + (chosen && t.w === chosen.w ? " chosen" : "") },
        el("span", { class: "w", text: t.w === "." ? tr("(end .)", "(סוף משפט)") : t.w }),
        el("div", { class: "bar-track" }, el("div", { class: "bar-fill", style: `width:${(t.p / max * 100).toFixed(1)}%` })),
        el("span", { class: "p", text: (t.p * 100).toFixed(1) + "%" }));
      bars.append(row);
    });
  }

  function step() {
    const { list, level } = distribution(ctx);
    const i = sampleFrom(list.map(x => x.p));
    const chosen = list[i];
    renderBars(list, level, chosen);
    ctx.push(chosen.w);
    count++;
    renderText(ctx.length - 1);
    if ((chosen.w === "." && count > 4) || count >= 24) { stop(); return; }
    timer = setTimeout(step, reduce ? 50 : 850);
  }
  function stop() { clearTimeout(timer); timer = null; go.textContent = tr("Generate again", "צור שוב"); }
  function start() {
    stop();
    ctx = seedIn.value.toLowerCase().replace(/[^a-z\u05D0-\u05EA\s.]/g, " ").split(/\s+/).filter(Boolean);
    if (!ctx.length) ctx = [words[0]];
    count = 0;
    renderText(-1);
    const { list, level } = distribution(ctx);
    renderBars(list, level, null);
    go.textContent = tr("Stop", "עצור");
    timer = setTimeout(step, reduce ? 50 : 700);
  }
  go.addEventListener("click", () => (timer ? stop() : start()));
  seedIn.addEventListener("keydown", e => { if (e.key === "Enter") start(); });
  start();
})();
