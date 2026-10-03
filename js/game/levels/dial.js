/* Hop 6 · The Dial — the player runs the sampler: temperature (and later top-k) on a REAL next-word
   distribution from RSCore.ngram trained on this page's CORPUS, then releases 10 seeded samples. */
(function () {
  "use strict";
  if (typeof RSGame === "undefined" || !RSGame.registerLevel) return;

  const DRAWS = 10, T_MIN = 0.1, T_MAX = 2, T_STEP = 0.05;
  const isWord = w => /[a-zא-ת]/i.test(String(w));
  const cleanWords = text => text.toLowerCase().split(/\s+/)
    .map(w => w.replace(/[^a-zא-ת]/g, "")).filter(Boolean);
  const pct = p => (p <= 0 ? "0%" : p < 0.001 ? "<0.1%" : (p * 100).toFixed(1) + "%");
  const wordLabel = w => (w === "." ? tr("“.” (end)", "“.” (סוף)") : w);
  const q = s => "“\u2068" + s + "\u2069”";

  const MISSIONS = [
    {
      name: tr("Boring", "משעמם"),
      goal: tr("Make it boring: the same word at least 9 times out of 10.", "משעמם: אותה מילה לפחות 9 פעמים מתוך 10."),
      topk: false,
      check: (counts) => Math.max(...counts) >= 9
    },
    {
      name: tr("Adventurous", "הרפתקני"),
      goal: tr("Make it adventurous: at least 5 different words in 10.", "הרפתקני: לפחות 5 מילים שונות מתוך 10."),
      topk: true,
      check: (counts) => counts.filter(c => c > 0).length >= 5
    },
    {
      name: tr("Adventurous but safe", "הרפתקני אבל בטוח"),
      goal: tr("Adventurous but safe: at least 4 different words, and never the least likely word (⚠).",
               "הרפתקני אבל בטוח: לפחות 4 מילים שונות, ואף פעם לא המילה הכי פחות סבירה (⚠)."),
      topk: true,
      least: true,
      check: (counts) => counts.filter(c => c > 0).length >= 4 && counts[counts.length - 1] === 0
    }
  ];

  /* Probabilities the sampler uses: softmax(log p / T) over the top k candidates (list is sorted desc). */
  function probsFor(core, list, T, k) {
    const head = core.softmax(list.slice(0, k).map(x => Math.log(x.p)), T);
    return list.map((_, i) => (i < k ? head[i] : 0));
  }
  function tally(draws, n) { const c = new Array(n).fill(0); draws.forEach(i => c[i]++); return c; }

  /* Pick a corpus context whose real distribution makes all three missions winnable but not automatic. */
  function chooseContext(core, rngOf) {
    const model = core.ngram(CORPUS);
    const toks = core.words(CORPUS);
    const seen = new Set();
    const cands = [];
    const tryCtx = (ctx) => {
      const key = ctx.join(" ");
      if (seen.has(key)) return;
      seen.add(key);
      let list;
      try { list = model.next(ctx); } catch (e) { return; }
      list = (list || []).filter(x => x && x.p > 0);
      if (list.length >= 3) cands.push({ ctx, list });
    };
    for (let i = 0; i < toks.length; i++) {
      if (!isWord(toks[i])) continue;
      if (i > 0 && isWord(toks[i - 1])) tryCtx([toks[i - 1], toks[i]]);
      tryCtx([toks[i]]);
    }
    const sim = (probs, ok, seed) => {
      const r = rngOf(seed);
      let wins = 0;
      for (let run = 0; run < 160; run++) {
        const d = [];
        for (let j = 0; j < DRAWS; j++) d.push(core.sample(probs, r));
        if (ok(tally(d, probs.length))) wins++;
      }
      return wins / 160;
    };
    const rate = (o) => {
      const n = o.list.length, P = (T, k) => probsFor(core, o.list, T, k);
      const f1 = sim(P(T_MIN, n), MISSIONS[0].check, "p1");
      const easy1 = sim(P(1, n), MISSIONS[0].check, "e1");
      const f2 = Math.max(sim(P(1.5, n), MISSIONS[1].check, "p2"), sim(P(T_MAX, n), MISSIONS[1].check, "p2b"));
      let f3 = 0;
      for (let k = 4; k < n; k++) for (const T of [1, 1.5, T_MAX]) f3 = Math.max(f3, sim(P(T, k), MISSIONS[2].check, "p3" + k + T));
      return Math.min(f1, f2, f3) - 0.5 * easy1 + (n <= 8 ? 0.1 : 0) + (o.ctx.length === 2 ? 0.05 : 0) - (isWord(o.list[0].w) ? 0 : 0.2);
    };
    const stages = [
      o => o.list.length >= 5 && o.list.length <= 10 && o.list[0].p >= 1.4 * o.list[1].p,
      o => o.list.length >= 5 && o.list.length <= 12 && o.list[0].p > o.list[1].p * 1.0001
    ];
    for (const ok of stages) {
      const pool = cands.filter(ok);
      if (!pool.length) continue;
      let best = null, bestS = -Infinity;
      pool.forEach(o => { const s = rate(o); if (s > bestS) { bestS = s; best = o; } });
      return best;
    }
    // Last resort: the richest context, trimmed to its 8 most likely words (labelled as trimmed).
    const o = cands.sort((a, b) => b.list.length - a.list.length)[0];
    const kept = o.list.slice(0, 8), s = kept.reduce((a, x) => a + x.p, 0);
    return { ctx: o.ctx, list: kept.map(x => ({ w: x.w, p: x.p / s })), trimmed: o.list.length - kept.length };
  }

  /* The sentence from the corpus that this context comes from, up to the context. */
  function sentenceFor(ctx) {
    const sents = CORPUS.split(/[.!?]+/).map(cleanWords);
    const c = ctx.map(w => String(w).toLowerCase());
    for (const s of sents) {
      for (let i = 0; i + c.length <= s.length; i++) {
        if (c.every((w, j) => s[i + j] === w)) return s.slice(Math.max(0, i + c.length - 7), i + c.length);
      }
    }
    return c.slice();
  }

  RSGame.registerLevel({
    id: "dial",
    order: 6,
    title: tr("The Dial", "החוגה"),
    hop: tr("Hop 6 · Egress", "תחנה 6 · יציאה"),
    concept: tr("Sampling & temperature", "דגימה ו־\u2066temperature\u2069"),
    chapterHref: "index.html#sampling",
    real: true,
    brief: tr(
      "The model has already scored every word that could come next. You run the part that actually picks one. Three missions: read the target, set the dial, release 10 packets and see what comes out.",
      "המודל כבר נתן ציון לכל מילה שיכולה לבוא עכשיו. אתם מפעילים את החלק שבאמת בוחר אחת מהן. שלוש משימות: קוראים את היעד, מכוונים את החוגה, משחררים 10 חבילות ורואים מה יוצא."),
    debrief: tr(
      "The network never “decides” anything — it only hands over a probability for every candidate. A separate, simple piece of code, the sampler, rolls the dice, and temperature is the knob on those dice: it's the “creativity” setting you see in AI tools.\n\nLow temperature sharpens the bars — repeatable and safe, but dull. High temperature flattens them — varied and surprising, but riskier. Top-k simply cuts off everything below the k most likely words, so the weird tail can never be picked. Real chatbots do exactly this, once per token, over a vocabulary of about 100,000 tokens.",
      "הרשת אף פעם לא \"מחליטה\" — היא רק מוסרת הסתברות לכל מועמד. קוד נפרד ופשוט, ה־\u2066sampler\u2069, מטיל את הקובייה, ו־\u2066temperature\u2069 הוא הכפתור של הקובייה הזו: זו הגדרת ה\"יצירתיות\" שרואים בכלי AI.\n\n\u2066temperature\u2069 נמוכה מחדדת את העמודות — תוצאה עקבית ובטוחה, אבל משעממת. \u2066temperature\u2069 גבוהה משטחת אותן — תוצאה מגוונת ומפתיעה, אבל מסוכנת יותר. \u2066top-k\u2069 פשוט חותך את כל מה שמתחת ל־k המילים הסבירות ביותר, כך שהזנב המוזר לא ייבחר לעולם. צ'טבוטים אמיתיים עושים בדיוק את זה, פעם אחת לכל טוקן, על אוצר מילים של כ־100,000 טוקנים."),

    mount(root, api) {
      const core = api.core;
      const motion = !api.reducedMotion;
      const pick = chooseContext(core, s => api.rng("dial-probe-" + s));
      const LIST = pick.list, N = LIST.length;
      let mi = 0, attempt = 0, busy = false, T = 1, K = N, timer = 0, last = null;
      const scores = [], tries = [];
      const later = (fn, ms) => { timer = setTimeout(() => { if (root.isConnected) fn(); }, ms); };

      root.innerHTML = "";
      const wrap = el("div", { class: "gl-level gl-dial" });

      /* ---- Mission header ---- */
      const mpips = el("ol", { class: "gl-mpips", "aria-label": tr("Missions", "משימות") });
      const mLabel = el("p", { class: "gl-turn" });
      const mGoal = el("h3", { class: "gl-h gl-goal", tabindex: "-1" });
      const unlock = el("p", { class: "gl-unlock", hidden: "" });
      const missionCard = el("section", { class: "gl-card gl-mission" },
        el("div", { class: "gl-status-top" }, mLabel, mpips), mGoal, unlock);

      /* ---- The sentence and its real distribution ---- */
      const sent = sentenceFor(pick.ctx);
      const blank = el("span", { class: "gl-blank", "aria-label": tr("next word", "המילה הבאה"), text: "?" });
      const sentence = el("p", { class: "gl-sentence", dir: "auto" });
      sent.forEach((w, i) => {
        const inCtx = i >= sent.length - pick.ctx.length;
        sentence.append(inCtx ? el("mark", { class: "gl-ctx", text: w }) : document.createTextNode(w), " ");
      });
      sentence.append(blank);
      const bars = el("div", { class: "gl-bars", role: "list", "aria-label": tr("Next-word probabilities", "הסתברויות למילה הבאה") });
      const rows = LIST.map((x, i) => {
        const fill = el("span", { class: "gl-fill" });
        const ghost = el("span", { class: "gl-ghost", style: `inline-size:${(x.p * 100).toFixed(2)}%` });
        const p = el("span", { class: "gl-p", dir: "ltr" });
        const t = el("span", { class: "gl-tally", dir: "ltr" });
        const w = el("span", { class: "gl-w", dir: "auto", text: wordLabel(x.w) });
        const row = el("div", { class: "gl-bar-row", role: "listitem" }, w, el("span", { class: "gl-track" }, ghost, fill), p, t);
        bars.append(row);
        return { row, fill, p, t, w, i };
      });
      const leastNote = el("p", { class: "gl-cap", hidden: "" });
      const lastP = LIST[N - 1].p, ties = LIST.filter(x => Math.abs(x.p - lastP) < 1e-12).length - 1;
      if (ties > 0) leastNote.textContent = tr(
        `⚠ is tied with ${ties} other word${ties > 1 ? "s" : ""} at ${pct(lastP)} — the model's list ranks it last, so top-k cuts it first.`,
        `⚠ שווה ל־${ties} ${ties > 1 ? "מילים אחרות" : "מילה אחרת"} (${pct(lastP)}) — ברשימה של המודל היא אחרונה, ולכן \u2066top-k\u2069 חותך אותה ראשונה.`);
      const two = pick.ctx.length > 1;
      const modelCard = el("section", { class: "gl-card" },
        sentence,
        el("p", { class: "gl-cap", text: two
          ? tr("The model sees only the last two words (highlighted) and has a probability for every word that followed them in its training text.",
               "המודל רואה רק את שתי המילים האחרונות (המודגשות), ויש לו הסתברות לכל מילה שבאה אחריהן בטקסט האימון שלו.")
          : tr("The model sees only the last word (highlighted) and has a probability for every word that followed it in its training text.",
               "המודל רואה רק את המילה האחרונה (המודגשת), ויש לו הסתברות לכל מילה שבאה אחריה בטקסט האימון שלו.") }),
        bars,
        el("p", { class: "gl-cap", text: tr(
          "Dashed outline: the model's own probabilities (temperature 1). Solid bar and %: what the sampler will actually use.",
          "קו מקווקו: ההסתברויות של המודל עצמו (\u2066temperature 1\u2069). העמודה המלאה והאחוז: מה שה־\u2066sampler\u2069 ישתמש בו בפועל.") }),
        leastNote,
        el("p", { class: "gl-cap gl-real", text: tr(
          "Real numbers: the live distribution from the tiny model running in your browser, trained on this site's sample text — not a hand-made example." + (pick.trimmed ? ` Showing its ${N} most likely words.` : ""),
          "מספרים אמיתיים: ההתפלגות החיה של המודל הזעיר שרץ בדפדפן, שאומן על טקסט הדוגמה של האתר — לא דוגמה שהומצאה ביד." + (pick.trimmed ? ` מוצגות ${N} המילים הסבירות ביותר.` : "")) }));

      /* ---- Controls ---- */
      const tId = "gl-temp-" + Math.random().toString(36).slice(2, 8);
      const tOut = el("output", { class: "gl-out", for: tId, dir: "ltr" });
      const slider = el("input", { type: "range", id: tId, class: "gl-range", min: String(T_MIN), max: String(T_MAX), step: String(T_STEP), value: "1" });
      const kOut = el("output", { class: "gl-out", dir: "auto" });
      const kDown = el("button", { type: "button", class: "gl-step", "aria-label": tr("Fewer candidates (lower top-k)", "פחות מועמדים (\u2066top-k\u2069 נמוך יותר)"), text: "−" });
      const kUp = el("button", { type: "button", class: "gl-step", "aria-label": tr("More candidates (higher top-k)", "יותר מועמדים (\u2066top-k\u2069 גבוה יותר)"), text: "+" });
      const kBox = el("div", { class: "gl-control gl-topk", hidden: "" },
        el("div", { class: "gl-control-head" },
          el("span", { class: "gl-control-lbl", id: tId + "-k", text: tr("Top-k: keep only the k most likely words", "\u2066top-k\u2069: משאירים רק את k המילים הסבירות ביותר") })),
        el("div", { class: "gl-stepper", role: "group", "aria-labelledby": tId + "-k" }, kDown, kOut, kUp));
      const controls = el("section", { class: "gl-card gl-controls" },
        el("div", { class: "gl-control" },
          el("div", { class: "gl-control-head" },
            el("label", { class: "gl-control-lbl", for: tId, text: tr("Temperature", "\u2066Temperature\u2069 (טמפרטורה)") }), tOut),
          slider,
          el("div", { class: "gl-ends", "aria-hidden": "true" },
            el("span", { text: tr("0.1 · focused", "0.1 · ממוקד") }), el("span", { text: tr("2.0 · wild", "2.0 · פרוע") }))),
        kBox);

      /* ---- Release ---- */
      const releaseBtn = el("button", { type: "button", class: "btn gl-btn-lg gl-release" });
      const drops = el("ol", { class: "gl-drops", "aria-label": tr("Released packets", "החבילות ששוחררו") });
      const verdict = el("div", { class: "gl-feedback", hidden: "" });
      const nextBtn = el("button", { type: "button", class: "btn gl-btn-lg", hidden: "" });
      const releaseCard = el("section", { class: "gl-card" },
        el("div", { class: "gl-actions" }, releaseBtn), drops, verdict, el("div", { class: "gl-actions" }, nextBtn));

      wrap.append(missionCard, modelCard, controls, releaseCard);
      root.append(wrap);

      /* ---- Behaviour ---- */
      const current = () => probsFor(core, LIST, T, K);
      function emptySlots() {
        drops.innerHTML = "";
        for (let i = 0; i < DRAWS; i++) drops.append(el("li", { class: "gl-slot", "aria-hidden": "true", text: String(i + 1) }));
      }
      function renderBars() {
        const P = current(), M = MISSIONS[mi];
        tOut.textContent = T.toFixed(2);
        slider.setAttribute("aria-valuetext", T.toFixed(2));
        kOut.textContent = K >= N ? tr(`all ${N}`, `כל ה־${N}`) : `k = ${K}`;
        kDown.disabled = K <= 1;
        kUp.disabled = K >= N;
        rows.forEach(r => {
          const cut = r.i >= K, least = !!M.least && r.i === N - 1;
          r.row.classList.toggle("is-cut", cut);
          r.row.classList.toggle("is-least", least);
          r.fill.style.inlineSize = (P[r.i] * 100).toFixed(2) + "%";
          r.p.textContent = cut ? tr("cut", "נחתך") : pct(P[r.i]);
          r.w.textContent = (least ? "⚠ " : "") + wordLabel(LIST[r.i].w);
          r.row.setAttribute("aria-label", `${wordLabel(LIST[r.i].w)}: ${cut ? tr("cut", "נחתך") : pct(P[r.i])}` + (r.t.textContent ? `, ${r.t.textContent}` : ""));
        });
        leastNote.hidden = !(M.least && ties > 0);
      }
      function clearTally() { rows.forEach(r => { r.t.textContent = ""; r.row.classList.remove("was-drawn"); }); }

      function startMission() {
        const M = MISSIONS[mi];
        attempt = 0; T = 1; K = N; busy = false; last = null;
        slider.value = "1";
        mLabel.textContent = tr(`Mission ${mi + 1} of ${MISSIONS.length}`, `משימה ${mi + 1} מתוך ${MISSIONS.length}`);
        mGoal.textContent = M.goal;
        mpips.innerHTML = "";
        MISSIONS.forEach((m, i) => mpips.append(el("li", {
          class: "gl-mpip" + (i < mi ? " done" : i === mi ? " now" : ""),
          text: (i < mi ? "✓ " : "") + m.name
        })));
        kBox.hidden = !M.topk;
        unlock.hidden = !(M.topk && mi === 1);
        unlock.textContent = tr("New control unlocked: top-k.", "בקרה חדשה נפתחה: \u2066top-k\u2069.");
        releaseBtn.textContent = tr(`Release ${DRAWS} packets`, `שחרור ${DRAWS} חבילות`);
        releaseBtn.disabled = false;
        blank.textContent = "?";
        verdict.hidden = true;
        nextBtn.hidden = true;
        clearTally();
        emptySlots();
        renderBars();
      }

      function explain(counts, ok) {
        const P = last.probs, M = MISSIONS[mi];
        const distinct = counts.filter(c => c > 0).length;
        let top = 0; counts.forEach((c, i) => { if (c > counts[top]) top = i; });
        const tw = q(wordLabel(LIST[top].w)), Tt = last.T.toFixed(2);
        const leastW = q(wordLabel(LIST[N - 1].w));
        if (mi === 0) return ok
          ? tr(`✓ ${tw} came out ${counts[top]} times out of 10. At temperature ${Tt} it has ${pct(P[top])} of the probability.`,
               `✓ ${tw} יצאה ${counts[top]} פעמים מתוך 10. ב־\u2066temperature ${Tt}\u2069 יש לה ${pct(P[top])} מההסתברות.`)
          : tr(`✗ The most common word, ${tw}, came out only ${counts[top]} times. At temperature ${Tt} the top word has ${pct(P[0])} — you need about 90% or more. Turn the dial down.`,
               `✗ המילה השכיחה ביותר, ${tw}, יצאה רק ${counts[top]} פעמים. ב־\u2066temperature ${Tt}\u2069 למילה המובילה יש ${pct(P[0])} — צריך בערך 90% ומעלה. סובבו את החוגה למטה.`);
        const kinds = d => (d === 1 ? tr("1 word", "מילה אחת") : tr(`${d} different words`, `${d} מילים שונות`));
        const maxed = last.T >= T_MAX - 1e-9;
        // What to try next: only advice the player can still act on.
        const advise = need => {
          const a = [];
          if (!maxed) a.push(tr("turn the dial up to flatten the bars", "סובבו את החוגה למעלה כדי לשטח את העמודות"));
          if (last.K < N && (mi === 1 || last.K < need + 1)) a.push(tr("let more candidates in (top-k)", "תנו ליותר מועמדים להיכנס (\u2066top-k\u2069)"));
          if (!a.length) return tr("At these settings it's down to the dice — release again.", "בהגדרות האלה זה כבר עניין של מזל בקובייה — שחררו שוב.");
          const s = a.join(tr(", and ", ", ו"));
          return s.charAt(0).toUpperCase() + s.slice(1) + ".";
        };
        if (mi === 1) return ok
          ? tr(`✓ ${kinds(distinct)} in 10 packets. At temperature ${Tt} the top word has only ${pct(P[0])}.`,
               `✓ ${kinds(distinct)} ב־10 חבילות. ב־\u2066temperature ${Tt}\u2069 למילה המובילה יש רק ${pct(P[0])}.`)
          : tr(`✗ Only ${kinds(distinct)} — you need 5. The top word holds ${pct(P[0])}. `,
               `✗ רק ${kinds(distinct)} — צריך 5. למילה המובילה יש ${pct(P[0])}. `) + advise(5);
        if (ok) return last.K < N
          ? tr(`✓ ${kinds(distinct)}, and ${leastW} never came out — top-k ${last.K} cut it off, so it couldn't.`,
               `✓ ${distinct} מילים שונות, ו־${leastW} לא יצאה אף פעם — \u2066top-k ${last.K}\u2069 חתך אותה, אז היא לא יכלה לצאת.`)
          : tr(`✓ ${kinds(distinct)}, and ${leastW} never came out — this time by luck (it still had ${pct(P[N - 1])}). Top-k would make it certain.`,
               `✓ ${distinct} מילים שונות, ו־${leastW} לא יצאה אף פעם — הפעם במזל (עדיין היו לה ${pct(P[N - 1])}). \u2066top-k\u2069 היה מבטיח את זה.`);
        const parts = [];
        if (counts[N - 1] > 0) parts.push(tr(
          `${leastW}, the least likely word (${pct(P[N - 1])} at these settings), slipped through ${counts[N - 1]}×. Use top-k to cut it off.`,
          `${leastW}, המילה הכי פחות סבירה (${pct(P[N - 1])} בהגדרות האלה), חמקה ${counts[N - 1] === 1 ? "פעם אחת" : counts[N - 1] + " פעמים"}. השתמשו ב־\u2066top-k\u2069 כדי לחתוך אותה.`));
        if (distinct < 4) parts.push(tr(`Only ${kinds(distinct)} — you need 4.`, `רק ${kinds(distinct)} — צריך 4.`) + " " + advise(4));
        return "✗ " + parts.join(" ");
      }

      function judge(draws) {
        const counts = tally(draws, N), M = MISSIONS[mi];
        const ok = M.check(counts);
        rows.forEach(r => {
          r.t.textContent = counts[r.i] ? `×${counts[r.i]}` : "";
          r.row.classList.toggle("was-drawn", counts[r.i] > 0);
        });
        renderBars();
        const msg = explain(counts, ok);
        verdict.className = "gl-feedback " + (ok ? "good" : "miss");
        verdict.innerHTML = "";
        verdict.append(el("p", { text: msg }));
        verdict.hidden = false;
        busy = false;
        if (ok) {
          scores[mi] = attempt === 1 ? 1 : attempt === 2 ? 0.7 : 0.4;
          tries[mi] = attempt;
          releaseBtn.disabled = true;
          nextBtn.textContent = mi < MISSIONS.length - 1 ? tr("Next mission", "למשימה הבאה") : tr("See your score", "לציון שלך");
          nextBtn.hidden = false;
          verdict.append(el("p", { class: "gl-cap", text: attempt === 1
            ? tr("First release — full marks.", "בשחרור הראשון — ניקוד מלא.")
            : tr(`Done on release ${attempt}.`, `הצלחה בשחרור ${attempt}.`) }));
          api.announce(msg);
          nextBtn.focus();
        } else {
          releaseBtn.disabled = false;
          releaseBtn.textContent = tr("Adjust and release again (fresh dice)", "לכוונן ולשחרר שוב (הטלה חדשה)");
          api.announce(msg);
        }
      }

      function release() {
        if (busy) return;
        busy = true;
        attempt++;
        clearTimeout(timer);
        const probs = current();
        last = { probs, T, K };
        const r = api.rng(`dial-${mi}-${attempt}`);
        const draws = [];
        for (let j = 0; j < DRAWS; j++) draws.push(core.sample(probs, r));
        releaseBtn.disabled = true;
        verdict.hidden = true;
        clearTally();
        emptySlots();
        const land = j => {
          const i = draws[j];
          const least = MISSIONS[mi].least && i === N - 1;
          const chip = el("li", { class: "gl-drop" + (least ? " is-least" : "") + (motion ? " gl-anim" : ""), dir: "auto",
            text: (least ? "⚠ " : "") + wordLabel(LIST[i].w) });
          drops.children[j].replaceWith(chip);
          blank.textContent = wordLabel(LIST[i].w);
        };
        if (!motion) { draws.forEach((_, j) => land(j)); judge(draws); return; }
        let j = 0;
        const step = () => {
          land(j++);
          if (j < DRAWS) later(step, 170);
          else later(() => judge(draws), 250);
        };
        step();
      }

      slider.addEventListener("input", () => {
        T = Math.min(T_MAX, Math.max(T_MIN, parseFloat(slider.value) || 1));
        rows.forEach(r => r.row.classList.add("is-stale"));
        renderBars();
      });
      kDown.addEventListener("click", () => { if (K > 1) { K--; renderBars(); api.announce(kOut.textContent); } });
      kUp.addEventListener("click", () => { if (K < N) { K++; renderBars(); api.announce(kOut.textContent); } });
      releaseBtn.addEventListener("click", () => { rows.forEach(r => r.row.classList.remove("is-stale")); release(); });
      nextBtn.addEventListener("click", () => {
        if (mi < MISSIONS.length - 1) { mi++; startMission(); mGoal.focus(); api.announce(MISSIONS[mi].goal); return; }
        nextBtn.disabled = true;
        const score = scores.reduce((a, b) => a + b, 0) / MISSIONS.length;
        api.finish({
          score,
          summary: MISSIONS.map((m, i) => tries[i] === 1
            ? tr(`${m.name}: ✓ first release`, `${m.name}: ✓ בשחרור הראשון`)
            : tr(`${m.name}: ✓ on release ${tries[i]}`, `${m.name}: ✓ בשחרור ${tries[i]}`)).join(" · ")
        });
      });

      startMission();
      return () => clearTimeout(timer);
    }
  });
})();
