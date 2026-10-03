import type { Bi } from "./types";
import { GLOSSARY, HELP_LINKS, SCAMS } from "./glossary";
import { STOCKS } from "./stocks";

/**
 * Help assistant ("Ask"). Answers questions about using the app, trading terms and scams.
 * Hackathon rules: never buy/sell/hold advice, no predictions, no opinions on specific shares.
 */

export interface FaqItem { id: string; q: Bi; a: Bi; keys: RegExp; action?: "check" | "learn" | "profile" | "help" }

export const FAQ: FaqItem[] = [
  { id: "how_check", keys: /\b(how|kaise)\b.*\b(check|use|jaanch\w*|chala\w*)\b|कैसे.*(जाँच|जांच|इस्तेमाल|चला)|\bcheck (a )?(tip|decision|message)\b/i, action: "check",
    q: { en: "How do I check a tip?", hi: "टिप कैसे जाँचें?" },
    a: { en: "Tap \"Check a decision\" on Home. 1) Say where the tip came from and paste the message, link or screenshot. 2) Pick the company, buy or sell, and how many shares. 3) Say why you want to trade. Then tap \"Check now\" — you get green, orange or red with reasons.", hi: "होम पर \"फ़ैसला जाँचें\" दबाएँ। 1) बताएँ टिप कहाँ से आई और मैसेज, लिंक या स्क्रीनशॉट डालें। 2) कंपनी, ख़रीदना या बेचना, और कितने शेयर चुनें। 3) बताएँ ट्रेड क्यों करना है। फिर \"अभी जाँचें\" दबाएँ — वजहों के साथ हरा, नारंगी या लाल नतीजा मिलेगा।" } },
  { id: "colours", keys: /\b(colou?rs?|red|orange|green|lal|hara|narangi|pause)\b|लाल|हरा|नारंगी|रंग|रुकें/i,
    q: { en: "What do the colours mean?", hi: "रंगों का क्या मतलब है?" },
    a: { en: "Red (Pause): several strong warning signs. Orange (Review): something worth checking. Green: no major warning signs in what we checked. Green does NOT mean it is a good investment — the app never predicts what a share will do.", hi: "लाल (रुकें): कई बड़े ख़तरे के संकेत। नारंगी (देख लें): कुछ जाँचने लायक बात। हरा: जो जाँचा उसमें बड़ा ख़तरा नहीं मिला। हरा का मतलब अच्छा निवेश नहीं है — ऐप कभी नहीं बताता कि शेयर क्या करेगा।" } },
  { id: "screenshot", keys: /\b(screenshot|screen ?shot|photo|image|picture)s?\b|स्क्रीनशॉट|फोटो|फ़ोटो/i, action: "check",
    q: { en: "How do I check a screenshot?", hi: "स्क्रीनशॉट कैसे जाँचें?" },
    a: { en: "In \"Check a decision\", tap \"Add screenshot\" and pick the image. The app reads the text (Hindi too) and fills it in. Check the text once, then continue.", hi: "\"फ़ैसला जाँचें\" में \"स्क्रीनशॉट जोड़ें\" दबाएँ और फ़ोटो चुनें। ऐप लिखावट (हिंदी भी) पढ़कर भर देगा। एक बार टेक्स्ट देख लें, फिर आगे बढ़ें।" } },
  { id: "whatsapp_share", keys: /(whatsapp|telegram).*\b(share|send|forward|bhej\w*)\b|\b(share|send|forward|bhej\w*)\b.*(whatsapp|telegram)|(व्हाट्सऐप|व्हाट्सएप|WhatsApp).*(भेज|शेयर)|(भेज|शेयर).*(व्हाट्सऐप|व्हाट्सएप|WhatsApp)/i,
    q: { en: "Can I send a WhatsApp message straight to the app?", hi: "क्या WhatsApp मैसेज सीधे ऐप में भेज सकते हैं?" },
    a: { en: "Yes, on Android: first add the app to your home screen (Chrome ⋮ → Add to Home screen). Then in WhatsApp, long-press the message → Share → choose this app. The message opens in the check form.", hi: "हाँ, Android पर: पहले ऐप को होम स्क्रीन पर जोड़ें (Chrome ⋮ → Add to Home screen)। फिर WhatsApp में मैसेज को देर तक दबाएँ → Share → यह ऐप चुनें। मैसेज जाँच फ़ॉर्म में खुल जाएगा।" } },
  { id: "trades", keys: /\b(past trades?|old trades?|trade history|csv|import|tradebook|purane trade)\b|पुराने ट्रेड|ट्रेडबुक/i, action: "profile",
    q: { en: "How do I add my past trades?", hi: "पुराने ट्रेड कैसे जोड़ें?" },
    a: { en: "Go to Profile → \"Add a past trade\", or \"Import tradebook (CSV)\" from your broker. This lets the app notice habits like loss-chasing. Your trades stay on your phone.", hi: "प्रोफ़ाइल → \"पुराना ट्रेड जोड़ें\", या ब्रोकर की \"ट्रेडबुक (CSV)\" इम्पोर्ट करें। इससे ऐप घाटा-वसूली जैसी आदतें पहचान पाता है। आपके ट्रेड आपके फ़ोन में ही रहते हैं।" } },
  { id: "privacy", keys: /\b(privacy|private|my data|data (safe|secure)|surakshit)\b|डेटा|सुरक्षित|निजी/i,
    q: { en: "Is my data safe?", hi: "क्या मेरा डेटा सुरक्षित है?" },
    a: { en: "The app never asks for your broker login, bank details, OTP or Aadhaar. Your checks and trades are stored only in this phone's browser.", hi: "ऐप कभी आपका ब्रोकर लॉगिन, बैंक जानकारी, OTP या आधार नहीं माँगता। आपकी जाँचें और ट्रेड सिर्फ़ इसी फ़ोन के ब्राउज़र में रहते हैं।" } },
  { id: "login_forgot", keys: /\b(forgot|forget|login id|pin|bhool\w*)\b|भूल|लॉगिन/i,
    q: { en: "I forgot my Login ID or PIN", hi: "मैं लॉगिन ID या PIN भूल गया/गई" },
    a: { en: "Accounts aren't stored on a server, so a forgotten Login ID or PIN can't be recovered. You can create a new account on the login screen.", hi: "अकाउंट सर्वर पर सेव नहीं होते, इसलिए भूली हुई लॉगिन ID या PIN वापस नहीं मिल सकती। लॉगिन स्क्रीन पर नया अकाउंट बना सकते हैं।" } },
  { id: "scammed", keys: /\b(scammed|lost money|fraud hua|thag\w*|cheated|complain\w*)\b|ठगी हुई|पैसा गया|पैसे डूब|धोखा हुआ|शिकायत|धोखे में पैसा/i, action: "help",
    q: { en: "I lost money to a scam. What now?", hi: "धोखे में पैसा गया। अब क्या करें?" },
    a: { en: "Act fast: 1) Call 1930 (cyber-fraud helpline) right away. 2) File a complaint at cybercrime.gov.in. 3) Inform your bank to block further payments. 4) Keep screenshots, UPI IDs and phone numbers as proof. 5) Beware of \"recovery agents\" who promise to get your money back for a fee — that is often a second scam.", hi: "जल्दी करें: 1) तुरंत 1930 (साइबर धोखाधड़ी हेल्पलाइन) पर कॉल करें। 2) cybercrime.gov.in पर शिकायत दर्ज करें। 3) बैंक को बताकर आगे के पेमेंट रुकवाएँ। 4) स्क्रीनशॉट, UPI ID और फ़ोन नंबर सबूत के तौर पर रखें। 5) फ़ीस लेकर पैसा वापस दिलाने वाले \"रिकवरी एजेंट\" से सावधान — यह अक्सर दूसरा धोखा होता है।" } },
  { id: "verify_adviser", keys: /\b(registered|registration|verify|genuine|real|asli|inh|ina|advis[eo]rs?|analysts?)\b|असली|रजिस्टर्ड|एडवाइज़र/i,
    q: { en: "How do I know if an adviser is real?", hi: "कैसे पता करें कि एडवाइज़र असली है?" },
    a: { en: "Ask for their SEBI registration number (INH… for research analysts, INA… for advisers). Search it on SEBI's website and check the name matches the person contacting you. Pay only to an \"@valid\" UPI ID, which you can verify on SEBI Check. The app does these checks when you paste their message.", hi: "उनसे SEBI रजिस्ट्रेशन नंबर माँगें (रिसर्च एनालिस्ट के लिए INH…, एडवाइज़र के लिए INA…)। SEBI की वेबसाइट पर खोजें और देखें कि नाम उसी से मिलता है जो आपसे संपर्क कर रहा है। पैसा सिर्फ़ \"@valid\" UPI ID पर दें, जिसे SEBI Check पर जाँच सकते हैं। मैसेज पेस्ट करने पर ऐप यह जाँच करता है।" } },
];

const ADVICE_REQUEST: RegExp[] = [
  /\bshould\s+i\s+(buy|sell|hold|invest|exit|enter|book)/i,
  /\b(which|what|best|good|top)\s+(stock|share|shares|stocks|ipo|mutual fund|fund|crypto|coin)s?\s+(to|should|for|will|is)/i,
  /\b(best|good|top|safe)\s+(stock|share|stocks|shares|ipo|fund)s?\b/i,
  /\b(will|is)\s+[\w&. ]{2,30}\s+(go up|go down|rise|fall|crash|increase|decrease|double|recover)/i,
  /\b(buy|sell)\s+(or|ya)\s+(sell|hold|buy|not)\b/i,
  /\b(kya|kaunsa|konsa|kon sa|kaun sa)\b.*\b(share|stock|lun|lu|kharid|khareed|bech)/i,
  /\b(kharid|khareed|bech)(u|un|oon|na)?\s*(kya|ya nahi|chahiye)/i,
  /(कौन\s*सा|कौनसा|कोनसा)\s*(शेयर|स्टॉक)/,
  /(ख़रीदूँ|खरीदूँ|खरीदूं|ख़रीदूं|बेचूँ|बेचूं)/,
  /(खरीदना|ख़रीदना|बेचना)\s*चाहिए/,
  /(बढ़ेगा|गिरेगा|चढ़ेगा|ऊपर जाएगा|नीचे जाएगा)/,
  /\b(how much|kitna)\b.*\b(profit|return|munafa)\b.*\b(will|milega|hoga)\b/i,
];

// Only treated as advice requests when a specific share is named ("target for Reliance?").
const STOCK_SPECIFIC: RegExp[] = [
  /\b(target|prediction|predict|forecast|outlook|view|tip|call|levels?|support|resistance|future)\b/i,
  /(टारगेट|भविष्य|अनुमान|लक्ष्य)/,
  /\b(good|bad|safe|risky)\b/i,
];

export function isAdviceRequest(text: string): boolean {
  if (ADVICE_REQUEST.some((re) => re.test(text))) return true;
  return mentionsStock(text) && STOCK_SPECIFIC.some((re) => re.test(text));
}

export const ADVICE_REFUSAL: Bi = {
  en: "I can't tell you to buy, sell or hold any share, or predict prices — nobody can know that, and it would be advice I'm not allowed to give. What I can do: help you check the tip you received (who sent it, what it promises, and your own recent trades), or explain any term. Tap \"Check a decision\" below.",
  hi: "मैं किसी शेयर को ख़रीदने, बेचने या रखने की सलाह नहीं दे सकता, और न दाम की भविष्यवाणी कर सकता हूँ — यह कोई नहीं जान सकता, और यह ऐसी सलाह होगी जो मुझे देने की अनुमति नहीं है। मैं यह कर सकता हूँ: आपको मिली टिप की जाँच में मदद (किसने भेजी, क्या वादा है, और आपके हाल के ट्रेड), या कोई भी शब्द समझाना। नीचे \"फ़ैसला जाँचें\" दबाएँ।",
};

/** Knowledge given to the AI so its answers stay grounded in the app's own content. */
export function knowledgeBase(): string {
  const terms = GLOSSARY.map((g) => `- ${g.word.en} / ${g.word.hi}: ${g.simple.en}${g.example ? " Example: " + g.example.en : ""}`).join("\n");
  const scams = SCAMS.map((s) => `- ${s.title.en}: ${s.how.en} How to spot: ${s.spot.en}`).join("\n");
  const faq = FAQ.map((f) => `- Q: ${f.q.en}\n  A: ${f.a.en}`).join("\n");
  const help = HELP_LINKS.map((h) => `- ${h.label.en}: ${h.href}`).join("\n");
  return `APP HELP (how to use the app):\n${faq}\n\nTERMS:\n${terms}\n\nCOMMON SCAMS:\n${scams}\n\nHELPLINES / OFFICIAL LINKS:\n${help}`;
}

/** Offline answer when AI is not available: best FAQ or glossary match. */
// Order matters: more specific topics are checked first.
const MATCH_ORDER = ["scammed", "verify_adviser", "whatsapp_share", "screenshot", "trades", "login_forgot", "privacy", "how_check", "colours"];

// Common words that must not decide which term a question is about.
const STOP = new Set(["app", "apps", "the", "what", "how", "can", "does", "mean", "meaning", "share", "shares", "stock", "stocks", "money", "price", "account", "trading", "market", "and", "for", "you", "your", "this", "that", "kya", "hai", "hota", "होता", "क्या", "है", "का", "की", "में", "मतलब"]);
const clean = (t: string) => t.toLowerCase().replace(/[?!.,;:"'()]/g, " ").replace(/\s+/g, " ").trim();

export function offlineAnswer(text: string, lang: "en" | "hi"): { answer: string; action?: FaqItem["action"]; term?: string } | null {
  const q = clean(text);
  // 1. Exact suggested question.
  const exact = FAQ.find((f) => clean(f.q.en) === q || clean(f.q.hi) === q);
  if (exact) return { answer: exact.a[lang], action: exact.action };
  // 2. Glossary term named in the question ("what is a stop-loss?").
  const words = new Set(q.split(/[\s/-]+/).filter((w) => w.length > 1 && !STOP.has(w)));
  let best: { score: number; id: string } | null = null;
  for (const g of GLOSSARY) {
    const tokens = [g.id.replace(/_/g, " "), ...clean(g.word.en).split(/[\s/()&-]+/), ...clean(g.word.hi).split(/[\s/()&-]+/)]
      .filter((w) => w.length > 1 && !STOP.has(w));
    let score = 0;
    for (const tk of new Set(tokens)) {
      if (tk.includes(" ") ? q.includes(tk) : words.has(tk)) score += tk.length;
    }
    const full = clean(g.word.en.split(" (")[0]).replace(/-/g, " ");
    if (new RegExp(`(^|\\s)${full.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`).test(q.replace(/-/g, " "))) score += 10; // full term name
    if (score > 0 && (!best || score > best.score)) best = { score, id: g.id };
  }
  const isTermQuestion = /\b(what|meaning|mean|define|explain|matlab|kya hota)\b|क्या होता|क्या है|मतलब|समझाएँ|समझाओ/i.test(text);
  // 3. App-help topics.
  const faq = MATCH_ORDER.map((id) => FAQ.find((f) => f.id === id)!).find((f) => f.keys.test(text));
  if (faq && !(isTermQuestion && best && best.score >= 6)) return { answer: faq.a[lang], action: faq.action };
  if (best && best.score >= 3) {
    const g = GLOSSARY.find((x) => x.id === best!.id)!;
    return { answer: `${g.word[lang]}: ${g.simple[lang]}${g.example ? (lang === "hi" ? " उदाहरण: " : " Example: ") + g.example[lang] : ""}`, term: g.id };
  }
  if (faq) return { answer: faq.a[lang], action: faq.action };
  return null;
}

export const mentionsStock = (text: string) => {
  const low = text.toLowerCase();
  return STOCKS.some((s) => low.includes(s.symbol.toLowerCase()) || s.aliases.some((a) => a.length >= 3 && low.includes(a)));
};

/** "Is Parag Thakur SEBI registered?" → "Parag Thakur" (null if the question isn't about a named person). */
export function extractAdviserName(text: string): string | null {
  const t = text.replace(/[?!.।"“”']/g, " ").replace(/\s+/g, " ").trim();
  if (!/sebi|सेबी|registered|registration|रजिस्टर्ड|पंजीकृत/i.test(t)) return null;
  const patterns = [
    /(?:check|verify|find out)\s+(?:if|whether)\s+(.{2,60}?)\s+is\s+(?:a\s+)?(?:sebi[\s-]*)?(?:registered|regd)/i,
    /(?:is|are|kya)\s+(.{2,60}?)\s+(?:a\s+)?(?:sebi[\s-]*)?(?:registered|regd|registration|reg\b)/i,
    /(?:check|verify|search)\s+(.{2,60}?)\s+(?:on|in|with)\s+sebi/i,
    /^(.{2,60}?)\s+(?:sebi[\s-]*)?(?:registered|regd)\s+(?:hai|he|h|hain|or not|ya nahi|kya)/i,
    /^(.{2,60}?)\s+(?:sebi|सेबी)\s*(?:में|me|mein)?\s*(?:registered|रजिस्टर्ड|पंजीकृत)/i,
    /(?:क्या)\s+(.{2,60}?)\s+(?:सेबी|SEBI)/i,
  ];
  for (const re of patterns) {
    const m = t.match(re);
    if (!m) continue;
    const name = m[1]
      .replace(/\b(is|are|the|a|an|mr|mrs|ms|shri|sir|this|that|kya|ki|ka|ke|sebi|channel|youtuber|finfluencer|adviser|advisor|analyst|person|guy|he|she|they|it|my|our)\b/gi, " ")
      .replace(/(क्या|यह|ये|सेबी|में|का|की|के)/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const words = name.split(" ").filter(Boolean);
    if (words.length >= 1 && words.length <= 5 && name.length >= 3) return name;
  }
  return null;
}
