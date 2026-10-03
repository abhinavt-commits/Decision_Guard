import type { PastTrade } from "./types";

// Demo accounts for the hackathon. No real financial data is used.
// Dates are generated relative to "now" so the history always looks recent.

export interface DemoAccount {
  username: string;
  password: string;
  displayName: { en: string; hi: string };
  city: string;
  story: { en: string; hi: string };
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    username: "demo-loss",
    password: "loss123",
    displayName: { en: "Ramesh (Demo – recent losses)", hi: "रमेश (डेमो – हाल में नुकसान)" },
    city: "Varanasi",
    story: {
      en: "Started trading 4 months ago. Three losses in a row this week, trading more often than usual.",
      hi: "4 महीने पहले ट्रेडिंग शुरू की। इस हफ़्ते लगातार तीन नुकसान, पहले से ज़्यादा बार ट्रेड कर रहे हैं।",
    },
  },
  {
    username: "demo-profit",
    password: "profit123",
    displayName: { en: "Sunita (Demo – recent profits)", hi: "सुनीता (डेमो – हाल में मुनाफ़ा)" },
    city: "Kanpur",
    story: {
      en: "Invests steadily, about once a week. Three profitable trades in a row recently.",
      hi: "हर हफ़्ते लगभग एक बार, सोच-समझकर निवेश करती हैं। हाल में लगातार तीन ट्रेड में मुनाफ़ा।",
    },
  },
];

function daysAgo(d: number, hour = 11): string {
  const t = new Date();
  t.setDate(t.getDate() - d);
  t.setHours(hour, (d * 7) % 60, 0, 0);
  return t.toISOString();
}

type Row = [number, string, number, number, number | null, number?]; // [daysAgo, symbol, qty, price, pnl, hour]

function build(rows: Row[], prefix: string): PastTrade[] {
  return rows.map(([d, symbol, qty, price, pnl, hour], i) => ({
    id: `${prefix}-${i}`,
    date: daysAgo(d, hour ?? 11),
    symbol,
    side: pnl === null ? "BUY" : "SELL",
    qty,
    price,
    amount: Math.round(qty * price),
    pnl,
  }));
}

// Ramesh: small, steady trades early on, then losses, a loss on Tata Motors,
// and a burst of trades this week after losses.
const LOSS_ROWS: Row[] = [
  [118, "ITC", 20, 430, 260],
  [104, "SBIN", 10, 810, -150],
  [96, "INFY", 6, 1480, 310],
  [83, "HDFCBANK", 10, 960, 120],
  [71, "RELIANCE", 6, 1390, -240],
  [62, "ITC", 25, 415, 180],
  [49, "ETERNAL", 30, 300, -420],
  [38, "SBIN", 12, 830, 95],
  [27, "TMPV", 25, 410, -1350],
  [19, "ICICIBANK", 7, 1410, 210],
  [6, "ETERNAL", 30, 318, -800, 10],
  [3, "TMPV", 30, 402, -1200, 14],
  [1, "RELIANCE", 8, 1410, -2000, 15],
  [1, "ITC", 30, 412, null, 16],
];

// Sunita: regular weekly trades, steady sizes, recent winning streak.
const PROFIT_ROWS: Row[] = [
  [120, "HDFCBANK", 20, 940, 600],
  [112, "ITC", 40, 420, -300],
  [104, "INFY", 12, 1460, 800],
  [97, "TCS", 6, 3150, -450],
  [90, "RELIANCE", 14, 1380, 700],
  [83, "SBIN", 24, 820, 500],
  [76, "ICICIBANK", 14, 1390, -380],
  [69, "BHARTIARTL", 10, 1880, 950],
  [62, "HDFCBANK", 20, 955, 400],
  [55, "ITC", 45, 410, -200],
  [48, "TCS", 6, 3080, 650],
  [41, "INFY", 13, 1500, -520],
  [34, "SBIN", 24, 840, 300],
  [27, "RELIANCE", 14, 1400, -350],
  [20, "ICICIBANK", 14, 1405, 1500],
  [13, "BHARTIARTL", 10, 1900, 900],
  [5, "HDFCBANK", 21, 960, 2100],
];

export function demoHistory(username: string): PastTrade[] {
  if (username === "demo-loss") return build(LOSS_ROWS, "L");
  if (username === "demo-profit") return build(PROFIT_ROWS, "P");
  return [];
}

export function findDemoAccount(username: string): DemoAccount | undefined {
  return DEMO_ACCOUNTS.find((a) => a.username === username);
}
