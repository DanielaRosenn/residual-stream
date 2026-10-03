/* Hop 1 · Chop Shop — the player builds a byte-pair-encoding (BPE) tokenizer by hand.
   Every count, merge and packet total comes from RSCore.bpe running on this page's CORPUS. */
(function () {
  "use strict";
  if (typeof RSGame === "undefined" || !RSGame.registerLevel) return;

  const B = "▁";        // word-start marker inside the tokenizer (same convention as js/tokenizer.js)
  const MARK = "␣";     // how that marker is drawn on screen (same as the tokens chapter)
  const TURNS = 8, CHOICES = 5, KEEP_GOING = 300;
  const RARE = tr("unbelievably", "אנציקלופדיה");

  const shown = s => String(s).split(B).join(MARK);
  const spoken = s => String(s).split(B).join(tr("word-start ", "תחילת־מילה "));
  const iso = s => "\u2068" + s + "\u2069"; // keep a piece's own order inside a sentence
  const nf = n => Math.round(n).toLocaleString(LANG === "he" ? "he-IL" : "en-US");
  const plainWord = sym => sym.join("").split(B).join("");
  const cleanWords = text => text.toLowerCase().split(/\s+/)
    .map(w => w.replace(/[^a-zא-ת]/g, "")).filter(Boolean);
  const packets = n => n === 1 ? tr("1 packet", "חבילה אחת") : tr(`${n} packets`, `${n} חבילות`);

  function shuffle(arr, rng) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /* A short slice of the corpus (whole sentences, ~10–14 words) to eyeball. */
  function pickSample(rng) {
    // Prefer sentences made of the text's common words, so the frequent pairs are visible in the slice.
    const freq = new Map();
    cleanWords(CORPUS).forEach(w => freq.set(w, (freq.get(w) || 0) + 1));
    const typical = s => s.reduce((a, w) => a + (freq.get(w) || 0), 0) / s.length;
    const sents = CORPUS.split(/[.!?]+/).map(cleanWords).filter(s => s.length >= 4)
      .sort((x, y) => typical(y) - typical(x));
    let i = Math.floor(rng() * Math.max(1, Math.ceil(sents.length * 0.4)));
    const out = [];
    while (out.length < 10 && out.length + sents[i % sents.length].length <= 16) { out.push(...sents[i % sents.length]); i++; }
    if (!out.length) out.push(...sents[0]);
    return out.slice(0, 14);
  }

  function chip(sym, extra) {
    const c = el("span", { class: "gl-chip" + (extra ? " " + extra : ""), dir: "auto" });
    String(sym).split(B).forEach((part, i) => {
      if (i) c.append(el("span", { class: "gl-mark", text: MARK }));
      if (part) c.append(document.createTextNode(part));
    });
    return c;
  }

  RSGame.registerLevel({
    id: "chop",
    order: 1,
    title: tr("Chop Shop", "סדנת החיתוך"),
    hop: tr("Hop 1 · Ingress", "תחנה 1 · כניסה"),
    concept: tr("Tokenization", "טוקניזציה"),
    chapterHref: "index.html#tokens",
    real: true,
    brief: tr(
      "A model can't read words — only pieces from a fixed list. You're building that list. Every piece costs one packet to send. Each turn, glue together the two neighbouring pieces you think appear most often in the whole text. Eight glues. Fewer packets wins.",
      "מודל לא יודע לקרוא מילים — רק חלקים מתוך רשימה קבועה. את הרשימה הזו בונים עכשיו. כל חלק עולה חבילה אחת במשלוח. בכל תור מדביקים יחד את שני החלקים השכנים שנראה לכם שמופיעים הכי הרבה בכל הטקסט. שמונה הדבקות. פחות חבילות — יותר טוב."),
    debrief: tr(
      "That is exactly how real tokenizers are built: start from single characters, count every neighbouring pair in a huge pile of text, glue the most common one, repeat — about 50,000 times or more instead of eight.\n\nThe result is a fixed list of pieces (tokens), and the model only ever sees their numbers. That's why AI tools count and bill in tokens, not words; why a common word costs one token while rare words, names and typos shatter into many; and why languages that are rare in the training text — Hebrew included — usually need more tokens for the same sentence.",
      "בדיוק כך בונים \u2066tokenizers\u2069 אמיתיים: מתחילים מתווים בודדים, סופרים כל זוג שכנים בערימה ענקית של טקסט, מדביקים את הזוג הנפוץ ביותר — וחוזרים על זה 50,000 פעמים ויותר במקום שמונה.\n\nהתוצאה היא רשימה קבועה של חלקים (טוקנים), והמודל רואה רק את המספרים שלהם. לכן כלי AI סופרים ומחייבים לפי טוקנים ולא לפי מילים; לכן מילה נפוצה עולה טוקן אחד, בזמן שמילים נדירות, שמות ושגיאות כתיב מתפרקים להרבה חלקים; ולכן שפות שמופיעות מעט בטקסט האימון — כולל עברית — צורכות בדרך כלל יותר טוקנים לאותו משפט."),

    mount(root, api) {
      const core = api.core;
      const rng = api.rng("chop-shop");
      const motion = !api.reducedMotion;
      const bpe = core.bpe(CORPUS);
      const startState = bpe.start();
      let state = startState;
      const START = bpe.tokenCount(state);
      const greedyCache = [START];
      const greedyCount = n => (greedyCache[n] != null ? greedyCache[n] : (greedyCache[n] = bpe.tokenCount(bpe.greedy(n))));
      const sample = pickSample(rng);
      let turn = 0, hits = 0, choices = [], timer = 0;
      const later = (fn, ms) => { clearTimeout(timer); timer = setTimeout(() => { if (root.isConnected) fn(); }, ms); };

      root.innerHTML = "";
      const wrap = el("div", { class: "gl-level gl-chop" });

      /* ---- Status: turn pips + packet counters ---- */
      const pips = el("ol", { class: "gl-pips", "aria-hidden": "true" });
      for (let i = 0; i < TURNS; i++) pips.append(el("li", { class: "gl-pip" }));
      const turnLbl = el("p", { class: "gl-turn" });
      const youNum = el("strong", { class: "gl-num", dir: "ltr" }), youSub = el("span", { class: "gl-sub", dir: "ltr" });
      const grNum = el("strong", { class: "gl-num", dir: "ltr" }), grSub = el("span", { class: "gl-sub", dir: "ltr" });
      const status = el("section", { class: "gl-card gl-status", "aria-label": tr("Progress", "התקדמות") },
        el("div", { class: "gl-status-top" }, turnLbl, pips),
        el("p", { class: "gl-h" }, tr("Packets needed to send the whole text", "חבילות שנדרשות כדי לשלוח את כל הטקסט")),
        el("div", { class: "gl-counters" },
          el("div", { class: "gl-counter gl-you" }, el("span", { class: "gl-counter-lbl", text: tr("Your pieces", "החלקים שלך") }), youNum, youSub),
          el("div", { class: "gl-counter" }, el("span", { class: "gl-counter-lbl", text: tr("Greedy algorithm, same number of glues", "האלגוריתם החמדן, אותו מספר הדבקות") }), grNum, grSub)),
        el("p", { class: "gl-cap", text: tr(
          `At the start every letter is its own packet, plus one ${MARK} per word: ${nf(START)} packets.`,
          `בהתחלה כל אות היא חבילה נפרדת, ועוד ${MARK} אחד לכל מילה: ${nf(START)} חבילות.`) }));

      /* ---- Sample line ---- */
      const line = el("div", { class: "gl-line" });
      const sampleCard = el("section", { class: "gl-card" },
        el("h3", { class: "gl-h", text: tr("Sample traffic, cut into your current pieces", "דגימת תעבורה, חתוכה לחלקים הנוכחיים שלך") }),
        line,
        el("p", { class: "gl-cap", text: tr(
          `${MARK} marks the start of a word — it stands for the space in front of it, so a word-start piece is different from the same letters mid-word.`,
          `${MARK} מסמן תחילת מילה — הוא מייצג את הרווח שלפניה, ולכן חלק שפותח מילה שונה מאותן אותיות באמצע מילה.`) }));

      /* ---- The move ---- */
      const qTitle = el("h3", { class: "gl-h", tabindex: "-1", text: tr("Which pair of neighbours appears most often in the whole text?", "איזה זוג שכנים מופיע הכי הרבה פעמים בכל הטקסט?") });
      const grid = el("div", { class: "gl-pairs", role: "group", "aria-label": tr("Candidate pairs", "זוגות מועמדים") });
      const feedback = el("div", { class: "gl-feedback", hidden: "" });
      const nextBtn = el("button", { type: "button", class: "btn gl-btn-lg", hidden: "" });
      const moveCard = el("section", { class: "gl-card" },
        qTitle,
        el("p", { class: "gl-cap", text: tr(
          "Tap the pair to glue into one new piece. The sample above is only a slice of the text — trust your eye.",
          "בחרו את הזוג שיודבק לחלק חדש אחד. הדגימה למעלה היא רק פרוסה מהטקסט — סמכו על העין.") }),
        grid, feedback, el("div", { class: "gl-actions" }, nextBtn));

      const finaleCard = el("section", { class: "gl-card gl-finale", hidden: "" });
      wrap.append(status, sampleCard, moveCard, finaleCard);
      root.append(wrap);

      /* ---- Rendering helpers ---- */
      function encodeSample(merges) { return sample.map(w => bpe.encode(w, merges)); }

      function renderLine(encs, fused, highlight) {
        line.innerHTML = "";
        let total = 0;
        encs.forEach((pieces, wi) => {
          const word = el("span", { class: "gl-word" });
          pieces.forEach((p, pi) => {
            let cls = pi % 2 ? "gl-alt" : "";
            if (fused && p === fused) cls += motion ? " gl-fused gl-anim" : " gl-fused";
            if (highlight && highlight.has(wi + ":" + pi)) cls += " gl-hi";
            word.append(chip(p, cls.trim()));
          });
          total += pieces.length;
          line.append(word);
        });
        line.setAttribute("aria-label", tr(`Sample: ${sample.length} words in ${total} pieces`, `דגימה: ${sample.length} מילים ב־${total} חלקים`));
      }

      function renderStatus(justGlued) {
        const you = bpe.tokenCount(state), g = greedyCount(turn);
        turnLbl.textContent = turn >= TURNS
          ? tr(`All ${TURNS} glues done`, `כל ${TURNS} ההדבקות בוצעו`)
          : justGlued
            ? tr(`Glue ${turn} of ${TURNS} done`, `הדבקה ${turn} מתוך ${TURNS} בוצעה`)
            : tr(`Glue ${turn + 1} of ${TURNS}`, `הדבקה ${turn + 1} מתוך ${TURNS}`);
        [...pips.children].forEach((li, i) => { li.className = "gl-pip" + (i < turn ? " done" : i === turn ? " now" : ""); });
        youNum.textContent = nf(you);
        youSub.textContent = you < START ? `−${nf(START - you)}` : "";
        grNum.textContent = nf(g);
        grSub.textContent = g < START ? `−${nf(START - g)}` : "";
      }

      function newTurn() {
        const counts = bpe.pairCounts(state);
        choices = shuffle(counts.slice(0, CHOICES), rng);
        grid.innerHTML = "";
        choices.forEach((c, i) => {
          grid.append(el("button", {
            type: "button", class: "gl-pair",
            "aria-label": tr(`Glue ${spoken(c.a)} and ${spoken(c.b)}`, `להדביק ${spoken(c.a)} ו־${spoken(c.b)}`),
            onclick: () => choose(i)
          },
            el("span", { class: "gl-pair-sym" }, chip(c.a), el("span", { class: "gl-plus", "aria-hidden": "true", text: "+" }), chip(c.b, "gl-alt")),
            el("span", { class: "gl-pair-reveal" })));
        });
        feedback.hidden = true;
        nextBtn.hidden = true;
        renderStatus();
        renderLine(encodeSample(state.merges));
      }

      function choose(i) {
        const c = choices[i];
        const max = Math.max(...choices.map(x => x.count));
        const best = choices.find(x => x.count === max);
        const hit = c.count === max;
        if (hit) hits++;

        // Reveal the real counts for every candidate.
        [...grid.children].forEach((btn, j) => {
          const x = choices[j], top = x.count === max, mine = j === i;
          btn.disabled = true;
          btn.classList.toggle("is-top", top);
          btn.classList.toggle("is-pick", mine);
          if (mine) btn.setAttribute("aria-pressed", "true");
          const rev = btn.querySelector(".gl-pair-reveal");
          rev.append(
            el("span", { class: "gl-meter" }, el("span", { class: "gl-meter-fill", style: `inline-size:${(x.count / max * 100).toFixed(1)}%` })),
            el("span", { class: "gl-pair-count", dir: "ltr", text: `×${nf(x.count)}` }));
          const badges = el("span", { class: "gl-badges" });
          if (top) badges.append(el("span", { class: "gl-badge good", text: tr("★ most common", "★ הכי נפוץ") }));
          if (mine) badges.append(el("span", { class: "gl-badge" + (hit ? " good" : " miss"), text: hit ? tr("✓ your pick", "✓ הבחירה שלך") : tr("✗ your pick", "✗ הבחירה שלך") }));
          if (badges.childNodes.length) rev.append(badges);
        });

        // Apply the PLAYER's merge: their tokenizer really diverges from greedy.
        const oldEnc = encodeSample(state.merges);
        const before = bpe.tokenCount(state);
        state = bpe.merge(state, c.a, c.b);
        turn++;
        const after = bpe.tokenCount(state), g = greedyCount(turn);
        const glued = c.a + c.b;
        const pairTxt = iso(`${shown(c.a)} + ${shown(c.b)}`), bestTxt = iso(`${shown(best.a)} + ${shown(best.b)}`);

        const head = hit
          ? tr(`✓ Top pair! “${pairTxt}” appears ${nf(c.count)} times — more than any other candidate.`,
               `✓ הזוג המוביל! \u200f“${pairTxt}” מופיע ${nf(c.count)} פעמים — יותר מכל מועמד אחר.`)
          : tr(`✗ Not the top pair: yours appears ${nf(c.count)} times, “${bestTxt}” appears ${nf(max)}. Glued anyway — your tokenizer follows your choices.`,
               `✗ לא הזוג המוביל: הזוג שלך מופיע ${nf(c.count)} פעמים, ו־“${bestTxt}” מופיע ${nf(max)}. הודבק בכל זאת — ה־\u2066tokenizer\u2069 שלך הולך לפי הבחירות שלך.`);
        const tail = tr(
          `“${iso(shown(glued))}” is now one piece everywhere. Whole text: ${nf(before)} → ${nf(after)} packets (greedy: ${nf(g)}).`,
          `מעכשיו \u200f“${iso(shown(glued))}” הוא חלק אחד בכל מקום. כל הטקסט ירד מ־${nf(before)} ל־${nf(after)} חבילות (החמדן: ${nf(g)}).`);
        feedback.innerHTML = "";
        feedback.className = "gl-feedback " + (hit ? "good" : "miss");
        feedback.append(el("p", { text: head }), el("p", { text: tail }));
        feedback.hidden = false;
        api.announce(head + " " + tail);

        // Chips: highlight the neighbours about to fuse, then fuse them.
        const hi = new Set();
        oldEnc.forEach((p, wi) => { for (let k = 0; k < p.length - 1; k++) if (p[k] === c.a && p[k + 1] === c.b) { hi.add(wi + ":" + k); hi.add(wi + ":" + (k + 1)); k++; } });
        const newEnc = encodeSample(state.merges);
        if (motion && hi.size) {
          renderLine(oldEnc, null, hi);
          later(() => renderLine(newEnc, glued), 550);
        } else renderLine(newEnc, glued);

        renderStatus(true);
        nextBtn.textContent = turn < TURNS ? tr("Next pair", "לזוג הבא") : tr("Test your tokenizer", "בדיקת ה־\u2066tokenizer\u2069 שלך");
        nextBtn.hidden = false;
        nextBtn.focus();
      }

      nextBtn.addEventListener("click", () => {
        clearTimeout(timer);
        if (turn < TURNS) {
          newTurn();
          qTitle.focus();
        } else finale();
      });

      /* ---- Finale: two words through the player's own tokenizer ---- */
      function finale() {
        moveCard.hidden = true;
        renderLine(encodeSample(state.merges));
        const freq = new Map();
        startState.words.forEach(w => { const s = plainWord(w.sym); freq.set(s, (freq.get(s) || 0) + w.freq); });
        let common = "", cf = 0;
        freq.forEach((f, w) => { if (f > cf) { cf = f; common = w; } });
        const rareF = freq.get(RARE) || 0;
        const longRun = bpe.greedy(KEEP_GOING).merges;

        const row = (label, merges, word) => {
          const pieces = bpe.encode(word, merges);
          return el("div", { class: "gl-enc" },
            el("span", { class: "gl-enc-lbl", text: label }),
            el("span", { class: "gl-word gl-enc-pieces" }, ...pieces.map((p, i) => chip(p, i % 2 ? "gl-alt" : ""))),
            el("strong", { class: "gl-enc-n", text: packets(pieces.length) }));
        };
        const block = (word, f) => el("div", { class: "gl-test" },
          el("p", { class: "gl-test-word" },
            el("strong", { dir: "auto", text: word }), " ",
            el("span", { class: "gl-cap", text: f
              ? tr(`appears ${nf(f)} times in the text`, `מופיעה ${nf(f)} פעמים בטקסט`)
              : tr("never appears in the text", "לא מופיעה בטקסט אף פעם") })),
          row(tr(`Your ${TURNS} glues`, `${TURNS} ההדבקות שלך`), state.merges, word),
          row(tr(`Same rule, kept going to ${longRun.length} glues`, `אותו כלל, ממשיכים עד ${longRun.length} הדבקות`), longRun, word));

        const finishBtn = el("button", { type: "button", class: "btn gl-btn-lg", text: tr("See your score", "לציון שלך") });
        finishBtn.addEventListener("click", () => {
          finishBtn.disabled = true;
          const you = bpe.tokenCount(state), g = greedyCount(TURNS);
          const span = START - g;
          const score = span > 0 ? Math.max(0, Math.min(1, (START - you) / span)) : 1;
          api.finish({
            score,
            summary: tr(
              `${hits} of your ${TURNS} glues picked the true top pair. Your pieces need ${nf(you)} packets for the whole text; the greedy algorithm needs ${nf(g)} (from ${nf(START)} at the start).`,
              `${hits} מתוך ${TURNS} ההדבקות שלך היו של הזוג המוביל באמת. החלקים שלך צריכים ${nf(you)} חבילות לכל הטקסט; האלגוריתם החמדן צריך ${nf(g)} (מתוך ${nf(START)} בהתחלה).`)
          });
        });

        finaleCard.innerHTML = "";
        const h = el("h3", { class: "gl-h", tabindex: "-1", text: tr("Test run: two words through your tokenizer", "הרצת בדיקה: שתי מילים דרך ה־\u2066tokenizer\u2069 שלך") });
        finaleCard.append(h,
          block(common, cf),
          block(RARE, rareF),
          el("p", { class: "gl-cap", text: tr(
            `“Kept going” is the same greedy rule run ${longRun.length} times on this page's text — real tokenizers run it tens of thousands of times on far more text.`,
            `"ממשיכים" — אותו כלל חמדן, שרץ ${longRun.length} פעמים על הטקסט של העמוד הזה. \u2066tokenizers\u2069 אמיתיים מריצים אותו עשרות אלפי פעמים על הרבה יותר טקסט.`) }),
          el("div", { class: "gl-actions" }, finishBtn));
        finaleCard.hidden = false;
        h.focus();
        const cN = bpe.encode(common, state.merges).length, rN = bpe.encode(RARE, state.merges).length;
        api.announce(tr(
          `Test run: “${common}” costs ${packets(cN)}, “${RARE}” costs ${packets(rN)}.`,
          `הרצת בדיקה: \u200f“${common}” עולה ${packets(cN)}, ו־“${RARE}” עולה ${packets(rN)}.`));
      }

      newTurn();
      return () => clearTimeout(timer);
    }
  });
})();
