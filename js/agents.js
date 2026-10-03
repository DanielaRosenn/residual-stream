(function () {
  /* ---------- Agent run simulator ---------- */
  const ROLE_COLOR = { system: "--muted", user: "--brand", assistant: "--good", tool: "--accent" };
  const ROLE_LABEL = {
    system: tr("system", "system"), user: tr("user", "user"),
    assistant: tr("assistant", "assistant"), tool: tr("tool result", "tool result")
  };
  const START = () => [
    { role: "system", tokens: 1200, text: tr("System prompt + three tool definitions as JSON schemas: search_tickets, get_ticket, draft_reply.", "System prompt + שלוש הגדרות כלים כ־JSON schema: search_tickets, ‏get_ticket, ‏draft_reply.") },
    { role: "user", tokens: 40, text: tr("“Find this week's most common customer complaint and draft a reply to the worst case.”", "“מצא את התלונה הנפוצה ביותר של לקוחות השבוע, ונסח תשובה למקרה הכי חמור.”") },
    { role: "assistant", tokens: 90, code: 'search_tickets({"query": "complaint", "since": "7d", "limit": 20})', text: tr("I'll start by pulling this week's complaint tickets.", "אתחיל בשליפת ה־tickets של תלונות מהשבוע.") },
    { role: "tool", tokens: 2400, text: tr("20 tickets returned. 9 mention CSV export failing, 5 slow dashboards, 3 login loops, 3 other.", "חזרו 20 tickets. ב־9 מוזכר שייצוא CSV נכשל, 5 על דשבורדים איטיים, 3 על לולאת התחברות, 3 אחרים.") },
    { role: "assistant", tokens: 70, code: 'get_ticket({"id": "T-4821"})', text: tr("CSV export is the pattern. T-4821 is the most escalated — reading it in full.", "ייצוא CSV הוא התבנית. ‏T-4821 הוא המוסלם ביותר — קורא אותו במלואו.") },
    { role: "tool", tokens: 1100, text: tr("Full thread of T-4821: customer has waited 4 days; export fails above 50,000 rows; two follow-ups unanswered.", "השרשור המלא של T-4821: הלקוח מחכה 4 ימים; הייצוא נכשל מעל 50,000 שורות; שתי פניות המשך לא נענו.") },
    { role: "assistant", tokens: 260, gate: true, code: 'draft_reply({"ticket": "T-4821", "body": "Hi Dana, I\'m sorry for the wait… we\'ll have a fix by Friday."})', text: tr("Drafting a reply. This tool writes to the customer's thread, so it needs approval.", "מנסח תשובה. הכלי הזה כותב לשרשור של הלקוח, ולכן צריך אישור.") }
  ];
  const APPROVED = () => [
    { role: "tool", tokens: 30, text: tr("Draft saved on T-4821 (not sent).", "הטיוטה נשמרה ב־T-4821 (לא נשלחה).") },
    { role: "assistant", tokens: 180, final: true, text: tr("Done. Most common complaint: CSV export failing on large files (9 of 20 tickets). Worst case T-4821 — a draft reply is saved for you to review and send.", "סיימתי. התלונה הנפוצה ביותר: ייצוא CSV שנכשל בקבצים גדולים (9 מתוך 20 tickets). המקרה הכי חמור הוא T-4821 — טיוטת תשובה שמורה לבדיקה ולשליחה שלך.") }
  ];
  const REJECTED = () => [
    { role: "tool", tokens: 40, text: tr("Rejected by reviewer: “Don't promise a fix date.”", "נדחה על ידי הבודק: “לא להבטיח תאריך לתיקון.”") },
    { role: "assistant", tokens: 240, gate: true, code: 'draft_reply({"ticket": "T-4821", "body": "Hi Dana, I\'m sorry for the wait… our team is working on large exports and I\'ll update you as soon as we have news."})', text: tr("Understood — revising without a date.", "הבנתי — מנסח מחדש בלי תאריך.") }
  ];

  let log, queue, waiting, calls, billedFull, billedCache, prevPrefix;
  const logEl = $("#agLog"), gate = $("#agGate");
  function reset() {
    log = []; queue = START(); waiting = false;
    calls = 0; billedFull = 0; billedCache = 0; prevPrefix = 0;
    render();
  }
  const ctxSize = () => log.reduce((s, m) => s + m.tokens, 0);
  function push(m) {
    if (m.role === "assistant") {
      // A model call reads the whole context so far. With caching, the prefix it has seen before is cheap.
      const input = ctxSize();
      calls++;
      billedFull += input;
      billedCache += (input - prevPrefix) + 0.1 * prevPrefix;
      prevPrefix = input + m.tokens; // its own output becomes part of the cached prefix next time
    }
    log.push(m);
  }
  function next() {
    if (waiting || !queue.length) return;
    const m = queue.shift();
    push(m);
    if (m.gate) waiting = true;
    render();
  }
  function decide(ok) {
    if (!waiting) return;
    waiting = false;
    queue = (ok ? APPROVED() : REJECTED()).concat(queue);
    next();
  }

  function render() {
    // log
    logEl.innerHTML = "";
    log.forEach((m, i) => {
      const li = el("li", { class: "ag-msg ag-" + m.role + (i === log.length - 1 ? " fresh" : "") },
        el("span", { class: "ag-role", text: ROLE_LABEL[m.role] }),
        el("span", { class: "ag-tok", text: m.tokens.toLocaleString("en-US") + " tok" }));
      li.append(el("p", { class: "ag-text", dir: "auto", text: m.text }));
      if (m.code) li.append(el("code", { class: "ag-code", text: "tool_use → " + m.code }));
      logEl.append(li);
    });
    logEl.scrollTop = logEl.scrollHeight; // keep the newest message in view
    // meter
    const meter = $("#agMeter");
    meter.innerHTML = "";
    const MAX = 6000, total = ctxSize();
    log.forEach(m => meter.append(el("div", { style: `width:${(m.tokens / MAX * 100).toFixed(2)}%;background:var(${ROLE_COLOR[m.role]})`, title: `${m.role} ${m.tokens}` })));
    // stats
    const cache = $("#agCache").checked;
    const billed = cache ? billedCache : billedFull;
    const saved = billedFull ? Math.round((1 - billedCache / billedFull) * 100) : 0;
    $("#agStats").textContent = tr(
      `Context: ${total.toLocaleString("en-US")} tokens. Model calls: ${calls}. Input tokens billed so far: ${Math.round(billed).toLocaleString("en-US")}` + (cache && calls > 1 ? ` (caching saves ${saved}%).` : "."),
      `גודל ה־context: ‏${total.toLocaleString("en-US")} טוקנים. קריאות למודל: ${calls}. טוקני קלט שחויבו עד עכשיו: ${Math.round(billed).toLocaleString("en-US")}` + (cache && calls > 1 ? ` (ה־caching חוסך ${saved}%).` : "."));
    // gate + buttons
    gate.hidden = !waiting;
    if (waiting) $("#agGateText").textContent = tr("Human approval required: the agent wants to write a reply on the customer's ticket. Read the draft above.", "נדרש אישור אנושי: ה־agent רוצה לכתוב תשובה ב־ticket של הלקוח. קראו את הטיוטה למעלה.");
    const done = !queue.length && !waiting;
    const nb = $("#agNext");
    nb.disabled = waiting || done;
    nb.textContent = done ? tr("Run complete", "הריצה הסתיימה") : tr("Next step", "הצעד הבא");
  }
  $("#agNext").addEventListener("click", next);
  $("#agReset").addEventListener("click", reset);
  $("#agApprove").addEventListener("click", () => decide(true));
  $("#agReject").addEventListener("click", () => decide(false));
  $("#agCache").addEventListener("change", render);
  reset();

  /* ---------- Compounding errors ---------- */
  const rp = $("#relP"), rn = $("#relN");
  function rel() {
    const p = +rp.value / 100, n = +rn.value, s = Math.pow(p, n);
    $("#relPOut").value = (+rp.value).toFixed(1) + "%";
    $("#relNOut").value = n;
    $("#relOut").textContent = tr(`${(s * 100).toFixed(1)}% chance the whole task succeeds`, `סיכוי של ${(s * 100).toFixed(1)}% שכל המשימה תצליח`);
    $("#relBar").style.width = (s * 100).toFixed(1) + "%";
  }
  rp.addEventListener("input", rel); rn.addEventListener("input", rel);
  rel();
})();
