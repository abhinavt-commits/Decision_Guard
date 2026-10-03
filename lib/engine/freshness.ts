import type { Bi, CheckInput, CheckResult, MarketContext, Signal } from "../types";
import { parseDate } from "../client/csv";

/**
 * "How old is this tip?" Share prices and company news change fast, so an old video or message
 * forwarded today can be badly out of date. We look for the publish date, compare the price
 * mentioned in the tip with today's price, and show how the share moved since the tip was made.
 * All facts about the past — never a prediction.
 */

const DAY = 86400000;
const inr = (n: number) => "₹" + (n >= 100 ? Math.round(n).toLocaleString("en-IN") : n.toFixed(2));
const pct = (x: number) => `${x >= 0 ? "+" : ""}${x.toFixed(1)}%`;

function fmtDate(d: Date, lang: "en" | "hi") {
  return d.toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function ageText(days: number): Bi {
  if (days < 1) return { en: "today", hi: "आज" };
  if (days < 14) return { en: `${days} day${days > 1 ? "s" : ""} ago`, hi: `${days} दिन पहले` };
  if (days < 60) return { en: `${Math.round(days / 7)} weeks ago`, hi: `${Math.round(days / 7)} हफ़्ते पहले` };
  if (days < 730) return { en: `${Math.round(days / 30)} months ago`, hi: `${Math.round(days / 30)} महीने पहले` };
  return { en: `${(days / 365).toFixed(1)} years ago`, hi: `${(days / 365).toFixed(1)} साल पहले` };
}

/** Dates inside a link (…/2025/09/14/… or …-20250914…) or written in the message. */
export function detectDate(text: string, url: string | undefined, now: number): { date: Date; from: "link" | "message" } | null {
  const ok = (d: Date | null) => d && !isNaN(+d) && +d <= now + DAY && d.getFullYear() >= 2015;
  if (url) {
    const m = url.match(/(20[12]\d)[/_-](0?[1-9]|1[0-2])[/_-](0?[1-9]|[12]\d|3[01])(?!\d)/) ?? url.match(/(20[12]\d)(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])(?!\d)/);
    if (m) {
      const d = new Date(+m[1], +m[2] - 1, +m[3], 12);
      if (ok(d)) return { date: d, from: "link" };
    }
  }
  const cands = text.match(/\b(\d{1,2}[-/. ](?:\d{1,2}|[A-Za-z]{3,9})[-/., ]+\d{2,4}|[A-Za-z]{3,9} \d{1,2},? \d{4}|20[12]\d-\d{2}-\d{2})\b/g) ?? [];
  const dates = cands.map((c) => parseDate(c)).filter((d): d is Date => Boolean(ok(d)));
  if (dates.length) return { date: new Date(Math.max(...dates.map((d) => +d))), from: "message" };
  return null;
}

/** Prices the tip gives as an entry/current price, e.g. "buy @ 120", "CMP 450", "entry around ₹410". */
export function tipPrices(text: string): number[] {
  const out: number[] = [];
  const re = /(?:\b(?:buy|kharido|entry|enter|cmp|ltp|current price)(?:\s+(?:at|above|below|near|around|range))?|@|भाव|ख़रीदें|खरीदें)\s*[:=-]?\s*(?:rs\.?|₹|inr)?\s*(\d{1,6}(?:\.\d{1,2})?)(?![\d%])(?!\s*(?:%|am|pm|baje|बजे|days?|din|दिन))/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const v = parseFloat(m[1]);
    if (v >= 1 && v < 500000) out.push(v);
  }
  return out.slice(0, 3);
}

export function analyseFreshness(opts: {
  input: CheckInput;
  text: string;
  youtubePublished?: string;
  market?: MarketContext;
  urgency: boolean;
  now?: number;
}): { signals: Signal[]; notChecked: Bi[]; freshness: NonNullable<CheckResult["freshness"]> } {
  const now = opts.now ?? Date.now();
  const signals: Signal[] = [];
  const notChecked: Bi[] = [];
  const { input, market } = opts;

  let date: Date | null = null;
  let from: NonNullable<CheckResult["freshness"]>["from"] = "none";
  if (opts.youtubePublished && !isNaN(+new Date(opts.youtubePublished))) { date = new Date(opts.youtubePublished); from = "youtube"; }
  else {
    const d = detectDate(opts.text, input.url, now);
    if (d) { date = d.date; from = d.from; }
  }
  const ageDays = date ? Math.max(0, Math.floor((now - +date) / DAY)) : undefined;
  const level: NonNullable<CheckResult["freshness"]>["level"] =
    ageDays === undefined ? "unknown" : ageDays <= 7 ? "fresh" : ageDays <= 30 ? "weeks" : ageDays <= 180 ? "months" : "old";

  const FROM: Record<string, Bi> = {
    youtube: { en: "YouTube upload date", hi: "YouTube पर अपलोड की तारीख़" },
    link: { en: "date in the link", hi: "लिंक में लिखी तारीख़" },
    message: { en: "date written in the message", hi: "मैसेज में लिखी तारीख़" },
  };

  if (date && ageDays !== undefined) {
    const when = { en: `${fmtDate(date, "en")} (${ageText(ageDays).en})`, hi: `${fmtDate(date, "hi")} (${ageText(ageDays).hi})` };
    if (level === "fresh") {
      signals.push({
        id: "source_age", level: "ok", category: "message",
        title: { en: `Recent: published ${ageText(ageDays).en}`, hi: `हाल का: ${ageText(ageDays).hi} प्रकाशित` },
        why: { en: "The tip is recent, so it talks about roughly today's situation.", hi: "टिप हाल की है, इसलिए यह लगभग आज की स्थिति की बात करती है।" },
        evidence: [{ en: `${FROM[from].en}: ${when.en}`, hi: `${FROM[from].hi}: ${when.hi}` }],
      });
    } else {
      signals.push({
        id: "source_age", level: level === "weeks" ? "info" : "orange", category: "message",
        title: level === "weeks"
          ? { en: `Published ${ageText(ageDays).en} — check what has changed`, hi: `${ageText(ageDays).hi} प्रकाशित — देखें क्या बदला है` }
          : { en: `Old tip: published ${ageText(ageDays).en}`, hi: `पुरानी टिप: ${ageText(ageDays).hi} प्रकाशित` },
        why: {
          en: "Share prices, company results and market mood change quickly. Advice that made sense then may not fit today — and old videos are often forwarded as if they were new.",
          hi: "शेयर के दाम, कंपनी के नतीजे और बाज़ार का माहौल जल्दी बदलते हैं। जो बात तब ठीक लगती थी, वह आज शायद सही न हो — और पुराने वीडियो अक्सर नए बताकर फ़ॉरवर्ड किए जाते हैं।",
        },
        evidence: [
          { en: `${FROM[from].en}: ${when.en}`, hi: `${FROM[from].hi}: ${when.hi}` },
          ...(opts.urgency && ageDays > 30 ? [{ en: "It asks you to act quickly, but it is not recent.", hi: "यह जल्दी करने को कहती है, पर यह हाल की नहीं है।" }] : []),
        ],
        action: { en: "Look for recent news about the company before acting on an old tip.", hi: "पुरानी टिप पर कुछ करने से पहले कंपनी की हाल की ख़बरें देखें।" },
        term: "stale_tip",
      });
    }

    // Old content passed on as new (common on WhatsApp)
    if ((input.tipAge === "today" || input.tipAge === "week") && ageDays > 90) {
      signals.push({
        id: "old_forwarded_as_new", level: "orange", category: "source",
        title: { en: "Old content shared with you as if it were new", hi: "पुरानी चीज़ आपको नई बताकर भेजी गई" },
        why: {
          en: `You got this ${input.tipAge === "today" ? "today" : "this week"}, but it was made ${ageText(ageDays).en}. Re-sharing old "success" videos is a common way to create false urgency.`,
          hi: `आपको यह ${input.tipAge === "today" ? "आज" : "इस हफ़्ते"} मिली, पर यह ${ageText(ageDays).hi} बनी थी। पुराने "कामयाबी" वाले वीडियो दोबारा भेजकर झूठी जल्दबाज़ी पैदा करना आम तरीका है।`,
        },
      });
    }

    // How the share moved since the tip was published (fact, not forecast)
    const series = market?._series;
    if (series?.length && market?.price && ageDays >= 2) {
      const first = series[0];
      const at = series.find((x) => x.t >= +date!) ?? null;
      if (at) {
        const ch = (market.price / at.c - 1) * 100;
        signals.push({
          id: "moved_since_tip", level: Math.abs(ch) >= 15 && ageDays > 14 ? "orange" : "info", category: "company",
          title: {
            en: `Since it was published, the share has moved ${pct(ch)}`,
            hi: `प्रकाशित होने के बाद से शेयर ${pct(ch)} बदल चुका है`,
          },
          why: {
            en: "If a lot of the move has already happened, the reason given in the tip may no longer apply. This is past data, not a forecast.",
            hi: "अगर बड़ी चाल पहले ही हो चुकी है, तो टिप में बताई वजह अब शायद लागू न हो। यह पुराना डेटा है, भविष्यवाणी नहीं।",
          },
          evidence: [{
            en: `${inr(at.c)} on ${fmtDate(new Date(at.t), "en")} → ${inr(market.price)} now`,
            hi: `${fmtDate(new Date(at.t), "hi")} को ${inr(at.c)} → अभी ${inr(market.price)}`,
          }],
        });
      } else if (+date < first.t) {
        notChecked.push({ en: "Price change since the tip: it is older than the 2 years of price data we have.", hi: "टिप के बाद दाम में बदलाव: टिप हमारे 2 साल के दाम के डेटा से भी पुरानी है।" });
      }
    }
  } else {
    // No date found: use what the user told us, or say we couldn't tell.
    if (input.tipAge === "older" || input.tipAge === "month") {
      signals.push({
        id: "source_age_user", level: input.tipAge === "older" ? "orange" : "info", category: "message",
        title: input.tipAge === "older"
          ? { en: "You got this tip more than a month ago", hi: "आपको यह टिप एक महीने से ज़्यादा पहले मिली" }
          : { en: "You got this tip within the last month", hi: "आपको यह टिप पिछले महीने के अंदर मिली" },
        why: { en: "Prices and company news may have changed since then. Check what is new before acting.", hi: "तब से दाम और कंपनी की ख़बरें बदल सकती हैं। कुछ करने से पहले देखें क्या नया है।" },
        term: "stale_tip",
      });
    }
    if (input.url || (input.message ?? "").length > 20) {
      notChecked.push({
        en: "When this was first published — no date found. Check the post/video date yourself; old tips are often forwarded as new.",
        hi: "यह पहली बार कब प्रकाशित हुई — कोई तारीख़ नहीं मिली। पोस्ट/वीडियो की तारीख़ ख़ुद देखें; पुरानी टिप अक्सर नई बताकर भेजी जाती है।",
      });
    }
  }

  // Price written in the tip vs today's price
  const prices = tipPrices(opts.text);
  if (prices.length && market?.price) {
    const p = prices[0];
    const gap = (market.price / p - 1) * 100;
    if (Math.abs(gap) >= 15) {
      signals.push({
        id: "tip_price_gap", level: "orange", category: "company",
        title: { en: `The tip's price (${inr(p)}) is far from today's price (${inr(market.price)})`, hi: `टिप का दाम (${inr(p)}) आज के दाम (${inr(market.price)}) से बहुत अलग है` },
        why: {
          en: "Either the tip is old, the price has already moved a lot, or it is about a different share. Don't act on an outdated price.",
          hi: "या तो टिप पुरानी है, दाम पहले ही बहुत बदल चुका है, या यह किसी दूसरे शेयर की बात है। पुराने दाम के भरोसे कुछ न करें।",
        },
        evidence: [{ en: `Difference: ${pct(gap)}`, hi: `अंतर: ${pct(gap)}` }],
        term: "stale_tip",
      });
    }
  }

  return { signals, notChecked, freshness: { date: date?.toISOString(), ageDays, from, level } };
}
