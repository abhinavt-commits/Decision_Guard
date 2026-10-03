// Shared types for the Decision Guard app.

export type Lang = "en" | "hi";
export type Bi = { en: string; hi: string };

export type SourceType =
  | "youtube"
  | "whatsapp"
  | "telegram"
  | "instagram"
  | "friend"
  | "news"
  | "influencer"
  | "sms"
  | "other";

export type ReasonChip =
  | "recommended"
  | "news"
  | "recover_loss"
  | "friends_buying"
  | "price_falling"
  | "own_research"
  | "fear_missing";

/** A completed (closed) trade in the user's history. */
export interface PastTrade {
  id: string;
  date: string; // ISO date of exit (or entry for open buys)
  symbol: string;
  side: "BUY" | "SELL";
  qty: number;
  price: number;
  amount: number; // money put in (₹)
  pnl: number | null; // profit/loss in ₹ for closed trades; null if still open
}

export interface CheckInput {
  symbol: string; // stock symbol from our list, or "OTHER"
  otherName?: string;
  stockName?: Bi; // display name for companies outside the curated list
  side: "BUY" | "SELL";
  qty: number;
  amount?: number; // ₹ (optional, computed from price if missing)
  sourceType: SourceType;
  knowsSender?: "yes" | "no" | "unsure";
  sourceName?: string; // name of the person/channel giving the tip (optional)
  url?: string;
  message?: string; // pasted text, OCR text or voice transcript
  views?: number; // optional, if user typed the view/follower count
  tipAge?: "today" | "week" | "month" | "older" | "unknown"; // when the user got / saw the tip
  reasonChips: ReasonChip[];
  reasonText?: string;
  lang: Lang;
}

export type Level = "red" | "orange" | "ok" | "info";
export type Category = "message" | "source" | "behaviour" | "company";

export interface Signal {
  id: string;
  level: Level;
  category: Category;
  title: Bi;
  why: Bi; // why it matters, in simple words
  evidence?: Bi[]; // what we found (quotes, numbers)
  action?: Bi; // what to check next
  link?: { label: Bi; href: string };
  term?: string; // glossary id to explain
}

export interface MarketContext {
  symbol: string;
  name: Bi;
  price?: number;
  currency?: string;
  change1m?: number; // %
  high1y?: number;
  low1y?: number;
  typicalDailyMove?: number; // %
  biggestMonthRise1y?: number; // %
  biggestMonthFall1y?: number; // %
  asOf?: string;
  live: boolean;
  headlines: { title: string; source?: string; date?: string; link?: string }[];
  note?: Bi;
  series?: string;
  sme?: boolean;
  exchange?: "NSE" | "BSE";
  _series?: { t: number; c: number }[]; // server-only: daily closes (removed before sending)
}

export interface CheckResult {
  id: string;
  createdAt: string;
  input: CheckInput;
  verdict: "green" | "orange" | "red";
  headline: Bi;
  signals: Signal[];
  notChecked: Bi[];
  checkedCount: number;
  market?: MarketContext;
  aiUsed: boolean;
  aiSummary?: Bi;
  video?: {
    status: "ok" | "failed" | "off";
    reason?: string;
    reasonText?: Bi;
    debug?: string;
    id?: string;
    speaker?: string;
    claims: { time?: string; quote: string; flag: string }[];
    regNumbers: string[];
    links: string[];
    disclaimer?: boolean;
    minutesWatched?: number;
  };
  youtube?: { title?: string; channel?: string; views?: number; published?: string };
  freshness?: { date?: string; ageDays?: number; from: "youtube" | "link" | "message" | "user" | "none"; level: "fresh" | "weeks" | "months" | "old" | "unknown" };
  // user follow-up
  decision?: "went_ahead" | "skipped" | "waiting";
  waitUntil?: string;
  journal?: { q: string; a: string }[];
  followUp?: { at: string; feeling: "glad" | "neutral" | "regret"; note?: string };
}
