/* Language switch: the page's <html lang> decides. tr(english, hebrew). */
const LANG = (document.documentElement.lang || "en").toLowerCase().startsWith("he") ? "he" : "en";
const tr = (en, he) => (LANG === "he" ? he : en);
