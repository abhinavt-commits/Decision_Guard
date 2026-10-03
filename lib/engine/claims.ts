import type { Bi, Level, Signal } from "../types";

/**
 * Rule-based reading of the recommendation text (English, Hindi and Hinglish).
 * Every rule is explainable: we show the exact words that matched.
 */

interface Rule {
  id: string;
  level: Level;
  patterns: RegExp[];
  /** If any of these appear near the match, the rule is ignored (e.g. "returns are NOT guaranteed"). */
  negations?: RegExp[];
  title: Bi;
  why: Bi;
  action?: Bi;
  term?: string;
}

const NEG_GUARANTEE = [
  /not\s+(be\s+)?guarantee/i,
  /no\s+guarantee/i,
  /(isn'?t|aren'?t|is not|are not|cannot be|can'?t be)\s+(\w+\s+){0,2}guarantee/i,
  /गारंटी\s*नहीं/,
  /गारंटी\s*नही/,
  /guarantee\s*nahi/i,
  /subject to market risk/i,
  /बाज़ार\s*जोखिम/,
];

// Text that warns ABOUT such promises (e.g. a SEBI caution notice). Checked only BEFORE the match,
// so "No scam! Guaranteed profit" style tricks are not excused.
const CAUTION_BEFORE = /\b(cautions?|beware|warns?|warning|avoid|against\s+(unregistered|entities|people|anyone|those|schemes?|fraud))\b|सावधान|बचें/i;

export const RULES: Rule[] = [
  {
    id: "guaranteed_return",
    level: "red",
    patterns: [
      /guarant(ee|eed|ied)\s*(\d+\s*%|profit|return|income|returns|gains?|money)/i,
      /(\d+\s*%)\s*guarant/i,
      /\bguaranteed\b/i,
      /\b100\s*%\s*(sure|safe|accurate|accuracy|profit|guarantee)/i,
      /\bsure\s*-?\s*shot\b/i,
      /\brisk\s*-?\s*free\b/i,
      /\bno\s*(risk|loss)\b/i,
      /\bzero\s*risk\b/i,
      /pakka\s*(profit|munafa|return)/i,
      /\bfixed\s*(daily|weekly|monthly)?\s*(return|profit|income)/i,
      /\bassured\s+(\d+\s*%|returns?|profits?|income|gains?)/i,
      /\b\d{2,3}\s*%\s*accura(cy|te)\b/i,
      /\b(earn|kamao|kamaye|income\s+of)\s+(₹|rs\.?|inr)\s*[\d,]+\s*(daily|per\s+day|every\s+day|a\s+day|weekly|per\s+week|monthly|per\s+month|\/\s*day)/i,
      /(रोज़|रोज|हर\s*दिन)\s*(₹|रु\.?)\s*[\d,]+\s*(कमाएँ|कमाएं|कमाओ|कमाई)/,
      /गारंटी/,
      /पक्का\s*(मुनाफ़ा|मुनाफा|फ़ायदा|फायदा|रिटर्न)/,
      /(बिना|कोई)\s*(जोखिम|रिस्क|नुकसान)/,
      /नुकसान\s*(का\s*)?(कोई\s*)?(डर|सवाल)\s*नहीं/,
      /100\s*%\s*(पक्का|सही|मुनाफ़ा|मुनाफा)/,
    ],
    negations: NEG_GUARANTEE,
    title: { en: "Promises a guaranteed or risk-free profit", hi: "पक्के या बिना जोखिम वाले मुनाफ़े का वादा" },
    why: {
      en: "No one can guarantee a profit from shares. Share prices go up and down. A promise of sure profit is one of the most common signs of investment fraud.",
      hi: "शेयर से मुनाफ़े की गारंटी कोई नहीं दे सकता। शेयर के दाम ऊपर-नीचे होते रहते हैं। पक्के मुनाफ़े का वादा निवेश धोखाधड़ी का सबसे आम संकेत है।",
    },
    action: {
      en: "Treat any \"guaranteed\" share tip as a warning, no matter who says it.",
      hi: "\"गारंटी\" वाली किसी भी शेयर टिप को चेतावनी मानें, चाहे कोई भी कहे।",
    },
    term: "guaranteed_return",
  },
  {
    id: "specific_return",
    level: "orange",
    patterns: [
      /\b\d{2,4}\s*%\s*(return|profit|gain|upside|returns|rise|jump|up)\b/i,
      /\b(double|triple|2x|3x|5x|10x)\b\s*(your\s*)?(money|paisa|capital|investment|in)?/i,
      /\bmulti\s*-?\s*bagger\b/i,
      /paisa\s*(double|dugna|dogna)/i,
      /(पैसा|पैसे|रकम)\s*(डबल|दोगुना|दुगना|तिगुना)/,
      /\d{2,4}\s*%\s*(रिटर्न|मुनाफ़ा|मुनाफा|फ़ायदा|फायदा|बढ़)/,
      /मल्टीबैगर/,
      /\b(rise|jump|gain|grow|go up|upside)\s+(of\s+|by\s+)?\d{2,4}\s*%/i,
    ],
    // Past facts in news ("profit rose 12% year on year") are not promises.
    negations: [
      /\b(reported|posted|recorded|rose|grew|fell|declined|dropped|year[- ]on[- ]year|yoy|q[1-4]|quarterly|last year|in fy\d*)\b/i,
      /(बढ़ा|घटा|बढ़ी|घटी)\s*(है|था|थी)?/,
    ],
    title: { en: "Promises a specific big return", hi: "किसी बड़े, तय रिटर्न का वादा" },
    why: {
      en: "A fixed number like \"40% return\" sounds exact, but nobody knows future prices. Ask: what evidence is this number based on?",
      hi: "\"40% रिटर्न\" जैसा तय आंकड़ा पक्का लगता है, पर भविष्य के दाम किसी को नहीं पता। पूछें: यह आंकड़ा किस सबूत पर आधारित है?",
    },
    term: "return",
  },
  {
    id: "price_target",
    level: "orange",
    patterns: [
      /\b(target|tgt|tp)\s*[:=\-]?\s*(rs\.?|₹|inr)?\s*\d{2,6}/i,
      /\bwill\s+(go|reach|touch|hit|cross|fly|zoom|rise|jump)\b/i,
      /\b(to the moon|rocket|upper\s*circuit)\b/i,
      /🚀|📈🔥|💰💰/,
      /टारगेट\s*[:=\-]?\s*(₹|रु\.?)?\s*\d+/,
      /(जाएगा|जायेगा|पहुँचेगा|पहुंचेगा|उड़ेगा)/,
      /(jayega|jaega|udega|bhagega)\b/i,
      /अपर\s*सर्किट/,
    ],
    title: { en: "Predicts where the price will go", hi: "दाम कहाँ तक जाएगा, इसकी भविष्यवाणी" },
    why: {
      en: "Price predictions are guesses. People who are allowed to give stock recommendations (SEBI-registered Research Analysts) must also explain the risks and their basis.",
      hi: "दाम की भविष्यवाणी अंदाज़ा होती है। जिन्हें शेयर सलाह देने की अनुमति है (SEBI-रजिस्टर्ड रिसर्च एनालिस्ट), उन्हें जोखिम और आधार भी बताना होता है।",
    },
    term: "target_price",
  },
  {
    id: "urgency",
    level: "orange",
    patterns: [
      /\b(buy|invest|join|act|enter)\s+(now|immediately|today|fast|quickly|asap)\b/i,
      /\blast\s+(chance|day|few\s+hours|opportunity)\b/i,
      /\bonly\s+(today|\d+\s+(seats|slots|spots|hours))\b/i,
      /\b(hurry|limited\s+(time|seats|offer)|don'?t\s+miss|before\s+it'?s\s+too\s+late|offer\s+ends)\b/i,
      /\b(abhi|turant|jaldi|aaj\s+hi)\s+(kharido|khareedo|kharid|buy|le\s*lo|lelo|join|invest|daalo|dalo)/i,
      /(अभी|तुरंत|जल्दी|आज\s*ही)\s*(ख़रीद|खरीद|जुड़|जुड|निवेश|लगा|ले\s*लो|डालो|ज्वाइन)/,
      /(आख़िरी|आखिरी|अंतिम)\s*(मौका|मौक़ा|दिन)/,
      /मौका\s*(ना|न)\s*(छोड़ें|गंवाएँ|गवाएं)/,
    ],
    title: { en: "Pushes you to act quickly", hi: "जल्दी फ़ैसला लेने का दबाव" },
    why: {
      en: "Pressure to act fast leaves no time to check. Real opportunities rarely disappear in a few hours; scams depend on you not stopping to think.",
      hi: "जल्दबाज़ी का दबाव जाँचने का समय नहीं देता। असली मौके कुछ घंटों में ख़त्म नहीं होते; धोखेबाज़ यही चाहते हैं कि आप रुककर न सोचें।",
    },
    action: { en: "Wait at least one day before acting on any message that rushes you.", hi: "जल्दबाज़ी कराने वाले किसी भी मैसेज पर कम से कम एक दिन रुककर फ़ैसला लें।" },
    term: "fomo",
  },
  {
    id: "insider_secret",
    level: "red",
    patterns: [
      /\binsider\b/i,
      /\boperator\b/i,
      /\b(inside|secret|confidential|sure)\s+(news|info|information|tip|call)\b/i,
      /\bjackpot\b/i,
      /\bdabba\b/i,
      /andar\s*ki\s*(khabar|baat)/i,
      /(अंदर|अन्दर)\s*की\s*(ख़बर|खबर|बात)/,
      /ऑपरेटर/,
      /जैकपॉट/,
    ],
    title: { en: "Claims secret or \"insider\" information", hi: "\"अंदर की ख़बर\" या गुप्त जानकारी का दावा" },
    why: {
      en: "Trading on real insider information is illegal. Most \"insider tips\" are invented to make people buy, so someone else can sell.",
      hi: "असली अंदरूनी जानकारी पर ट्रेड करना ग़ैरक़ानूनी है। ज़्यादातर \"अंदर की ख़बर\" लोगों से ख़रीदवाने के लिए गढ़ी जाती है, ताकि कोई और बेच सके।",
    },
    term: "pump_and_dump",
  },
  {
    id: "payment_request",
    level: "red",
    patterns: [
      /\b(pay|send|transfer|deposit)\s+(₹|rs\.?|inr)?\s*\d+/i,
      /\b(joining|registration|membership|subscription)\s+(fee|fees|charge|charges)\b/i,
      /\b(vip|premium|paid)\s+(group|channel|membership|plan|tips|calls)\b/i,
      /\bprofit\s+shar(e|ing)\b/i,
      /(₹|rs\.?|inr)\s*[\d,]+\s*\/\s*(month|mo|year|yr)\b/i,
      /\b(deposit|registration\s+fee|refundable)\b/i,
      /\b(gpay|phonepe|paytm|upi)\b/i,
      /(पेमेंट|भुगतान|फ़ीस|फीस)\s*(करें|भेजें|दें)?/,
      /(वीआईपी|प्रीमियम)\s*(ग्रुप|चैनल)/,
      /मुनाफ़े\s*में\s*हिस्सा|मुनाफे\s*में\s*हिस्सा/,
    ],
    title: { en: "Asks you to pay money or join a paid group", hi: "पैसे भेजने या पेड ग्रुप से जुड़ने को कहा गया" },
    why: {
      en: "Many tip-selling groups charge fees and then disappear. Only SEBI-registered advisers / research analysts are allowed to charge for stock advice.",
      hi: "कई टिप बेचने वाले ग्रुप फ़ीस लेकर ग़ायब हो जाते हैं। शेयर सलाह के लिए पैसे सिर्फ़ SEBI-रजिस्टर्ड एडवाइज़र / रिसर्च एनालिस्ट ही ले सकते हैं।",
    },
    term: "registered_ra",
  },
  {
    id: "credentials",
    level: "red",
    patterns: [
      /\b(share|send|tell|give)\s+(your\s+)?(otp|pin|password|login|tpin|demat\s+(id|details|password))\b/i,
      /\botp\b.*\b(share|send|batao|bhejo)\b/i,
      /(ओटीपी|OTP|पिन|पासवर्ड)\s*(बताएं|बताएँ|भेजें|शेयर|दें)/,
    ],
    title: { en: "Asks for your OTP, PIN or login", hi: "आपका OTP, PIN या लॉगिन माँगा गया" },
    why: {
      en: "No genuine broker, adviser or bank will ever ask for your OTP, PIN or password. Sharing these can empty your account.",
      hi: "कोई भी असली ब्रोकर, एडवाइज़र या बैंक कभी आपका OTP, PIN या पासवर्ड नहीं माँगता। इन्हें बताने से आपका खाता खाली हो सकता है।",
    },
    action: { en: "Never share these. If you already did, call 1930 immediately.", hi: "इन्हें कभी न बताएँ। अगर बता दिया है, तो तुरंत 1930 पर कॉल करें।" },
  },
  {
    id: "app_or_group_move",
    level: "red",
    patterns: [
      /\b(download|install)\s+(our|this|the)?\s*(app|apk|application)\b/i,
      /\.apk\b/i,
      /\binstitutional\s+(account|trading)\b/i,
      /\b(ipo|block\s*deal)\s+(allotment|quota)\s+(guarantee|assured|sure)/i,
      /\bqib\s+(quota|account)\b/i,
      /(ऐप|एप)\s*(डाउनलोड|इंस्टॉल)/,
      /इंस्टीट्यूशनल\s*(अकाउंट|खाता)/,
    ],
    title: { en: "Asks you to install an app or use a special trading account", hi: "कोई ऐप इंस्टॉल करने या ख़ास ट्रेडिंग अकाउंट की बात" },
    why: {
      en: "A common scam: victims are moved to a fake trading app that shows big (fake) profits, then they cannot withdraw. Use only your own broker's official app.",
      hi: "एक आम धोखा: लोगों को नकली ट्रेडिंग ऐप पर ले जाया जाता है जो बड़ा (नकली) मुनाफ़ा दिखाता है, फिर पैसा निकलता नहीं। सिर्फ़ अपने ब्रोकर का आधिकारिक ऐप इस्तेमाल करें।",
    },
    term: "fake_app",
  },
  {
    id: "herd_pressure",
    level: "orange",
    patterns: [
      /\b(everyone|everybody|lakhs\s+of\s+people|thousands\s+of\s+(people|members|investors))\s+(is|are)?\s*(buying|joined|investing|earning)/i,
      /\bjoin\s+\d[\d,]*\+?\s*(members|traders|investors)\b/i,
      /\bsab\s*log\b/i,
      /(सब|सभी|लाखों)\s*(लोग)?\s*(ख़रीद|खरीद|कमा|जुड़)/,
    ],
    title: { en: "Says \"everyone is buying\"", hi: "कहा गया कि \"सब लोग ख़रीद रहे हैं\"" },
    why: {
      en: "Crowds can be wrong. When a message uses the number of people as proof, it is using pressure, not evidence.",
      hi: "भीड़ ग़लत भी हो सकती है। जब मैसेज लोगों की गिनती को सबूत बताता है, तो वह दबाव डाल रहा है, सबूत नहीं दे रहा।",
    },
    term: "herd",
  },
  {
    id: "fake_approval",
    level: "red",
    patterns: [
      /\b(sebi|nse|bse|rbi)\s*(approved|certified|guaranteed|backed)\s*(stock|tip|call|share|return|scheme|plan)?/i,
      /(सेबी|SEBI)\s*(द्वारा)?\s*(मंज़ूर|मंजूर|अप्रूव्ड|प्रमाणित)/,
    ],
    title: { en: "Claims SEBI / exchange \"approved\" the tip", hi: "दावा कि SEBI / एक्सचेंज ने टिप को \"मंज़ूरी\" दी" },
    why: {
      en: "SEBI and the stock exchanges never approve or recommend any share tip or return. Using their name this way is misleading.",
      hi: "SEBI और स्टॉक एक्सचेंज कभी किसी शेयर टिप या रिटर्न को मंज़ूरी या सलाह नहीं देते। उनके नाम का ऐसा इस्तेमाल गुमराह करने वाला है।",
    },
    term: "sebi",
  },
];

const POSITIVE: { id: string; patterns: RegExp[]; title: Bi; why: Bi }[] = [
  {
    id: "risk_disclaimer",
    patterns: [
      /subject to market risk/i,
      /(investments?|returns?)\s+(are|is)\s+not\s+guaranteed/i,
      /past performance (is not|does not)/i,
      /not (an? )?(investment )?(advice|recommendation)/i,
      /बाज़ार\s*जोखिम|बाजार\s*जोखिम/,
    ],
    title: { en: "Mentions the risk", hi: "जोखिम के बारे में बताया गया है" },
    why: {
      en: "Responsible messages remind you that prices can fall. This alone does not prove the message is correct.",
      hi: "ज़िम्मेदार मैसेज बताते हैं कि दाम गिर भी सकते हैं। सिर्फ़ इससे मैसेज सही साबित नहीं होता।",
    },
  },
];

function snippet(text: string, idx: number, len: number): string {
  const start = Math.max(0, idx - 25);
  const end = Math.min(text.length, idx + len + 25);
  return (start > 0 ? "…" : "") + text.slice(start, end).replace(/\s+/g, " ").trim() + (end < text.length ? "…" : "");
}

export interface ClaimOutput {
  signals: Signal[];
  matchedIds: string[];
  /** e.g. "40%" numbers mentioned as returns, used for market comparison */
  promisedPercent?: number;
  promisedDays?: number;
  eventWords: string[];
}

const EVENT_WORDS: [RegExp, string][] = [
  [/\b(merger|merge)\b|विलय/i, "merger"],
  [/\b(acquisition|acquire|takeover)\b|अधिग्रहण/i, "acquisition"],
  [/\bbonus\b|बोनस/i, "bonus"],
  [/\b(split)\b|स्प्लिट/i, "split"],
  [/\b(buyback|buy\s*back)\b|बायबैक/i, "buyback"],
  [/\b(order|contract|deal)\s+(win|worth|from|of)\b|ऑर्डर|कॉन्ट्रैक्ट/i, "order"],
  [/\bdividend\b|डिविडेंड|लाभांश/i, "dividend"],
  [/\b(results?|earnings|quarter|q[1-4])\b|नतीजे|तिमाही/i, "results"],
];

export function analyseClaims(text: string): ClaimOutput {
  const signals: Signal[] = [];
  const matchedIds: string[] = [];
  const t = (text || "").slice(0, 8000);
  if (!t.trim()) return { signals, matchedIds, eventWords: [] };

  for (const rule of RULES) {
    const quotes: string[] = [];
    const hits: number[] = [];
    for (const p of rule.patterns) {
      const re = new RegExp(p.source, p.flags.includes("g") ? p.flags : p.flags + "g");
      let m: RegExpExecArray | null;
      while ((m = re.exec(t)) && quotes.length < 3) {
        const around = t.slice(Math.max(0, m.index - 40), m.index + m[0].length + 20);
        if (rule.negations?.some((n) => n.test(around))) continue;
        if ((rule.id === "guaranteed_return" || rule.id === "specific_return") && CAUTION_BEFORE.test(t.slice(Math.max(0, m.index - 80), m.index))) continue;
        if (hits.some((h) => Math.abs(h - m!.index) < 60)) continue; // overlapping quote
        hits.push(m.index);
        const q = snippet(t, m.index, m[0].length);
        if (!quotes.includes(q)) quotes.push(q);
        if (m[0].length === 0) re.lastIndex++;
      }
    }
    if (quotes.length) {
      matchedIds.push(rule.id);
      signals.push({
        id: rule.id,
        level: rule.level,
        category: "message",
        title: rule.title,
        why: rule.why,
        evidence: quotes.map((q) => ({ en: `“${q}”`, hi: `“${q}”` })),
        action: rule.action,
        term: rule.term,
      });
    }
  }

  // Specific-return is redundant if guaranteed already matched on the same words; keep both but it's fine.
  for (const p of POSITIVE) {
    const hit = p.patterns.find((re) => re.test(t));
    if (hit) {
      signals.push({ id: p.id, level: "ok", category: "message", title: p.title, why: p.why });
    }
  }

  // Extract promised % and time frame, e.g. "40% in 30 days", "40% return in 1 month"
  let promisedPercent: number | undefined;
  let promisedDays: number | undefined;
  const pm = t.match(/(\d{2,4})\s*%/);
  if (pm) promisedPercent = parseInt(pm[1], 10);
  if (/\b(double|2x|डबल|दोगुना|दुगना)\b/i.test(t) && !promisedPercent) promisedPercent = 100;
  const dm = t.match(/(\d{1,3})\s*(days?|din|दिन|weeks?|hafte|हफ़्ते|हफ्ते|months?|mahine|महीने)/i);
  if (dm) {
    const n = parseInt(dm[1], 10);
    const unit = dm[2].toLowerCase();
    promisedDays = /week|hafte|हफ़्ते|हफ्ते/.test(unit) ? n * 7 : /month|mahine|महीने/.test(unit) ? n * 30 : n;
  }

  const eventWords = EVENT_WORDS.filter(([re]) => re.test(t)).map(([, w]) => w);
  return { signals, matchedIds, promisedPercent, promisedDays, eventWords };
}
