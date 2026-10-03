import type { Bi } from "./types";

export interface Term {
  id: string;
  word: Bi;
  simple: Bi; // one-line simple meaning
  example?: Bi;
}

// Plain-language explanations. Hindi first-class, with the English word in brackets.
export const GLOSSARY: Term[] = [
  { id: "share", word: { en: "Share / Stock", hi: "शेयर (Share)" },
    simple: { en: "A small piece of ownership in a company. If the company does well, the share price may rise; if not, it may fall.", hi: "किसी कंपनी में मालिकाना हक़ का छोटा हिस्सा। कंपनी अच्छा करे तो दाम बढ़ सकता है, न करे तो गिर सकता है।" },
    example: { en: "Owning 10 shares of a company with 1 crore shares means you own a tiny part of it.", hi: "1 करोड़ शेयर वाली कंपनी के 10 शेयर आपके हैं, तो आप उसके बहुत छोटे हिस्से के मालिक हैं।" } },
  { id: "sebi", word: { en: "SEBI", hi: "सेबी (SEBI)" },
    simple: { en: "The government body that makes rules for the share market and protects investors. It never recommends any share.", hi: "शेयर बाज़ार के नियम बनाने और निवेशकों की रक्षा करने वाली सरकारी संस्था। यह कभी किसी शेयर की सलाह नहीं देती।" } },
  { id: "registered_ra", word: { en: "SEBI-registered Research Analyst / Adviser", hi: "SEBI-रजिस्टर्ड रिसर्च एनालिस्ट / एडवाइज़र" },
    simple: { en: "People allowed by SEBI to give stock recommendations or investment advice. Their number starts with INH (analyst) or INA (adviser). Registration means they must follow rules — not that they are always right.", hi: "जिन्हें SEBI ने शेयर सलाह या निवेश सलाह देने की अनुमति दी है। इनका नंबर INH (एनालिस्ट) या INA (एडवाइज़र) से शुरू होता है। रजिस्ट्रेशन का मतलब है कि उन्हें नियम मानने होंगे — यह नहीं कि वे हमेशा सही होंगे।" },
    example: { en: "Example number: INH000012345", hi: "उदाहरण नंबर: INH000012345" } },
  { id: "upi_valid", word: { en: "@valid UPI ID", hi: "@valid UPI ID" },
    simple: { en: "Since October 2025, SEBI-registered intermediaries collect money through special UPI IDs ending like @validhdfc or @validicici. You can check them on SEBI Check.", hi: "अक्टूबर 2025 से SEBI-रजिस्टर्ड संस्थाएँ ख़ास UPI ID से पैसा लेती हैं, जो @validhdfc या @validicici जैसी होती हैं। इन्हें SEBI Check पर जाँच सकते हैं।" },
    example: { en: "abc.brk@validhdfc — broker; xyz.mf@validicici — mutual fund", hi: "abc.brk@validhdfc — ब्रोकर; xyz.mf@validicici — म्यूचुअल फ़ंड" } },
  { id: "return", word: { en: "Return", hi: "रिटर्न (Return)" },
    simple: { en: "How much your money grew or shrank. ₹100 becoming ₹110 is a 10% return; becoming ₹90 is −10%.", hi: "आपका पैसा कितना बढ़ा या घटा। ₹100 का ₹110 होना 10% रिटर्न है; ₹90 होना −10%।" } },
  { id: "guaranteed_return", word: { en: "Guaranteed return", hi: "गारंटीड रिटर्न (Guaranteed return)" },
    simple: { en: "A promise that you will surely earn a fixed amount. With shares this is impossible, because prices can always fall.", hi: "पक्का तय पैसा कमाने का वादा। शेयर में यह संभव नहीं, क्योंकि दाम हमेशा गिर भी सकते हैं।" } },
  { id: "risk", word: { en: "Risk", hi: "जोखिम (Risk)" },
    simple: { en: "The chance that you lose some or all of your money.", hi: "आपका कुछ या पूरा पैसा डूबने की संभावना।" } },
  { id: "volatility", word: { en: "Volatility", hi: "उतार-चढ़ाव (Volatility)" },
    simple: { en: "How much a price moves up and down. A share that moves 3% a day is more volatile than one that moves 0.5%.", hi: "दाम कितना ऊपर-नीचे होता है। रोज़ 3% हिलने वाला शेयर 0.5% हिलने वाले से ज़्यादा उतार-चढ़ाव वाला है।" } },
  { id: "loss_chasing", word: { en: "Loss-chasing", hi: "घाटा-वसूली (Loss-chasing)" },
    simple: { en: "Making quick or bigger trades to win back money you just lost. It often leads to bigger losses.", hi: "हाल का नुकसान वापस पाने के लिए जल्दी या बड़े ट्रेड करना। इससे अक्सर नुकसान और बढ़ जाता है।" } },
  { id: "overconfidence", word: { en: "Overconfidence", hi: "ज़रूरत से ज़्यादा भरोसा (Overconfidence)" },
    simple: { en: "After a few wins, feeling sure you can't lose and taking bigger risks than usual.", hi: "कुछ बार मुनाफ़े के बाद यह मान लेना कि नुकसान नहीं होगा, और आम से बड़ा जोखिम लेना।" } },
  { id: "overtrading", word: { en: "Overtrading", hi: "ज़रूरत से ज़्यादा ट्रेडिंग (Overtrading)" },
    simple: { en: "Buying and selling too often. Each trade has costs, and hurried trades are often emotional.", hi: "बहुत बार ख़रीदना-बेचना। हर ट्रेड पर खर्च लगता है, और जल्दबाज़ी के ट्रेड अक्सर भावनाओं में होते हैं।" } },
  { id: "fomo", word: { en: "FOMO (fear of missing out)", hi: "मौका छूटने का डर (FOMO)" },
    simple: { en: "The worry that everyone else will make money and you will be left behind. Scammers use it to rush you.", hi: "यह डर कि सब पैसा कमा लेंगे और आप पीछे रह जाएँगे। धोखेबाज़ इसी से जल्दबाज़ी कराते हैं।" } },
  { id: "herd", word: { en: "Herd behaviour", hi: "भेड़चाल (Herd behaviour)" },
    simple: { en: "Doing something only because many others are doing it. Popularity is not proof.", hi: "सिर्फ़ इसलिए कुछ करना क्योंकि बहुत लोग कर रहे हैं। लोकप्रियता सबूत नहीं है।" } },
  { id: "pump_and_dump", word: { en: "Pump and dump", hi: "पंप एंड डंप (Pump and dump)" },
    simple: { en: "A scam where people hype a share so others buy and the price rises, then they sell at the top and the price crashes.", hi: "एक धोखा: कुछ लोग किसी शेयर का शोर मचाते हैं, दूसरे ख़रीदते हैं और दाम बढ़ता है, फिर वे ऊपर बेचकर निकल जाते हैं और दाम गिर जाता है।" } },
  { id: "target_price", word: { en: "Target price", hi: "टारगेट प्राइस (Target price)" },
    simple: { en: "A price someone guesses a share will reach. It is an opinion, not a promise.", hi: "किसी का अंदाज़ा कि शेयर किस दाम तक जाएगा। यह राय है, वादा नहीं।" } },
  { id: "finfluencer", word: { en: "Finfluencer", hi: "फ़िनफ़्लुएंसर (Finfluencer)" },
    simple: { en: "A social-media creator who talks about money and investing. Many are not SEBI-registered and earn from views or paid groups.", hi: "पैसे और निवेश की बात करने वाला सोशल मीडिया क्रिएटर। कई SEBI-रजिस्टर्ड नहीं होते और व्यूज़ या पेड ग्रुप से कमाते हैं।" } },
  { id: "fake_app", word: { en: "Fake trading app", hi: "नकली ट्रेडिंग ऐप" },
    simple: { en: "An app that looks like a trading app and shows big profits, but the money is not invested and cannot be withdrawn.", hi: "ऐसा ऐप जो ट्रेडिंग ऐप जैसा दिखता है और बड़ा मुनाफ़ा दिखाता है, पर पैसा असल में लगाया नहीं जाता और निकलता नहीं।" } },
  { id: "phishing", word: { en: "Phishing", hi: "फ़िशिंग (Phishing)" },
    simple: { en: "A fake message or website made to look real, to steal your password, OTP or money.", hi: "असली जैसा दिखने वाला नकली मैसेज या वेबसाइट, जिससे आपका पासवर्ड, OTP या पैसा चुराया जाता है।" } },
  { id: "demerger", word: { en: "Demerger", hi: "डीमर्जर (Demerger)" },
    simple: { en: "When one company splits into two separate listed companies. Old names and prices can become confusing.", hi: "जब एक कंपनी दो अलग-अलग लिस्टेड कंपनियों में बँट जाती है। पुराने नाम और दाम उलझन पैदा कर सकते हैं।" } },
  { id: "demat", word: { en: "Demat account", hi: "डीमैट अकाउंट (Demat account)" },
    simple: { en: "An account where your shares are kept electronically, like a bank account for shares (with NSDL or CDSL).", hi: "ऐसा खाता जिसमें आपके शेयर इलेक्ट्रॉनिक रूप में रखे जाते हैं, शेयरों का बैंक खाता (NSDL या CDSL में)।" } },
  { id: "broker", word: { en: "Broker", hi: "ब्रोकर (Broker)" },
    simple: { en: "A SEBI-registered company through which you buy and sell shares (its app or website).", hi: "SEBI-रजिस्टर्ड कंपनी जिसके ज़रिए (ऐप या वेबसाइट से) आप शेयर ख़रीदते-बेचते हैं।" } },
  { id: "fno", word: { en: "F&O (Futures & Options)", hi: "F&O (फ़्यूचर्स और ऑप्शंस)" },
    simple: { en: "Complex bets on price moves, often with borrowed money. SEBI found about 9 out of 10 individual traders in F&O lost money (FY22–FY24).", hi: "दाम की चाल पर जटिल दाँव, अक्सर उधार के पैसे से। SEBI के अध्ययन में F&O के लगभग 10 में से 9 व्यक्तिगत ट्रेडर्स को नुकसान हुआ (FY22–FY24)।" } },
  { id: "stop_loss", word: { en: "Stop-loss", hi: "स्टॉप-लॉस (Stop-loss)" },
    simple: { en: "An order to sell automatically if the price falls to a level you choose, to limit the loss.", hi: "पहले से तय दाम तक गिरने पर अपने-आप बेचने का ऑर्डर, ताकि नुकसान सीमित रहे।" } },
  { id: "ipo", word: { en: "IPO", hi: "IPO (आईपीओ)" },
    simple: { en: "When a company sells its shares to the public for the first time. Nobody can \"guarantee\" you an IPO allotment.", hi: "जब कोई कंपनी पहली बार आम लोगों को शेयर बेचती है। IPO में शेयर मिलने की \"गारंटी\" कोई नहीं दे सकता।" } },
];

GLOSSARY.push(
  { id: "stale_tip", word: { en: "Old (stale) tip", hi: "पुरानी (बासी) टिप" },
    simple: { en: "A tip made weeks or months ago. The price, company news and market mood may have changed since — and old videos are often forwarded as new.", hi: "हफ़्तों या महीनों पहले दी गई टिप। तब से दाम, कंपनी की ख़बरें और बाज़ार का माहौल बदल सकता है — और पुराने वीडियो अक्सर नए बताकर फ़ॉरवर्ड किए जाते हैं।" },
    example: { en: "A 2024 video saying \"buy at ₹120\" when the share is ₹180 today.", hi: "2024 का वीडियो जो कहता है \"₹120 पर ख़रीदें\", जबकि आज शेयर ₹180 का है।" } },

  { id: "sme", word: { en: "SME share", hi: "SME शेयर" },
    simple: { en: "Shares of small and medium companies listed on a special platform (NSE Emerge / BSE SME). Fewer people trade them, so prices can be moved easily.", hi: "छोटी और मध्यम कंपनियों के शेयर, जो ख़ास प्लैटफ़ॉर्म (NSE Emerge / BSE SME) पर लिस्टेड होते हैं। इन्हें कम लोग ट्रेड करते हैं, इसलिए दाम आसानी से हिलाए जा सकते हैं।" } },
  { id: "penny_stock", word: { en: "Penny stock", hi: "पेनी स्टॉक" },
    simple: { en: "A share with a very low price (often below ₹20). Small trades can move it by large percentages — a favourite of pump-and-dump schemes.", hi: "बहुत कम दाम (अक्सर ₹20 से कम) वाला शेयर। थोड़े से ट्रेड से इसका दाम बहुत ज़्यादा प्रतिशत में बदल सकता है — पंप एंड डंप वालों का पसंदीदा।" } },
  { id: "trade_for_trade", word: { en: "Trade-for-trade (BE/BZ)", hi: "ट्रेड-फ़ॉर-ट्रेड (BE/BZ)" },
    simple: { en: "A restricted category where every buy must be taken as delivery — no same-day buying and selling. Exchanges use it for surveillance or for companies that break listing rules.", hi: "एक सीमित श्रेणी जिसमें हर ख़रीद की डिलीवरी लेनी होती है — एक ही दिन ख़रीद-बिक्री नहीं। एक्सचेंज इसे निगरानी के लिए या नियम तोड़ने वाली कंपनियों के लिए इस्तेमाल करते हैं।" } },
);

export const findTerm = (id: string) => GLOSSARY.find((t) => t.id === id);

export const SCAMS: { id: string; title: Bi; how: Bi; spot: Bi }[] = [
  { id: "tip_group", title: { en: "WhatsApp/Telegram \"tip\" groups", hi: "WhatsApp/Telegram \"टिप\" ग्रुप" },
    how: { en: "Free tips first, a few look right, then a paid \"VIP\" group or a big \"sure\" call.", hi: "पहले मुफ़्त टिप, कुछ सही लगती हैं, फिर पेड \"VIP\" ग्रुप या कोई बड़ी \"पक्की\" कॉल।" },
    spot: { en: "Guaranteed returns, urgency, payment to a personal UPI ID, no SEBI number.", hi: "गारंटीड रिटर्न, जल्दबाज़ी, निजी UPI ID पर पेमेंट, कोई SEBI नंबर नहीं।" } },
  { id: "fake_app", title: { en: "Fake trading apps", hi: "नकली ट्रेडिंग ऐप" },
    how: { en: "You are asked to install an app or use an \"institutional account\". It shows big profits, but withdrawals are blocked.", hi: "आपसे कोई ऐप इंस्टॉल करवाया जाता है या \"इंस्टीट्यूशनल अकाउंट\" की बात होती है। ऐप बड़ा मुनाफ़ा दिखाता है, पर पैसा निकलता नहीं।" },
    spot: { en: "App not from your own broker, links to .apk files, \"IPO allotment guaranteed\".", hi: "ऐप आपके अपने ब्रोकर का नहीं, .apk फ़ाइल वाले लिंक, \"IPO में शेयर पक्का\"।" } },
  { id: "pump", title: { en: "Pump and dump", hi: "पंप एंड डंप" },
    how: { en: "A small or unknown share is hyped everywhere at once. Promoters sell when you buy.", hi: "किसी छोटे या अनजान शेयर का एक साथ हर जगह शोर। जब आप ख़रीदते हैं, वे बेचते हैं।" },
    spot: { en: "\"Upper circuit\", \"multibagger\", rockets, everyone suddenly talking about the same share.", hi: "\"अपर सर्किट\", \"मल्टीबैगर\", रॉकेट, अचानक सब एक ही शेयर की बात करें।" } },
  { id: "impersonation", title: { en: "Fake \"SEBI registered\" advisers", hi: "नकली \"SEBI रजिस्टर्ड\" एडवाइज़र" },
    how: { en: "They copy a real registration number or company name to look genuine.", hi: "असली दिखने के लिए किसी असली रजिस्ट्रेशन नंबर या कंपनी के नाम की नकल करते हैं।" },
    spot: { en: "Check the number on SEBI's site AND that the name matches who is talking to you.", hi: "SEBI की साइट पर नंबर जाँचें और यह भी कि नाम उसी से मिलता है जो आपसे बात कर रहा है।" } },
  { id: "deepfake", title: { en: "Deepfake videos of famous people", hi: "मशहूर लोगों के डीपफ़ेक वीडियो" },
    how: { en: "AI-made videos show a famous businessperson or expert \"recommending\" a scheme.", hi: "AI से बने वीडियो में कोई मशहूर बिज़नेसमैन या एक्सपर्ट किसी स्कीम की \"सलाह\" देता दिखता है।" },
    spot: { en: "Lips not matching words, links to unknown sites, promises of sure returns.", hi: "होंठ और शब्द मेल न खाएँ, अनजान साइट के लिंक, पक्के रिटर्न के वादे।" } },
];

export const HELP_LINKS = [
  { label: { en: "Cyber fraud helpline: call 1930", hi: "साइबर धोखाधड़ी हेल्पलाइन: 1930 पर कॉल करें" }, href: "tel:1930" },
  { label: { en: "Report online: cybercrime.gov.in", hi: "ऑनलाइन शिकायत: cybercrime.gov.in" }, href: "https://cybercrime.gov.in" },
  { label: { en: "SEBI complaints: SCORES", hi: "SEBI शिकायत: SCORES" }, href: "https://scores.sebi.gov.in" },
  { label: { en: "Check a UPI ID: SEBI Check", hi: "UPI ID जाँचें: SEBI Check" }, href: "https://siportal.sebi.gov.in/intermediary/sebi-check" },
  { label: { en: "Check an adviser: SEBI registry", hi: "एडवाइज़र जाँचें: SEBI सूची" }, href: "https://www.sebi.gov.in/intermediaries.html" },
  { label: { en: "Report fraud calls/SMS: Sanchar Saathi (Chakshu)", hi: "धोखे वाले कॉल/SMS की शिकायत: संचार साथी (चक्षु)" }, href: "https://sancharsaathi.gov.in" },
];
