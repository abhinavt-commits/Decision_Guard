import type { Bi } from "./types";

// Shared between server and browser (no server-only code here).

export type AlertKind = "official" | "news";
export type AlertTopic = "fake_app" | "tip_group" | "impersonation" | "deepfake" | "ponzi" | "govt_action" | "other";

export interface AlertItem {
  id: string;
  title: string;
  source: string;
  date?: string; // ISO
  link: string;
  kind: AlertKind;
  topic: AlertTopic;
  govtAction: boolean;
  lang: "en" | "hi";
  titleBi?: Bi; // headline in both languages (AI translation, optional)
}

// ---- Always-available: what the government has put in place ---------------------------

export const GOVT_MEASURES: { id: string; title: Bi; what: Bi; use: Bi; link: string }[] = [
  {
    id: "valid_upi",
    title: { en: "SEBI's \"@valid\" UPI IDs and SEBI Check (from Oct 2025)", hi: "SEBI की \"@valid\" UPI ID और SEBI Check (अक्टूबर 2025 से)" },
    what: { en: "SEBI-registered intermediaries collect investors' money through special UPI IDs ending like @validhdfc. SEBI Check lets you verify a UPI ID or bank account before paying.", hi: "SEBI-रजिस्टर्ड संस्थाएँ निवेशकों से पैसा ख़ास UPI ID (जैसे @validhdfc) से लेती हैं। SEBI Check पर पेमेंट से पहले UPI ID या बैंक खाता जाँच सकते हैं।" },
    use: { en: "Before paying any \"adviser\" or \"broker\", check the UPI ID on SEBI Check.", hi: "किसी भी \"एडवाइज़र\" या \"ब्रोकर\" को पैसा देने से पहले UPI ID SEBI Check पर जाँचें।" },
    link: "https://siportal.sebi.gov.in/intermediary/sebi-check",
  },
  {
    id: "finfluencer",
    title: { en: "Rules for finfluencers (2024–25)", hi: "फ़िनफ़्लुएंसर के लिए नियम (2024–25)" },
    what: { en: "SEBI-regulated firms may not work with unregistered people who give advice or promise returns, and unregistered \"educators\" may not use recent share prices in their content.", hi: "SEBI के तहत आने वाली कंपनियाँ ऐसे बिना रजिस्ट्रेशन वाले लोगों के साथ काम नहीं कर सकतीं जो सलाह दें या रिटर्न का वादा करें, और बिना रजिस्ट्रेशन वाले \"शिक्षक\" अपने कंटेंट में हाल के शेयर दाम इस्तेमाल नहीं कर सकते।" },
    use: { en: "If a creator gives you a stock tip, ask for their SEBI registration number.", hi: "अगर कोई क्रिएटर शेयर टिप दे, तो उनसे SEBI रजिस्ट्रेशन नंबर माँगें।" },
    link: "https://www.sebi.gov.in",
  },
  {
    id: "registry",
    title: { en: "Public list of registered advisers and analysts", hi: "रजिस्टर्ड एडवाइज़र और एनालिस्ट की सार्वजनिक सूची" },
    what: { en: "SEBI publishes every registered Investment Adviser (INA…) and Research Analyst (INH…) with name and number.", hi: "SEBI हर रजिस्टर्ड इन्वेस्टमेंट एडवाइज़र (INA…) और रिसर्च एनालिस्ट (INH…) का नाम और नंबर प्रकाशित करता है।" },
    use: { en: "Search the number AND check the name matches who is contacting you.", hi: "नंबर खोजें और यह भी देखें कि नाम उसी से मिलता है जो आपसे संपर्क कर रहा है।" },
    link: "https://www.sebi.gov.in/intermediaries.html",
  },
  {
    id: "helpline",
    title: { en: "1930 cyber-fraud helpline and cybercrime.gov.in", hi: "1930 साइबर धोखाधड़ी हेल्पलाइन और cybercrime.gov.in" },
    what: { en: "The national helpline for online financial fraud. Reporting quickly can help freeze the money trail.", hi: "ऑनलाइन वित्तीय धोखाधड़ी के लिए राष्ट्रीय हेल्पलाइन। जल्दी शिकायत करने से पैसे का रास्ता रोका जा सकता है।" },
    use: { en: "If you have paid a scammer, call 1930 immediately and file a complaint online.", hi: "अगर किसी धोखेबाज़ को पैसा दे दिया है, तो तुरंत 1930 पर कॉल करें और ऑनलाइन शिकायत दर्ज करें।" },
    link: "https://cybercrime.gov.in",
  },
  {
    id: "chakshu",
    title: { en: "Report fraud calls and messages: Sanchar Saathi (Chakshu)", hi: "धोखे वाले कॉल और मैसेज की शिकायत: संचार साथी (चक्षु)" },
    what: { en: "The Department of Telecommunications' portal to report suspected fraud calls, SMS and WhatsApp messages.", hi: "दूरसंचार विभाग का पोर्टल, जहाँ संदिग्ध धोखे वाले कॉल, SMS और WhatsApp मैसेज की शिकायत कर सकते हैं।" },
    use: { en: "Report the number that sent you a fake tip.", hi: "जिस नंबर से नकली टिप आई, उसकी शिकायत करें।" },
    link: "https://sancharsaathi.gov.in",
  },
  {
    id: "scores",
    title: { en: "SEBI SCORES: complaints against registered firms", hi: "SEBI SCORES: रजिस्टर्ड कंपनियों के ख़िलाफ़ शिकायत" },
    what: { en: "SEBI's online complaint system for problems with brokers, advisers and other registered entities.", hi: "ब्रोकर, एडवाइज़र और अन्य रजिस्टर्ड संस्थाओं से जुड़ी समस्याओं के लिए SEBI की ऑनलाइन शिकायत प्रणाली।" },
    use: { en: "Use it if a registered broker or adviser treats you unfairly.", hi: "अगर कोई रजिस्टर्ड ब्रोकर या एडवाइज़र आपके साथ ग़लत करे, तो इसका इस्तेमाल करें।" },
    link: "https://scores.sebi.gov.in",
  },
];

/** Which alert topics relate to which warning signals (to show "related alerts" on a result). */
export const SIGNAL_TO_TOPIC: Record<string, AlertTopic> = {
  app_or_group_move: "fake_app",
  apk_link: "fake_app",
  lookalike_domain: "impersonation",
  sebi_reg_name_mismatch: "impersonation",
  sebi_reg_not_found: "impersonation",
  fake_approval: "impersonation",
  payment_request: "tip_group",
  upi_not_valid: "tip_group",
  private_group: "tip_group",
  insider_secret: "tip_group",
  guaranteed_return: "ponzi",
};

/** One-line "how to spot it" per alert topic. */
export const TOPIC_INFO: Record<AlertTopic, { label: Bi; spot: Bi }> = {
  fake_app: { label: { en: "Fake app", hi: "नकली ऐप" }, spot: { en: "Use only your broker's official app from the Play Store. Never install apps from links.", hi: "सिर्फ़ Play Store से अपने ब्रोकर का आधिकारिक ऐप इस्तेमाल करें। लिंक से कोई ऐप इंस्टॉल न करें।" } },
  tip_group: { label: { en: "Tip group", hi: "टिप ग्रुप" }, spot: { en: "Free tips, then a paid \"VIP\" group or big \"sure\" call. Ask for a SEBI number; pay only to @valid UPI IDs.", hi: "पहले मुफ़्त टिप, फिर पेड \"VIP\" ग्रुप या बड़ी \"पक्की\" कॉल। SEBI नंबर माँगें; पैसा सिर्फ़ @valid UPI ID पर दें।" } },
  impersonation: { label: { en: "Fake identity", hi: "नकली पहचान" }, spot: { en: "Scammers copy real names, logos and registration numbers. Check the number and the name on SEBI's site.", hi: "धोखेबाज़ असली नाम, लोगो और रजिस्ट्रेशन नंबर की नकल करते हैं। SEBI की साइट पर नंबर और नाम दोनों जाँचें।" } },
  deepfake: { label: { en: "Deepfake", hi: "डीपफ़ेक" }, spot: { en: "A famous face \"recommending\" a scheme in a video is not proof. Real experts don't promise sure returns.", hi: "वीडियो में किसी मशहूर चेहरे का किसी स्कीम की \"सलाह\" देना सबूत नहीं है। असली विशेषज्ञ पक्के रिटर्न का वादा नहीं करते।" } },
  ponzi: { label: { en: "Assured returns", hi: "पक्के रिटर्न" }, spot: { en: "Fixed or \"guaranteed\" returns from shares are impossible. Old investors are often paid with new investors' money.", hi: "शेयर से तय या \"गारंटीड\" रिटर्न संभव नहीं। अक्सर पुराने निवेशकों को नए निवेशकों के पैसे से भुगतान होता है।" } },
  govt_action: { label: { en: "Action taken", hi: "कार्रवाई" }, spot: { en: "Read what the regulator or police found — the same tricks are often used again elsewhere.", hi: "पढ़ें कि रेगुलेटर या पुलिस ने क्या पाया — यही तरीके अक्सर दूसरी जगह दोबारा इस्तेमाल होते हैं।" } },
  other: { label: { en: "Alert", hi: "चेतावनी" }, spot: { en: "Pause and check before acting on any money message.", hi: "पैसे से जुड़े किसी भी मैसेज पर कुछ करने से पहले रुकें और जाँचें।" } },
};
