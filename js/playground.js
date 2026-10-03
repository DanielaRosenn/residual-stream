/* "Build a prompt" playground. ILLUSTRATIVE: there is no model here. Every answer is hand-written
   and assembled from parts (greeting by role, body by task × context, closing by role, variants by temperature). */
(function () {
  const mount = $("#pgMount");
  if (!mount) return;

  const L = s => "⁦" + s + "⁩";           // isolate an English run inside Hebrew text
  const U = t => ({ k: "used", t });                 // detail copied from the reader's context
  const M = t => ({ k: "made", t });                 // plausible-sounding invention (hallucination)

  /* ---------- Roles (system prompt) ---------- */
  const ROLES = [
    {
      id: "none", label: tr("No role", "בלי תפקיד"), system: "",
      greet: [tr("Hello {a},", "שלום {a},"), tr("Hi {a},", "היי {a},"), tr("Greetings, {a},", "{a} שלום,")],
      close: [tr("Best regards.", "בברכה."), tr("All the best.", "כל טוב."), tr("Thanks, and goodbye for now.", "תודה ולהתראות.")]
    },
    {
      id: "friendly", label: tr("Friendly helper", "עוזר ידידותי"),
      system: tr("You are a warm, friendly helper. Be kind, positive and encouraging.", "אתה עוזר חם וידידותי. דבר בנועם, בחיוב ובעידוד."),
      greet: [tr("Hi {a}!", "היי {a}!"), tr("Hi there, {a}!", "אהלן {a}!"), tr("Hey hey, {a}!", "היי היי, {a}!")],
      close: [
        tr("Have a lovely day — I'm here if you need anything!", "שיהיה יום נפלא, ואני כאן לכל שאלה!"),
        tr("You can always come back to me with any question!", "תמיד אפשר לפנות אליי שוב!"),
        tr("Big hug, and talk soon!", "חיבוק גדול, ונדבר בקרוב!")
      ]
    },
    {
      id: "lawyer", label: tr("Strict lawyer", "עורך דין קפדן"),
      system: tr("You are a strict, formal lawyer. Be precise and official.", "אתה עורך דין קפדן ורשמי. התנסח במדויק ובאופן רשמי."),
      greet: [tr("Dear {a},", "לכבוד {a},"), tr("To: {a}.", "אל: {a}."), tr("For the attention of {a}:", "לידיעת {a}:")],
      close: [
        tr("Yours sincerely.", "בכבוד רב."),
        tr("Respectfully yours.", "בכבוד רב ובברכה."),
        tr("The above is without prejudice to any other rights. Yours faithfully.", "האמור לעיל אינו ממצה את מלוא הטענות. בכבוד רב.")
      ]
    },
    {
      id: "pirate", label: tr("Pirate", "פיראט"),
      system: tr("You are a pirate. Speak like one at all times.", "אתה פיראט. דבר כמו פיראט בכל רגע."),
      greet: [tr("Ahoy, {a}!", "אהוי, {a}!"), tr("Arr, {a}!", "ארררר, {a}!"), tr("Yo-ho-ho, {a}!", "יו־הו־הו, {a}!")],
      close: [
        tr("Fair winds to ye!", "רוח טובה במפרשים!"),
        tr("Smooth sailin', matey!", "הפלגה שקטה ורוח גבית!"),
        tr("May yer sails stay full and yer rum never run dry!", "שהמפרשים תמיד יהיו מלאים ושהרום לא ייגמר לעולם!")
      ]
    }
  ];

  /* ---------- Tasks ---------- */
  const SCENARIOS = [
    {
      id: "customer", label: tr("Unhappy customer", "לקוחה לא מרוצה"),
      task: tr("Write a reply to a customer who is unhappy about their order.", "תכתוב תשובה ללקוחה שלא מרוצה מההזמנה שלה."),
      facts: [
        {
          label: tr("The customer's name", "שם הלקוחה"), generic: true,
          line: tr("Customer name: Maya.", "שם הלקוחה: מאיה."),
          miss: tr("The model does not know the customer's name, so the greeting is generic.", "המודל לא יודע איך קוראים ללקוחה, ולכן הפנייה כללית.")
        },
        {
          label: tr("What went wrong with the order", "מה השתבש בהזמנה"),
          line: tr("Order 4821: a Wi-Fi router, arrived on Monday with a cracked case.", "הזמנה מספר 4821: ראוטר Wi-Fi, הגיע ביום שני עם מארז סדוק."),
          miss: tr("The model does not know what went wrong, so it invents an order.", "המודל לא יודע מה השתבש, ולכן הוא ממציא הזמנה.")
        },
        {
          label: tr("The shop's refund policy", "מדיניות ההחזרות של החנות"),
          line: tr("Policy: a damaged item is replaced free or refunded in full, within 30 days.", "מדיניות: מוצר פגום מוחלף בחינם או מזוכה במלואו, עד 30 יום מהקבלה."),
          miss: tr("The model does not know the refund policy, so it promises one of its own.", "המודל לא מכיר את מדיניות ההחזרות, ולכן הוא מבטיח מדיניות משלו.")
        }
      ],
      addr: c => (c[0] ? U(tr("Maya", "מאיה")) : tr("valued customer", "לקוחה יקרה")),
      body: c => [
        c[1]
          ? [tr("We are sorry that ", "צר לנו ש"), U(tr("the Wi-Fi router from order 4821 arrived on Monday with a cracked case", "הראוטר מהזמנה 4821 הגיע ביום שני עם מארז סדוק")), "."]
          : [tr("We are sorry that ", "צר לנו ש"), M(tr("the coffee machine you ordered arrived with a broken glass jug", "מכונת הקפה שהזמנת הגיעה עם קנקן זכוכית שבור")), "."],
        c[2]
          ? [tr("For a damaged item, ", "במקרה של מוצר פגום, "), U(tr("we can send a free replacement or refund you in full — your choice, within 30 days", "אפשר לקבל מוצר חלופי בחינם או זיכוי מלא — הבחירה שלך, עד 30 יום מקבלת המוצר")), "."]
          : [tr("Under our policy, ", "לפי המדיניות שלנו, "), M(tr("you are entitled to a full refund within 90 days, plus a 20% voucher", "מגיע לך החזר כספי מלא בתוך 90 יום, ובנוסף שובר הנחה של 20%")), "."]
      ],
      extras: [
        tr("Just reply to this message with the option you prefer, and we will take care of the rest.", "מספיק להשיב להודעה הזאת עם האפשרות המועדפת, ואנחנו נטפל בכל השאר."),
        tr("There is nothing else you need to do for now.", "כרגע אין צורך לעשות שום דבר נוסף.")
      ],
      asides: [
        tr("A parcel should bring a smile, not a headache.", "חבילה אמורה להביא חיוך, לא כאב ראש."),
        tr("Nobody opens a box hoping for a surprise like that.", "אף אחד לא פותח קרטון בתקווה להפתעה כזאת."),
        tr("Between us, that parcel has some explaining to do.", "בינינו, לחבילה הזאת יש כמה הסברים לתת.")
      ],
      openers: {
        none: tr("Thank you for contacting us.", "תודה על הפנייה."),
        friendly: tr("Thank you so much for telling us — it is completely clear how frustrating this is.", "תודה רבה שסיפרת לנו — ברור לגמרי כמה זה מתסכל."),
        lawyer: tr("Your complaint has been received and carefully reviewed.", "פנייתך התקבלה ונבחנה בקפידה."),
        pirate: tr("Yer message reached our ship, and the whole crew be frownin'.", "ההודעה שלך הגיעה לספינה, וכל הצוות קימט את המצח.")
      }
    },
    {
      id: "grandma", label: tr("Slow internet, for Grandma", "אינטרנט איטי, לסבתא"),
      task: tr("Explain to my grandmother why her internet is slow.", "תסביר לסבתא שלי למה האינטרנט אצלה איטי."),
      facts: [
        {
          label: tr("What she uses the internet for", "למה היא משתמשת באינטרנט"), generic: true,
          line: tr("She mostly makes video calls with the grandchildren on her tablet, from the living room.", "היא בעיקר עושה שיחות וידאו עם הנכדים בטאבלט, מהסלון."),
          miss: tr("The model does not know what she uses the internet for, so it stays vague.", "המודל לא יודע למה סבתא משתמשת באינטרנט, ולכן הוא נשאר כללי.")
        },
        {
          label: tr("The real cause", "הסיבה האמיתית"),
          line: tr("Her router sits inside a closed cupboard in the bedroom, far from the living room.", "הראוטר שלה נמצא בתוך ארון סגור בחדר השינה, רחוק מהסלון."),
          miss: tr("The model does not know the real cause, so it guesses a common one.", "המודל לא יודע מה הסיבה האמיתית, ולכן הוא מנחש סיבה נפוצה.")
        },
        {
          label: tr("What we will do about it", "מה נעשה בעניין"),
          line: tr("On Friday I will come over and move the router to the living-room shelf.", "ביום שישי אבוא להעביר את הראוטר למדף בסלון."),
          miss: tr("The model does not know your plan, so it makes up advice.", "המודל לא יודע מה התוכנית שלכם, ולכן הוא ממציא עצה.")
        }
      ],
      addr: () => tr("Grandma", "סבתא"),
      body: c => [
        c[0]
          ? [tr("I hear that ", "שמעתי ש"), U(tr("the video calls with the grandchildren on your tablet", "שיחות הווידאו עם הנכדים בטאבלט שלך")), tr(" keep freezing.", " נתקעות כל הזמן.")]
          : [tr("I hear the internet has been slow for you lately.", "שמעתי שהאינטרנט אצלך איטי בזמן האחרון.")],
        c[1]
          ? [tr("The reason is simple: ", "הסיבה פשוטה: "), U(tr("the router is shut inside the bedroom cupboard, far from the living room", "הראוטר סגור בתוך הארון בחדר השינה, רחוק מהסלון")), tr(", so the signal arrives weak.", ", ולכן האות מגיע חלש.")]
          : [tr("The reason is probably that ", "הסיבה היא כנראה ש"), M(tr("too many devices in your home are downloading large files at the same time", "יותר מדי מכשירים בבית מורידים קבצים גדולים בו־זמנית")), "."],
        c[2]
          ? [U(tr("On Friday I will come over and move the router to the living-room shelf", "ביום שישי אבוא ואעביר את הראוטר למדף בסלון")), tr(", and that should fix it.", ", וזה אמור לפתור את הבעיה.")]
          : [tr("To fix it, ", "כדי לפתור את זה, "), M(tr("call your provider and upgrade to the faster 500-megabit plan", "כדאי להתקשר לספק ולשדרג לחבילה המהירה של 500 מגה")), "."]
      ],
      extras: [
        tr("Nothing is broken, and you did not do anything wrong.", "שום דבר לא התקלקל, ולא עשית שום דבר לא בסדר."),
        tr("Slow internet is one of the most common annoyances at home, and it nearly always has a simple fix.", "אינטרנט איטי הוא אחת התקלות הנפוצות ביותר בבית, וכמעט תמיד יש לה פתרון פשוט.")
      ],
      asides: [
        tr("Even the internet has slow mornings.", "גם לאינטרנט יש בקרים איטיים."),
        tr("Think of it as a traffic jam, only for pictures and voices.", "אפשר לחשוב על זה כמו על פקק תנועה, רק של תמונות וקולות."),
        tr("The internet is a bit like the post: sometimes it dawdles on the way.", "האינטרנט קצת כמו הדואר: לפעמים הוא מתעכב בדרך.")
      ],
      openers: {
        none: tr("Here is a simple explanation.", "הנה הסבר פשוט."),
        friendly: tr("There is no need to worry: this happens to lots of people and it is easy to sort out.", "אין מה לדאוג, זה קורה להמון אנשים וקל לסדר את זה."),
        lawyer: tr("With reference to your enquiry regarding the performance of your internet connection, please note the following.", "בהמשך לפנייתך בעניין ביצועי חיבור האינטרנט שברשותך, להלן הדברים."),
        pirate: tr("Yer internet be crawlin' like a ship with no wind, and here be why.", "האינטרנט שלך זוחל כמו ספינה בלי רוח, והנה הסיבה.")
      }
    },
    {
      id: "phish", label: tr("Suspicious email warning", "אזהרה על מייל חשוד"),
      task: tr("Write a short warning to my team about a suspicious email that is going around.", "תכתוב אזהרה קצרה לצוות שלי על מייל חשוד שמסתובב אצלנו."),
      facts: [
        {
          label: tr("Who the team is", "מי הצוות"), generic: true,
          line: tr("The team: the finance team, 12 people who approve payments.", "הצוות: צוות הכספים, 12 אנשים שמאשרים תשלומים."),
          miss: tr("The model does not know who the team is, so it writes to “everyone”.", "המודל לא יודע מי הצוות, ולכן הוא פונה ל“חברי הצוות” באופן כללי.")
        },
        {
          label: tr("What the email looks like", "איך המייל נראה"),
          line: tr("The email pretends to be from the CEO and urgently asks to buy gift cards.", "המייל מתחזה למנכ״ל ומבקש בדחיפות לקנות שוברי מתנה."),
          miss: tr("The model has not seen the email, so it describes a different scam.", "המודל לא ראה את המייל, ולכן הוא מתאר הונאה אחרת.")
        },
        {
          label: tr("What people should do", "מה צריך לעשות"),
          line: tr("Do not reply or click. Press the “Report phishing” button, then call the IT desk on extension 4400.", `לא לענות ולא ללחוץ. לדווח בכפתור ${L("“Report phishing”")} ואז להתקשר לתמיכת ${L("IT")} בשלוחה 4400.`),
          miss: tr("The model does not know your reporting procedure, so it invents one.", "המודל לא מכיר את נוהל הדיווח שלכם, ולכן הוא ממציא נוהל.")
        }
      ],
      addr: c => (c[0] ? U(tr("finance team", "צוות הכספים")) : tr("everyone", "חברי הצוות")),
      body: c => [
        c[1]
          ? [tr("A fake email is going around: ", "מייל מזויף מסתובב אצלנו: "), U(tr("it pretends to come from the CEO and urgently asks you to buy gift cards", "הוא מתחזה למנכ״ל ומבקש בדחיפות לקנות שוברי מתנה")), "."]
          : [tr("A fake email is going around: ", "מייל מזויף מסתובב אצלנו: "), M(tr("it says your mailbox is full and asks you to log in through a link to free up space", "הוא טוען שתיבת הדואר מלאה ומבקש להתחבר דרך קישור כדי לפנות מקום")), "."],
        c[2]
          ? [tr("If you receive it, ", "מי שמקבל אותו — "), U(tr("do not reply and do not click anything: press the “Report phishing” button and call the IT desk on extension 4400", `לא לענות ולא ללחוץ על שום דבר: לדווח בכפתור ${L("“Report phishing”")} ולהתקשר לתמיכת ${L("IT")} בשלוחה 4400`)), "."]
          : [tr("If you receive it, ", "מי שמקבל אותו — "), M(tr("forward it to the security hotline and change your password within 24 hours", "להעביר אותו למוקד האבטחה ולהחליף סיסמה בתוך 24 שעות")), "."]
      ],
      extras: [
        tr("The warning signs: pressure to act fast, and a request that skips the normal process.", "סימני האזהרה: לחץ לפעול מהר, ובקשה שעוקפת את הנוהל הרגיל."),
        tr("If you have already clicked or replied, say so straight away: the sooner it is known, the easier it is to contain.", "מי שכבר לחץ או ענה — כדאי לומר זאת מיד: ככל שיודעים מוקדם יותר, קל יותר לעצור את הנזק.")
      ],
      asides: [
        tr("If an email is in a hurry, you do not have to be.", "אם המייל ממהר, אתם לא חייבים למהר איתו."),
        tr("A real request survives a two-minute check; a fake one does not.", "בקשה אמיתית שורדת בדיקה של שתי דקות; בקשה מזויפת לא."),
        tr("When in doubt, a short phone call beats a quick click.", "כשיש ספק, שיחת טלפון קצרה עדיפה על לחיצה מהירה.")
      ],
      openers: {
        none: tr("Please read this short notice.", "נא לקרוא את ההודעה הקצרה הזאת."),
        friendly: tr("A quick heads-up so that nobody gets caught out — it takes a minute to read.", "עדכון קצר כדי שאף אחד לא ייפול בפח — לוקח דקה לקרוא."),
        lawyer: tr("You are hereby notified of a fraudulent message currently in circulation.", "הרינו להודיעכם על הודעה מזויפת המופצת בימים אלה."),
        pirate: tr("There be a scallywag in our waters, sendin' false messages to honest sailors.", "נוכל מסתובב במים שלנו ושולח הודעות שקר למלחים ישרים.")
      }
    }
  ];

  const TEMPS = [
    { id: "low", label: tr("Low", "נמוכה"), value: "0", variants: 1, aside: false },
    { id: "medium", label: tr("Medium", "בינונית"), value: "0.7", variants: 2, aside: false },
    { id: "high", label: tr("High", "גבוהה"), value: "1.3", variants: 3, aside: true }
  ];
  const LENS = [
    { id: "short", label: tr("Short", "קצרה"), max: 120 },
    { id: "detailed", label: tr("Detailed", "מפורטת"), max: 400 }
  ];

  const NOTES = {
    init: tr("Change one ingredient at a time and watch which part of the answer moves.", "שנו מרכיב אחד בכל פעם וראו איזה חלק בתשובה זז."),
    scenario: tr("A new task. The model has no memory of the previous one: all it ever sees is the prompt shown here.", `משימה חדשה. המודל לא זוכר את הקודמת: כל מה שהוא רואה הוא ה־${L("prompt")} שמוצג כאן.`),
    roleOn: tr("The system prompt is read first, so every word after it is predicted “in character”. Notice that the facts did not change — only the voice.", `ה־${L("system prompt")} נקרא ראשון, ולכן כל מילה שאחריו נחזית “בתוך הדמות”. שימו לב שהעובדות לא השתנו — רק הקול.`),
    roleOff: tr("With no system prompt the model falls back on its default voice: polite and a little bland.", `בלי ${L("system prompt")} המודל חוזר לקול ברירת המחדל שלו: מנומס וקצת אפור.`),
    factOn: tr("That fact is now part of the prompt, so the model can copy it instead of guessing. Look for the green marking in the answer.", `העובדה הזאת נמצאת עכשיו ב־${L("prompt")}, ולכן המודל יכול להעתיק אותה במקום לנחש. חפשו את הסימון הירוק בתשובה.`),
    factOffMade: tr("That fact is gone from the prompt. The model still has to write a fluent sentence, so it fills the gap with something that merely sounds likely. This is a hallucination — it is marked in yellow.", `העובדה הזאת כבר לא ב־${L("prompt")}. המודל עדיין צריך לכתוב משפט שוטף, ולכן הוא ממלא את החסר במשהו שרק נשמע סביר. זו ${L("hallucination")} — היא מסומנת בצהוב.`),
    factOffGeneric: tr("That fact is gone from the prompt. Here the model plays safe and stays vague rather than inventing something.", `העובדה הזאת כבר לא ב־${L("prompt")}. כאן המודל נזהר ונשאר כללי במקום להמציא משהו.`),
    low: tr("Low temperature: at every step the model takes the most likely next token. Press “Ask again” — you get the same answer every time.", `${L("temperature")} נמוכה: בכל צעד המודל בוחר את הטוקן הסביר ביותר. לחצו על “לשאול שוב” — התשובה תהיה זהה בכל פעם.`),
    medium: tr("Medium temperature: a less likely token sometimes wins, so the wording shifts a little between tries. The facts stay put.", `${L("temperature")} בינונית: לפעמים נבחר טוקן פחות סביר, ולכן הניסוח משתנה מעט בין ניסיון לניסיון. העובדות נשארות במקומן.`),
    high: tr("High temperature: unlikely tokens get a real chance. The answer becomes looser and more surprising — press “Ask again” a few times.", `${L("temperature")} גבוהה: גם טוקנים לא סבירים מקבלים סיכוי אמיתי. התשובה נעשית חופשית ומפתיעה יותר — לחצו על “לשאול שוב” כמה פעמים.`),
    short: tr("A low max tokens limit caps how much the model may write, so only the essentials fit.", `מגבלת ${L("max tokens")} נמוכה קובעת כמה המודל רשאי לכתוב, ולכן נכנס רק העיקר.`),
    detailed: tr("More room to write: the model adds an opening line and extra explanation. The facts are the same — longer is not automatically better.", "יותר מקום לכתוב: המודל מוסיף משפט פתיחה והסברים. העובדות אותן עובדות — ארוך יותר לא אומר טוב יותר."),
    againSame: tr("Same prompt, low temperature: exactly the same answer, word for word.", `אותו ${L("prompt")}, ${L("temperature")} נמוכה: בדיוק אותה תשובה, מילה במילה.`),
    againNew: tr("Same prompt, different answer. Nothing in the prompt changed — the dice were simply rolled again.", `אותו ${L("prompt")}, תשובה אחרת. שום דבר ב־${L("prompt")} לא השתנה — פשוט הטילו שוב את הקובייה.`)
  };

  /* ---------- State ---------- */
  const state = { sc: 0, role: 0, facts: [false, false, false], temp: 0, len: 0, pick: { g: 0, c: 0, a: 0 } };
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let timer = null;
  let lastBlocks = {};

  /* ---------- Skeleton ---------- */
  let groupN = 0;
  function group(title, body) {
    const id = "pgLbl" + (++groupN);
    body.setAttribute("aria-labelledby", id);
    return el("div", { class: "pg-group" }, el("span", { class: "pg-label", id, text: title }), body);
  }
  const scSeg = el("div", { class: "seg", id: "pgScenario", role: "radiogroup" });
  const roleSeg = el("div", { class: "seg", id: "pgRole", role: "radiogroup" });
  const factsBox = el("div", { class: "pg-facts", id: "pgFacts", role: "group" });
  const tempSeg = el("div", { class: "seg", id: "pgTemp", role: "radiogroup" });
  const lenSeg = el("div", { class: "seg", id: "pgLen", role: "radiogroup" });
  const hint = el("div", { class: "pg-hint", id: "pgHint" });

  const promptTok = el("span", { class: "pg-count", id: "pgTokens" });
  const promptBox = el("div", { class: "pg-prompt", id: "pgPrompt" });
  const answerTok = el("span", { class: "pg-count", id: "pgAnswerTokens" });
  const answer = el("div", { class: "pg-answer", id: "pgAnswer", "aria-live": "polite", "data-typing": "false" });
  const again = el("button", { type: "button", class: "btn", id: "pgAgain", text: tr("Ask again", "לשאול שוב") });
  const note = el("p", { class: "pg-note-text", id: "pgNote" });

  mount.append(
    el("div", { class: "pg-grid" },
      el("div", { class: "pg-controls" },
        group(tr("The task", "המשימה"), scSeg),
        group(tr("Role (system prompt)", `תפקיד (${L("system prompt")})`), roleSeg),
        group(tr("What the model is told (context)", `מה מספרים למודל (${L("context")})`), factsBox),
        group(tr("Creativity (temperature)", `יצירתיות (${L("temperature")})`), tempSeg),
        group(tr("Answer length (max tokens)", `אורך התשובה (${L("max tokens")})`), lenSeg),
        hint
      ),
      el("div", { class: "pg-chat" },
        el("div", { class: "pg-head" }, el("span", { class: "pg-head-t", text: tr("What the model sees", "מה שהמודל רואה") }), promptTok),
        promptBox,
        el("div", { class: "pg-head" }, el("span", { class: "pg-head-t", text: tr("Simulated answer", "תשובה מדומה") }), answerTok),
        answer,
        el("div", { class: "pg-legend" },
          el("span", { class: "pg-key" }, el("span", { class: "pg-swatch pg-used", "aria-hidden": "true" }), tr("taken from your context", `נלקח מה־${L("context")} שנתתם`)),
          el("span", { class: "pg-key" }, el("span", { class: "pg-swatch pg-made", "aria-hidden": "true" }), tr("made-up detail", "פרט מומצא"))
        ),
        el("div", { class: "pg-actions" }, again),
        el("div", { class: "pg-note" }, el("span", { class: "pg-note-h", text: tr("What just happened inside", "מה קרה עכשיו בפנים") }), note)
      )
    ),
    el("p", { class: "caption pg-caption", text: tr(
      "Illustrative demo: there is no real model behind this box and nothing is sent anywhere. Every answer was written by hand and is assembled by a small script, to show how each ingredient of a prompt changes the result. Token counts are rough estimates.",
      `הדגמה להמחשה בלבד: אין כאן מודל אמיתי ושום דבר לא נשלח לשום מקום. כל התשובות נכתבו ביד ומורכבות על ידי סקריפט קטן, כדי להראות איך כל מרכיב ב־${L("prompt")} משנה את התוצאה. ספירת הטוקנים היא הערכה גסה.`) })
  );

  function seg(container, items, initial, onChange) {
    const btns = segmented(container, items.map((o, i) => ({ value: i, label: o.label })), initial, onChange);
    btns.forEach((b, i) => { b.dataset.value = items[i].id; });
  }
  seg(scSeg, SCENARIOS, 0, v => { state.sc = v; state.facts = [false, false, false]; buildFacts(); update("scenario"); });
  seg(roleSeg, ROLES, 0, v => { state.role = v; update(v ? "roleOn" : "roleOff"); });
  seg(tempSeg, TEMPS, 0, v => { state.temp = v; roll(); update(TEMPS[v].id); });
  seg(lenSeg, LENS, 0, v => { state.len = v; update(LENS[v].id); });
  again.addEventListener("click", () => {
    const changed = roll();
    update(changed ? "againNew" : "againSame");
  });

  function buildFacts() {
    factsBox.innerHTML = "";
    SCENARIOS[state.sc].facts.forEach((f, i) => {
      const cb = el("input", { type: "checkbox", id: "pgFact" + i });
      cb.checked = state.facts[i];
      cb.addEventListener("change", () => {
        state.facts[i] = cb.checked;
        update(cb.checked ? "factOn" : f.generic ? "factOffGeneric" : "factOffMade");
      });
      factsBox.append(el("label", { class: "check pg-fact", for: "pgFact" + i }, cb, el("span", { text: f.label })));
    });
  }

  /* ---------- Variant choice (temperature) ---------- */
  function roll() {
    const t = TEMPS[state.temp], rnd = n => Math.floor(Math.random() * n);
    const before = JSON.stringify(state.pick);
    let p = { g: 0, c: 0, a: 0 };
    if (t.variants > 1) {
      for (let tries = 0; tries < 12; tries++) {
        p = { g: rnd(t.variants), c: rnd(t.variants), a: t.aside ? rnd(3) : 0 };
        if (JSON.stringify(p) !== before) break;
      }
    }
    state.pick = p;
    return JSON.stringify(p) !== before;
  }

  /* ---------- Assemble prompt and answer ---------- */
  function compose() {
    const sc = SCENARIOS[state.sc], role = ROLES[state.role], t = TEMPS[state.temp], c = state.facts;
    const detailed = LENS[state.len].id === "detailed";
    const [pre, post] = role.greet[state.pick.g].split("{a}");
    const paras = [[pre, sc.addr(c), post]];
    const body = [];
    if (detailed) body.push(sc.openers[role.id], " ");
    sc.body(c).forEach((s, i) => { if (i) body.push(" "); body.push(...s); });
    paras.push(body);
    const tail = [];
    if (detailed) tail.push(sc.extras[0], " ", sc.extras[1]);
    if (t.aside) { if (tail.length) tail.push(" "); tail.push(sc.asides[state.pick.a]); }
    if (tail.length) paras.push(tail);
    paras.push([role.close[state.pick.c]]);
    return paras.map(p => p.filter(s => s !== "").map(s => (typeof s === "string" ? { k: "", t: s } : s)));
  }
  const approxTokens = text => Math.max(1, Math.ceil(text.length / (LANG === "he" ? 3 : 4)));
  const tokLabel = n => tr(`≈ ${n} tokens`, `≈ ${n} טוקנים`);

  function renderPrompt() {
    const sc = SCENARIOS[state.sc], role = ROLES[state.role];
    const given = sc.facts.filter((f, i) => state.facts[i]);
    const blocks = [
      { key: "system", text: role.system, empty: tr("(empty — no role was given)", "(ריק — לא הוגדר תפקיד)") },
      { key: "context", lines: given.map(f => f.line), empty: tr("(empty — the model knows nothing about the situation)", "(ריק — המודל לא יודע דבר על המצב)") },
      { key: "user", text: sc.task }
    ];
    promptBox.innerHTML = "";
    let all = "";
    const seen = {};
    blocks.forEach(b => {
      const txt = b.lines ? b.lines.join("\n") : b.text;
      all += txt + " ";
      seen[b.key] = txt;
      const box = el("div", { class: "pg-block pg-b-" + b.key + (txt ? "" : " pg-empty") + (b.key in lastBlocks && lastBlocks[b.key] !== txt ? " pg-flash" : "") },
        el("span", { class: "pg-block-l", text: b.key }));
      if (!txt) box.append(el("p", { text: b.empty }));
      else if (b.lines) box.append(el("ul", {}, ...b.lines.map(l => el("li", { text: l }))));
      else box.append(el("p", { text: txt }));
      promptBox.append(box);
    });
    lastBlocks = seen;
    promptBox.append(el("div", { class: "pg-settings", dir: "ltr", text: `temperature ${TEMPS[state.temp].value} · max tokens ${LENS[state.len].max}` }));
    promptTok.textContent = tokLabel(approxTokens(all));
  }

  function renderAnswer(paras, animate) {
    if (timer) { clearInterval(timer); timer = null; }
    answer.innerHTML = "";
    const toks = [];
    let text = "";
    paras.forEach(p => {
      const pe = el("p");
      p.forEach(s => {
        text += s.t;
        (s.t.match(/\s+|\S+\s*/g) || []).forEach(w => {
          const sp = el("span", { class: "pg-tok" + (s.k ? " pg-" + s.k : ""), text: w });
          pe.append(sp); toks.push(sp);
        });
      });
      answer.append(pe);
    });
    answerTok.textContent = tokLabel(approxTokens(text));
    if (!animate || reduceMotion) { answer.dataset.typing = "false"; return; }
    // All words are already in the DOM (no layout shift, one screen-reader announcement); reveal them one by one.
    toks.forEach(s => s.classList.add("pg-wait"));
    answer.dataset.typing = "true";
    let i = 0;
    const step = Math.max(14, Math.min(40, Math.round(2200 / toks.length)));
    timer = setInterval(() => {
      do { toks[i].classList.remove("pg-wait"); i++; } while (i < toks.length && !toks[i - 1].textContent.trim());
      if (i >= toks.length) { clearInterval(timer); timer = null; answer.dataset.typing = "false"; }
    }, step);
  }

  function renderHint(paras) {
    const sc = SCENARIOS[state.sc];
    const missing = sc.facts.filter((f, i) => !state.facts[i]);
    const made = paras.reduce((n, p) => n + p.filter(s => s.k === "made").length, 0);
    const score = (state.role ? 1 : 0) + (3 - missing.length);
    hint.innerHTML = "";
    const pips = el("span", { class: "pg-pips", role: "img", "aria-label": tr(`${score} of 4`, `${score} מתוך 4`) });
    for (let i = 0; i < 4; i++) pips.append(el("span", { class: "pg-pip" + (i < score ? " on" : "") }));
    hint.append(el("div", { class: "pg-hint-h" }, el("span", { text: tr("Prompt quality", `איכות ה־${L("prompt")}`) }), pips));
    const list = el("ul", { class: "pg-hint-list" });
    missing.forEach(f => list.append(el("li", { class: f.generic ? "" : "pg-warn", text: f.miss })));
    if (!missing.length) {
      list.append(el("li", { class: "pg-ok", text: state.role
        ? tr("Strong prompt: the model knows who to be, what happened and what to say.", `${L("prompt")} חזק: המודל יודע מי הוא, מה קרה ומה צריך לומר.`)
        : tr("Good context — nothing is left to guess. Now try a role to set the tone.", "context טוב — לא נשאר מה לנחש. עכשיו נסו לבחור תפקיד כדי לקבוע את הטון.") }));
    } else {
      list.append(el("li", { class: "pg-tip", text: tr("Tick the facts above to give the model context.", `סמנו את העובדות למעלה כדי לתת למודל ${L("context")}.`) }));
    }
    hint.append(list);
    hint.dataset.made = String(made);
    hint.dataset.score = String(score);
  }

  function update(why) {
    const paras = compose();
    renderPrompt();
    renderAnswer(paras, why !== "init");
    renderHint(paras);
    note.textContent = NOTES[why] || NOTES.init;
    mount.dataset.reason = why;
  }

  buildFacts();
  update("init");
})();
