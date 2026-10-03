import type { PastTrade } from "../types";
import { STOCKS } from "../stocks";

/**
 * Reads a past-trades CSV in the browser (nothing is uploaded).
 * Works with:
 *  - broker tradebooks (Zerodha Console, Groww, Upstox, Angel One, ICICI, etc.)
 *  - the simple app template:  date,symbol,side,qty,price,pnl
 *  - Excel "Save as CSV" files (comma / semicolon / tab, BOM, title rows above the header)
 *  - Indian dates: 25-09-2026, 25/09/2026, 25-Sep-2026, 2026-09-25, with or without time
 * Buys and sells are matched (FIFO) to work out profit/loss when the file has no P&L column.
 */

export interface ParseResult {
  trades: PastTrade[];
  error?: "excel" | "empty" | "no_header" | "no_rows";
  missing?: string[]; // which required columns we couldn't find
  skipped: number; // rows we could not read
}

const ALIASES: Record<"symbol" | "date" | "side" | "qty" | "price" | "value" | "pnl", string[]> = {
  symbol: ["symbol", "tradingsymbol", "scrip", "scripname", "scripcode", "stock", "stockname", "share", "company", "companyname", "instrument", "security", "securityname", "name", "script", "scripsymbol"],
  date: ["tradedate", "date", "orderdate", "executiondate", "orderexecutiontime", "tradetime", "datetime", "transactiondate", "time", "exitdate", "selldate"],
  side: ["tradetype", "side", "type", "buysell", "bs", "transactiontype", "action", "buyorsell", "txntype"],
  qty: ["quantity", "qty", "shares", "noofshares", "tradedqty", "tradeqty", "units", "filledqty"],
  price: ["price", "tradeprice", "rate", "avgprice", "averageprice", "tradedprice", "netrate", "executionprice", "buyprice"],
  value: ["value", "tradevalue", "amount", "netamount", "totalamount", "total", "turnover", "grossamount", "netvalue"],
  pnl: ["pnl", "profit", "profitloss", "realisedpnl", "realizedpnl", "realisedprofit", "realizedprofit", "netpnl", "netpl", "pl", "gainloss", "realised", "realized"],
};

const norm = (h: string) => h.replace(/^﻿/, "").toLowerCase().replace(/&/g, "").replace(/[^a-z]/g, "");

function splitLine(line: string, d: string): string[] {
  const out: string[] = [];
  let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q;
    } else if (ch === d && !q) { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function detectDelimiter(lines: string[]): string {
  const cands = [",", ";", "\t", "|"];
  let best = ",", score = 0;
  for (const d of cands) {
    const s = lines.slice(0, 10).reduce((n, l) => n + (splitLine(l, d).length - 1), 0);
    if (s > score) { score = s; best = d; }
  }
  return best;
}

const MONTHS: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

/** Parses Indian-style dates (day first) as well as ISO dates. */
export function parseDate(raw: string): Date | null {
  const s = raw.trim().replace(/\s+/g, " ");
  if (!s) return null;
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/); // 2026-09-25
  if (m) return mk(+m[1], +m[2] - 1, +m[3], s);
  m = s.match(/^(\d{1,2})[-/. ]([A-Za-z]{3})[A-Za-z]*[-/. ,]+(\d{2,4})/); // 25-Sep-2026, 25 Sep 2026
  if (m && MONTHS[m[2].toLowerCase()] !== undefined) return mk(yr(+m[3]), MONTHS[m[2].toLowerCase()], +m[1], s);
  m = s.match(/^([A-Za-z]{3})[A-Za-z]*[ -](\d{1,2}),?[ -](\d{2,4})/); // Sep 25, 2026
  if (m && MONTHS[m[1].toLowerCase()] !== undefined) return mk(yr(+m[3]), MONTHS[m[1].toLowerCase()], +m[2], s);
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/); // 25-09-2026 (day first, as used in India)
  if (m) {
    let d = +m[1], mo = +m[2];
    if (mo > 12 && d <= 12) [d, mo] = [mo, d]; // clearly month-first (US style)
    return mk(yr(+m[3]), mo - 1, d, s);
  }
  return null;
}
const yr = (y: number) => (y < 100 ? 2000 + y : y);
function mk(y: number, mo: number, d: number, s: string): Date | null {
  if (mo < 0 || mo > 11 || d < 1 || d > 31) return null;
  const t = s.match(/(\d{1,2}):(\d{2})/);
  const dt = new Date(y, mo, d, t ? +t[1] : 12, t ? +t[2] : 0);
  return isNaN(+dt) ? null : dt;
}

const num = (s: string | undefined) => {
  if (s === undefined) return NaN;
  const c = s.replace(/[₹,\s]|rs\.?|inr/gi, "").replace(/^\((.*)\)$/, "-$1"); // (1,200) → -1200
  return c === "" || c === "-" ? NaN : parseFloat(c);
};

/** Maps "TATA MOTORS PASS VEH", "Infosys Ltd" or "SBIN-EQ" to our stock symbols where we can. */
function toSymbol(raw: string): string {
  const up = raw.toUpperCase().replace(/-EQ$|\s+EQ$|\.NS$|\.BO$/i, "").trim();
  if (!up) return "";
  if (STOCKS.some((s) => s.symbol === up)) return up;
  const low = up.toLowerCase();
  const hit = STOCKS.find((s) => s.aliases.some((a) => a.length >= 4 && /^[a-z ]+$/.test(a) && low.includes(a)) || low.includes(s.name.en.toLowerCase()));
  return hit ? hit.symbol : up;
}

export function parseTradebook(text: string): ParseResult {
  if (text.startsWith("PK")) return { trades: [], error: "excel", skipped: 0 };
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim() && !/^[,;\t|\s]+$/.test(l));
  if (lines.length < 2) return { trades: [], error: "empty", skipped: 0 };
  const d = detectDelimiter(lines);

  // Find the header row (brokers often put a title/account block above it).
  let headerIdx = -1, cols: Record<string, number> = {};
  let bestMissing: string[] = ["symbol", "date", "qty", "price"];
  for (let i = 0; i < Math.min(lines.length, 25); i++) {
    const head = splitLine(lines[i], d).map(norm);
    const found: Record<string, number> = {};
    for (const [key, names] of Object.entries(ALIASES)) {
      // Exact names first, in priority order; then "starts with" (e.g. "Trade Date (IST)").
      let idx2 = -1;
      for (const n of names) { idx2 = head.indexOf(n); if (idx2 >= 0) break; }
      if (idx2 < 0) for (const n of names) { if (n.length < 4) continue; idx2 = head.findIndex((h) => h.startsWith(n)); if (idx2 >= 0) break; }
      if (idx2 >= 0) found[key] = idx2;
    }
    const missing = ["symbol", "date", "qty", "price"].filter((k) => found[k] === undefined && !(k === "price" && found.value !== undefined));
    if (missing.length < bestMissing.length) bestMissing = missing;
    if (missing.length === 0) { headerIdx = i; cols = found; break; }
  }
  if (headerIdx < 0) return { trades: [], error: "no_header", missing: bestMissing, skipped: 0 };

  type Raw = { date: Date; symbol: string; side: "BUY" | "SELL"; qty: number; price: number; pnl?: number };
  const rows: Raw[] = [];
  let skipped = 0;
  for (const l of lines.slice(headerIdx + 1)) {
    const c = splitLine(l, d);
    const date = parseDate(c[cols.date] ?? "");
    const qtyRaw = num(c[cols.qty]);
    const price = cols.price !== undefined ? num(c[cols.price]) : Math.abs(num(c[cols.value])) / Math.abs(qtyRaw);
    const symbol = toSymbol(c[cols.symbol] ?? "");
    if (!date || !symbol || !(Math.abs(qtyRaw) > 0) || !(price > 0)) { skipped++; continue; }
    const sideRaw = (cols.side !== undefined ? c[cols.side] : "").toLowerCase();
    const side: "BUY" | "SELL" = /^(s|sell|sale|sold)/.test(sideRaw) || (cols.side === undefined && qtyRaw < 0) ? "SELL" : "BUY";
    const pnl = cols.pnl !== undefined ? num(c[cols.pnl]) : NaN;
    rows.push({ date, symbol, side, qty: Math.abs(qtyRaw), price, pnl: isNaN(pnl) ? undefined : pnl });
  }
  if (!rows.length) return { trades: [], error: "no_rows", skipped };
  rows.sort((a, b) => +a.date - +b.date);

  const lots: Record<string, { qty: number; price: number }[]> = {};
  const out: PastTrade[] = [];
  rows.forEach((r, i) => {
    const id = `csv-${+r.date}-${i}`;
    if (r.side === "BUY") {
      (lots[r.symbol] ??= []).push({ qty: r.qty, price: r.price });
      out.push({ id, date: r.date.toISOString(), symbol: r.symbol, side: "BUY", qty: r.qty, price: r.price, amount: Math.round(r.qty * r.price), pnl: r.pnl ?? null });
      return;
    }
    let remaining = r.qty, cost = 0;
    const q = lots[r.symbol] ?? [];
    while (remaining > 0 && q.length) {
      const lot = q[0];
      const take = Math.min(lot.qty, remaining);
      cost += take * lot.price;
      lot.qty -= take;
      remaining -= take;
      if (lot.qty <= 0) q.shift();
    }
    const matched = r.qty - remaining;
    const pnl = r.pnl ?? (matched > 0 ? Math.round(matched * r.price - cost) : null);
    out.push({ id, date: r.date.toISOString(), symbol: r.symbol, side: "SELL", qty: r.qty, price: r.price, amount: Math.round(cost || r.qty * r.price), pnl });
  });
  // Keep closed trades (with P&L) and buys that are still open; drop buys already closed by a later sale.
  const openSyms = new Set(Object.entries(lots).filter(([, l]) => l.some((x) => x.qty > 0)).map(([s]) => s));
  const trades = out.filter((t) => t.side === "SELL" || t.pnl !== null || openSyms.has(t.symbol)).slice(-300);
  return { trades, skipped };
}

export const SAMPLE_CSV = `date,symbol,side,qty,price,pnl
05-08-2026,ITC,BUY,20,430,
12-08-2026,ITC,SELL,20,443,260
20-08-2026,SBIN,BUY,10,810,
28-08-2026,SBIN,SELL,10,795,-150
10-09-2026,TMPV,BUY,25,410,
18-09-2026,TMPV,SELL,25,356,-1350
`;
