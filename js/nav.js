(function () {
  const sections = $$("section.chapter");
  const railNodes = $("#railNodes");
  const mobile = $("#mobileMenu");
  const links = [];

  sections.forEach(s => {
    const a = el("a", { href: "#" + s.id }, el("span", { class: "dot" }), el("span", { class: "lbl", text: s.dataset.title }));
    railNodes.append(el("li", {}, a));
    links.push(a);
    mobile.append(el("a", { href: "#" + s.id, text: s.dataset.title, onclick: () => toggleMenu(false) }));
  });

  function update() {
    const docH = document.documentElement.scrollHeight - innerHeight;
    const p = docH > 0 ? Math.min(1, Math.max(0, scrollY / docH)) : 0;
    $("#railFill").style.height = (p * 100).toFixed(2) + "%";
    $("#topFill").style.width = (p * 100).toFixed(2) + "%";
    let active = 0;
    sections.forEach((s, i) => { if (s.getBoundingClientRect().top < innerHeight * 0.4) active = i; });
    links.forEach((a, i) => {
      a.classList.toggle("active", i === active);
      a.classList.toggle("passed", i < active);
      if (i === active) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
    });
  }
  let ticking = false;
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { update(); ticking = false; }); } }, { passive: true });
  addEventListener("resize", update);
  update();

  const menuBtn = $("#menuBtn");
  function toggleMenu(open) {
    const o = open ?? mobile.hidden;
    mobile.hidden = !o;
    menuBtn.setAttribute("aria-expanded", String(o));
  }
  menuBtn.addEventListener("click", () => toggleMenu());

  // Theme: explicit choice wins over the system setting and is remembered.
  const root = document.documentElement;
  try { const t = localStorage.getItem("rs-theme"); if (t) root.dataset.theme = t; } catch (e) {}
  function currentDark() {
    if (root.dataset.theme) return root.dataset.theme === "dark";
    return matchMedia("(prefers-color-scheme: dark)").matches;
  }
  function flip() {
    const next = currentDark() ? "light" : "dark";
    root.dataset.theme = next;
    try { localStorage.setItem("rs-theme", next); } catch (e) {}
    themeListeners.forEach(f => f());
  }
  $("#themeBtn").addEventListener("click", flip);
  $("#themeBtn2").addEventListener("click", flip);
  matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => themeListeners.forEach(f => f()));
})();
