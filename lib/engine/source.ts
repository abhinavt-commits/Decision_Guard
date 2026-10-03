import type { CheckInput, Signal } from "../types";

const OFFICIAL_DOMAINS = [
  "sebi.gov.in", "nseindia.com", "bseindia.com", "rbi.org.in", "nsdl.co.in", "cdslindia.com",
  "amfiindia.com", "mca.gov.in", "cybercrime.gov.in", "incometax.gov.in",
];
const NEWS_DOMAINS = [
  "economictimes.indiatimes.com", "livemint.com", "business-standard.com", "moneycontrol.com",
  "thehindubusinessline.com", "financialexpress.com", "reuters.com", "ndtvprofit.com", "cnbctv18.com",
  "timesofindia.indiatimes.com", "hindustantimes.com", "bhaskar.com", "amarujala.com", "jagran.com", "zeebiz.com",
];
const SHORTENERS = ["bit.ly", "tinyurl.com", "t.co", "cutt.ly", "rb.gy", "is.gd", "shorturl.at", "goo.gl", "ow.ly", "tiny.cc", "s.id", "rebrand.ly"];
const BRANDS = ["sebi", "nse", "bse", "zerodha", "groww", "upstox", "angelone", "angel", "icicidirect", "hdfcsec", "kotak", "nsdl", "cdsl", "paytm", "5paisa", "dhan"];
const BRAND_OFFICIAL: Record<string, string[]> = {
  sebi: ["sebi.gov.in"], nse: ["nseindia.com"], bse: ["bseindia.com"], zerodha: ["zerodha.com"],
  groww: ["groww.in"], upstox: ["upstox.com"], angelone: ["angelone.in"], angel: ["angelone.in"],
  icicidirect: ["icicidirect.com"], hdfcsec: ["hdfcsec.com"], kotak: ["kotak.com", "kotaksecurities.com"],
  nsdl: ["nsdl.co.in", "nsdl.com"], cdsl: ["cdslindia.com"], paytm: ["paytm.com", "paytmmoney.com"],
  "5paisa": ["5paisa.com"], dhan: ["dhan.co"],
};

const endsWithDomain = (host: string, d: string) => host === d || host.endsWith("." + d);

/** Business-news channels: the person speaking is usually a guest (fund manager, analyst), not the channel. */
export const NEWS_CHANNELS = /\b(ndtv\s*profit|cnbc[\s-]*(tv18|awaaz|bajar)|et\s*now|zee\s*business|moneycontrol|business\s*standard|economic\s*times|bloomberg|bq\s*prime|mint|financial\s*express|business\s*today|india\s*today|aaj\s*tak|abp|news18)\b/i;
export const isNewsChannel = (name?: string) => Boolean(name && NEWS_CHANNELS.test(name));

export function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|live\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

/** Find UPI IDs (name@bank). Emails have a dot after @, UPI handles don't. */
export function extractUpiIds(text: string): string[] {
  const out = new Set<string>();
  const re = /\b([a-zA-Z0-9][a-zA-Z0-9._-]{1,255})@([a-zA-Z][a-zA-Z0-9]{1,63})\b(?!\.[a-zA-Z])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.add(m[0].toLowerCase());
  return [...out].slice(0, 5);
}

export function isValidSebiUpi(upi: string): boolean {
  // SEBI's validated handles look like  name.category@valid<bank>, e.g. edelweiss.pms@validaxis
  return /^[a-z0-9._-]+@valid[a-z]+$/i.test(upi);
}

export function analyseSource(input: CheckInput, text: string, ytChannel?: string): { signals: Signal[] } {
  const signals: Signal[] = [];

  // --- Who sent it ---------------------------------------------------------
  const anonymousChannels = ["whatsapp", "telegram", "sms", "instagram"];
  if (anonymousChannels.includes(input.sourceType) && input.knowsSender !== "yes") {
    signals.push({
      id: "unknown_sender",
      level: "orange",
      category: "source",
      title: { en: "You don't personally know who sent this", hi: "आप भेजने वाले को निजी तौर पर नहीं जानते" },
      why: {
        en: "Tips forwarded in groups or from unknown numbers can't be traced to a responsible person. Anyone can type anything.",
        hi: "ग्रुप में फ़ॉरवर्ड हुई या अनजान नंबर से आई टिप का कोई ज़िम्मेदार व्यक्ति पता नहीं चलता। कोई भी कुछ भी लिख सकता है।",
      },
      action: { en: "Find out who first wrote this and whether they are SEBI-registered.", hi: "पता करें कि यह सबसे पहले किसने लिखा और क्या वह SEBI-रजिस्टर्ड है।" },
    });
  }
  if (input.sourceType === "friend") {
    signals.push({
      id: "friend_source",
      level: "info",
      category: "source",
      title: { en: "Came from a friend or family member", hi: "दोस्त या परिवार से आई सलाह" },
      why: {
        en: "People we trust often pass on tips they heard elsewhere. Ask them where the tip came from and whether they checked it.",
        hi: "जिन पर हम भरोसा करते हैं, वे भी अक्सर कहीं और सुनी टिप आगे बढ़ा देते हैं। उनसे पूछें कि टिप कहाँ से आई और क्या उन्होंने जाँची।",
      },
    });
  }
  if (isNewsChannel(ytChannel)) {
    signals.push({
      id: "news_channel_opinion",
      level: "info",
      category: "source",
      title: { en: `A business-news channel (${ytChannel}) — a guest's opinion`, hi: `बिज़नेस न्यूज़ चैनल (${ytChannel}) — किसी मेहमान की राय` },
      why: {
        en: "Fund managers and analysts on TV share their own views. Experts often disagree, they may already own the share, and their view is not advice for your situation.",
        hi: "टीवी पर फ़ंड मैनेजर और एनालिस्ट अपनी राय बताते हैं। विशेषज्ञ अक्सर असहमत होते हैं, उनके पास पहले से वह शेयर हो सकता है, और उनकी राय आपकी स्थिति के लिए सलाह नहीं है।",
      },
      action: { en: "Check whether the speaker disclosed owning the share, and look for other views before acting.", hi: "देखें कि बोलने वाले ने शेयर रखने की बात बताई या नहीं, और कुछ करने से पहले दूसरी राय भी देखें।" },
    });
  } else if (input.sourceType === "influencer" || input.sourceType === "youtube" || input.sourceType === "instagram") {
    signals.push({
      id: "finfluencer",
      level: "info",
      category: "source",
      title: { en: "Social media creator (finfluencer)", hi: "सोशल मीडिया क्रिएटर (फ़िनफ़्लुएंसर)" },
      why: {
        en: "Creators earn from views, sponsors and paid groups, so exciting claims help them even if the claims are wrong. Since 2025, SEBI rules stop unregistered \"educators\" from using recent share prices in their content.",
        hi: "क्रिएटर व्यूज़, स्पॉन्सर और पेड ग्रुप से कमाते हैं, इसलिए रोमांचक दावे उन्हें फ़ायदा देते हैं, चाहे दावे ग़लत हों। 2025 से SEBI के नियम बिना रजिस्ट्रेशन वाले \"शिक्षकों\" को अपने कंटेंट में हाल के शेयर दाम इस्तेमाल करने से रोकते हैं।",
      },
      term: "finfluencer",
    });
  }

  // --- Popularity is not credibility ----------------------------------------
  if (input.views && input.views > 0) {
    const v = input.views;
    const f1 = (x: number) => (Math.round(x * 10) / 10).toString();
    const pretty = v >= 1e7 ? `${f1(v / 1e7)} crore` : v >= 1e5 ? `${f1(v / 1e5)} lakh` : v.toLocaleString("en-IN");
    const prettyHi = v >= 1e7 ? `${f1(v / 1e7)} करोड़` : v >= 1e5 ? `${f1(v / 1e5)} लाख` : v.toLocaleString("en-IN");
    signals.push({
      id: "popularity",
      level: "info",
      category: "source",
      title: { en: `${pretty} views — popular, but that is not proof`, hi: `${prettyHi} व्यूज़ — लोकप्रिय, पर यह सबूत नहीं` },
      why: {
        en: "Views show how many people watched, not whether the claim is true. Exciting or scary claims often get more views.",
        hi: "व्यूज़ बताते हैं कि कितने लोगों ने देखा, यह नहीं कि दावा सच है। रोमांचक या डराने वाले दावों को अक्सर ज़्यादा व्यूज़ मिलते हैं।",
      },
      term: "herd",
    });
  }

  // --- URL checks -----------------------------------------------------------
  const urls = new Set<string>();
  if (input.url) urls.add(input.url.trim());
  for (const m of text.match(/\bhttps?:\/\/[^\s<>"']+/gi) ?? []) urls.add(m);
  for (const m of text.match(/\b(?:t\.me|chat\.whatsapp\.com|wa\.me|bit\.ly|tinyurl\.com)\/[^\s<>"']+/gi) ?? []) urls.add("https://" + m);

  for (const raw of [...urls].slice(0, 5)) {
    let u: URL;
    try {
      u = new URL(/^https?:\/\//i.test(raw) ? raw : "https://" + raw);
    } catch {
      continue;
    }
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    const ev = [{ en: raw.slice(0, 120), hi: raw.slice(0, 120) }];

    if (OFFICIAL_DOMAINS.some((d) => endsWithDomain(host, d))) {
      signals.push({
        id: "official_domain", level: "ok", category: "source",
        title: { en: `Link is an official website (${host})`, hi: `लिंक आधिकारिक वेबसाइट का है (${host})` },
        why: { en: "Official regulator/exchange sites are reliable places to check facts.", hi: "रेगुलेटर/एक्सचेंज की आधिकारिक साइट जानकारी जाँचने की भरोसेमंद जगह है।" },
        evidence: ev,
      });
      continue;
    }
    if (NEWS_DOMAINS.some((d) => endsWithDomain(host, d))) {
      signals.push({
        id: "news_domain", level: "ok", category: "source",
        title: { en: `Link is from a known news website (${host})`, hi: `लिंक जानी-मानी न्यूज़ वेबसाइट का है (${host})` },
        why: {
          en: "News reports facts and opinions. A news story is not a recommendation to buy or sell.",
          hi: "ख़बरें तथ्य और राय बताती हैं। कोई ख़बर ख़रीदने-बेचने की सलाह नहीं होती।",
        },
        evidence: ev,
      });
      continue;
    }
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
      signals.push({
        id: "ip_link", level: "red", category: "source",
        title: { en: "Link uses a bare number address instead of a website name", hi: "लिंक में वेबसाइट के नाम की जगह सिर्फ़ नंबर हैं" },
        why: { en: "Genuine financial companies don't send links like this. It is a common sign of phishing.", hi: "असली वित्तीय कंपनियाँ ऐसे लिंक नहीं भेजतीं। यह फ़िशिंग का आम संकेत है।" },
        evidence: ev, term: "phishing",
      });
    }
    if (/\.apk(\?|$)/i.test(u.pathname)) {
      signals.push({
        id: "apk_link", level: "red", category: "source",
        title: { en: "Link downloads an app file (.apk) directly", hi: "लिंक सीधे ऐप फ़ाइल (.apk) डाउनलोड करता है" },
        why: { en: "Apps from outside the Play Store can steal data or show fake profits. Install trading apps only from the official store.", hi: "Play Store के बाहर से आए ऐप डेटा चुरा सकते हैं या नकली मुनाफ़ा दिखा सकते हैं। ट्रेडिंग ऐप सिर्फ़ आधिकारिक स्टोर से इंस्टॉल करें।" },
        evidence: ev, term: "fake_app",
      });
    }
    if (SHORTENERS.some((d) => endsWithDomain(host, d))) {
      signals.push({
        id: "short_link", level: "orange", category: "source",
        title: { en: "Shortened link hides where it goes", hi: "छोटा किया गया लिंक असली पता छिपाता है" },
        why: { en: "You can't see the real website before opening it. Be careful what you enter after opening.", hi: "खोलने से पहले असली वेबसाइट नहीं दिखती। खोलने के बाद कुछ भी भरने में सावधानी रखें।" },
        evidence: ev, term: "phishing",
      });
    }
    if (endsWithDomain(host, "t.me") || endsWithDomain(host, "telegram.me") || endsWithDomain(host, "chat.whatsapp.com")) {
      signals.push({
        id: "private_group", level: "orange", category: "source",
        title: { en: "Invites you into a private group", hi: "किसी प्राइवेट ग्रुप में बुलाया जा रहा है" },
        why: { en: "Many tip scams start with a free group, then push paid \"VIP\" tips or fake apps. Nothing said inside is checked by anyone.", hi: "कई टिप वाले धोखे मुफ़्त ग्रुप से शुरू होकर पेड \"VIP\" टिप या नकली ऐप तक ले जाते हैं। अंदर कही गई किसी बात की कोई जाँच नहीं करता।" },
        evidence: ev,
      });
    }
    const brand = BRANDS.find((b) => host.includes(b));
    if (brand && !(BRAND_OFFICIAL[brand] ?? []).some((d) => endsWithDomain(host, d))) {
      signals.push({
        id: "lookalike_domain", level: "red", category: "source",
        title: { en: `Website looks like \"${brand}\" but is not its official site`, hi: `वेबसाइट \"${brand}\" जैसी दिखती है पर उसकी आधिकारिक साइट नहीं है` },
        why: { en: "Fake sites copy well-known names to steal logins or money.", hi: "नकली साइटें लॉगिन या पैसा चुराने के लिए मशहूर नामों की नकल करती हैं।" },
        evidence: [...ev, { en: `Official: ${(BRAND_OFFICIAL[brand] ?? []).join(", ")}`, hi: `आधिकारिक: ${(BRAND_OFFICIAL[brand] ?? []).join(", ")}` }],
        term: "phishing",
      });
    }
    if (u.protocol === "http:") {
      signals.push({
        id: "no_https", level: "info", category: "source",
        title: { en: "Link is not secure (http, not https)", hi: "लिंक सुरक्षित नहीं है (https नहीं)" },
        why: { en: "Don't type passwords or payment details on such pages.", hi: "ऐसे पेज पर पासवर्ड या पेमेंट की जानकारी न डालें।" },
        evidence: ev,
      });
    }
  }

  // --- UPI IDs ---------------------------------------------------------------
  for (const upi of extractUpiIds(text)) {
    if (isValidSebiUpi(upi)) {
      signals.push({
        id: "upi_valid", level: "ok", category: "source",
        title: { en: `${upi} looks like a SEBI-verified \"@valid\" UPI ID`, hi: `${upi} SEBI-सत्यापित \"@valid\" UPI ID जैसा है` },
        why: {
          en: "SEBI-registered intermediaries (brokers, mutual funds, portfolio managers and others) collect money through special @valid UPI IDs. Confirm it on SEBI Check before paying.",
          hi: "SEBI-रजिस्टर्ड संस्थाएँ (ब्रोकर, म्यूचुअल फ़ंड, पोर्टफ़ोलियो मैनेजर आदि) ख़ास @valid UPI ID से पैसा लेती हैं। पेमेंट से पहले SEBI Check पर पक्का करें।",
        },
        link: { label: { en: "Open SEBI Check", hi: "SEBI Check खोलें" }, href: "https://siportal.sebi.gov.in/intermediary/sebi-check" },
        term: "upi_valid",
      });
    } else {
      signals.push({
        id: "upi_not_valid", level: "red", category: "source",
        title: { en: `Asks for payment to an ordinary UPI ID (${upi})`, hi: `सामान्य UPI ID (${upi}) पर पेमेंट माँगा गया` },
        why: {
          en: "SEBI-registered market intermediaries now collect investors' money through special \"@valid\" UPI IDs. This is not one of them, so the money may be going to an individual.",
          hi: "SEBI-रजिस्टर्ड बाज़ार संस्थाएँ अब निवेशकों से पैसा ख़ास \"@valid\" UPI ID से लेती हैं। यह वैसी ID नहीं है, इसलिए पैसा किसी व्यक्ति के पास जा सकता है।",
        },
        action: { en: "Don't pay. Check the UPI ID on SEBI Check.", hi: "पेमेंट न करें। SEBI Check पर UPI ID जाँचें।" },
        link: { label: { en: "Open SEBI Check", hi: "SEBI Check खोलें" }, href: "https://siportal.sebi.gov.in/intermediary/sebi-check" },
        term: "upi_valid",
      });
    }
  }

  void ytChannel;
  return { signals };
}

/** YouTube details: oEmbed (no key) and, if YOUTUBE_API_KEY is set, views/description. */
export async function fetchYoutube(url: string): Promise<{ title?: string; channel?: string; views?: number; published?: string; description?: string } | null> {
  const id = youtubeId(url);
  if (!id) return null;
  const out: { title?: string; channel?: string; views?: number; published?: string; description?: string } = {};
  const key = process.env.YOUTUBE_API_KEY;
  if (key) {
    try {
      const r = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${id}&key=${key}`, { signal: AbortSignal.timeout(6000) });
      const j = await r.json();
      const it = j.items?.[0];
      if (it) {
        out.title = it.snippet?.title;
        out.channel = it.snippet?.channelTitle;
        out.published = it.snippet?.publishedAt;
        out.description = (it.snippet?.description ?? "").slice(0, 3000);
        out.views = Number(it.statistics?.viewCount) || undefined;
        return out;
      }
    } catch { /* fall through to oEmbed */ }
  }
  const [oe, page] = await Promise.allSettled([
    fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent("https://www.youtube.com/watch?v=" + id)}`, { signal: AbortSignal.timeout(5000) }).then((r) => (r.ok ? r.json() : null)),
    // The public watch page also carries the upload date, description and view count (no key needed).
    fetch(`https://www.youtube.com/watch?v=${id}&hl=en`, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "Accept-Language": "en-IN,en;q=0.9" }, signal: AbortSignal.timeout(6000) }).then((r) => (r.ok ? r.text() : null)),
  ]);
  if (oe.status === "fulfilled" && oe.value) {
    out.title = oe.value.title;
    out.channel = oe.value.author_name;
  }
  if (page.status === "fulfilled" && page.value) {
    const html = page.value;
    const date = html.match(/"(?:uploadDate|publishDate)"\s*:\s*"([^"]+)"/)?.[1] ?? html.match(/itemprop="(?:uploadDate|datePublished)"\s+content="([^"]+)"/)?.[1];
    if (date && !isNaN(+new Date(date))) out.published = new Date(date).toISOString();
    const desc = html.match(/"shortDescription"\s*:\s*"((?:[^"\\]|\\.)*)"/)?.[1];
    if (desc) {
      try { out.description = JSON.parse(`"${desc}"`).slice(0, 3000); } catch { /* ignore */ }
    }
    const views = html.match(/"viewCount"\s*:\s*"(\d+)"/)?.[1];
    if (views) out.views = Number(views);
    if (!out.title) out.title = html.match(/<meta name="title" content="([^"]+)"/)?.[1];
    if (!out.channel) out.channel = html.match(/"ownerChannelName"\s*:\s*"([^"]+)"/)?.[1];
  }
  return out.title || out.published ? out : null;
}
