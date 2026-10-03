import registry from "../../data/sebi-registry.json";
import type { Signal } from "../types";

/**
 * Checks SEBI registration numbers mentioned in a message.
 *  INA... = Investment Adviser, INH... = Research Analyst, INZ... = Stock broker
 * Sources (in order): full downloaded list (data/sebi-registry.json) → live SEBI website lookup.
 * If neither can confirm, we say "could not verify" — never "fake".
 */

type Entry = { reg: string; name: string; type: string };
const REG: { complete: boolean; fetchedAt: string; entries: Entry[] } = registry as never;
const BY_REG = new Map(REG.entries.map((e) => [e.reg.toUpperCase(), e]));

const SEBI_AJAX = "https://www.sebi.gov.in/sebiweb/ajax/other/getintmfpiinfo.jsp";
const INTM: Record<string, number> = { INA: 13, INH: 14 };

/**
 * POSTs a search to SEBI's intermediary registry. SEBI's page uses JavaScript, so we try the two
 * request shapes its search form is known to send. Returns the HTML, or null if SEBI can't be reached.
 */
async function sebiSearch(intmId: number, q: { name?: string; regNo?: string }): Promise<string | null> {
  const variants = [
    { nextValue: "1", next: "s", doDirect: "-1" },
    { nextValue: "0", next: "n", doDirect: "0" },
  ];
  for (const v of variants) {
    try {
      const body = new URLSearchParams({
        ...v, intmId: String(intmId), contPer: "", name: q.name ?? "", regNo: q.regNo ?? "",
        email: "", location: "", exchange: "", affiliate: "", alp: "", intmIds: "",
      });
      const res = await fetch(SEBI_AJAX, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) DecisionGuard",
          "X-Requested-With": "XMLHttpRequest",
          Referer: `https://www.sebi.gov.in/sebiweb/other/OtherAction.do?doRecognisedFpi=yes&intmId=${intmId}`,
        },
        body, signal: AbortSignal.timeout(7000), cache: "no-store",
      });
      if (!res.ok) { console.warn(`[sebi] search HTTP ${res.status}`); continue; }
      const html = await res.text();
      if (/registration\s*no|no\s+records?\s+found/i.test(html)) return html;
      console.warn(`[sebi] unexpected reply (variant ${v.next}): ${html.replace(/\s+/g, " ").slice(0, 120)}`);
    } catch (e) {
      console.warn(`[sebi] search failed: ${(e as Error).message}`);
    }
  }
  return null;
}

export function extractRegNumbers(text: string): string[] {
  const out = new Set<string>();
  const re = /\bIN[AHZ]\s*-?\s*\d{9}\b/gi;
  for (const m of text.match(re) ?? []) out.add(m.replace(/[\s-]/g, "").toUpperCase());
  return [...out].slice(0, 5);
}

/** Parse SEBI's registry HTML into entries (tolerant of markup changes). */
export function parseSebiHtml(html: string, type: string): Entry[] {
  const tokens = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .split(/<[^>]+>/)
    .map((s) => s.replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").trim())
    .filter(Boolean);
  const entries: Entry[] = [];
  let name = "";
  for (let i = 0; i < tokens.length - 1; i++) {
    if (/^name\s*:?$/i.test(tokens[i])) name = tokens[i + 1];
    if (/^registration\s*no\.?\s*:?$/i.test(tokens[i])) {
      const reg = tokens[i + 1].replace(/\s/g, "").toUpperCase();
      if (/^IN[AHZ]\d{9}$/.test(reg)) entries.push({ reg, name, type });
    }
  }
  return entries;
}

async function liveLookup(reg: string): Promise<Entry | null | "error"> {
  const prefix = reg.slice(0, 3);
  const intmId = INTM[prefix];
  if (!intmId) return "error";
  const html = await sebiSearch(intmId, { regNo: reg });
  if (html === null) return "error";
  const entries = parseSebiHtml(html, prefix === "INA" ? "IA" : "RA");
  const hit = entries.find((e) => e.reg === reg);
  if (hit) return hit;
  // Only trust "not found" when SEBI clearly says no records. Anything else = could not verify.
  if (entries.length === 0 && /no\s+records?\s+found/i.test(html)) return null;
  return "error";
}

const TYPE_NAME: Record<string, { en: string; hi: string }> = {
  INA: { en: "Investment Adviser", hi: "इन्वेस्टमेंट एडवाइज़र" },
  INH: { en: "Research Analyst", hi: "रिसर्च एनालिस्ट" },
  INZ: { en: "Stock broker", hi: "स्टॉक ब्रोकर" },
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !["private", "limited", "ltd", "pvt", "the", "and"].includes(w));

export async function checkRegistrations(
  text: string,
  opts: { offline?: boolean; sourceName?: string; givesTips: boolean; claimsRegistered: boolean }
): Promise<{ signals: Signal[]; notChecked: { en: string; hi: string }[] }> {
  const signals: Signal[] = [];
  const notChecked: { en: string; hi: string }[] = [];
  const regs = extractRegNumbers(text);

  for (const reg of regs) {
    const kind = TYPE_NAME[reg.slice(0, 3)] ?? { en: "SEBI registration", hi: "SEBI रजिस्ट्रेशन" };
    let found: Entry | null = BY_REG.get(reg) ?? null;
    let how: "list" | "live" = "list";
    let status: "found" | "notfound" | "unknown" = found ? "found" : "unknown";
    if (!found) {
      const live = opts.offline ? "error" : await liveLookup(reg);
      if (live && live !== "error") { found = live; how = "live"; status = "found"; }
      else if (live === null) status = "notfound"; // SEBI's live search answered: no record
      else if (REG.complete) status = "notfound"; // full downloaded list doesn't have it
    }

    if (status === "found" && found) {
      // Number exists. Does the name in the message/channel match?
      const words = norm(found.name);
      const sourceWords = norm((opts.sourceName ?? "") + " " + text);
      const overlap = words.filter((w) => sourceWords.includes(w)).length;
      const nameMatches = words.length > 0 && overlap >= Math.min(2, words.length);
      signals.push({
        id: nameMatches ? "sebi_reg_found" : "sebi_reg_name_mismatch",
        level: nameMatches ? "ok" : "orange",
        category: "source",
        title: nameMatches
          ? { en: `${reg} is a real SEBI-registered ${kind.en}`, hi: `${reg} एक असली SEBI-रजिस्टर्ड ${kind.hi} है` }
          : { en: `${reg} is registered — but to \"${found.name}\"`, hi: `${reg} रजिस्टर्ड है — पर \"${found.name}\" के नाम पर` },
        why: nameMatches
          ? {
              en: "The registration number matches SEBI's records. Registration means they are allowed to give advice — it does not mean this tip will be right.",
              hi: "रजिस्ट्रेशन नंबर SEBI के रिकॉर्ड से मेल खाता है। रजिस्ट्रेशन का मतलब है कि उन्हें सलाह देने की अनुमति है — इसका मतलब यह नहीं कि यह टिप सही होगी।",
            }
          : {
              en: "Scammers often copy a real registration number. Make sure the person or company talking to you is the same as the registered name.",
              hi: "धोखेबाज़ अक्सर किसी असली रजिस्ट्रेशन नंबर की नकल करते हैं। पक्का करें कि आपसे बात करने वाला वही व्यक्ति/कंपनी है जिसके नाम पर रजिस्ट्रेशन है।",
            },
        evidence: [{
          en: `SEBI record: ${found.name} (${how === "live" ? "checked live on sebi.gov.in" : "SEBI list downloaded " + REG.fetchedAt})`,
          hi: `SEBI रिकॉर्ड: ${found.name} (${how === "live" ? "sebi.gov.in पर अभी जाँचा" : "SEBI सूची, " + REG.fetchedAt})`,
        }],
        link: { label: { en: "Open SEBI's registry", hi: "SEBI की सूची खोलें" }, href: "https://www.sebi.gov.in/intermediaries.html" },
        term: "registered_ra",
      });
    } else if (status === "notfound") {
      signals.push({
        id: "sebi_reg_not_found",
        level: "red",
        category: "source",
        title: { en: `${reg} was not found in SEBI's records`, hi: `${reg} SEBI के रिकॉर्ड में नहीं मिला` },
        why: {
          en: "The message shows a registration number, but SEBI's list does not have it. A fake registration number is a strong warning sign.",
          hi: "मैसेज में रजिस्ट्रेशन नंबर दिया है, पर SEBI की सूची में यह नहीं है। नकली रजिस्ट्रेशन नंबर एक बड़ा ख़तरे का संकेत है।",
        },
        evidence: [{
          en: `Checked against SEBI's registry (list of ${REG.fetchedAt}${REG.complete ? "" : ", plus live search"})`,
          hi: `SEBI की रजिस्ट्री से जाँचा (${REG.fetchedAt} की सूची${REG.complete ? "" : " और लाइव खोज"})`,
        }],
        action: { en: "Search the number yourself on SEBI's website before trusting it.", hi: "भरोसा करने से पहले यह नंबर ख़ुद SEBI की वेबसाइट पर खोजें।" },
        link: { label: { en: "Search on SEBI", hi: "SEBI पर खोजें" }, href: "https://www.sebi.gov.in/intermediaries.html" },
        term: "registered_ra",
      });
    } else {
      notChecked.push({
        en: `Registration number ${reg}: SEBI's website could not be reached just now. Search it yourself at sebi.gov.in → Intermediaries.`,
        hi: `रजिस्ट्रेशन नंबर ${reg}: अभी SEBI की वेबसाइट से जाँच नहीं हो पाई। ख़ुद sebi.gov.in → Intermediaries पर खोजें।`,
      });
    }
  }

  if (!regs.length && opts.claimsRegistered) {
    signals.push({
      id: "sebi_claim_no_number",
      level: "orange",
      category: "source",
      title: { en: "Says \"SEBI registered\" but gives no number", hi: "\"SEBI रजिस्टर्ड\" कहा, पर नंबर नहीं दिया" },
      why: {
        en: "Real SEBI-registered advisers and analysts must show their registration number (it starts with INA or INH). Without it, the claim cannot be checked.",
        hi: "असली SEBI-रजिस्टर्ड एडवाइज़र और एनालिस्ट को अपना रजिस्ट्रेशन नंबर (INA या INH से शुरू) दिखाना होता है। उसके बिना दावे की जाँच नहीं हो सकती।",
      },
      action: { en: "Ask them for their registration number and search it on SEBI's website.", hi: "उनसे रजिस्ट्रेशन नंबर माँगें और SEBI की वेबसाइट पर खोजें।" },
      term: "registered_ra",
    });
  } else if (!regs.length && opts.givesTips) {
    signals.push({
      id: "sebi_no_registration",
      level: "orange",
      category: "source",
      title: { en: "No SEBI registration shown", hi: "कोई SEBI रजिस्ट्रेशन नहीं दिखाया गया" },
      why: {
        en: "This gives a specific stock tip but shows no SEBI registration. In India, people who give stock recommendations as a service must be SEBI-registered Research Analysts or Advisers.",
        hi: "इसमें किसी शेयर की ख़ास टिप दी गई है, पर कोई SEBI रजिस्ट्रेशन नहीं दिखाया। भारत में शेयर सलाह को सेवा के रूप में देने वालों का SEBI-रजिस्टर्ड रिसर्च एनालिस्ट या एडवाइज़र होना ज़रूरी है।",
      },
      term: "registered_ra",
    });
  }

  return { signals, notChecked };
}

export const registryInfo = { complete: REG.complete, fetchedAt: REG.fetchedAt, count: REG.entries.length };

// ---- Search by name (for creators who don't show a number) ----------------------------------

const GENERIC = new Set(["capital", "investment", "investments", "advisors", "advisers", "advisory", "research", "analyst", "analysts", "financial", "finance", "services", "securities", "market", "markets", "stock", "stocks", "trading", "wealth", "india", "consultancy", "consultants", "ventures", "official", "channel", "hindi"]);
const nameTokens = (s: string) => norm(s).filter((w) => !GENERIC.has(w));

/**
 * Indian names are spelt many ways in English (Thakur / Thakkar, Sharma / Sharmaa, Choudhary / Chaudhari).
 * Compare a simple sound "skeleton": drop vowels after the first letter, merge doubled letters and h-sounds.
 */
export function nameSkeleton(w: string): string {
  const x = w.toLowerCase().replace(/[^a-z]/g, "")
    .replace(/ph/g, "f").replace(/(?<=[bcdgjkpt])h/g, "").replace(/w/g, "v").replace(/z/g, "j").replace(/q/g, "k").replace(/ck/g, "k");
  return (x[0] ?? "") + x.slice(1).replace(/[aeiouy]/g, "").replace(/(.)\1+/g, "$1");
}
const sameName = (a: string, b: string) => a === b || (a.length >= 4 && b.length >= 4 && nameSkeleton(a) === nameSkeleton(b));

/**
 * Looks for a channel/speaker name among SEBI-registered Investment Advisers and Research Analysts.
 * A match only means "a registered entity with a similar name exists" — never proof it is the same person.
 */
export async function searchRegistryByName(name: string, offline = false): Promise<{ matches: Entry[]; searched: "list" | "live" | "none" }> {
  const want = nameTokens(name);
  if (!want.length) return { matches: [], searched: "none" };
  const score = (e: Entry) => {
    const have = nameTokens(e.name);
    const common = want.filter((w) => have.some((h) => sameName(w, h))).length;
    return common >= Math.min(2, want.length) ? common / Math.max(want.length, have.length) : 0;
  };
  const local = REG.entries.map((e) => ({ e, s: score(e) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).map((x) => x.e);
  if (local.length || REG.complete || offline) return { matches: local.slice(0, 3), searched: REG.complete ? "list" : local.length ? "list" : "none" };

  // Not in our (partial) list: ask SEBI's own search, for both advisers and analysts.
  const query = [...want].sort((a, b) => b.length - a.length)[0];
  const results: Entry[] = [];
  let answered = false;
  for (const [prefix, intmId] of Object.entries(INTM)) {
    const html = await sebiSearch(intmId, { name: query });
    if (html === null) continue;
    const found = parseSebiHtml(html, prefix === "INA" ? "IA" : "RA");
    const relevant = found.filter((e) => score(e) > 0);
    // Count as an answer only if SEBI clearly filtered by name (results contain the name) or said "no records".
    if (relevant.length || found.some((e) => nameTokens(e.name).includes(query)) || /no\s+records?\s+found/i.test(html)) answered = true;
    results.push(...relevant);
  }
  return { matches: results.slice(0, 3), searched: answered ? "live" : "none" };
}

/** Verify one registration number: downloaded list first, then SEBI's live search. */
export async function verifyRegNumber(reg: string, offline = false): Promise<{ entry: Entry | null; how: "list" | "live" | "none" }> {
  const hit = BY_REG.get(reg.toUpperCase());
  if (hit) return { entry: hit, how: "list" };
  if (offline) return { entry: null, how: "none" };
  const live = await liveLookup(reg.toUpperCase());
  if (live && live !== "error") return { entry: live, how: "live" };
  return { entry: null, how: live === null ? "live" : "none" };
}
export type RegistryEntry = Entry;
