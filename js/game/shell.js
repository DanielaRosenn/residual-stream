/* RSGame — the game shell: route map, level view, scoring, progress, hash routing.
   Levels register themselves with RSGame.registerLevel(def); start.js calls RSGame.start(). */
const RSGame = (function () {
  const STORE_KEY = "rs-game";
  const levels = new Map();
  const reducedMotion = (() => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } })();

  /* Hops that are planned but may not be built yet. A registered level with the same id replaces its placeholder. */
  const PLANNED = [
    { id: "job", order: 0, title: tr("The Job", "התפקיד"), concept: tr("Next-word prediction", "חיזוי המילה הבאה"), hop: tr("Hop 0 · Handshake", "תחנה 0 · לחיצת יד") },
    { id: "chop", order: 1, title: tr("Chop", "חיתוך"), concept: tr("Tokenization", "⁦Tokenization⁩"), hop: tr("Hop 1 · Ingress", "תחנה 1 · כניסה") },
    { id: "hotcold", order: 2, title: tr("Hot and Cold", "חם וקר"), concept: tr("Embeddings", "⁦Embeddings⁩"), hop: tr("Hop 2 · Address lookup", "תחנה 2 · חיפוש כתובת") },
    { id: "stamp", order: 3, title: tr("Stamp the Order", "חותמת סדר"), concept: tr("Position", "מיקום (⁦position⁩)"), hop: tr("Hop 3 · Sequence numbers", "תחנה 3 · מספרי רצף") },
    { id: "spotlight", order: 4, title: tr("Spotlight", "זרקור"), concept: tr("Attention", "⁦Attention⁩"), hop: tr("Hop 4 · Routing", "תחנה 4 · ניתוב") },
    { id: "notepad", order: 5, title: tr("The Notepad", "הפנקס"), concept: tr("Residual stream", "⁦Residual stream⁩"), hop: tr("Hop 5 · Payload", "תחנה 5 · המטען") },
    { id: "dial", order: 6, title: tr("The Dial", "החוגה"), concept: tr("Sampling & temperature", "⁦Sampling⁩ וטמפרטורה"), hop: tr("Hop 6 · Egress", "תחנה 6 · יציאה") },
    { id: "downhill", order: 7, title: tr("Downhill Blind", "במורד, בעיניים עצומות"), concept: tr("Training", "אימון (⁦training⁩)"), hop: tr("Hop 7 · Route tuning", "תחנה 7 · כיוון המסלול") },
    { id: "desk", order: 8, title: tr("The Desk", "השולחן"), concept: tr("Context window", "⁦Context window⁩"), hop: tr("Hop 8 · Buffer", "תחנה 8 · חוצץ") },
    { id: "nonsense", order: 9, title: tr("Confident Nonsense", "שטויות בביטחון מלא"), concept: tr("Hallucination", "הזיות (⁦hallucination⁩)"), hop: tr("Hop 9 · Spoofed reply", "תחנה 9 · תשובה מזויפת") },
    { id: "gatekeeper", order: 10, title: tr("Gatekeeper", "שומר הסף"), concept: tr("Prompt injection", "⁦Prompt injection⁩"), hop: tr("Hop 10 · Firewall", "תחנה 10 · חומת אש") },
  ];

  /* ---------- Progress storage (works without localStorage) ---------- */
  let progress = { v: 1, levels: {} };
  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      const p = JSON.parse(raw);
      if (p && p.v === 1 && p.levels && typeof p.levels === "object") progress = { v: 1, levels: p.levels };
    } catch (e) { /* storage unavailable or corrupt: play without saving */ }
  }
  function saveProgress() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(progress)); } catch (e) { /* ignore */ }
  }
  const record = id => progress.levels[id] || { stars: 0, best: 0 };
  const starsFor = score => (score >= 0.85 ? 3 : score >= 0.6 ? 2 : 1);

  /* ---------- Registry ---------- */
  function registerLevel(def) {
    if (!def || typeof def.id !== "string" || typeof def.mount !== "function") {
      console.warn("RSGame.registerLevel: a level needs an id and a mount(root, api) function", def);
      return;
    }
    levels.set(def.id, { order: 0, real: false, ...def });
  }
  const registered = () => [...levels.values()].sort((a, b) => a.order - b.order);
  function routeList() {
    const list = registered().map(d => ({ ...d, built: true }));
    PLANNED.forEach(p => { if (!levels.has(p.id)) list.push({ ...p, built: false }); });
    return list.sort((a, b) => a.order - b.order);
  }
  function isUnlocked(id) {
    const regs = registered();
    const i = regs.findIndex(d => d.id === id);
    if (i <= 0) return i === 0;
    return record(regs[i - 1].id).stars >= 1;
  }
  function prevLevel(id) {
    const regs = registered();
    const i = regs.findIndex(d => d.id === id);
    return i > 0 ? regs[i - 1] : null;
  }
  function nextLevel(id) {
    const regs = registered();
    const i = regs.findIndex(d => d.id === id);
    return i >= 0 && i < regs.length - 1 ? regs[i + 1] : null;
  }

  /* chapterHref is written as "index.html#x"; both play pages resolve that to their own guide.
     Strip any language/relative prefix a level may have added. */
  function chapterLink(href) {
    return String(href || "index.html").replace(/^(\.\.\/|\.\/)+/, "").replace(/^he\//, "");
  }

  /* ---------- Small DOM helpers ---------- */
  let live = null;
  function announce(text) {
    if (!live) return;
    live.textContent = "";
    setTimeout(() => { live.textContent = String(text || ""); }, 60);
  }
  function starIcons(n, cls = "") {
    const wrap = el("span", { class: "g-stars " + cls, role: "img", "aria-label": tr(`${n} of 3 stars`, `${n} מתוך 3 כוכבים`) });
    for (let i = 0; i < 3; i++) {
      const s = sv("svg", { viewBox: "0 0 24 24", class: "g-star" + (i < n ? " on" : ""), "aria-hidden": "true", focusable: "false" });
      s.append(sv("path", { d: "M12 2.6l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.4l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" }));
      if (!reducedMotion && cls.includes("pop")) s.style.animationDelay = (0.12 + i * 0.14) + "s";
      wrap.append(s);
    }
    return wrap;
  }
  function oneStar() {
    const s = sv("svg", { viewBox: "0 0 24 24", class: "g-star on", "aria-hidden": "true", focusable: "false" });
    s.append(sv("path", { d: "M12 2.6l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.4l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" }));
    return s;
  }
  const pct = x => Math.round(Math.max(0, Math.min(1, x)) * 100) + "%";
  const BACK = () => tr("← Route map", "→ מפת המסלול");

  /* ---------- Views ---------- */
  let root = null, firstRender = true, lastLevelId = null, unmount = null;

  function setView(node, focusTarget) {
    if (typeof unmount === "function") { try { unmount(); } catch (e) { console.error(e); } }
    unmount = null;
    root.innerHTML = "";
    root.append(node);
    if (!firstRender && focusTarget) {
      try { window.scrollTo({ top: 0, behavior: "instant" }); } catch (e) { window.scrollTo(0, 0); }
      focusTarget.focus({ preventScroll: true });
    }
    firstRender = false;
  }

  function renderMap(notice) {
    const list = routeList();
    const regs = registered();
    const totalStars = regs.reduce((s, d) => s + record(d.id).stars, 0);
    const cleared = regs.filter(d => record(d.id).stars >= 1).length;

    const h1 = el("h1", { id: "gMapTitle", class: "g-title", tabindex: "-1", text: tr("Be the Model", "להיות המודל") });
    const sec = el("section", { class: "g-map", "aria-labelledby": "gMapTitle" },
      el("p", { class: "g-kicker", dir: "ltr" }, el("span", { class: "g-prompt", "aria-hidden": "true", text: "$ " }), document.createTextNode("traceroute prompt → next-token")),
      h1,
      el("p", { class: "g-lede", text: tr("Trace one guess through a transformer, hop by hop.", "עוקבים אחרי ניחוש אחד במסעו בתוך ⁦transformer⁩, תחנה אחרי תחנה.") }),
      el("p", { class: "g-intro", text: tr(
        "You are the model. Each hop on this route is one step a language model takes to produce a single word. Make the move yourself, then see how close you came to the real computation running right here in your browser. No way to lose — retry as often as you like.",
        "אתם המודל. כל תחנה במסלול היא צעד אחד שמודל שפה עושה כדי להפיק מילה אחת. עשו את הצעד בעצמכם, ואז תראו כמה קרוב הגעתם לחישוב האמיתי שרץ כאן בדפדפן. אי אפשר להפסיד — אפשר לנסות שוב כמה שרוצים.") }));

    if (notice) sec.append(el("p", { class: "g-notice", role: "status", text: notice }));

    sec.append(el("p", { class: "g-tally" },
      el("span", { class: "g-tally-stars" }, oneStar(), el("span", { text: tr(` ${totalStars} / ${regs.length * 3} stars`, ` ${totalStars} / ${regs.length * 3} כוכבים`) })),
      el("span", { class: "g-tally-hops", text: tr(`${cleared} of ${regs.length} hops cleared`, `${cleared} מתוך ${regs.length} תחנות הושלמו`) })));

    const ol = el("ol", { class: "g-route", "aria-label": tr("Route", "המסלול") });
    list.forEach(d => {
      const rec = record(d.id);
      let state = "soon";
      if (d.built) state = isUnlocked(d.id) ? (rec.stars >= 1 ? "done" : "open") : "locked";
      const li = el("li", { class: "g-hop is-" + state, "data-hop": d.id });
      li.append(el("span", { class: "g-node", "aria-hidden": "true" }));
      const stateText = {
        open: tr("Play", "שחקו"),
        done: tr(`Best ${pct(rec.best)} · replay`, `שיא ${pct(rec.best)} · שחקו שוב`),
        locked: tr("Locked", "נעול"),
        soon: tr("Coming soon", "בקרוב"),
      }[state];
      const inner = [
        el("span", { class: "g-hop-label", text: d.hop || "" }),
        el("span", { class: "g-hop-title", text: d.title }),
        el("span", { class: "g-hop-concept", text: d.concept || "" }),
        el("span", { class: "g-hop-foot" },
          d.built ? starIcons(rec.stars) : null,
          el("span", { class: "g-hop-state", text: stateText })),
      ];
      if (d.built) {
        const btn = el("button", { type: "button", class: "g-hop-card", "data-level": d.id }, ...inner);
        if (state === "locked") {
          btn.setAttribute("aria-disabled", "true");
          const prev = prevLevel(d.id);
          btn.addEventListener("click", () => announce(tr(
            `Locked. Earn a star on “${prev ? prev.title : ""}” first.`,
            `נעול. קודם צריך להרוויח כוכב ב“${prev ? prev.title : ""}”.`)));
        } else {
          btn.addEventListener("click", () => { location.hash = "#" + d.id; });
        }
        li.append(btn);
      } else {
        li.append(el("div", { class: "g-hop-card" }, ...inner));
      }
      ol.append(li);
    });
    sec.append(ol);

    let armed = false;
    const reset = el("button", { type: "button", class: "g-reset", text: tr("Reset progress", "איפוס ההתקדמות") });
    reset.addEventListener("click", () => {
      if (!armed) { armed = true; reset.textContent = tr("Click again to erase all stars", "לחצו שוב כדי למחוק את כל הכוכבים"); return; }
      progress = { v: 1, levels: {} };
      try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
      announce(tr("Progress reset.", "ההתקדמות אופסה."));
      renderMap();
    });
    sec.append(el("p", { class: "g-foot" }, reset));

    document.title = tr("Be the Model — The Residual Stream", "להיות המודל — The Residual Stream");
    let focusTarget = h1;
    if (lastLevelId) {
      const card = sec.querySelector(`.g-hop-card[data-level="${lastLevelId}"]`);
      if (card) focusTarget = card;
    }
    setView(sec, focusTarget);
    lastLevelId = null;
  }

  function renderLevel(def) {
    lastLevelId = def.id;
    const regs = registered();
    const idx = regs.findIndex(d => d.id === def.id);
    const back = el("button", { type: "button", class: "g-back", text: BACK() });
    back.addEventListener("click", () => { location.hash = ""; });
    const h1 = el("h1", { id: "gLevelTitle", class: "g-level-title", tabindex: "-1", text: def.title });
    const tags = el("p", { class: "g-tags" },
      def.concept ? el("span", { class: "g-tag", text: def.concept }) : null,
      def.real
        ? el("span", { class: "g-tag is-real", title: tr("Your move is scored against a real computation running in this page.", "המהלך שלכם נמדד מול חישוב אמיתי שרץ בדף הזה."), text: tr("Live · real computation", "חי · חישוב אמיתי") })
        : el("span", { class: "g-tag is-illus", title: tr("The numbers here are hand-set to show the idea; they are not computed by a model.", "המספרים כאן נקבעו ידנית כדי להמחיש את הרעיון; הם לא חושבו על ידי מודל."), text: tr("Illustrative", "להמחשה") }));

    const sec = el("section", { class: "g-level", "aria-labelledby": "gLevelTitle", "data-level": def.id },
      el("div", { class: "g-crumbs" }, back,
        el("span", { class: "g-progress", text: tr(`Level ${idx + 1} of ${regs.length}`, `שלב ${idx + 1} מתוך ${regs.length}`) })),
      el("header", { class: "g-level-head" },
        el("p", { class: "g-hop-label", text: def.hop || "" }),
        h1, tags,
        el("p", { class: "g-brief", text: def.brief || "" })));

    if (!isUnlocked(def.id)) {
      const prev = prevLevel(def.id);
      const go = el("button", { type: "button", class: "g-linkbtn", text: tr(`Play “${prev ? prev.title : ""}” first`, `לשחק קודם ב“${prev ? prev.title : ""}”`) });
      go.addEventListener("click", () => { if (prev) location.hash = "#" + prev.id; });
      sec.append(el("p", { class: "g-notice" },
        document.createTextNode(tr("You skipped ahead — this hop builds on the one before it. ", "דילגתם קדימה — התחנה הזו נשענת על זו שלפניה. ")), go));
    }

    let stage = el("div", { class: "g-stage" });
    sec.append(stage);
    const results = el("section", { class: "g-results", hidden: "", "aria-labelledby": "gResTitle" });
    sec.append(results);

    function mount() {
      if (typeof unmount === "function") { try { unmount(); } catch (e) { console.error(e); } }
      unmount = null;
      const fresh = el("div", { class: "g-stage" });
      stage.replaceWith(fresh);
      stage = fresh;
      results.hidden = true;
      results.innerHTML = "";
      const api = {
        core: typeof RSCore !== "undefined" ? RSCore : null,
        rng: seed => RSCore.rng(seed),
        announce,
        reducedMotion,
        finish: res => showResults(def, res, results),
      };
      try {
        const ret = def.mount(stage, api);
        if (typeof ret === "function") unmount = ret;
      } catch (e) {
        console.error(e);
        stage.innerHTML = "";
        stage.append(el("p", { class: "g-notice", text: tr("This hop failed to load. Try again, or go back to the route map.", "התחנה הזו לא נטענה. נסו שוב, או חזרו למפת המסלול.") }));
      }
    }
    sec._remount = mount;

    document.title = tr(`${def.title} — Be the Model`, `${def.title} — להיות המודל`);
    setView(sec, h1);
    mount();
  }

  function showResults(def, res, box) {
    const score = Math.max(0, Math.min(1, Number(res && res.score) || 0));
    const stars = starsFor(score);
    const prev = record(def.id);
    const isBest = score > prev.best || prev.stars === 0;
    progress.levels[def.id] = { stars: Math.max(prev.stars, stars), best: Math.max(prev.best, score) };
    saveProgress();
    const rec = record(def.id);

    box.innerHTML = "";
    const h2 = el("h2", { id: "gResTitle", class: "g-res-title", tabindex: "-1", text: tr("Hop complete", "התחנה הושלמה") });
    const verdict = stars === 3 ? tr("Spot on — that's what the model does.", "בול — זה בדיוק מה שהמודל עושה.")
      : stars === 2 ? tr("Close to the real thing.", "קרוב לדבר האמיתי.")
      : tr("Off the model's route this time — try again?", "הפעם יצאתם מהמסלול של המודל — עוד ניסיון?");
    box.append(h2,
      el("div", { class: "g-score" },
        el("div", { class: "g-match" },
          el("span", { class: "g-match-num", text: pct(score) }),
          el("span", { class: "g-match-lbl", text: tr("match with the real computation", "התאמה לחישוב האמיתי") })),
        starIcons(stars, "big pop")),
      el("p", { class: "g-verdict", text: verdict }),
      res && res.summary ? el("p", { class: "g-summary", text: res.summary }) : null,
      el("p", { class: "g-best", text: isBest && prev.stars > 0
        ? tr(`New best: ${pct(rec.best)}`, `שיא חדש: ${pct(rec.best)}`)
        : tr(`Best so far: ${pct(rec.best)}`, `השיא שלכם: ${pct(rec.best)}`) }));

    const deb = el("div", { class: "g-debrief" }, el("h3", { text: tr("What you just did", "מה בעצם עשיתם") }));
    String(def.debrief || "").split(/\n\s*\n/).filter(Boolean).forEach(p => deb.append(el("p", { text: p.trim() })));
    box.append(deb);

    const again = el("button", { type: "button", class: "btn ghost g-again", text: tr("Try again", "לנסות שוב") });
    again.addEventListener("click", () => {
      const sec = box.closest(".g-level");
      if (sec && sec._remount) sec._remount();
      const h1 = sec && sec.querySelector(".g-level-title");
      if (h1) { h1.focus({ preventScroll: true }); h1.scrollIntoView({ block: "start", behavior: reducedMotion ? "auto" : "smooth" }); }
    });
    const read = el("a", { class: "btn ghost g-read", href: chapterLink(def.chapterHref), text: tr("Read the chapter", "לקריאת הפרק") });
    const nx = nextLevel(def.id);
    const next = el("button", { type: "button", class: "btn g-next", text: nx ? tr(`Next hop: ${nx.title}`, `לתחנה הבאה: ${nx.title}`) : tr("Back to the route map", "חזרה למפת המסלול") });
    next.addEventListener("click", () => { location.hash = nx ? "#" + nx.id : ""; });
    box.append(el("div", { class: "g-actions" }, again, read, next));
    box.hidden = false;

    announce(tr(
      `Hop complete. ${pct(score)} match, ${stars} of 3 stars. ${res && res.summary ? res.summary : ""}`,
      `התחנה הושלמה. ${pct(score)} התאמה, ${stars} מתוך 3 כוכבים. ${res && res.summary ? res.summary : ""}`));
    h2.focus({ preventScroll: true });
    box.scrollIntoView({ block: "nearest", behavior: reducedMotion ? "auto" : "smooth" });
  }

  /* ---------- Routing ---------- */
  function route() {
    const id = decodeURIComponent((location.hash || "").replace(/^#/, ""));
    if (id && levels.has(id)) { renderLevel(levels.get(id)); return; }
    const planned = PLANNED.find(p => p.id === id);
    renderMap(planned ? tr(`“${planned.title}” isn't built yet — it's on the route as a coming-soon hop.`, `“${planned.title}” עוד לא מוכנה — היא מופיעה במסלול כתחנה שתגיע בקרוב.`) : null);
  }

  /* ---------- Theme toggle (same behaviour as js/nav.js) ---------- */
  function setupTheme() {
    const html = document.documentElement;
    try { const t = localStorage.getItem("rs-theme"); if (t) html.dataset.theme = t; } catch (e) { /* ignore */ }
    const dark = () => (html.dataset.theme ? html.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches);
    const btn = document.getElementById("gThemeBtn");
    if (!btn) return;
    btn.addEventListener("click", () => {
      const next = dark() ? "light" : "dark";
      html.dataset.theme = next;
      try { localStorage.setItem("rs-theme", next); } catch (e) { /* ignore */ }
      if (typeof themeListeners !== "undefined") themeListeners.forEach(f => { try { f(); } catch (e) { console.error(e); } });
    });
  }

  function start() {
    root = document.getElementById("gameRoot");
    if (!root) return;
    loadProgress();
    root.setAttribute("tabindex", "-1");
    live = el("div", { class: "g-live", "aria-live": "polite", "aria-atomic": "true" });
    document.body.append(live);
    setupTheme();
    // The skip link must not change the hash (that would route to the map).
    const skip = document.querySelector(".skip");
    if (skip) skip.addEventListener("click", e => { e.preventDefault(); const h = root.querySelector("h1") || root; h.focus(); });
    addEventListener("hashchange", route);
    route();
  }

  return { registerLevel, start, starsFor, reducedMotion, get levels() { return registered(); } };
})();
