/* Level 0 — "The Job": guess the next word, scored against the real trigram model built from CORPUS. */
(function () {
  if (typeof RSGame === "undefined" || typeof RSCore === "undefined") return;
  const ROUNDS = 6;
  const END = ".";
  const show = w => (w === END ? tr("(end of sentence)", "(סוף המשפט)") : w);
  const pctTxt = p => (p > 0 && p < 0.01 ? "<1%" : Math.round(p * 100) + "%");

  /* Every sentence prefix (≥ 2 words) whose next word the trigram model sees with several real options.
     Tier A: three or more continuations; tier B: two. One context per distinct pair of last words. */
  let pools = null;
  function buildPools(model) {
    if (pools) return pools;
    const ws = model.words;
    const seen = new Set(), A = [], Bt = [];
    let s0 = 0;
    for (let i = 0; i < ws.length; i++) {
      if (ws[i] === END) { s0 = i + 1; continue; }
      if (i - s0 < 2) continue;
      const prefix = ws.slice(s0, i);
      const key = prefix.slice(-2).join(" ");
      if (seen.has(key) || model.order(prefix) !== 3) continue;
      const d = model.next(prefix);
      if (d.length >= 3 && !d.slice(0, 3).some(x => x.w === END) && d[0].p <= 0.6 && d[2].p >= 0.1) { seen.add(key); A.push(prefix); }
      else if (d.length >= 2 && !d.slice(0, 2).some(x => x.w === END) && d[0].p <= 0.67) { seen.add(key); Bt.push(prefix); }
    }
    pools = { A, B: Bt };
    return pools;
  }

  function shuffle(arr, rnd) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  /* Four options: the model's top candidates plus a low-probability distractor. */
  function makeRound(model, prefix, rnd) {
    const dist = model.next(prefix);
    const pOf = w => (dist.find(x => x.w === w) || { p: 0 }).p;
    const opts = dist.slice(0, Math.min(3, dist.length)).map(x => x.w);
    const extras = [];
    if (dist.length >= 4) extras.push(dist[dist.length - 1].w); // the least likely word the model did see here
    // Words that follow the last word elsewhere but never these two words: plausible-looking, 0% here.
    const last = prefix[prefix.length - 1];
    const lookalikes = shuffle(model.next([last]).map(x => x.w), rnd).filter(w => w !== END && !dist.some(x => x.w === w));
    const anyWords = shuffle(model.vocab, rnd).filter(w => w !== END && !dist.some(x => x.w === w));
    for (const w of [...extras, ...lookalikes, ...anyWords]) {
      if (opts.length >= 4) break;
      if (!opts.includes(w)) opts.push(w);
    }
    const options = shuffle(opts, rnd).map(w => ({ w, p: pOf(w) }));
    const best = Math.max(...options.map(o => o.p));
    const shownMass = options.reduce((s, o) => s + o.p, 0);
    const others = dist.filter(x => !opts.includes(x.w));
    return { prefix, dist, options, best, otherCount: others.length, otherMass: Math.max(0, 1 - shownMass) };
  }

  function mount(root, api) {
    const model = api.core.ngram(CORPUS);
    const seed = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
    const rnd = api.rng(seed);
    const { A, B } = buildPools(model);
    const fromA = shuffle(A, rnd).slice(0, Math.min(4, A.length));
    const fromB = shuffle(B, rnd).slice(0, ROUNDS - fromA.length);
    let picks = shuffle([...fromA, ...fromB], rnd);
    if (picks.length < ROUNDS) picks = picks.concat(shuffle(A.concat(B), rnd)).slice(0, ROUNDS);
    const rounds = picks.slice(0, ROUNDS).map(p => makeRound(model, p, rnd));
    const results = [];
    let r = 0, revealed = false, optionBtns = [];

    root.classList.add("g-job");
    const pips = el("ol", { class: "g-job-pips", "aria-hidden": "true" });
    rounds.forEach(() => pips.append(el("li")));
    const counter = el("span", { class: "g-job-count" });
    const running = el("span", { class: "g-job-running" });
    const head = el("div", { class: "g-job-head" },
      el("span", { class: "g-job-trace", dir: "ltr", text: "trace " + seed.toString(16).slice(-4).padStart(4, "0") }),
      counter, pips, running);
    const sentence = el("p", { class: "g-job-sentence" });
    const ask = el("p", { class: "g-job-ask" });
    const grid = el("div", { class: "g-job-options", role: "group" });
    const feedback = el("p", { class: "g-job-feedback", role: "status" });
    const note = el("p", { class: "g-job-note" });
    const nextBtn = el("button", { type: "button", class: "btn g-job-nextbtn", hidden: "" });
    const card = el("div", { class: "g-job-card" }, head, sentence, ask, grid, feedback, note, el("div", { class: "g-job-actions" }, nextBtn));
    root.append(card);

    function renderSentence(pickWord) {
      sentence.innerHTML = "";
      const pr = rounds[r].prefix;
      pr.forEach((w, i) => {
        const read = revealed && i >= pr.length - 2;
        sentence.append(el("span", { class: "g-job-w" + (read ? " is-read" : ""), text: w }), document.createTextNode(" "));
      });
      const slot = el("span", { class: "g-job-slot" + (pickWord != null ? " is-filled" : "") });
      slot.textContent = pickWord != null ? show(pickWord) : " ";
      if (pickWord == null) slot.setAttribute("aria-label", tr("blank", "ריק"));
      sentence.append(slot);
    }

    function renderRound() {
      revealed = false;
      const R = rounds[r];
      counter.textContent = tr(`Packet ${r + 1} of ${ROUNDS}`, `חבילה ${r + 1} מתוך ${ROUNDS}`);
      [...pips.children].forEach((li, i) => { li.className = i < r ? "done " + results[i].cls : i === r ? "now" : ""; });
      renderRunning();
      renderSentence(null);
      ask.textContent = tr("Which word does the model send next?", "איזו מילה המודל ישלח עכשיו?");
      grid.setAttribute("aria-label", tr("Next-word options", "אפשרויות למילה הבאה"));
      grid.innerHTML = "";
      feedback.textContent = "";
      note.textContent = "";
      nextBtn.hidden = true;
      optionBtns = R.options.map((o, i) => {
        const b = el("button", { type: "button", class: "g-job-opt", "data-word": o.w },
          el("span", { class: "g-job-key", "aria-hidden": "true", text: String(i + 1) }),
          el("span", { class: "g-job-word", text: show(o.w) }),
          el("span", { class: "g-job-bar", "aria-hidden": "true" }, el("span", { class: "g-job-fill" })),
          el("span", { class: "g-job-p" }),
          el("span", { class: "g-job-badge" }));
        b.addEventListener("click", () => choose(i));
        grid.append(b);
        return b;
      });
    }

    function renderRunning() {
      if (!results.length) { running.textContent = ""; return; }
      const m = results.reduce((s, x) => s + x.score, 0) / results.length;
      running.textContent = tr(`Match so far ${Math.round(m * 100)}%`, `התאמה עד עכשיו ${Math.round(m * 100)}%`);
    }

    function choose(i) {
      if (revealed) return;
      revealed = true;
      const R = rounds[r];
      const pick = R.options[i];
      const fav = pick.p === R.best ? pick : R.options.find(o => o.p === R.best);
      const score = R.best > 0 ? pick.p / R.best : 0;
      const hit = pick.p === R.best && R.best > 0;
      results.push({ cls: hit ? "hit" : pick.p > 0 ? "near" : "miss", score, hit, prefix: R.prefix, pick: pick.w, pickP: pick.p, fav: fav.w, favP: fav.p });

      renderSentence(pick.w);
      optionBtns.forEach((b, j) => {
        const o = R.options[j];
        b.setAttribute("aria-disabled", "true");
        b.classList.add("is-revealed");
        if (j === i) b.classList.add("is-pick");
        if (o.p === R.best) b.classList.add("is-fav");
        b.querySelector(".g-job-p").textContent = pctTxt(o.p);
        const badge = j === i && o.p === R.best ? tr("your pick · model's favourite", "הבחירה שלכם · המועדפת על המודל")
          : j === i ? tr("your pick", "הבחירה שלכם")
          : o.p === R.best ? tr("model's favourite", "המועדפת על המודל") : "";
        b.querySelector(".g-job-badge").textContent = badge;
        b.setAttribute("aria-label", `${show(o.w)}: ${pctTxt(o.p)}${badge ? " — " + badge : ""}`);
        const fill = b.querySelector(".g-job-fill");
        const w = (o.p * 100).toFixed(1) + "%";
        if (api.reducedMotion) fill.style.width = w;
        else { fill.style.width = "0%"; fill.style.transitionDelay = (j * 0.07) + "s"; requestAnimationFrame(() => requestAnimationFrame(() => { fill.style.width = w; })); }
      });

      const ctx2 = R.prefix.slice(-2).join(" ");
      let msg;
      if (hit) msg = tr(`Match. The model's favourite was “${show(pick.w)}” at ${pctTxt(pick.p)}.`, `פגיעה. גם המודל העדיף את “${show(pick.w)}” — ${pctTxt(pick.p)}.`);
      else if (pick.p > 0) msg = tr(
        `Close. The model gave “${show(pick.w)}” ${pctTxt(pick.p)}; its favourite, “${show(fav.w)}”, got ${pctTxt(fav.p)}. Round score ${Math.round(score * 100)}%.`,
        `קרוב. המודל נתן ל“${show(pick.w)}” ${pctTxt(pick.p)}; המועדפת עליו, “${show(fav.w)}”, קיבלה ${pctTxt(fav.p)}. ציון הסיבוב ${Math.round(score * 100)}%.`);
      else msg = tr(
        `Miss. “${show(pick.w)}” never followed “${ctx2}” in the text the model learned from, so it got 0%. Its favourite was “${show(fav.w)}” at ${pctTxt(fav.p)}.`,
        `החטאה. “${show(pick.w)}” אף פעם לא הופיעה אחרי “${ctx2}” בטקסט שהמודל למד ממנו, ולכן קיבלה 0%. המועדפת עליו הייתה “${show(fav.w)}” — ${pctTxt(fav.p)}.`);
      feedback.textContent = msg;
      feedback.className = "g-job-feedback " + (hit ? "is-hit" : pick.p > 0 ? "is-near" : "is-miss");
      note.textContent = (R.otherCount
        ? tr(`${R.otherCount} other word${R.otherCount > 1 ? "s" : ""} share the remaining ${pctTxt(R.otherMass)}. `, `${R.otherCount === 1 ? "מילה אחת נוספת מקבלת" : R.otherCount + " מילים נוספות חולקות"} את ה־${pctTxt(R.otherMass)} שנשארו. `)
        : "") + tr("The highlighted words are all this small model actually reads: the last two.", "המילים המודגשות הן כל מה שהמודל הקטן הזה באמת קורא: שתי המילים האחרונות.");
      api.announce(msg);
      renderRunning();
      [...pips.children][r].className = "done " + results[r].cls;

      nextBtn.textContent = r < ROUNDS - 1 ? tr("Next packet", "החבילה הבאה") : tr("See how you did", "לתוצאות");
      nextBtn.hidden = false;
      nextBtn.focus({ preventScroll: true });
      if (!api.reducedMotion) nextBtn.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }

    nextBtn.addEventListener("click", () => {
      if (r < ROUNDS - 1) {
        r++;
        renderRound();
        const first = optionBtns[0];
        if (first) first.focus({ preventScroll: true });
        sentence.scrollIntoView({ block: "nearest", behavior: api.reducedMotion ? "auto" : "smooth" });
      } else finishGame();
    });

    root.addEventListener("keydown", e => {
      if (revealed || e.altKey || e.ctrlKey || e.metaKey) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= optionBtns.length) { e.preventDefault(); choose(n - 1); }
    });

    function finishGame() {
      const score = results.reduce((s, x) => s + x.score, 0) / results.length;
      const hits = results.filter(x => x.hit).length;
      card.innerHTML = "";
      const list = el("ol", { class: "g-job-recap" });
      results.forEach(x => {
        const tail = x.prefix.slice(-3).join(" ");
        list.append(el("li", { class: x.hit ? "is-hit" : x.pickP > 0 ? "is-near" : "is-miss" },
          el("span", { class: "g-job-recap-ctx", text: "… " + tail }),
          el("span", { class: "g-job-recap-you", text: tr(`you: ${show(x.pick)} (${pctTxt(x.pickP)})`, `אתם: ${show(x.pick)} (${pctTxt(x.pickP)})`) }),
          el("span", { class: "g-job-recap-model", text: tr(`model: ${show(x.fav)} (${pctTxt(x.favP)})`, `המודל: ${show(x.fav)} (${pctTxt(x.favP)})`) })));
      });
      card.append(
        el("p", { class: "g-job-recap-title", text: tr("Your six packets", "שש החבילות שלכם") }),
        list);
      api.finish({
        score,
        summary: tr(`You matched the model's favourite ${hits} of ${ROUNDS} times.`, `בחרתם במילה המועדפת על המודל ${hits} פעמים מתוך ${ROUNDS}.`),
      });
    }

    renderRound();
  }

  RSGame.registerLevel({
    id: "job",
    order: 0,
    title: tr("The Job", "התפקיד"),
    hop: tr("Hop 0 · Handshake", "תחנה 0 · לחיצת יד"),
    concept: tr("Next-word prediction", "חיזוי המילה הבאה"),
    brief: tr("Here is the start of a sentence — pick the word you think the model will send next.",
      "הנה תחילתו של משפט — בחרו את המילה שלדעתכם המודל ישלח עכשיו."),
    debrief: tr(
      "That was the whole job. A language model does one thing: it looks at the words so far and puts a probability on every possible next piece. One piece is picked, stuck on the end, and the whole thing runs again — that is how a paragraph gets written, one guess at a time.\n\n" +
      "The model you just played against is tiny and real: it counted which word followed each pair of words in a few paragraphs of text, and it only ever looks at the last two words. A real LLM reads thousands of tokens back and learned from trillions, but what comes out is the same kind of list you just saw. Every other hop on this route exists to make that one guess better.",
      "זה כל התפקיד. מודל שפה עושה דבר אחד: מסתכל על המילים עד עכשיו ונותן הסתברות לכל חלק אפשרי שיבוא אחריהן. חלק אחד נבחר, מתווסף לסוף, והכול רץ שוב — ככה נכתבת פסקה, ניחוש אחרי ניחוש.\n\n" +
      "המודל שמולו שיחקתם קטנטן, אבל אמיתי: הוא ספר איזו מילה באה אחרי כל זוג מילים בכמה פסקאות של טקסט, והוא מסתכל רק על שתי המילים האחרונות. ⁦LLM⁩ אמיתי קורא אלפי טוקנים אחורה ולמד מטריליונים, אבל מה שיוצא ממנו הוא בדיוק אותו סוג של רשימה שראיתם. כל שאר התחנות במסלול קיימות כדי לשפר את הניחוש האחד הזה."),
    chapterHref: "index.html#start",
    real: true,
    mount,
  });
})();
