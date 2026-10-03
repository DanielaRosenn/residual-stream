(function () {
  const QS = [
    { q: "What is the single training objective of a pretrained LLM?", o: ["Answer questions correctly", "Predict the next token", "Classify text by topic", "Translate between languages"], a: 1,
      e: "Pretraining is next-token prediction, scored by cross-entropy. Question answering, translation and the rest emerge because they make text more predictable." },
    { q: "Why did the transformer replace recurrent networks?", o: ["It uses fewer parameters", "It can process all positions in parallel during training", "It doesn't need training data", "It has no context limit"], a: 1,
      e: "An RNN must process token 1 before token 2. Attention compares all pairs in one matrix multiplication, so training uses GPUs fully — and that is what made scale possible." },
    { q: "In attention, what does a token's key represent?", o: ["What the token is looking for", "What the token offers to others when they search", "The information it passes on", "Its position in the sentence"], a: 1,
      e: "Query = what I'm looking for, key = what I can be found by, value = what I hand over. Scores come from query·key; outputs are weighted sums of values." },
    { q: "Why are attention scores divided by √dₖ?", o: ["To save memory", "To keep softmax out of its saturated, near one-hot regime", "To normalise the values", "To apply the causal mask"], a: 1,
      e: "Dot products grow with dimension. Without scaling, softmax becomes extremely peaked and gradients vanish." },
    { q: "What does the causal mask do?", o: ["Hides padding tokens", "Stops each token from attending to later tokens", "Removes rare words", "Drops random weights during training"], a: 1,
      e: "Setting future scores to −∞ gives them zero weight after softmax, so the model can be trained on every position at once without seeing the answer." },
    { q: "What is the residual stream?", o: ["The training data pipeline", "The per-token vector that every sublayer reads from and adds to", "The output probabilities", "The KV cache"], a: 1,
      e: "Sublayers add their results to the stream instead of replacing it. This keeps information intact across depth and lets gradients flow." },
    { q: "Where does most of a dense transformer's parameter count live?", o: ["Attention", "The MLP (feed-forward) layers", "Layer norms", "Positional encodings"], a: 1,
      e: "With a 4× expansion, the MLP has about 8d² parameters per layer against attention's 4d² — roughly two thirds of the block. Check it in the calculator." },
    { q: "Setting temperature to 0 means…", o: ["Maximum creativity", "Always choosing the highest-probability token", "Sampling uniformly", "The model stops generating"], a: 1,
      e: "Temperature → 0 sharpens the distribution to a single spike: greedy decoding. Repeatable, but often dull or repetitive." },
    { q: "What does a KV cache save?", o: ["Re-computing keys and values of earlier tokens at every generation step", "Disk space for model weights", "Training time", "Tokenization time"], a: 0,
      e: "Thanks to the causal mask, earlier tokens' keys and values never change during generation, so they are computed once and reused." },
    { q: "A mixture-of-experts model with 1T total parameters and 32B active uses per token roughly the compute of…", o: ["A 1T dense model", "A 32B dense model", "A 500B dense model", "A 1B dense model"], a: 1,
      e: "Only the routed experts (plus shared layers) run for each token, so per-token compute tracks active parameters. Memory still has to hold all of them." },
    { q: "What is superposition in a neural network?", o: ["Representing more features than dimensions, as nearly perpendicular directions", "Running several models at the same time", "Averaging the outputs of all attention heads", "Adding positional encodings to embeddings"], a: 0,
      e: "Models pack many sparse concepts into fewer dimensions at almost-orthogonal angles. It works because most concepts rarely co-occur, and it's why individual neurons look polysemantic." },
    { q: "Why shouldn't a model's explanation of its own reasoning be treated as a readout of its internals?", o: ["Models are unable to produce explanations", "It's generated text — circuit tracing shows the internal method can differ from the one described", "Explanations are always deliberately false", "Internals and explanations are identical by design"], a: 1,
      e: "In Anthropic's attribution-graph work, Claude did mental arithmetic with parallel approximate and exact paths, yet described the carry-the-one method when asked. Judge behaviour with evals, not self-reports." },
    { q: "When an LLM “uses a tool”, who actually executes the tool?", o: ["The model, inside its forward pass", "Your application code, which parses the model's structured call", "The GPU's tool-execution unit", "The tokenizer"], a: 1,
      e: "The model only emits tokens in a structured format. Your code runs the function and appends the result as more tokens — which is also why tool results must be treated as untrusted input." },
    { q: "If each step of an agent succeeds independently 95% of the time, a 20-step task succeeds roughly…", o: ["95% of the time", "75% of the time", "36% of the time", "5% of the time"], a: 2,
      e: "0.95²⁰ ≈ 0.36. Errors compound, which is why verification steps, retries and recovery matter so much for long-horizon agents." }
  ];

  const QS_HE = [
    { q: "מהי מטרת האימון היחידה של LLM בשלב ה־pretraining?", o: ["לענות נכון על שאלות", "לחזות את הטוקן הבא", "לסווג טקסט לפי נושא", "לתרגם בין שפות"], a: 1,
      e: "Pretraining הוא חיזוי של הטוקן הבא, שנמדד ב־cross-entropy. מענה על שאלות, תרגום וכל השאר צצים כי הם הופכים את הטקסט לצפוי יותר." },
    { q: "למה ה־transformer החליף את הרשתות הרקורסיביות?", o: ["יש לו פחות פרמטרים", "הוא יכול לעבד את כל המיקומים במקביל באימון", "הוא לא צריך נתוני אימון", "אין לו מגבלת context"], a: 1,
      e: "RNN חייב לעבד את טוקן 1 לפני טוקן 2. Attention משווה את כל הזוגות בהכפלת מטריצות אחת, כך שהאימון מנצל את כרטיסי המסך במלואם — וזה מה שאפשר את קנה המידה." },
    { q: "ב־attention, מה מייצג ה־key של טוקן?", o: ["מה הטוקן מחפש", "מה הטוקן מציע לאחרים כשהם מחפשים", "המידע שהוא מעביר הלאה", "המיקום שלו במשפט"], a: 1,
      e: "Query = מה אני מחפש, key = לפי מה אפשר למצוא אותי, value = מה אני מעביר. הציונים מגיעים מ־query·key; הפלטים הם סכום משוקלל של values." },
    { q: "למה מחלקים את ציוני ה־attention ב־√dₖ?", o: ["כדי לחסוך זיכרון", "כדי להרחיק את ה־softmax ממצב רווי, כמעט one-hot", "כדי לנרמל את ה־values", "כדי להפעיל את ה־causal mask"], a: 1,
      e: "Dot products גדלים עם הממד. בלי חלוקה, ה־softmax נעשה חד מאוד וה־gradients נעלמים." },
    { q: "מה עושה ה־causal mask?", o: ["מסתיר טוקני padding", "מונע מכל טוקן להסתכל על טוקנים שבאים אחריו", "מסיר מילים נדירות", "מפיל משקלות אקראיים באימון"], a: 1,
      e: "ציונים של העתיד מקבלים −∞ ולכן משקל אפס אחרי ה־softmax, כך שאפשר לאמן את המודל על כל המיקומים בבת אחת בלי שיראה את התשובה." },
    { q: "מהו ה־residual stream?", o: ["צינור נתוני האימון", "הווקטור של כל טוקן, שכל תת־שכבה קוראת ממנו ומוסיפה אליו", "הסתברויות הפלט", "ה־KV cache"], a: 1,
      e: "תת־השכבות מוסיפות את התוצאה שלהן ל־stream במקום להחליף אותו. כך המידע נשמר לאורך העומק וה־gradients זורמים." },
    { q: "איפה נמצא רוב מספר הפרמטרים של transformer ‏dense?", o: ["ב־attention", "בשכבות ה־MLP ‏(feed-forward)", "ב־layer norms", "בקידוד המיקום"], a: 1,
      e: "עם הרחבה פי 4, ל־MLP יש כ־8d² פרמטרים לשכבה מול 4d² של ה־attention — בערך שני שלישים מה־block. בדקו במחשבון." },
    { q: "temperature של 0 אומר…", o: ["יצירתיות מקסימלית", "תמיד לבחור את הטוקן עם ההסתברות הגבוהה ביותר", "דגימה אחידה", "המודל מפסיק לייצר"], a: 1,
      e: "כש־temperature שואף ל־0 ההתפלגות מתחדדת לשיא יחיד: greedy decoding. ניתן לשחזור, אבל לרוב משעמם או חוזר על עצמו." },
    { q: "מה חוסך KV cache?", o: ["חישוב מחדש של ה־keys וה־values של טוקנים קודמים בכל צעד יצירה", "מקום בדיסק למשקלות המודל", "זמן אימון", "זמן tokenization"], a: 0,
      e: "בזכות ה־causal mask, ה־keys וה־values של טוקנים קודמים לא משתנים במהלך היצירה, אז מחשבים אותם פעם אחת ומשתמשים בהם שוב." },
    { q: "מודל mixture-of-experts עם טריליון פרמטרים בסך הכול ו־32B פעילים משתמש לכל טוקן בכוח חישוב של בערך…", o: ["מודל dense של טריליון", "מודל dense של 32B", "מודל dense של 500B", "מודל dense של 1B"], a: 1,
      e: "רק ה־experts שנבחרו (ועוד השכבות המשותפות) רצים לכל טוקן, ולכן כוח החישוב לטוקן תלוי בפרמטרים הפעילים. הזיכרון עדיין צריך להחזיק את כולם." },
    { q: "מהו superposition ברשת נוירונים?", o: ["ייצוג של יותר features ממספר הממדים, ככיוונים כמעט מאונכים", "הרצה של כמה מודלים בו־זמנית", "מיצוע הפלטים של כל ה־attention heads", "הוספת קידוד מיקום ל־embeddings"], a: 0,
      e: "מודלים דוחסים הרבה מושגים דלילים לפחות ממדים, בזוויות כמעט אורתוגונליות. זה עובד כי רוב המושגים כמעט לא מופיעים יחד — ובגלל זה נוירונים בודדים נראים פוליסמנטיים." },
    { q: "למה לא כדאי להתייחס להסבר של מודל לחשיבה שלו כאל קריאה של מה שקורה בפנים?", o: ["מודלים לא מסוגלים לייצר הסברים", "זה טקסט שנוצר — circuit tracing מראה שהשיטה הפנימית יכולה להיות שונה מזו שמתוארת", "ההסברים תמיד שקריים בכוונה", "הפנים וההסבר זהים מעצם התכנון"], a: 1,
      e: "במחקר ה־attribution graphs של Anthropic, ‏Claude חישב בראש עם מסלולים מקבילים — משוער ומדויק — אבל כשנשאל, תיאר את שיטת ה“מעבירים אחד”. שופטים התנהגות עם evals, לא עם דיווח עצמי." },
    { q: "כש־LLM “משתמש בכלי”, מי בעצם מריץ את הכלי?", o: ["המודל, בתוך ה־forward pass", "הקוד של האפליקציה שלכם, שמפרש את הקריאה המובנית של המודל", "יחידת הרצת כלים בכרטיס המסך", "ה־tokenizer"], a: 1,
      e: "המודל רק מפיק טוקנים בפורמט מובנה. הקוד שלכם מריץ את הפונקציה ומצרף את התוצאה כעוד טוקנים — ולכן גם צריך להתייחס לתוצאות כלים כקלט לא מהימן." },
    { q: "אם כל צעד של agent מצליח באופן בלתי תלוי ב־95% מהמקרים, משימה של 20 צעדים מצליחה בערך…", o: ["ב־95% מהמקרים", "ב־75% מהמקרים", "ב־36% מהמקרים", "ב־5% מהמקרים"], a: 2,
      e: "‏0.95²⁰ ≈ 0.36. טעויות מצטברות, ולכן צעדי אימות, ניסיונות חוזרים והתאוששות כל כך חשובים ל־agents שעובדים על משימות ארוכות." }
  ];
  if (LANG === "he") QS.splice(0, QS.length, ...QS_HE);
  // Shuffle answer order (seeded, so it's stable between visits).
  const qr = mulberry32(2017);
  QS.forEach(item => {
    const order = item.o.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(qr() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    item.o = order.map(i => item.o[i]);
    item.a = order.indexOf(item.a);
  });
  const box = $("#quizBox"), score = $("#quizScore");
  let answered = 0, right = 0;
  QS.forEach((item, qi) => {
    const wrap = el("div", { class: "q-item" }, el("h3", { text: `${qi + 1}. ${item.q}` }));
    const opts = el("div", { class: "q-opts" });
    const exp = el("p", { class: "q-exp", hidden: "" });
    const btns = item.o.map((txt, oi) => el("button", { type: "button", text: txt }));
    btns.forEach((b, oi) => {
      b.addEventListener("click", () => {
        btns.forEach(x => (x.disabled = true));
        btns[item.a].classList.add("right");
        if (oi !== item.a) b.classList.add("wrong"); else right++;
        answered++;
        exp.textContent = (oi === item.a ? tr("Correct. ", "נכון. ") : tr("Not quite. ", "לא בדיוק. ")) + item.e;
        exp.hidden = false;
        score.textContent = tr(`${right} of ${answered} correct`, `${right} נכונות מתוך ${answered}`) + (answered === QS.length
          ? (right >= 12 ? tr(" — you could explain this to someone else now.", " — עכשיו אפשר להסביר את זה למישהו אחר.") : tr(" — scroll back to the chapters you missed and try the demos.", " — כדאי לחזור לפרקים שפספסתם ולנסות את הדמואים."))
          : "");
      });
      opts.append(b);
    });
    wrap.append(opts, exp);
    box.append(wrap);
  });

  // Post-training stages: simple disclosure
  $$("#stages button").forEach(b => b.addEventListener("click", () => {
    const body = b.nextElementSibling, open = b.getAttribute("aria-expanded") === "true";
    b.setAttribute("aria-expanded", String(!open));
    body.hidden = open;
  }));
})();
