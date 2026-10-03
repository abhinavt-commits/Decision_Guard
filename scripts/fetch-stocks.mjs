// Downloads NSE's public lists of every listed company into data/nse-equities.json:
//   - Main board (EQUITY_L.csv)  - SME platform / NSE Emerge (SME_EQUITY_L.csv)
// Run on a computer in India:  npm run fetch-stocks
// Safe to re-run. If NSE blocks the request, the app keeps working with Yahoo search as a fallback.

import fs from "node:fs";

const SOURCES = [
  { sme: false, urls: ["https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv", "https://archives.nseindia.com/content/equities/EQUITY_L.csv"] },
  { sme: true, urls: ["https://nsearchives.nseindia.com/emerge/corporates/content/SME_EQUITY_L.csv", "https://archives.nseindia.com/emerge/corporates/content/SME_EQUITY_L.csv"] },
];
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
  Accept: "text/csv,*/*",
  Referer: "https://www.nseindia.com/",
};

function splitLine(line) {
  const out = []; let cur = "", q = false;
  for (const ch of line) {
    if (ch === '"') q = !q;
    else if (ch === "," && !q) { out.push(cur.trim()); cur = ""; }
    else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

async function download(urls) {
  for (const u of urls) {
    try {
      const r = await fetch(u, { headers: HEADERS });
      if (!r.ok) { console.error(`  ${u} → HTTP ${r.status}`); continue; }
      const text = await r.text();
      if (/symbol/i.test(text.slice(0, 200))) return text;
      console.error(`  ${u} → unexpected content`);
    } catch (e) {
      console.error(`  ${u} → ${e.message}`);
    }
  }
  return null;
}

const items = new Map();
for (const src of SOURCES) {
  const text = await download(src.urls);
  if (!text) continue;
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  const head = splitLine(lines[0]).map((h) => h.toUpperCase().replace(/[^A-Z]/g, ""));
  const iS = head.indexOf("SYMBOL");
  const iN = head.findIndex((h) => h.startsWith("NAMEOFCOMPANY") || h === "NAME" || h === "COMPANYNAME");
  const iSr = head.indexOf("SERIES");
  const iI = head.findIndex((h) => h.startsWith("ISIN"));
  let n = 0;
  for (const l of lines.slice(1)) {
    const c = splitLine(l);
    const s = (c[iS] ?? "").toUpperCase();
    if (!s) continue;
    items.set(s, { s, n: c[iN] ?? s, sr: iSr >= 0 ? c[iSr] : undefined, ...(src.sme ? { sme: true } : {}), ...(iI >= 0 && c[iI] ? { isin: c[iI] } : {}) });
    n++;
  }
  console.log(`  ${src.sme ? "SME platform" : "Main board"}: ${n} companies`);
}

if (items.size < 500) {
  console.error(`\nOnly ${items.size} companies downloaded — NSE may have blocked the request. Keeping the existing file.`);
  console.error("Tip: open https://www.nseindia.com in your browser once, then run this again.");
  process.exit(1);
}
const file = new URL("../data/nse-equities.json", import.meta.url);
fs.writeFileSync(file, JSON.stringify({ _note: "From NSE's public equity lists.", fetchedAt: new Date().toISOString().slice(0, 10), complete: true, items: [...items.values()] }));
console.log(`\nSaved ${items.size} companies to data/nse-equities.json`);
