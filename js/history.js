(function () {
  const ERAS = [
    {
      id: "found", label: "1943–2011: Foundations",
      intro: "Neurons on paper, a machine that learns, two winters, and the rule that still trains every model today.",
      items: [
        { y: "1943", t: "The artificial neuron", b: "Warren McCulloch and Walter Pitts describe a simplified neuron as a logic unit: it sums its inputs and fires above a threshold.", w: "The first mathematical model of a neural network — the conceptual ancestor of every parameter in an LLM." },
        { y: "1950", t: "Turing asks whether machines can think", b: "Alan Turing's paper “Computing Machinery and Intelligence” proposes the imitation game: judge a machine by whether its conversation is distinguishable from a person's.", w: "It framed conversation as the test of intelligence, seventy years before chat assistants." },
        { y: "1956", t: "“Artificial intelligence” gets its name", b: "The Dartmouth summer workshop, organised by John McCarthy, Marvin Minsky, Claude Shannon and Nathaniel Rochester, launches AI as a field.", w: "Early AI bet on hand-written rules and symbols — the opposite of learning from data." },
        { y: "1958", t: "The perceptron learns", b: "Frank Rosenblatt builds the perceptron, a single layer of adjustable weights that learns to classify inputs from examples.", w: "The first machine that improved by adjusting weights from data — the core idea of training." },
        { y: "1966", t: "ELIZA, the first chatbot", b: "Joseph Weizenbaum's ELIZA imitates a therapist with simple pattern-matching rules. Users confide in it anyway.", w: "An early warning that fluent text makes people attribute understanding — still true today." },
        { y: "1969", t: "Perceptrons hits a wall", b: "Minsky and Papert's book proves single-layer perceptrons cannot learn even simple functions like XOR. Funding and interest collapse into the first “AI winter”.", w: "Multi-layer networks could solve it, but nobody yet knew how to train them." },
        { y: "1986", t: "Backpropagation", b: "Rumelhart, Hinton and Williams popularise backpropagation: the chain rule, applied backward through a network, tells every weight how to change to reduce the error.", w: "This is how every LLM is still trained. It made deep, multi-layer networks learnable.", key: true },
        { y: "1990", t: "Networks with memory", b: "Jeffrey Elman's simple recurrent network feeds its own hidden state back in at each step, letting it process sequences like sentences one word at a time.", w: "Recurrent networks would dominate language modelling for the next 27 years." },
        { y: "1997", t: "LSTM", b: "Sepp Hochreiter and Jürgen Schmidhuber add gates to recurrent networks so they can keep information over longer spans without the gradient vanishing.", w: "LSTMs powered speech recognition and translation through the 2010s — the architecture the transformer replaced." },
        { y: "2003", t: "A neural language model", b: "Yoshua Bengio and colleagues train a neural network to predict the next word, learning a vector for every word along the way.", w: "Next-word prediction plus learned word vectors — the exact recipe of modern LLMs, at toy scale." }
      ]
    },
    {
      id: "lang", label: "2012–2016: Learning language",
      intro: "GPUs make deep learning practical, words become geometry, and translation exposes the bottleneck that attention removes.",
      items: [
        { y: "2012", t: "AlexNet and the GPU", b: "Krizhevsky, Sutskever and Hinton win the ImageNet competition by a huge margin with a deep network trained on two gaming GPUs.", w: "Proved that big networks plus big data plus GPUs beat hand-engineered features. The deep learning boom begins." },
        { y: "2013", t: "word2vec", b: "Tomas Mikolov's team at Google trains word vectors cheaply on billions of words. Vector arithmetic captures meaning: king − man + woman lands near queen.", w: "Made embeddings mainstream. Every LLM starts by turning tokens into vectors like these." },
        { y: "2014", t: "Sequence to sequence", b: "Sutskever, Vinyals and Le translate with two LSTMs: an encoder reads the sentence into a single vector, a decoder writes the translation from it.", w: "End-to-end neural translation worked — but cramming a whole sentence into one fixed vector broke down on long inputs." },
        { y: "2014", t: "Attention is born", b: "Bahdanau, Cho and Bengio let the decoder look back at every encoder state and take a weighted average, choosing which source words to focus on for each output word.", w: "Removed the single-vector bottleneck. The transformer would later keep this idea and discard everything else.", key: true },
        { y: "2015", t: "Residual connections and subword tokens", b: "He et al.'s ResNet trains networks over 100 layers deep by adding each layer's output to its input. The same year, Sennrich et al. adapt byte-pair encoding to split rare words into pieces.", w: "Two quiet ingredients every transformer depends on: the residual stream and BPE tokenization." },
        { y: "2016", t: "Neural translation in production", b: "Google Translate switches to a neural system built from deep LSTMs with attention. LayerNorm is introduced the same year.", w: "Attention-based models were now serving millions — yet recurrence made them slow to train, one step at a time." }
      ]
    },
    {
      id: "scale", label: "2017–today: Attention scales",
      intro: "One architecture, trained on ever more data and compute, goes from translating sentences to writing code and running agents.",
      items: [
        { y: "2017", t: "Attention Is All You Need", b: "Eight Google researchers — Vaswani, Shazeer, Parmar, Uszkoreit, Jones, Gomez, Kaiser and Polosukhin — drop recurrence completely. Self-attention plus feed-forward layers, stacked, trained in parallel on GPUs, beats the best translation systems at a fraction of the training cost.", w: "Parallel training is what made scale possible. Every major LLM since is a transformer.", key: true },
        { y: "2018", t: "GPT and BERT", b: "OpenAI's GPT pretrains a decoder-only transformer on books, then fine-tunes it. Google's BERT pretrains an encoder by filling in masked words and sweeps language-understanding benchmarks.", w: "Established the recipe: pretrain once on unlabelled text, adapt to anything." },
        { y: "2019", t: "GPT-2", b: "A 1.5-billion-parameter model writes coherent paragraphs. OpenAI releases it in stages, citing misuse concerns.", w: "The first time generated text was good enough to worry people." },
        { y: "2020", t: "Scaling laws and GPT-3", b: "Kaplan et al. show loss falls as a smooth power law in parameters, data and compute. GPT-3, at 175 billion parameters, performs new tasks from a few examples in the prompt, with no retraining.", w: "In-context learning appeared from scale alone, and scaling became a predictable engineering strategy.", key: true },
        { y: "2021", t: "Code and rotary positions", b: "GitHub Copilot launches in preview, powered by OpenAI's Codex. RoPE is proposed and later becomes the standard way to encode position.", w: "LLMs became daily working tools for developers." },
        { y: "2022", t: "Alignment, Chinchilla and ChatGPT", b: "Chain-of-thought prompting shows step-by-step reasoning helps. InstructGPT uses RLHF to make models follow instructions. Chinchilla shows models need far more data per parameter. On 30 November, ChatGPT launches.", w: "Post-training turned a text predictor into an assistant, and ChatGPT put it in front of the world.", key: true },
        { y: "2023", t: "GPT-4, Claude, open weights", b: "GPT-4 and Anthropic's first Claude models arrive in March. Meta's LLaMA kick-starts open-weight models; Mixtral popularises mixture-of-experts in the open; DPO simplifies preference tuning.", w: "A competitive field formed, with strong open models alongside closed frontier ones." },
        { y: "2024", t: "Long context, multimodality, reasoning", b: "Context windows reach a million tokens. Models see images and hear audio natively. In September, OpenAI's o1 is trained to reason at length before answering. In November, Anthropic open-sources the Model Context Protocol for connecting models to tools.", w: "Test-time compute became a second axis of scaling, and tools a standard interface." },
        { y: "2025", t: "Open reasoning and agents", b: "DeepSeek-R1 shows reinforcement learning on verifiable problems can produce strong reasoning in an open-weight model. Coding agents that edit whole repositories go mainstream. Kimi K2 releases a trillion-parameter mixture-of-experts model as open weights.", w: "The focus shifted from answering questions to completing long, multi-step tasks." },
        { y: "2026", t: "Where things stand", b: "Extended thinking is on by default in frontier models, million-token contexts are common, mixture-of-experts models activate only a small fraction of their weights per token, and hybrid designs mix linear and full attention. Underneath, it is still the 2017 block: attention, MLP, residual stream.", w: "The architecture barely changed; data, scale, post-training and the systems around the model did." }
      ]
    }
  ];


  const ERAS_HE = [
    {
      id: "found", label: "1943–2011: היסודות",
      intro: "נוירונים על הנייר, מכונה שלומדת, שני חורפים, והכלל שעדיין מאמן כל מודל היום.",
      items: [
        { y: "1943", t: "הנוירון המלאכותי", b: "וורן מקקאלוק ו־וולטר פיטס מתארים נוירון מפושט כיחידה לוגית: הוא סוכם את הקלטים שלו ו״יורה״ מעל סף מסוים.", w: "המודל המתמטי הראשון של רשת נוירונים — האב הרעיוני של כל פרמטר ב־LLM." },
        { y: "1950", t: "טיורינג שואל אם מכונות יכולות לחשוב", b: "במאמר “Computing Machinery and Intelligence” אלן טיורינג מציע את משחק החיקוי: לשפוט מכונה לפי השאלה אם אפשר להבחין בין השיחה שלה לשיחה עם אדם.", w: "הוא הגדיר שיחה כמבחן לאינטליגנציה, שבעים שנה לפני עוזרי הצ׳אט." },
        { y: "1956", t: "״בינה מלאכותית״ מקבלת שם", b: "סדנת הקיץ בדארטמות׳, שאורגנה בידי ג׳ון מקארתי, מרווין מינסקי, קלוד שאנון ונתניאל רוצ׳סטר, משיקה את הבינה המלאכותית כתחום.", w: "הבינה המלאכותית המוקדמת הימרה על חוקים וסמלים שנכתבים ביד — ההפך מלמידה מנתונים." },
        { y: "1958", t: "הפרספטרון לומד", b: "פרנק רוזנבלט בונה את הפרספטרון: שכבה אחת של משקלות מתכווננים שלומדת לסווג קלטים מתוך דוגמאות.", w: "המכונה הראשונה שהשתפרה על ידי כיוונון משקלות מנתונים — הרעיון שבלב האימון." },
        { y: "1966", t: "ELIZA, הצ׳אטבוט הראשון", b: "ELIZA של ג׳וזף וייצנבאום מחקה מטפלת בעזרת חוקי התאמת תבניות פשוטים. המשתמשים נפתחים אליה בכל זאת.", w: "אזהרה מוקדמת: טקסט רהוט גורם לאנשים לייחס לו הבנה — וזה נכון גם היום." },
        { y: "1969", t: "הפרספטרון נתקע", b: "הספר “Perceptrons” של מינסקי ופאפרט מוכיח שפרספטרון של שכבה אחת לא יכול ללמוד אפילו פונקציה פשוטה כמו XOR. המימון והעניין קורסים לתוך ״חורף הבינה המלאכותית״ הראשון.", w: "רשתות עם כמה שכבות יכלו לפתור את זה, אבל איש עוד לא ידע איך לאמן אותן." },
        { y: "1986", t: "Backpropagation", b: "רומלהרט, הינטון וויליאמס מפיצים את ה־backpropagation: כלל השרשרת, מופעל אחורה דרך הרשת, אומר לכל משקל איך להשתנות כדי להקטין את השגיאה.", w: "כך מאמנים עד היום כל LLM. זה הפך רשתות עמוקות, מרובות שכבות, לניתנות לאימון.", key: true },
        { y: "1990", t: "רשתות עם זיכרון", b: "הרשת הרקורסיבית הפשוטה של ג׳פרי אלמן מזינה את המצב הפנימי שלה בחזרה לעצמה בכל צעד, וכך יכולה לעבד רצפים כמו משפטים, מילה אחרי מילה.", w: "רשתות רקורסיביות שלטו במידול שפה ב־27 השנים הבאות." },
        { y: "1997", t: "LSTM", b: "ספ הוכרייטר ויורגן שמידהובר מוסיפים ״שערים״ לרשתות רקורסיביות, כדי שיוכלו לשמור מידע לאורך טווחים ארוכים בלי שה־gradient ייעלם.", w: "LSTM הניעו זיהוי דיבור ותרגום לאורך שנות ה־2010 — הארכיטקטורה שה־transformer החליף." },
        { y: "2003", t: "מודל שפה נוירוני", b: "יושוע בנג׳יו ועמיתיו מאמנים רשת נוירונים לחזות את המילה הבאה, ותוך כדי לומדים וקטור לכל מילה.", w: "חיזוי המילה הבאה יחד עם וקטורי מילים נלמדים — בדיוק המתכון של LLMs מודרניים, בקנה מידה של צעצוע." }
      ]
    },
    {
      id: "lang", label: "2012–2016: ללמוד שפה",
      intro: "כרטיסי מסך הופכים למידה עמוקה למעשית, מילים הופכות לגיאומטריה, ותרגום חושף את צוואר הבקבוק ש־attention מסיר.",
      items: [
        { y: "2012", t: "AlexNet וכרטיס המסך", b: "קריז׳בסקי, סוצקבר והינטון זוכים בתחרות ImageNet בפער עצום, עם רשת עמוקה שאומנה על שני כרטיסי מסך של גיימינג.", w: "הוכיח שרשתות גדולות, הרבה נתונים וכרטיסי מסך מנצחים פיצ׳רים שתוכננו ביד. בום הלמידה העמוקה מתחיל." },
        { y: "2013", t: "word2vec", b: "הצוות של תומאש מיקולוב בגוגל מאמן וקטורי מילים בזול על מיליארדי מילים. אריתמטיקה של וקטורים לוכדת משמעות: king − man + woman נוחת ליד queen.", w: "הפך embeddings למיינסטרים. כל LLM מתחיל בהפיכת טוקנים לווקטורים כאלה." },
        { y: "2014", t: "Sequence to sequence", b: "סוצקבר, ויניאלס ולה מתרגמים בעזרת שתי רשתות LSTM: encoder קורא את המשפט לתוך וקטור יחיד, ו־decoder כותב ממנו את התרגום.", w: "תרגום נוירוני מקצה לקצה עבד — אבל דחיסה של משפט שלם לווקטור אחד בגודל קבוע קרסה על קלטים ארוכים." },
        { y: "2014", t: "Attention נולד", b: "בהדנאו, צ׳ו ובנג׳יו מאפשרים ל־decoder להסתכל אחורה על כל המצבים של ה־encoder ולקחת ממוצע משוקלל — לבחור באילו מילים במקור להתמקד לכל מילה בתרגום.", w: "הסיר את צוואר הבקבוק של הווקטור היחיד. ה־transformer שמר אחר כך את הרעיון הזה וזרק את כל השאר.", key: true },
        { y: "2015", t: "Residual connections ו־subword tokens", b: "ResNet של הא ועמיתיו מאמן רשתות בעומק של יותר מ־100 שכבות על ידי הוספת הפלט של כל שכבה לקלט שלה. באותה שנה, סנריך ועמיתיו מתאימים את byte-pair encoding לפיצול מילים נדירות לחלקים.", w: "שני מרכיבים שקטים שכל transformer תלוי בהם: ה־residual stream וה־tokenization של BPE." },
        { y: "2016", t: "תרגום נוירוני בפרודקשן", b: "Google Translate עובר למערכת נוירונית שבנויה מ־LSTM עמוקים עם attention. באותה שנה מוצג LayerNorm.", w: "מודלים מבוססי attention שירתו כבר מיליונים — אבל הרקורסיה גרמה לאימון להיות איטי, צעד אחרי צעד." }
      ]
    },
    {
      id: "scale", label: "2017–היום: attention בקנה מידה",
      intro: "ארכיטקטורה אחת, שמאומנת על עוד ועוד נתונים וכוח חישוב, עוברת מתרגום משפטים לכתיבת קוד ולהרצת agents.",
      items: [
        { y: "2017", t: "Attention Is All You Need", b: "שמונה חוקרים בגוגל — וסוואני, שאזיר, פרמר, אושקורייט, ג׳ונס, גומז, קייזר ופולוסוחין — מוותרים לגמרי על רקורסיה. Self-attention ושכבות feed-forward, ערומות זו על זו ומאומנות במקביל על כרטיסי מסך, מנצחות את מערכות התרגום הטובות ביותר בחלק קטן מעלות האימון.", w: "אימון מקבילי הוא מה שאפשר את קנה המידה. כל LLM מרכזי מאז הוא transformer.", key: true },
        { y: "2018", t: "GPT ו־BERT", b: "ה־GPT של OpenAI מאמן מראש transformer מסוג decoder-only על ספרים, ואז מבצע fine-tune. ה־BERT של גוגל מאמן מראש encoder על ידי השלמת מילים מוסתרות, ושובר את כל הבנצ׳מרקים של הבנת שפה.", w: "קבע את המתכון: לאמן פעם אחת מראש על טקסט לא מתויג, ולהתאים לכל משימה." },
        { y: "2019", t: "GPT-2", b: "מודל של 1.5 מיליארד פרמטרים כותב פסקאות קוהרנטיות. OpenAI משחררת אותו בשלבים, בנימוק של חשש לשימוש לרעה.", w: "הפעם הראשונה שטקסט שנוצר היה טוב מספיק כדי להדאיג אנשים." },
        { y: "2020", t: "Scaling laws ו־GPT-3", b: "קפלן ועמיתיו מראים שה־loss יורד כחוק חזקה חלק כפונקציה של פרמטרים, נתונים וכוח חישוב. GPT-3, עם 175 מיליארד פרמטרים, מבצע משימות חדשות מכמה דוגמאות ב־prompt, בלי אימון מחדש.", w: "In-context learning הופיע מקנה המידה בלבד, וגדילה הפכה לאסטרטגיה הנדסית צפויה.", key: true },
        { y: "2021", t: "קוד ומיקומים מסתובבים", b: "GitHub Copilot יוצא בגרסת preview, מבוסס על Codex של OpenAI. מוצע RoPE, שהופך בהמשך לדרך הסטנדרטית לקודד מיקום.", w: "LLMs הפכו לכלי עבודה יומיומי של מפתחים." },
        { y: "2022", t: "Alignment, ‏Chinchilla ו־ChatGPT", b: "Chain-of-thought prompting מראה שחשיבה צעד־אחר־צעד עוזרת. InstructGPT משתמש ב־RLHF כדי לגרום למודלים לציית להוראות. Chinchilla מראה שמודלים צריכים הרבה יותר נתונים לכל פרמטר. ב־30 בנובמבר יוצא ChatGPT.", w: "ה־post-training הפך מנבא טקסט לעוזר, ו־ChatGPT הציב אותו מול העולם.", key: true },
        { y: "2023", t: "GPT-4, ‏Claude ומשקלות פתוחים", b: "GPT-4 ומודלי ה־Claude הראשונים של Anthropic יוצאים במרץ. LLaMA של Meta מניע את גל המודלים עם משקלות פתוחים; Mixtral מפיץ mixture-of-experts בקוד פתוח; DPO מפשט את ה־preference tuning.", w: "נוצר שדה תחרותי, עם מודלים פתוחים חזקים לצד מודלי חזית סגורים." },
        { y: "2024", t: "Context ארוך, מולטימודליות, reasoning", b: "חלונות context מגיעים למיליון טוקנים. מודלים רואים תמונות ושומעים אודיו באופן מובנה. בספטמבר, o1 של OpenAI מאומן לחשוב באריכות לפני שהוא עונה. בנובמבר, Anthropic משחררת כקוד פתוח את Model Context Protocol לחיבור מודלים לכלים.", w: "Test-time compute הפך לציר גדילה שני, וכלים — לממשק סטנדרטי." },
        { y: "2025", t: "Reasoning פתוח ו־agents", b: "DeepSeek-R1 מראה ש־reinforcement learning על בעיות ניתנות לבדיקה יכול לייצר reasoning חזק במודל עם משקלות פתוחים. Coding agents שעורכים ריפוזיטורי שלם נכנסים למיינסטרים. Kimi K2 משחרר מודל mixture-of-experts של טריליון פרמטרים עם משקלות פתוחים.", w: "הפוקוס עבר ממענה על שאלות להשלמת משימות ארוכות ורב־שלביות." },
        { y: "2026", t: "איפה אנחנו עומדים", b: "Extended thinking מופעל כברירת מחדל במודלי החזית, חלונות context של מיליון טוקנים נפוצים, מודלי mixture-of-experts מפעילים רק חלק קטן מהמשקלות שלהם לכל טוקן, ותכנונים היברידיים משלבים linear attention עם attention מלא. מתחת לכל זה, זה עדיין ה־block של 2017: attention, ‏MLP, ‏residual stream.", w: "הארכיטקטורה כמעט לא השתנתה; הנתונים, קנה המידה, ה־post-training והמערכות שמסביב למודל — כן." }
      ]
    }
  ];
  const SOURCE = LANG === "he" ? ERAS_HE : ERAS;
  const tabs = $("#eraTabs"), list = $("#timeline");
  const intro = el("p", { class: "era-intro" });
  list.before(intro);
  function show(id) {
    const era = SOURCE.find(e => e.id === id);
    list.innerHTML = "";
    intro.textContent = era.intro;
    era.items.forEach(it => {
      list.append(el("li", { class: it.key ? "key" : "" },
        el("div", { class: "tl-year", text: it.y }),
        el("div", { class: "tl-title", text: it.t }),
        el("p", { class: "tl-body", text: it.b }),
        el("p", { class: "tl-why" }, el("b", { text: tr("Why it mattered: ", "למה זה חשוב: ") }), it.w)));
    });
  }
  SOURCE.forEach((e, i) => {
    const b = el("button", { type: "button", role: "tab", "aria-selected": String(i === 0), text: e.label });
    b.addEventListener("click", () => {
      $$("button", tabs).forEach(x => x.setAttribute("aria-selected", "false"));
      b.setAttribute("aria-selected", "true");
      show(e.id);
    });
    tabs.append(b);
  });
  show("found");
})();
