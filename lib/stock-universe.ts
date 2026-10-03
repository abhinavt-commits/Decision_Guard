import universe from "../data/nse-equities.json";
import type { Bi } from "./types";
import { STOCKS, type Stock } from "./stocks";

/**
 * Every company listed on NSE (main board + SME platform), from NSE's own public lists
 * (data/nse-equities.json, refreshed with `npm run fetch-stocks`). Server-side only.
 * Curated stocks (lib/stocks.ts) keep their Hindi names and notes; everything else is generated.
 * If the full list hasn't been downloaded, search falls back to Yahoo Finance's public search.
 */

type U = { s: string; n: string; sr?: string; sme?: boolean; isin?: string };
const U_DATA = universe as { complete: boolean; fetchedAt: string; items: U[] };
const BY_SYMBOL = new Map(U_DATA.items.map((x) => [x.s, x]));

export interface ResolvedStock extends Stock {
  series?: string;
  sme?: boolean;
  curated: boolean;
  exchange: "NSE" | "BSE";
}

const tidy = (name: string) =>
  name.replace(/\b(limited|ltd\.?)\b/gi, "").replace(/\s+/g, " ").trim().replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\b(Of|And|The)\b/g, (w) => w.toLowerCase());

function generated(u: U): ResolvedStock {
  const name = tidy(u.n.toLowerCase());
  const sme = Boolean(u.sme || /^(SM|ST|SZ)$/.test(u.sr ?? ""));
  return {
    symbol: u.s,
    yahoo: `${u.s}.NS`,
    name: { en: name, hi: name },
    newsQuery: name,
    aliases: [],
    about: sme
      ? { en: "A small company listed on NSE's SME platform (NSE Emerge).", hi: "NSE के SME प्लैटफ़ॉर्म (NSE Emerge) पर लिस्टेड एक छोटी कंपनी।" }
      : { en: "Listed on the National Stock Exchange (NSE).", hi: "नेशनल स्टॉक एक्सचेंज (NSE) पर लिस्टेड।" },
    series: u.sr,
    sme,
    curated: false,
    exchange: "NSE",
  };
}

export function resolveStock(symbol: string): ResolvedStock | undefined {
  const sym = symbol.toUpperCase();
  const c = STOCKS.find((s) => s.symbol === sym);
  const u = BY_SYMBOL.get(sym);
  if (c) return { ...c, series: u?.sr ?? "EQ", sme: false, curated: true, exchange: "NSE" };
  if (u) return generated(u);
  // Not in the downloaded list (e.g. BSE-only, or list not downloaded): accept a plausible symbol.
  if (/^[A-Z0-9&-]{2,20}(\.BO)?$/.test(sym)) {
    const bse = sym.endsWith(".BO");
    const base = sym.replace(/\.BO$/, "");
    return { symbol: sym, yahoo: bse ? sym : `${sym}.NS`, name: { en: base, hi: base }, newsQuery: base, aliases: [], about: { en: bse ? "Listed on BSE." : "Listed in India.", hi: bse ? "BSE पर लिस्टेड।" : "भारत में लिस्टेड।" }, curated: false, exchange: bse ? "BSE" : "NSE" };
  }
  return undefined;
}

export interface StockHit { symbol: string; name: Bi; sme?: boolean; series?: string; exchange: "NSE" | "BSE"; curated: boolean }

function score(q: string, symbol: string, name: string, aliases: string[] = []): number {
  const s = symbol.toLowerCase(), n = name.toLowerCase();
  if (s === q) return 100;
  if (aliases.some((a) => a === q)) return 95;
  if (s.startsWith(q)) return 80;
  if (n.startsWith(q)) return 75;
  if (aliases.some((a) => a.startsWith(q))) return 70;
  if (n.split(/\s+/).some((w) => w.startsWith(q))) return 60;
  if (q.length >= 3 && (n.includes(q) || s.includes(q))) return 40;
  return 0;
}

export async function searchUniverse(query: string, limit = 12): Promise<{ hits: StockHit[]; source: "list" | "yahoo" | "seed" }> {
  const q = query.trim().toLowerCase();
  if (!q) return { hits: STOCKS.map((c) => ({ symbol: c.symbol, name: c.name, exchange: "NSE" as const, curated: true })), source: "list" };
  const hits: (StockHit & { sc: number })[] = [];
  for (const c of STOCKS) {
    const sc = Math.max(score(q, c.symbol, c.name.en, c.aliases), c.name.hi.includes(query.trim()) ? 90 : 0);
    if (sc) hits.push({ symbol: c.symbol, name: c.name, exchange: "NSE", curated: true, sc: sc + 5 });
  }
  for (const u of U_DATA.items) {
    if (STOCKS.some((c) => c.symbol === u.s)) continue;
    const sc = score(q, u.s, u.n);
    if (sc) { const g = generated(u); hits.push({ symbol: u.s, name: g.name, sme: g.sme, series: u.sr, exchange: "NSE", curated: false, sc }); }
  }
  hits.sort((a, b) => b.sc - a.sc || a.symbol.length - b.symbol.length);
  if (hits.length || U_DATA.complete) return { hits: hits.slice(0, limit).map(({ sc: _sc, ...h }) => h), source: U_DATA.complete ? "list" : "seed" };

  // Full list not downloaded → Yahoo Finance public search (NSE and BSE results only).
  try {
    const r = await fetch(`https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0&lang=en-IN&region=IN`, {
      headers: { "User-Agent": "Mozilla/5.0 (DecisionGuard)" }, signal: AbortSignal.timeout(5000),
    });
    const j = await r.json();
    const out: StockHit[] = (j.quotes ?? [])
      .filter((x: { symbol?: string; quoteType?: string }) => /\.(NS|BO)$/.test(x.symbol ?? "") && (x.quoteType ?? "EQUITY") === "EQUITY")
      .slice(0, limit)
      .map((x: { symbol: string; longname?: string; shortname?: string }) => {
        const bse = x.symbol.endsWith(".BO");
        const sym = bse ? x.symbol : x.symbol.replace(/\.NS$/, "");
        const nm = tidy((x.longname || x.shortname || sym).toLowerCase());
        return { symbol: sym, name: { en: nm, hi: nm }, exchange: bse ? "BSE" : "NSE", curated: false };
      });
    return { hits: out, source: "yahoo" };
  } catch {
    return { hits: [], source: "seed" };
  }
}

export const universeInfo = { complete: U_DATA.complete, fetchedAt: U_DATA.fetchedAt, count: U_DATA.items.length };
