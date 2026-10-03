/* Guess-first cards, one quick check per chapter, and saved progress.
   Inserts its own DOM: a "guess" card before each chapter's first demo panel,
   a "check" card at the end of the chapter, and a progress strip in the hero. */
(function () {
  const KEY = "rs-progress";
  // Isolate left-to-right (English) islands inside Hebrew strings.
  const L = s => (LANG === "he" ? "⁦" + s + "⁩" : s);

  /* x: optional English sentence shown above the question (always left-to-right), q: question, o: options, a: index of the right option, e: explanation shown after answering. */
  const CH = [
    { id: "tokens",
      guess: {
        q: tr("The model chops text into small pieces before it reads it. Which word do you think ends up in more pieces?",
              "המודל חותך את הטקסט לחתיכות קטנות לפני שהוא קורא אותו. איזו מילה לדעתכם תיחתך ליותר חתיכות?"),
        o: [tr("“the”", "“החתול”"), tr("“unbelievably”", "“מדהימה”"), tr("Both the same", "שתיהן אותו דבר")], a: 1,
        e: tr("Words the model has met often, like “the”, fuse into a single piece; rare words stay cut into several. Both words are in the demo below — move the slider and watch.",
              "מילים שהמודל פגש הרבה פעמים, כמו “החתול”, מתאחדות לחתיכה אחת; מילים נדירות נשארות חתוכות לכמה חתיכות. שתי המילים מופיעות בדמו למטה — הזיזו את המחוון ותראו.") },
      check: {
        q: tr("Why might a chatbot miscount the letter “r” in “strawberry”?",
              `למה צ'אטבוט עלול לטעות כשמבקשים ממנו לספור את האות ${L("“r”")} במילה ${L("“strawberry”")}?`),
        o: [tr("It never learned to count", "הוא אף פעם לא למד לספור"),
            tr("It sees the word as a few chunks, not as separate letters", "הוא רואה את המילה ככמה חתיכות, לא כאותיות נפרדות"),
            tr("The word is too long for it", "המילה ארוכה מדי בשבילו")], a: 1,
        e: tr("The model reads chunks such as “str”, “aw”, “berry” — the individual letters are hidden inside them.",
              `המודל קורא חתיכות כמו ${L("“str”")}, ${L("“aw”")}, ${L("“berry”")} — האותיות הבודדות מסתתרות בתוכן.`) } },

    { id: "embeddings",
      guess: {
        q: tr("The model places every word on a kind of map. Start at “king”, take away “man” and add “woman”. Where do you land?",
              `המודל מניח כל מילה על מעין מפה. מתחילים ב־${L("“king”")} (מלך), מורידים ${L("“man”")} (גבר) ומוסיפים ${L("“woman”")} (אישה). לאן מגיעים?`),
        o: [tr("“princess”", `${L("“princess”")} (נסיכה)`), tr("“queen”", `${L("“queen”")} (מלכה)`), tr("“woman”", `${L("“woman”")} (אישה)`)], a: 1,
        e: tr("The step from “man” to “woman” is the same step as from “king” to “queen” — meaning works like directions on a map. Try other word trios in the demo below.",
              `הצעד מ־${L("“man”")} ל־${L("“woman”")} הוא אותו צעד כמו מ־${L("“king”")} ל־${L("“queen”")} — משמעות עובדת כמו כיוונים על מפה. נסו שלישיות אחרות של מילים בדמו למטה.`) },
      check: {
        q: tr("On the model's map of words, which pair would you expect to sit close together?",
              "על מפת המילים של המודל, איזה זוג הייתם מצפים למצוא קרוב זה לזה?"),
        o: [tr("“cat” and “dog” — used in similar ways", "“חתול” ו“כלב” — משתמשים בהן בצורה דומה"),
            tr("“cat” and “car” — spelled almost the same", "“חתול” ו“חתונה” — מתחילות באותן אותיות"),
            tr("“cat” and “sun” — both short words", "“חתול” ו“שמש” — שתיהן מילים קצרות")], a: 0,
        e: tr("Position on the map reflects how words are used, not how they are spelled. Words that show up in similar sentences end up as neighbours.",
              "המיקום על המפה משקף איך משתמשים במילים, לא איך כותבים אותן. מילים שמופיעות במשפטים דומים נעשות שכנות.") } },

    { id: "position",
      guess: {
        q: tr("“Dog bites man” and “man bites dog” use exactly the same words. If nobody told the model the order of the words, could it tell the two apart?",
              "“כלב נושך איש” ו“איש נושך כלב” בנויים בדיוק מאותן מילים. אם אף אחד לא היה מספר למודל מה סדר המילים, הוא היה מצליח להבדיל ביניהם?"),
        o: [tr("Yes, easily", "כן, בקלות"), tr("No — they would look identical", "לא — הם היו נראים לו זהים")], a: 1,
        e: tr("On its own the model sees a bag of words with no order, so every word gets an extra marker for its place. The striped pattern in the demo below is that marker.",
              "בלי עזרה, המודל רואה שק של מילים בלי שום סדר, ולכן כל מילה מקבלת סימון נוסף שמציין את מקומה. דוגמת הפסים בדמו למטה היא הסימון הזה.") },
      check: {
        q: tr("What does the position marker tell the model about each word?", "מה סימון המיקום מספר למודל על כל מילה?"),
        o: [tr("What the word means", "מה המשמעות של המילה"),
            tr("Where the word sits in the sentence", "איפה המילה נמצאת במשפט"),
            tr("How common the word is", "עד כמה המילה נפוצה")], a: 1,
        e: tr("Meaning comes from the word itself; the position marker adds where it stands, so “dog bites man” and “man bites dog” stop looking the same.",
              "המשמעות מגיעה מהמילה עצמה; סימון המיקום מוסיף איפה היא עומדת, וכך “כלב נושך איש” ו“איש נושך כלב” כבר לא נראים אותו דבר.") } },

    { id: "attention",
      guess: {
        x: "“The animal didn't cross the street because it was too tired.”",
        q: tr("In this sentence, what does “it” refer to?", `למה מתייחסת המילה ${L("“it”")} במשפט הזה?`),
        o: [tr("The animal", `${L("animal")} (החיה)`), tr("The street", `${L("street")} (הרחוב)`), tr("Impossible to tell", "אי אפשר לדעת")], a: 0,
        e: tr("You used the word “tired” to decide — streets don't get tired. The model does the same kind of looking back. In the demo below, switch the last word to “wide” and watch the answer flip.",
              `השתמשתם במילה ${L("“tired”")} (עייף) כדי להחליט — רחובות לא מתעייפים. המודל עושה אותו סוג של הסתכלות לאחור. בדמו למטה, החליפו את המילה האחרונה ל־${L("“wide”")} ותראו איך התשובה מתהפכת.`) },
      check: {
        q: tr("In short: what does attention let each word do?", "בקצרה: מה attention מאפשר לכל מילה לעשות?"),
        o: [tr("Pull in information from the earlier words that matter to it", "לאסוף מידע מהמילים הקודמות שחשובות לה"),
            tr("Jump ahead and read the end of the text", "לקפוץ קדימה ולקרוא את סוף הטקסט"),
            tr("Look itself up in a dictionary", "לחפש את עצמה במילון")], a: 0,
        e: tr("Each word looks back over what came before, decides which words are relevant, and blends in what they offer. It can never look ahead.",
              "כל מילה מסתכלת אחורה על מה שבא לפניה, מחליטה אילו מילים רלוונטיות, ומשלבת את מה שהן מציעות. קדימה היא אף פעם לא יכולה להסתכל.") } },

    { id: "block",
      guess: {
        q: tr("The model works on each word in dozens of rounds, one after another. What do you think each round does with the notes left by earlier rounds?",
              "המודל מעבד כל מילה בעשרות סבבים, אחד אחרי השני. מה לדעתכם כל סבב עושה עם ההערות שהשאירו הסבבים הקודמים?"),
        o: [tr("Throws them away and starts fresh", "זורק אותן ומתחיל מחדש"), tr("Keeps them and adds a little more", "שומר אותן ומוסיף עוד קצת")], a: 1,
        e: tr("Every round adds to the same running notes; nothing is erased. Step through the diagram below and watch the bars shift a little at each stage.",
              "כל סבב מוסיף לאותן הערות מצטברות; שום דבר לא נמחק. עברו שלב אחרי שלב בתרשים למטה ותראו איך העמודות זזות קצת בכל פעם.") },
      check: {
        q: tr("Which part of a block lets words share information with one another?", "איזה חלק ב־block מאפשר למילים לחלוק מידע זו עם זו?"),
        o: [tr("Attention", "ה־attention"),
            tr("The MLP (the part that works on each word alone)", "ה־MLP (החלק שעובד על כל מילה בנפרד)"),
            tr("Neither — words never affect each other", "אף אחד — מילים אף פעם לא משפיעות זו על זו")], a: 0,
        e: tr("Attention is the only place where words exchange information. The MLP then processes each word by itself, drawing on what the model has stored.",
              "ה־attention הוא המקום היחיד שבו מילים מחליפות מידע. אחריו ה־MLP מעבד כל מילה בפני עצמה, בעזרת הידע שהמודל צבר.") } },

    { id: "sampling",
      guess: {
        q: tr("The model has a dial called “temperature”. If we turn it all the way down, will its answers become more surprising or more predictable?",
              `למודל יש כפתור כוונון שנקרא ${L("“temperature”")}. אם נסובב אותו עד הסוף למטה, התשובות יהיו מפתיעות יותר או צפויות יותר?`),
        o: [tr("More surprising", "מפתיעות יותר"), tr("More predictable", "צפויות יותר"), tr("No change", "לא ישתנה כלום")], a: 1,
        e: tr("At the lowest setting the model always picks its single favourite word, so you get the same answer every time. Drag the Temperature slider below to 0 and sample a few times.",
              "בערך הנמוך ביותר המודל תמיד בוחר את המילה המועדפת עליו, ולכן מקבלים אותה תשובה בכל פעם. גררו את מחוון ה־temperature בדמו למטה עד 0 ודגמו כמה פעמים.") },
      check: {
        q: tr("You ask a chatbot the same question twice and get two different answers. Why?",
              "שואלים צ'אטבוט את אותה שאלה פעמיים ומקבלים שתי תשובות שונות. למה?"),
        o: [tr("It learned something new in between", "הוא למד משהו חדש בינתיים"),
            tr("It picks each next word with a bit of chance, like rolling a weighted dice", "הוא בוחר כל מילה עם קצת מזל, כמו הטלת קובייה משוקללת"),
            tr("One of the two answers must be a malfunction", "אחת משתי התשובות היא בהכרח תקלה")], a: 1,
        e: tr("The model only produces a list of likely next words with their odds. A separate step rolls the dice among them, so two runs can take different paths.",
              "המודל רק מפיק רשימה של מילים אפשריות להמשך, עם הסיכוי של כל אחת. שלב נפרד “מטיל קובייה” ביניהן, ולכן שתי הרצות יכולות ללכת בדרכים שונות.") } },

    { id: "training",
      guess: {
        q: tr("Below, a tiny model learns to write by practising on a short text. The chart tracks how “surprised” it is by what comes next. As it practises, will that line go up or down?",
              "בדמו למטה מודל זעיר לומד לכתוב מתוך תרגול על טקסט קצר. הגרף מראה עד כמה הוא “מופתע” ממה שבא בהמשך. ככל שהוא מתרגל, הקו יעלה או ירד?"),
        o: [tr("Up", "יעלה"), tr("Down", "ירד"), tr("Stay flat", "יישאר במקום")], a: 1,
        e: tr("Learning means being less surprised: each small correction makes the real next letter a bit more expected. Press Train below and watch the line fall.",
              "ללמוד פירושו להיות פחות מופתע: כל תיקון קטן הופך את האות הבאה האמיתית לקצת יותר צפויה. הפעילו את האימון בדמו למטה ותראו את הקו יורד.") },
      check: {
        q: tr("Fresh out of its first and biggest round of training, a language model behaves most like…",
              "מיד אחרי שלב האימון הראשון והגדול ביותר, מודל שפה מתנהג הכי דומה ל…"),
        o: [tr("A helpful assistant, ready to chat", "עוזר אדיב שמוכן לשיחה"),
            tr("A very well-read autocomplete that simply continues text", "השלמה אוטומטית שקראה המון, ופשוט ממשיכה טקסט"),
            tr("A search engine that looks things up online", "מנוע חיפוש שבודק דברים באינטרנט")], a: 1,
        e: tr("At that point it only continues text — ask it a question and it may reply with more questions. Further rounds of training teach it to behave like an assistant.",
              "בשלב הזה הוא רק ממשיך טקסט — שאלו אותו שאלה, והוא עלול לענות בעוד שאלות. שלבי אימון נוספים מלמדים אותו להתנהג כמו עוזר.") } },

    { id: "modern",
      guess: {
        q: tr("A model writes one word at a time. To write word number 500, must it redo all its work on the 499 words before it?",
              "מודל כותב מילה אחת בכל פעם. כדי לכתוב את מילה מספר 500, הוא חייב לעשות מחדש את כל העבודה על 499 המילים שלפניה?"),
        o: [tr("Yes — everything, every time", "כן — הכול, בכל פעם"), tr("No — it can save that work and reuse it", "לא — אפשר לשמור את העבודה ולהשתמש בה שוב")], a: 1,
        e: tr("The earlier words don't change, so the work done on them can be stored and reused — one reason answers arrive quickly. In the demo below, untick “Use KV cache” to see how much work it saves.",
              `המילים הקודמות לא משתנות, אז אפשר לשמור את העבודה שנעשתה עליהן ולהשתמש בה שוב — וזו אחת הסיבות שהתשובות מגיעות מהר. בדמו למטה, בטלו את הסימון של ${L("KV cache")} ותראו כמה עבודה הוא חוסך.`) },
      check: {
        q: tr("A model's knowledge stops on the day its training ended. What is the usual way to give it up-to-date information?",
              "הידע של מודל נעצר ביום שבו האימון שלו הסתיים. מה הדרך המקובלת לתת לו מידע עדכני?"),
        o: [tr("Ask the same question several times", "לשאול את אותה שאלה כמה פעמים"),
            tr("Put the relevant documents into the text it reads, next to your question", "לצרף את המסמכים הרלוונטיים לטקסט שהוא קורא, לצד השאלה"),
            tr("Wait — it updates itself overnight", "לחכות — הוא מתעדכן לבד בלילה")], a: 1,
        e: tr("This is called retrieval (RAG): fresh, relevant documents are placed in front of the model together with the question, so it can answer from them.",
              `לזה קוראים ${L("RAG")}: מניחים לפני המודל מסמכים עדכניים ורלוונטיים יחד עם השאלה, וכך הוא יכול לענות מתוכם.`) } },

    { id: "interp",
      guess: {
        x: "“The Eiffel Tower is located in the city of …”",
        q: tr("The model is finishing this sentence. It thinks in 12 stages. Halfway through, what is its best guess for the next word?",
              "המודל משלים את המשפט הזה. הוא חושב ב־12 שלבים. באמצע הדרך, מה הניחוש הכי טוב שלו למילה הבאה?"),
        o: [tr("“Paris” — it knows from the start", `${L("“Paris”")} — הוא יודע מההתחלה`),
            tr("“France” — close, but not there yet", `${L("“France”")} — קרוב, אבל עוד לא שם`),
            tr("A random, unrelated word", "מילה אקראית שלא קשורה לכלום")], a: 1,
        e: tr("The answer forms gradually: first common filler words, then related ideas like “Europe” and “France”, and only near the end “Paris”. Drag the layer slider in the demo below to watch it happen.",
              `התשובה נבנית בהדרגה: קודם מילים כלליות ונפוצות, אחר כך רעיונות קרובים כמו ${L("“Europe”")} ו־${L("“France”")}, ורק לקראת הסוף ${L("“Paris”")}. גררו את מחוון השכבות בדמו למטה ותראו את זה קורה.`) },
      check: {
        q: tr("Researchers found the spot inside a model that stands for the Golden Gate Bridge and turned it way up. What happened?",
              "חוקרים מצאו בתוך מודל את המקום שמייצג את גשר שער הזהב, והגבירו אותו מאוד. מה קרה?"),
        o: [tr("The model stopped working", "המודל הפסיק לעבוד"),
            tr("The model kept steering every conversation back to the bridge", "המודל החזיר כל שיחה לנושא הגשר"),
            tr("Nothing noticeable changed", "לא השתנה שום דבר מורגש")], a: 1,
        e: tr("Ideas inside the model are like dials. Turning one up changes behaviour — strong evidence that the dial really stands for that idea.",
              "רעיונות בתוך המודל דומים לכפתורי כוונון. כשמגבירים אחד מהם ההתנהגות משתנה — ראיה חזקה לכך שהכפתור באמת מייצג את הרעיון הזה.") } },

    { id: "agents",
      guess: {
        q: tr("An assistant gets each step right 95% of the time. How often will it finish a 20-step task without a single mistake?",
              "עוזר דיגיטלי מצליח בכל צעד ב־95% מהמקרים. באיזו תדירות הוא יסיים משימה של 20 צעדים בלי אף טעות?"),
        o: [tr("About 95% of the time", "בערך 95% מהפעמים"), tr("About 75% of the time", "בערך 75% מהפעמים"), tr("About 36% of the time", "בערך 36% מהפעמים")], a: 2,
        e: tr("Small risks multiply: 20 steps at 95% each leave only about a 36% chance of a clean run. Try the two sliders further down this chapter and watch the number move.",
              "סיכונים קטנים מצטברים: 20 צעדים של 95% משאירים רק כ־36% סיכוי לריצה נקייה. נסו את שני המחוונים בהמשך הפרק ותראו איך המספר משתנה.") },
      check: {
        q: tr("An AI agent is about to send an email on your behalf. What is the sensible design?",
              `סוכן AI ‏(${L("agent")}) עומד לשלוח אימייל בשמכם. מה התכנון הנבון?`),
        o: [tr("Let it send — it is usually right", "לתת לו לשלוח — בדרך כלל הוא צודק"),
            tr("Have a person approve first, because sending can't be undone", "שאדם יאשר קודם, כי שליחה אי אפשר לבטל"),
            tr("Have it send twice, to be safe", "שישלח פעמיים, ליתר ביטחון")], a: 1,
        e: tr("Reading and drafting are easy to undo; sending, paying and deleting are not. Well-built agents pause for a human before steps like these.",
              "קריאה וכתיבת טיוטה קל לבטל; שליחה, תשלום ומחיקה — לא. agents שבנויים היטב עוצרים ומחכים לאישור של אדם לפני צעדים כאלה.") } }
  ];

  /* ---------- Saved state: { v: 1, a: { "<chapter>:<guess|check>": { c: chosenIndex, ok: bool } } } ---------- */
  let state = { v: 1, a: {} };
  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || "null");
      if (raw && raw.v === 1 && raw.a && typeof raw.a === "object") state = { v: 1, a: raw.a };
    } catch (e) {}
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
  load();

  /* ---------- Cards ---------- */
  const cards = []; // { key, chapter, item, btns, fb, node }
  function showAnswer(card, chosen, announce) {
    const { item, btns, fb, node } = card;
    const ok = chosen === item.a;
    btns.forEach((b, i) => {
      b.setAttribute("aria-disabled", "true");
      b.setAttribute("aria-pressed", String(i === chosen));
      b.classList.toggle("ch-right", i === item.a);
      b.classList.toggle("ch-wrong", i === chosen && !ok);
    });
    node.classList.add("ch-answered");
    fb.textContent = "";
    fb.append(el("strong", { class: ok ? "ch-ok" : "ch-no", text: ok ? tr("That's right.", "נכון!") : tr("Not quite.", "לא בדיוק.") }), " " + item.e);
    fb.hidden = false;
    if (!announce) fb.removeAttribute("aria-live"); else fb.setAttribute("aria-live", "polite");
  }
  function clearAnswer(card) {
    card.btns.forEach(b => {
      b.removeAttribute("aria-disabled");
      b.setAttribute("aria-pressed", "false");
      b.classList.remove("ch-right", "ch-wrong");
    });
    card.node.classList.remove("ch-answered");
    card.fb.textContent = "";
    card.fb.setAttribute("aria-live", "polite");
  }
  function buildCard(chapter, kind, item) {
    const key = chapter + ":" + kind;
    const qid = `ch-${chapter}-${kind}-q`, xid = `ch-${chapter}-${kind}-x`;
    const fb = el("p", { class: "ch-fb", "aria-live": "polite" });
    const btns = item.o.map((txt, i) => el("button", { type: "button", class: "ch-opt", "aria-pressed": "false", "data-i": String(i) }, el("span", { text: txt })));
    const node = el("aside", { class: `ch-card ch-${kind}`, id: `ch-${chapter}-${kind}`, role: "group", "aria-labelledby": item.x ? `${xid} ${qid}` : qid },
      el("p", { class: "ch-kicker", text: kind === "guess" ? tr("Guess first", "נחשו קודם") : tr("Quick check", "בדיקה קצרה") }),
      item.x ? el("p", { class: "ch-quote", id: xid, dir: "ltr", lang: "en", text: item.x }) : null,
      el("p", { class: "ch-q", id: qid, text: item.q }),
      el("div", { class: "ch-opts" }, ...btns),
      fb);
    const card = { key, chapter, item, btns, fb, node };
    btns.forEach((b, i) => b.addEventListener("click", () => {
      if (state.a[key]) return; // already answered; buttons stay focusable but inert
      state.a[key] = { c: i, ok: i === item.a };
      save();
      showAnswer(card, i, true);
      refresh();
    }));
    cards.push(card);
    return node;
  }

  CH.forEach(c => {
    const sec = document.getElementById(c.id);
    if (!sec) return;
    const firstPanel = $(".panel", sec);
    const g = buildCard(c.id, "guess", c.guess);
    if (firstPanel) firstPanel.before(g); else sec.append(g);
    sec.append(buildCard(c.id, "check", c.check));
  });
  if (!cards.length) return;

  /* ---------- Progress strip (in the hero) ---------- */
  const total = cards.length;
  const pText = el("span", { class: "ch-progress-text", "aria-live": "polite" });
  const pFill = el("div", { class: "ch-progress-fill" });
  const pBar = el("div", { class: "ch-progress-bar", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": String(total),
    "aria-label": tr("Questions answered", "שאלות שנענו") }, pFill);
  const pReset = el("button", { type: "button", class: "ch-reset", text: tr("Start over", "להתחיל מחדש") });
  const pNote = el("p", { class: "ch-progress-note", text: tr(
    "Guess before each demo, then check yourself at the end of the chapter. Your progress is saved in this browser.",
    "נחשו לפני כל דמו, ובדקו את עצמכם בסוף כל פרק. ההתקדמות נשמרת בדפדפן הזה.") });
  const progress = el("div", { class: "ch-progress", id: "ch-progress" },
    el("div", { class: "ch-progress-row" }, pText, pReset), pBar, pNote);
  const start = document.getElementById("start");
  if (start) start.append(progress);

  pReset.addEventListener("click", () => {
    state = { v: 1, a: {} };
    try { localStorage.removeItem(KEY); } catch (e) {}
    cards.forEach(clearAnswer);
    refresh();
  });

  function refresh() {
    const mine = cards.filter(c => state.a[c.key]);
    const done = mine.length, right = mine.filter(c => state.a[c.key].ok).length;
    pText.textContent = tr(`${done} of ${total} questions done · ${right} correct`, `${done} מתוך ${total} שאלות נענו · ${right} נכונות`);
    pFill.style.width = (done / total * 100).toFixed(1) + "%";
    pBar.setAttribute("aria-valuenow", String(done));
    pReset.hidden = done === 0;
    CH.forEach(c => {
      const complete = !!(state.a[c.id + ":guess"] && state.a[c.id + ":check"]);
      $$(`#railNodes a[href="#${c.id}"], #mobileMenu a[href="#${c.id}"]`).forEach(a => a.classList.toggle("done", complete));
    });
  }

  // Restore what was answered on an earlier visit (silently — no screen-reader announcements).
  cards.forEach(card => {
    const s = state.a[card.key];
    if (s && Number.isInteger(s.c) && s.c >= 0 && s.c < card.item.o.length) showAnswer(card, s.c, false);
    else delete state.a[card.key];
  });
  refresh();
})();
