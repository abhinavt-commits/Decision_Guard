import { translateHeadlines } from "./engine/gemini";

/**
 * Fraud & awareness alerts.
 * Sources (in order of trust):
 *  1. Official: SEBI RSS feed (filtered to investor-protection items).
 *  2. News: Google News RSS (English + Hindi), filtered by fraud keywords and to known news outlets.
 * Plus a fixed list of government measures (always shown, works offline).
 * Nothing here is investment advice; items are facts with a link to the source.
 */

import type { AlertItem, AlertTopic } from "./alerts-shared";
export type { AlertItem } from "./alerts-shared";

// ---- Keyword filters -------------------------------------------------------------------

const FRAUD = /\b(fraud|scam|scammer|cheat(ed|ing)?|duped|con(ned)?|fake|bogus|impersonat\w*|ponzi|unregistered|unauthori[sz]ed|misleading|deepfake|phishing|cyber ?crime|duping|swindl\w*|investment (trap|racket)|tip(s)? (group|racket)|pump[- ]and[- ]dump|finfluencer|caution(s|ary)?|beware|alert)\b|ठगी|धोखाधड़ी|धोखा|फर्जी|फ़र्ज़ी|ठग|साइबर अपराध|नकली|सावधान/i;
const MARKET = /\b(stock|share|trading|trader|invest\w*|demat|ipo|sebi|nse|bse|mutual fund|f&o|broker|market|crypto|app)\b|शेयर|निवेश|ट्रेडिंग|सेबी|बाज़ार|बाजार|आईपीओ|डीमैट/i;
const NOT_RELEVANT = /\b(target price|stocks to buy|buy or sell|top picks|multibagger|share price today|sensex today|nifty today|q[1-4] results)\b/i;
const GOVT = /\b(sebi|rbi|nse|bse|police|ed\b|cbi|i4c|mha|government|govt|ministry|court|arrest\w*|bars?|bans?|banned|penal(ty|ised|ized)|order(s|ed)?|crackdown|blocks?|blocked|advisory|cautions?|attach\w*|raid\w*|book(s|ed)|fir|launch(es|ed)?|campaign|awareness)\b|गिरफ्तार|गिरफ़्तार|पुलिस|सेबी|प्रतिबंध|कार्रवाई|जुर्माना|एफआईआर|अभियान/i;

const TOPICS: [AlertTopic, RegExp][] = [
  ["deepfake", /deepfake|deep fake|ai[- ]generated|morphed|डीपफेक/i],
  ["fake_app", /\b(app|apk|application|platform|website|portal|institutional account)\b|ऐप|एप|वेबसाइट/i],
  ["impersonation", /impersonat|posing as|fake (sebi|broker|advis|official)|in the name of (sebi|nse|bse|rbi)|फर्जी अधिकारी|सेबी के नाम/i],
  ["tip_group", /whatsapp|telegram|tips?\b|group|finfluencer|advis(e|or|ory) (firm|service)|research analyst|ग्रुप|टिप/i],
  ["ponzi", /ponzi|chit|collective investment|assured return|guaranteed return|double (your )?money|पैसा डबल|पोंजी/i],
];

// Known outlets for the news layer (others are dropped).
const OUTLETS = /economic times|the economic times|mint|livemint|business standard|moneycontrol|hindu businessline|businessline|financial express|the hindu|times of india|hindustan times|ndtv|india today|indian express|reuters|pti|press trust|cnbc|zee business|business today|deccan herald|news18|dainik bhaskar|amar ujala|dainik jagran|jagran|navbharat times|livehindustan|hindustan|aaj tak|abp|pib|press information bureau/i;

function decode(s: string) {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/<[^>]+>/g, "").trim();
}
function tag(xml: string, t: string) {
  return decode((xml.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)) ?? [])[1] ?? "");
}
function parseDate(s: string): string | undefined {
  if (!s) return undefined;
  const d1 = new Date(s);
  if (!isNaN(+d1)) return d1.toISOString();
  const m = s.match(/(\d{1,2}) ([A-Za-z]{3}),? (\d{4})/); // SEBI: "01 Oct, 2026 +0530"
  if (m) {
    const d = new Date(`${m[2]} ${m[1]} ${m[3]} 12:00 GMT+0530`);
    if (!isNaN(+d)) return d.toISOString();
  }
  return undefined;
}
const hash = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
};

function classify(title: string): { topic: AlertTopic; govtAction: boolean } {
  const govtAction = GOVT.test(title);
  const topic = TOPICS.find(([, re]) => re.test(title))?.[0] ?? (govtAction ? "govt_action" : "other");
  return { topic, govtAction };
}

async function fetchText(url: string): Promise<string> {
  const r = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (DecisionGuard awareness feed)" },
    signal: AbortSignal.timeout(7000),
    next: { revalidate: 3600 },
  } as RequestInit);
  if (!r.ok) throw new Error(String(r.status));
  return r.text();
}

async function sebiFeed(): Promise<AlertItem[]> {
  const xml = await fetchText("https://www.sebi.gov.in/sebirss.xml");
  const SEBI_KEEP = /unregistered|unauthori[sz]ed|investment advis|research analyst|caution|beware|fraud|misleading|finfluencer|telegram|whatsapp|ponzi|collective investment|impersonat|fake|investor awareness|press release|social media|guaranteed|assured/i;
  return xml.split("<item>").slice(1, 80).flatMap((it) => {
    const title = tag(it, "title");
    if (!title || !SEBI_KEEP.test(title)) return [];
    const link = tag(it, "link");
    return [{ id: "sebi-" + hash(link || title), title, source: "SEBI", date: parseDate(tag(it, "pubDate")), link: link || "https://www.sebi.gov.in", kind: "official" as const, lang: "en" as const, ...classify(title), govtAction: true }];
  });
}

async function newsFeed(q: string, lang: "en" | "hi"): Promise<AlertItem[]> {
  const hl = lang === "hi" ? "hi&gl=IN&ceid=IN:hi" : "en-IN&gl=IN&ceid=IN:en";
  const xml = await fetchText(`https://news.google.com/rss/search?q=${encodeURIComponent(q + " when:30d")}&hl=${hl}`);
  return xml.split("<item>").slice(1, 40).flatMap((it) => {
    let title = tag(it, "title");
    const source = tag(it, "source");
    if (source && title.endsWith(" - " + source)) title = title.slice(0, -(source.length + 3));
    if (!title || !FRAUD.test(title) || !MARKET.test(title) || NOT_RELEVANT.test(title)) return [];
    if (!OUTLETS.test(source)) return [];
    const link = tag(it, "link");
    return [{ id: "n-" + hash(title), title, source, date: parseDate(tag(it, "pubDate")), link, kind: "news" as const, lang, ...classify(title) }];
  });
}

const QUERIES: [string, "en" | "hi"][] = [
  ["stock market fraud India investors", "en"],
  ["fake trading app fraud arrested", "en"],
  ["SEBI unregistered investment advisers action", "en"],
  ["WhatsApp Telegram stock tips scam", "en"],
  ["शेयर बाजार ठगी", "hi"],
  ["फर्जी ट्रेडिंग ऐप ठगी", "hi"],
];

let cache: { at: number; items: AlertItem[]; sources: { ok: number; failed: number } } | null = null;

export async function getAlerts(): Promise<{ items: AlertItem[]; sources: { ok: number; failed: number }; fetchedAt: string }> {
  if (cache && Date.now() - cache.at < 60 * 60 * 1000) return { ...cache, fetchedAt: new Date(cache.at).toISOString() };
  const jobs = [sebiFeed(), ...QUERIES.map(([q, l]) => newsFeed(q, l))];
  const res = await Promise.allSettled(jobs);
  const all: AlertItem[] = [];
  let ok = 0, failed = 0;
  for (const r of res) {
    if (r.status === "fulfilled") { ok++; all.push(...r.value); } else failed++;
  }
  // De-duplicate similar headlines, newest first, official first on ties.
  const seen = new Set<string>();
  const items = all
    .filter((a) => {
      const key = a.title.toLowerCase().replace(/[^a-z0-9ऀ-ॿ]/g, "").slice(0, 60);
      if (seen.has(key)) return false;
      seen.add(key);
      return !a.date || Date.now() - +new Date(a.date) < 60 * 86400000;
    })
    .sort((a, b) => (+new Date(b.date ?? 0) - +new Date(a.date ?? 0)) || (a.kind === "official" ? -1 : 1))
    .slice(0, 30);
  // Optional: headlines in both languages (only translation, no new facts).
  try {
    const tr = await translateHeadlines(items.slice(0, 20).map((i) => ({ id: i.id, title: i.title, lang: i.lang })));
    for (const i of items) if (tr[i.id]) i.titleBi = tr[i.id];
  } catch { /* keep originals */ }
  if (ok > 0) cache = { at: Date.now(), items, sources: { ok, failed } };
  return { items, sources: { ok, failed }, fetchedAt: new Date().toISOString() };
}

