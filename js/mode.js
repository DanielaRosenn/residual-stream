/* Reading mode: Simple / Deep.
   <html data-mode> is set before first paint by an inline script in <head>; this file runs the toggle UI.
   All visible strings live in the two HTML files, so nothing here needs tr(). */
(function () {
  const root = document.documentElement;
  const KEY = "rs-mode", HINT_KEY = "rs-mode-hint";
  const all = (s, r) => Array.from((r || document).querySelectorAll(s));
  const current = () => (root.dataset.mode === "deep" ? "deep" : "simple");
  if (root.dataset.mode !== "deep" && root.dataset.mode !== "simple") root.dataset.mode = "simple";

  const groups = all(".mode-toggle");

  function paint() {
    const m = current();
    groups.forEach(g => all("[data-mode-set]", g).forEach(b => {
      const on = b.dataset.modeSet === m;
      b.setAttribute("aria-checked", String(on));
      b.tabIndex = on ? 0 : -1; // roving tabindex: one tab stop per radio group
    }));
  }

  function hintSeen() {
    try { localStorage.setItem(HINT_KEY, "0"); } catch (e) {}
  }

  /* Switch mode and keep the reader where they were: the chapter they are reading stays put on screen.
     Coming from a teaser, whatever the teaser stood in for lands exactly where the teaser was. */
  function setMode(next, from) {
    if (next !== "deep" && next !== "simple") return;
    if (next === current()) return;
    const sections = all("section.chapter");
    let sec = sections[0] || null;
    sections.forEach(s => { if (s.getBoundingClientRect().top < innerHeight * 0.4) sec = s; });
    const teaser = from && from.closest ? from.closest(".mode-teaser") : null;
    const before = teaser ? teaser.getBoundingClientRect().top : sec ? sec.getBoundingClientRect().top : 0;

    root.dataset.mode = next;
    try { localStorage.setItem(KEY, next); } catch (e) {}
    hintSeen();
    paint();

    let anchor = sec;
    if (teaser) {
      let n = teaser.nextElementSibling;
      while (n && n.getClientRects().length === 0) n = n.nextElementSibling;
      if (n) anchor = n;
    }
    if (anchor) {
      const fix = () => {
        let delta = anchor.getBoundingClientRect().top - before;
        // The chapter got shorter and would end above the reading line: show it from its start instead.
        if (anchor === sec && sec.getBoundingClientRect().bottom - delta < innerHeight * 0.4 && before < 0) {
          delta = sec.getBoundingClientRect().top - 24;
        }
        if (Math.abs(delta) > 1) scrollTo({ top: scrollY + delta, left: scrollX, behavior: "instant" });
      };
      fix();
      requestAnimationFrame(fix); // once more after the browser's own scroll anchoring has settled
    }
    if (teaser && anchor && anchor !== sec) {
      anchor.classList.add("mode-landing");
      if (!anchor.hasAttribute("tabindex")) anchor.setAttribute("tabindex", "-1");
      try { anchor.focus({ preventScroll: true }); } catch (e) {}
    }
    // Section heights changed: let the rail / progress bar (and anything else that listens) re-measure.
    dispatchEvent(new Event("resize"));
  }

  document.addEventListener("click", e => {
    const b = e.target.closest ? e.target.closest("[data-mode-set]") : null;
    if (b) setMode(b.dataset.modeSet, b);
  });

  // Radio-group keyboard behaviour: arrows (and Home/End) move the selection.
  groups.forEach(g => g.addEventListener("keydown", e => {
    const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];
    if (!keys.includes(e.key)) return;
    const btns = all("[data-mode-set]", g);
    let i = btns.findIndex(b => b.dataset.modeSet === current());
    const rtl = root.dir === "rtl";
    if (e.key === "Home") i = 0;
    else if (e.key === "End") i = btns.length - 1;
    else {
      const fwd = e.key === "ArrowDown" || e.key === (rtl ? "ArrowLeft" : "ArrowRight");
      i = (i + (fwd ? 1 : -1) + btns.length) % btns.length;
    }
    e.preventDefault();
    setMode(btns[i].dataset.modeSet, btns[i]);
    btns[i].focus();
  }));

  all(".mode-hint-close").forEach(b => b.addEventListener("click", () => {
    hintSeen();
    root.dataset.modeHint = "off";
  }));

  paint();
})();
