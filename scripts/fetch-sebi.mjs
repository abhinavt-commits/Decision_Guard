// Downloads SEBI's public lists of registered Investment Advisers (INA) and Research Analysts (INH)
// into data/sebi-registry.json, so registration and name checks work instantly and offline.
//
//   npm run fetch-sebi                 → download both full lists
//   npm run fetch-sebi -- --test NAME  → just search SEBI for a name and print what came back
//   add --debug to save SEBI's raw reply to data/sebi-debug.html (send it to the developer if parsing fails)
//
// Run on a computer in India (SEBI's site may block some cloud servers). Safe to re-run.

import fs from "node:fs";

const AJAX = "https://www.sebi.gov.in/sebiweb/ajax/other/getintmfpiinfo.jsp";
const LISTS = [
  { intmId: 13, type: "IA", label: "Investment Advisers" },
  { intmId: 14, type: "RA", label: "Research Analysts" },
];
const args = process.argv.slice(2);
const DEBUG = args.includes("--debug");
const testIdx = args.indexOf("--test");
const TEST_NAME = testIdx >= 0 ? args.slice(testIdx + 1).filter((a) => !a.startsWith("--")).join(" ") : null;

function parse(html, type) {
  const tokens = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .split(/<[^>]+>/)
    .map((s) => s.replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").trim())
    .filter(Boolean);
  const out = [];
  let name = "";
  for (let i = 0; i < tokens.length - 1; i++) {
    if (/^name\s*:?$/i.test(tokens[i])) name = tokens[i + 1];
    if (/^registration\s*no\.?\s*:?$/i.test(tokens[i])) {
      const reg = tokens[i + 1].replace(/\s/g, "").toUpperCase();
      if (/^IN[AHZ]\d{9}$/.test(reg)) out.push({ reg, name, type });
    }
  }
  // Fallback: any registration numbers in the page, even if labels changed.
  if (!out.length) for (const m of html.matchAll(/IN[AH]\d{9}/g)) out.push({ reg: m[0], name: "", type });
  return out;
}

async function post(intmId, fields) {
  const body = new URLSearchParams({
    contPer: "", name: "", regNo: "", email: "", location: "", exchange: "", affiliate: "", alp: "", intmIds: "",
    intmId: String(intmId), ...fields,
  });
  const r = await fetch(AJAX, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      "X-Requested-With": "XMLHttpRequest",
      Referer: `https://www.sebi.gov.in/sebiweb/other/OtherAction.do?doRecognisedFpi=yes&intmId=${intmId}`,
    },
    body,
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const html = await r.text();
  if (DEBUG) fs.writeFileSync(new URL("../data/sebi-debug.html", import.meta.url), html);
  return html;
}

// --- Test mode: search one name ---------------------------------------------------------------
if (TEST_NAME) {
  console.log(`Searching SEBI for "${TEST_NAME}"…`);
  for (const L of LISTS) {
    for (const v of [{ nextValue: "1", next: "s", doDirect: "-1" }, { nextValue: "0", next: "n", doDirect: "0" }]) {
      try {
        const html = await post(L.intmId, { ...v, name: TEST_NAME });
        const rows = parse(html, L.type);
        const none = /no\s+records?\s+found/i.test(html);
        console.log(`  ${L.label} [${v.next}]: ${rows.length} result(s)${none ? " (SEBI: no records found)" : ""}`);
        rows.slice(0, 5).forEach((x) => console.log(`     ${x.reg}  ${x.name}`));
        if (rows.length || none) break;
      } catch (e) {
        console.log(`  ${L.label} [${v.next}]: failed — ${e.message}`);
      }
    }
  }
  process.exit(0);
}

// --- Full download --------------------------------------------------------------------------
const all = new Map();
for (const L of LISTS) {
  const before = all.size;
  let lastFirst = "";
  let pages = 0;
  for (let n = 0; n < 200; n++) {
    let rows = [];
    let ok = false;
    for (const v of [{ nextValue: String(n), next: "n", doDirect: String(n) }, { nextValue: String(n + 1), next: "n", doDirect: String(n + 1) }]) {
      try {
        rows = parse(await post(L.intmId, v), L.type);
        if (rows.length && rows[0].reg !== lastFirst) { ok = true; break; }
      } catch (e) {
        console.error(`\n  ${L.label}: page ${n} failed (${e.message})`);
      }
    }
    if (!ok) break; // no more pages / same page repeated
    lastFirst = rows[0].reg;
    rows.forEach((x) => all.set(x.reg, x));
    pages++;
    process.stdout.write(`\r  ${L.label}: ${all.size - before} so far (page ${pages})…`);
    await new Promise((res) => setTimeout(res, 400)); // be gentle with SEBI's server
  }
  console.log(`\n  ${L.label}: ${all.size - before} entries`);
}

const file = new URL("../data/sebi-registry.json", import.meta.url);
if (all.size < 500) {
  console.error(`\nOnly ${all.size} entries found — SEBI's page format may have changed. Keeping the existing file.`);
  console.error("Run again with --debug and share data/sebi-debug.html so the parser can be fixed.");
  process.exit(1);
}
const old = JSON.parse(fs.readFileSync(file, "utf8"));
for (const e of old.entries) if (!all.has(e.reg)) all.set(e.reg, e);
fs.writeFileSync(
  file,
  JSON.stringify({ _note: "Downloaded from SEBI's public intermediary registry.", fetchedAt: new Date().toISOString().slice(0, 10), complete: true, entries: [...all.values()] })
);
console.log(`\nSaved ${all.size} entries to data/sebi-registry.json`);
