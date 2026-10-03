/* Shared helpers used by every demo. Plain scripts, no build step. */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") n.className = v;
    else if (k === "text") n.textContent = v;
    else if (k === "html") n.innerHTML = v;
    else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  }
  for (const c of kids) if (c != null) n.append(c);
  return n;
}

const SVGNS = "http://www.w3.org/2000/svg";
function sv(tag, attrs = {}, text) {
  const n = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text != null) n.textContent = text;
  return n;
}

/* Deterministic random numbers so demos are reproducible. */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gauss(rng) { // Box–Muller
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/* Softmax that tolerates -Infinity entries (masked positions). */
function softmax(arr, T = 1) {
  const scaled = arr.map(x => x / T);
  const finite = scaled.filter(Number.isFinite);
  const m = finite.length ? Math.max(...finite) : 0;
  const e = scaled.map(x => (Number.isFinite(x) ? Math.exp(x - m) : 0));
  const s = e.reduce((a, b) => a + b, 0) || 1;
  return e.map(x => x / s);
}

function sampleFrom(probs, rng = Math.random) {
  let r = rng(), acc = 0;
  for (let i = 0; i < probs.length; i++) { acc += probs[i]; if (r < acc) return i; }
  for (let i = probs.length - 1; i >= 0; i--) if (probs[i] > 0) return i;
  return 0;
}

/* Matrix helpers (arrays of rows). */
const matmul = (A, B) => A.map(r => B[0].map((_, j) => r.reduce((s, a, k) => s + a * B[k][j], 0)));
const transpose = A => A[0].map((_, j) => A.map(r => r[j]));

/* Read a CSS custom property — canvases re-read on theme change. */
function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgba(hex, a) { const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; }
function mix(hexA, hexB, t) {
  const a = hexToRgb(hexA), b = hexToRgb(hexB);
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(",")})`;
}

/* Retina-sharp canvas: keep the CSS size, scale the backing store. */
function setupCanvas(cv) {
  const ratio = window.devicePixelRatio || 1;
  if (!cv.dataset.w) { cv.dataset.w = cv.width; cv.dataset.h = cv.height; }
  const w = +cv.dataset.w, h = +cv.dataset.h;
  cv.width = w * ratio; cv.height = h * ratio;
  const ctx = cv.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  // Absolute alignment everywhere; base direction follows the page so mixed Hebrew/number labels read correctly.
  ctx.direction = document.documentElement.dir === "rtl" ? "rtl" : "ltr";
  ctx.textAlign = "left";
  return { ctx, w, h };
}

const fmt = (x, d = 2) => (Number.isFinite(x) ? x.toFixed(d) : x === -Infinity ? "−∞" : "∞");

function humanNum(n) {
  const a = Math.abs(n);
  if (a >= 1e12) return (n / 1e12).toFixed(2) + "T";
  if (a >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (a >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (a >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(Math.round(n));
}
function humanBytes(b) {
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  while (b >= 1024 && i < u.length - 1) { b /= 1024; i++; }
  return b.toFixed(b >= 100 || i === 0 ? 0 : 1) + " " + u[i];
}

/* Segmented control (radio group of buttons). */
function segmented(container, options, initial, onChange) {
  container.innerHTML = "";
  const btns = options.map(o => {
    const b = el("button", { type: "button", role: "radio", "aria-checked": String(o.value === initial), text: o.label });
    b.addEventListener("click", () => {
      btns.forEach(x => x.setAttribute("aria-checked", "false"));
      b.setAttribute("aria-checked", "true");
      onChange(o.value);
    });
    container.append(b);
    return b;
  });
  return btns;
}

/* SVG text attributes for labels that contain Hebrew. In an RTL label, "end" is the left edge. */
const RTL_TXT = () => (document.documentElement.dir === "rtl" ? { direction: "rtl", "unicode-bidi": "embed" } : {});
function svgLabel(attrs, text) {
  const rtl = document.documentElement.dir === "rtl";
  const a = { ...attrs, ...RTL_TXT() };
  if (rtl) {
    const anchor = attrs["text-anchor"] || "start";
    a["text-anchor"] = anchor === "start" ? "end" : anchor === "end" ? "start" : "middle";
  }
  return sv("text", a, text);
}

/* Re-render hooks for theme switches. */
const themeListeners = [];
function onTheme(fn) { themeListeners.push(fn); }

/* Run demos only once they're near the viewport (keeps first paint fast). */
function whenVisible(node, fn) {
  if (!("IntersectionObserver" in window)) { fn(); return; }
  const io = new IntersectionObserver(es => {
    if (es.some(e => e.isIntersecting)) { io.disconnect(); fn(); }
  }, { rootMargin: "300px" });
  io.observe(node);
}

/* The sample text every in-browser model on this page trains on. Written for this site.
   The Hebrew page trains on a Hebrew text instead. */
const CORPUS_EN = `the model reads the text one token at a time. the model looks back at every word it has seen. each word asks a question and the other words offer an answer. the cat sat on the mat and the dog sat on the rug. the cat looked at the dog and the dog looked at the cat. the cat chased the mouse across the room. the mouse ran under the old wooden table. the dog slept by the warm fire all night. the cat slept on the soft chair by the window. a good model learns patterns from many examples. a small model learns simple patterns and a large model learns deep patterns. the network learns to predict the next word. it predicts the next word again and again until the story ends. attention lets each word look at the words that came before it. the words that matter most get the most attention. training makes the predictions better one small step at a time. every step lowers the loss a little. language is full of patterns and the model learns them all. we read books to learn new ideas. a book is a long sequence of words. a sentence is a short sequence of words. the story begins with a question and ends with an answer. the teacher asked a question and the student gave an answer. the student learned the answer from a book. the student asked the teacher a new question. the sun rose over the quiet city. the city woke up and the streets filled with people. people talk and write and the model reads it all. the old dog looked at the sun and the young cat looked at the dog. the model learned the patterns of the city and the story of the cat. a large model reads many books and learns many ideas. the teacher read the story to the student. the dog chased the cat across the street. the cat ran under the table and the dog sat by the door. every word in the sentence looks at the words before it. the network learns which words matter for the next word. the next word depends on the words that came before.`;
const CORPUS_HE = `המודל קורא את הטקסט טוקן אחרי טוקן. המודל מסתכל אחורה על כל מילה שהוא ראה. כל מילה שואלת שאלה והמילים האחרות נותנות תשובה. החתול ישב על השטיח והכלב ישב על הספה. החתול הסתכל על הכלב והכלב הסתכל על החתול. החתול רדף אחרי העכבר בכל החדר. העכבר רץ מתחת לשולחן הישן. הכלב ישן ליד האש החמה כל הלילה. החתול ישן על הכורסה הרכה ליד החלון. מודל טוב לומד תבניות מהרבה דוגמאות. מודל קטן לומד תבניות פשוטות ומודל גדול לומד תבניות עמוקות. הרשת לומדת לחזות את המילה הבאה. היא חוזה את המילה הבאה שוב ושוב עד שהסיפור נגמר. תשומת הלב מאפשרת לכל מילה להסתכל על המילים שבאו לפניה. המילים החשובות מקבלות את רוב תשומת הלב. האימון משפר את התחזיות צעד קטן אחרי צעד קטן. כל צעד מוריד את השגיאה קצת. השפה מלאה בתבניות והמודל לומד את כולן. אנחנו קוראים ספרים כדי ללמוד רעיונות חדשים. ספר הוא רצף ארוך של מילים. משפט הוא רצף קצר של מילים. הסיפור מתחיל בשאלה ונגמר בתשובה. המורה שאלה שאלה והתלמיד נתן תשובה. התלמיד למד את התשובה מתוך ספר. התלמיד שאל את המורה שאלה חדשה. השמש עלתה מעל העיר השקטה. העיר התעוררה והרחובות התמלאו באנשים. אנשים מדברים וכותבים והמודל קורא הכול. הכלב הזקן הסתכל על השמש והחתול הצעיר הסתכל על הכלב. המודל למד את התבניות של העיר ואת הסיפור של החתול. מודל גדול קורא הרבה ספרים ולומד הרבה רעיונות. המורה קראה את הסיפור לתלמיד. הכלב רדף אחרי החתול ברחוב. החתול רץ מתחת לשולחן והכלב ישב ליד הדלת. כל מילה במשפט מסתכלת על המילים שלפניה. הרשת לומדת אילו מילים חשובות למילה הבאה. המילה הבאה תלויה במילים שבאו לפניה.`;
const CORPUS = (document.documentElement.lang || "").toLowerCase().startsWith("he") ? CORPUS_HE : CORPUS_EN;
