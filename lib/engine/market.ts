import type { MarketContext, Signal } from "../types";
import { resolveStock } from "../stock-universe";

/**
 * Public facts about the company, for context only. No predictions.
 * Prices: Yahoo Finance chart API (free, no key). News: Google News RSS.
 * Both fail gracefully.
 */

async function fetchPrices(yahoo: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahoo)}?range=2y&interval=1d`;
  const r = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (DecisionGuard)" },
    signal: AbortSignal.timeout(6000),
    next: { revalidate: 900 },
  } as RequestInit);
  if (!r.ok) throw new Error("price " + r.status);
  const j = await r.json();
  const res = j.chart?.result?.[0];
  const rawCloses: (number | null)[] = res?.indicators?.quote?.[0]?.close ?? [];
  const ts: number[] = res?.timestamp ?? [];
  // Pair each close with its date (2 years) — used to show how the price moved since a tip was published.
  const series = ts.map((t, i) => ({ t: t * 1000, c: rawCloses[i] })).filter((x): x is { t: number; c: number } => typeof x.c === "number");
  const closes = series.slice(-252).map((x) => x.c); // last ~1 year for the statistics
  if (closes.length < 30) throw new Error("not enough data");
  return { closes, series, price: res.meta?.regularMarketPrice ?? closes[closes.length - 1], currency: res.meta?.currency ?? "INR", lastTs: ts[ts.length - 1] };
}

function decodeXml(s: string) {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
}

async function fetchNews(q: string, lang: "en" | "hi") {
  const hl = lang === "hi" ? "hi&gl=IN&ceid=IN:hi" : "en-IN&gl=IN&ceid=IN:en";
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q + " when:14d")}&hl=${hl}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(6000), next: { revalidate: 1800 } } as RequestInit);
  if (!r.ok) throw new Error("news " + r.status);
  const xml = await r.text();
  const items = xml.split("<item>").slice(1, 7);
  return items.map((it) => {
    const get = (tag: string) => decodeXml((it.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`)) ?? [])[1] ?? "");
    const title = get("title");
    const source = get("source");
    return { title: source && title.endsWith(" - " + source) ? title.slice(0, -(source.length + 3)) : title, source, date: get("pubDate"), link: get("link") };
  }).filter((x) => x.title);
}

export async function getMarketContext(symbol: string, lang: "en" | "hi", offline = false): Promise<MarketContext | undefined> {
  const stock = resolveStock(symbol);
  if (!stock) return undefined;
  const ctx: MarketContext = { symbol, name: stock.name, live: false, headlines: [], note: stock.note, series: stock.series, sme: stock.sme, exchange: stock.exchange };
  if (offline) return ctx;

  const [p, n] = await Promise.allSettled([fetchPrices(stock.yahoo), fetchNews(stock.newsQuery, lang)]);
  if (p.status === "fulfilled") {
    const { closes, price, currency, lastTs, series } = p.value;
    ctx._series = series;
    const last = closes[closes.length - 1];
    const m1 = closes[Math.max(0, closes.length - 22)];
    const rets = closes.slice(1).map((c, i) => Math.abs(c / closes[i] - 1));
    const sorted = [...rets].sort((a, b) => a - b);
    let bestRise = -Infinity, worstFall = Infinity;
    for (let i = 21; i < closes.length; i++) {
      const r = closes[i] / closes[i - 21] - 1;
      bestRise = Math.max(bestRise, r);
      worstFall = Math.min(worstFall, r);
    }
    Object.assign(ctx, {
      live: true,
      price,
      currency,
      change1m: (last / m1 - 1) * 100,
      high1y: Math.max(...closes),
      low1y: Math.min(...closes),
      typicalDailyMove: sorted[Math.floor(sorted.length / 2)] * 100,
      biggestMonthRise1y: bestRise * 100,
      biggestMonthFall1y: worstFall * 100,
      asOf: lastTs ? new Date(lastTs * 1000).toISOString() : undefined,
    });
  }
  if (n.status === "fulfilled") ctx.headlines = n.value;
  return ctx;
}

const pct = (x: number) => `${x >= 0 ? "+" : ""}${x.toFixed(1)}%`;

/** Turns market facts into explainable signals (context, not prediction). */
export function marketSignals(
  ctx: MarketContext | undefined,
  claim: { promisedPercent?: number; promisedDays?: number; eventWords: string[] }
): { signals: Signal[]; notChecked: { en: string; hi: string }[] } {
  const signals: Signal[] = [];
  const notChecked: { en: string; hi: string }[] = [];
  if (!ctx) {
    notChecked.push({
      en: "Company facts: this company is not in our supported list yet, so we could not load its price or news.",
      hi: "कंपनी की जानकारी: यह कंपनी अभी हमारी सूची में नहीं है, इसलिए दाम या ख़बरें नहीं दिखा पाए।",
    });
    return { signals, notChecked };
  }

  if (ctx.note) {
    signals.push({
      id: "company_note", level: "info", category: "company",
      title: { en: "Something to know about this company's name", hi: "इस कंपनी के नाम के बारे में ज़रूरी बात" },
      why: ctx.note, term: "demerger",
    });
  }

  if (ctx.sme) {
    signals.push({
      id: "sme_stock", level: "orange", category: "company",
      title: { en: "This is a small company on the SME platform", hi: "यह SME प्लैटफ़ॉर्म पर लिस्टेड एक छोटी कंपनी है" },
      why: {
        en: "SME shares have fewer buyers and sellers and lighter disclosure rules, so their prices are easier to push up and down. Many \"pump and dump\" tips are about such shares.",
        hi: "SME शेयरों में ख़रीदार-बेचने वाले कम होते हैं और जानकारी देने के नियम हल्के होते हैं, इसलिए इनके दाम आसानी से ऊपर-नीचे किए जा सकते हैं। कई \"पंप एंड डंप\" टिप ऐसे ही शेयरों की होती हैं।",
      },
      term: "sme",
    });
  }
  if (ctx.series === "BE" || ctx.series === "BZ") {
    signals.push({
      id: "restricted_series", level: "orange", category: "company",
      title: { en: `NSE trades this share in a restricted category (${ctx.series})`, hi: `NSE इस शेयर को सीमित श्रेणी (${ctx.series}) में ट्रेड करता है` },
      why: {
        en: "Exchanges move shares to \"trade-for-trade\" for surveillance or when a company doesn't follow listing rules. You can't buy and sell the same day, and it can be hard to sell.",
        hi: "एक्सचेंज शेयरों को निगरानी के लिए या कंपनी के नियम न मानने पर \"ट्रेड-फ़ॉर-ट्रेड\" में डालते हैं। इसमें एक ही दिन ख़रीद-बिक्री नहीं हो सकती, और बेचना मुश्किल हो सकता है।",
      },
      term: "trade_for_trade",
    });
  }
  if (ctx.live && (ctx.price ?? 99) < 20) {
    signals.push({
      id: "penny_stock", level: "info", category: "company",
      title: { en: `Very low-priced share (₹${(ctx.price ?? 0).toFixed(2)})`, hi: `बहुत कम दाम वाला शेयर (₹${(ctx.price ?? 0).toFixed(2)})` },
      why: {
        en: "Low-priced (\"penny\") shares can jump or crash by large percentages on small trades, which makes them popular for hype and manipulation.",
        hi: "कम दाम वाले (\"पेनी\") शेयर थोड़े से ट्रेड से बड़े प्रतिशत में उछल या गिर सकते हैं, इसलिए इनका शोर मचाना और हेरफेर आसान होता है।",
      },
      term: "penny_stock",
    });
  }

  if (!ctx.live) {
    notChecked.push({ en: "Live share price could not be loaded right now.", hi: "अभी शेयर का लाइव दाम लोड नहीं हो पाया।" });
  } else {
    if (ctx.typicalDailyMove !== undefined) {
      signals.push({
        id: "volatility", level: "info", category: "company",
        title: {
          en: `On a typical day this share moves about ${ctx.typicalDailyMove.toFixed(1)}% up or down`,
          hi: `आम दिन में यह शेयर लगभग ${ctx.typicalDailyMove.toFixed(1)}% ऊपर या नीचे जाता है`,
        },
        why: {
          en: `Last 1 month: ${pct(ctx.change1m ?? 0)}. 1-year range: ₹${Math.round(ctx.low1y ?? 0)} – ₹${Math.round(ctx.high1y ?? 0)}. These are past facts, not a forecast.`,
          hi: `पिछला 1 महीना: ${pct(ctx.change1m ?? 0)}। 1 साल में दाम: ₹${Math.round(ctx.low1y ?? 0)} – ₹${Math.round(ctx.high1y ?? 0)}। ये पुराने तथ्य हैं, भविष्यवाणी नहीं।`,
        },
        term: "volatility",
      });
    }
    if (Math.abs(ctx.change1m ?? 0) >= 15) {
      signals.push({
        id: "recent_big_move", level: "info", category: "company",
        title: {
          en: `The price already moved ${pct(ctx.change1m ?? 0)} in the last month`,
          hi: `पिछले एक महीने में दाम पहले ही ${pct(ctx.change1m ?? 0)} बदल चुका है`,
        },
        why: {
          en: "Tips often spread after a big move has already happened. Fast moves can reverse as fast.",
          hi: "टिप अक्सर तब फैलती हैं जब बड़ी चाल पहले ही हो चुकी होती है। तेज़ चाल उतनी ही तेज़ी से पलट भी सकती है।",
        },
      });
    }
    if (claim.promisedPercent && ctx.biggestMonthRise1y !== undefined) {
      const promised = claim.promisedPercent;
      const best = ctx.biggestMonthRise1y;
      const days = claim.promisedDays;
      const shortWindow = !days || days <= 45;
      if (promised > best * 1.2 && shortWindow) {
        signals.push({
          id: "claim_vs_history", level: "orange", category: "company",
          title: {
            en: `The tip promises ${promised}%${days ? ` in ${days} days` : ""} — the biggest 1-month rise in the past year was ${pct(best)}`,
            hi: `टिप ${promised}%${days ? ` (${days} दिन में)` : ""} का वादा करती है — पिछले एक साल में सबसे बड़ी 1 महीने की बढ़त ${pct(best)} थी`,
          },
          why: {
            en: "This compares the promise with what actually happened in the last year. It does not tell what will happen next — it shows how unusual the promise is.",
            hi: "यह वादे की तुलना पिछले साल असल में हुए बदलाव से करता है। इससे आगे क्या होगा, यह नहीं पता चलता — बस यह दिखता है कि वादा कितना असामान्य है।",
          },
          evidence: [{
            en: `Biggest 1-month fall in the past year: ${pct(ctx.biggestMonthFall1y ?? 0)}`,
            hi: `पिछले एक साल में सबसे बड़ी 1 महीने की गिरावट: ${pct(ctx.biggestMonthFall1y ?? 0)}`,
          }],
        });
      }
    }
  }

  // News vs claimed events
  if (ctx.headlines.length === 0) {
    notChecked.push({ en: "Recent news could not be loaded right now.", hi: "अभी हाल की ख़बरें लोड नहीं हो पाईं।" });
  }
  const EVENT_KEYS: Record<string, RegExp> = {
    merger: /merg|विलय/i, acquisition: /acqui|takeover|अधिग्रहण/i, bonus: /bonus|बोनस/i, split: /split|demerg|स्प्लिट/i,
    buyback: /buy\s*back|बायबैक/i, order: /order|contract|deal|ऑर्डर/i, dividend: /dividend|डिविडेंड|लाभांश/i,
    results: /result|profit|quarter|q[1-4]|नतीजे|तिमाही|मुनाफ/i,
  };
  for (const w of claim.eventWords) {
    if (ctx.headlines.length === 0) break;
    const re = EVENT_KEYS[w];
    const match = ctx.headlines.find((h) => re?.test(h.title));
    signals.push(match ? {
      id: "event_in_news", level: "ok", category: "company",
      title: { en: `We found news mentioning \"${w}\"`, hi: `\"${w}\" से जुड़ी ख़बर मिली` },
      why: {
        en: "The event mentioned in the tip appears in recent news. Read the original news — the tip's conclusion may still be exaggerated.",
        hi: "टिप में बताई गई बात हाल की ख़बरों में है। असली ख़बर पढ़ें — टिप का नतीजा फिर भी बढ़ा-चढ़ाकर हो सकता है।",
      },
      evidence: [{ en: `${match.title} (${match.source ?? ""})`, hi: `${match.title} (${match.source ?? ""})` }],
    } : {
      id: "event_not_in_news", level: "orange", category: "company",
      title: { en: `Tip mentions \"${w}\", but we found no matching recent news`, hi: `टिप में \"${w}\" की बात है, पर हाल की ख़बरों में ऐसा कुछ नहीं मिला` },
      why: {
        en: "Real company events (mergers, bonus, big orders) are announced to the stock exchange and reported in the news. We could not find it in the last 14 days of news.",
        hi: "कंपनी की असली घटनाएँ (विलय, बोनस, बड़े ऑर्डर) स्टॉक एक्सचेंज को बताई जाती हैं और ख़बरों में आती हैं। पिछले 14 दिनों की ख़बरों में हमें यह नहीं मिला।",
      },
      action: { en: "Check the company's announcements on nseindia.com or bseindia.com.", hi: "nseindia.com या bseindia.com पर कंपनी की घोषणाएँ देखें।" },
      link: { label: { en: "NSE announcements", hi: "NSE घोषणाएँ" }, href: "https://www.nseindia.com/companies-listing/corporate-filings-announcements" },
    });
  }
  return { signals, notChecked };
}
