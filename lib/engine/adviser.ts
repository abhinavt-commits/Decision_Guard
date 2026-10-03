import type { Bi, Signal } from "../types";
import { searchRegistryByName, verifyRegNumber, type RegistryEntry } from "./sebi";
import { geminiEnabled, webCheckSebi } from "./gemini";

/**
 * "Is <name> SEBI-registered?"
 * 1. SEBI's registry (downloaded list, then SEBI's live search) by name.
 * 2. If not found there and AI is on: a Google-grounded web search for a registration number or SEBI action,
 *    and any number found is re-checked against SEBI's registry before we call it registered.
 * We never say someone is "fake" or "not registered" as a fact — only what we could and couldn't find.
 */

export interface AdviserLookup {
  name: string;
  outcome: "match" | "web_unverified" | "not_found" | "unknown";
  matches: (RegistryEntry & { via: "list" | "live" | "web+sebi" })[];
  webNumbers: string[];
  webSaysRegistered: boolean | null;
  sebiActions: string[];
  sources: { title: string; url: string }[];
  searched: string[];
}

export async function lookupAdviser(name: string, offline = false): Promise<AdviserLookup> {
  const out: AdviserLookup = { name, outcome: "unknown", matches: [], webNumbers: [], webSaysRegistered: null, sebiActions: [], sources: [], searched: [] };
  const reg = await searchRegistryByName(name, offline);
  if (reg.searched !== "none") out.searched.push(reg.searched === "list" ? "sebi_list" : "sebi_live");
  out.matches.push(...reg.matches.map((m) => ({ ...m, via: (reg.searched === "live" ? "live" : "list") as "list" | "live" })));

  if (!offline && geminiEnabled()) {
    const web = await webCheckSebi(name);
    if (web.status === "ok") {
      out.searched.push("web");
      out.webSaysRegistered = web.saysRegistered;
      out.sebiActions = web.sebiActions;
      out.sources = web.sources;
      for (const n of web.regNumbers) {
        const v = await verifyRegNumber(n);
        if (v.entry && !out.matches.some((m) => m.reg === v.entry!.reg)) out.matches.push({ ...v.entry, via: "web+sebi" });
        else if (!v.entry) out.webNumbers.push(n);
      }
    }
  }

  if (out.matches.length) out.outcome = "match";
  else if (out.webNumbers.length || out.webSaysRegistered === true) out.outcome = "web_unverified";
  else if (out.searched.length) out.outcome = "not_found";
  return out;
}

const typeName = (t: string): Bi => (t === "IA" ? { en: "Investment Adviser", hi: "इन्वेस्टमेंट एडवाइज़र" } : { en: "Research Analyst", hi: "रिसर्च एनालिस्ट" });
const SEARCHED: Record<string, Bi> = {
  sebi_list: { en: "SEBI's downloaded list", hi: "SEBI की डाउनलोड की गई सूची" },
  sebi_live: { en: "SEBI's website (live)", hi: "SEBI की वेबसाइट (लाइव)" },
  web: { en: "web search (AI + Google)", hi: "वेब खोज (AI + Google)" },
};

/** Turns a lookup into result-screen signals. */
export function adviserSignals(l: AdviserLookup, givesTips: boolean, opts: { newsGuest?: boolean } = {}): { signals: Signal[]; notChecked: Bi[] } {
  const signals: Signal[] = [];
  const notChecked: Bi[] = [];
  const searchedEv: Bi = {
    en: "Searched: " + l.searched.map((s) => SEARCHED[s].en).join(", "),
    hi: "कहाँ खोजा: " + l.searched.map((s) => SEARCHED[s].hi).join(", "),
  };
  const srcLink = l.sources.find((s) => /sebi\.gov\.in/i.test(s.title + s.url)) ?? l.sources[0];

  if (l.outcome === "match") {
    signals.push({
      id: "sebi_name_similar", level: "info", category: "source",
      title: { en: `A SEBI-registered name matching “${l.name}” was found`, hi: `“${l.name}” से मेल खाता SEBI-रजिस्टर्ड नाम मिला` },
      why: {
        en: "This does NOT prove the person contacting you is the same one — scammers copy real names. Ask them for their registration number and check it matches this record.",
        hi: "इससे यह साबित नहीं होता कि आपसे बात करने वाला वही व्यक्ति है — धोखेबाज़ असली नामों की नकल करते हैं। उनसे रजिस्ट्रेशन नंबर माँगें और इस रिकॉर्ड से मिलाएँ।",
      },
      evidence: [
        ...l.matches.map((m) => ({
          en: `${m.name} — ${m.reg} (${typeName(m.type).en})${m.via === "web+sebi" ? ", number found on the web and confirmed with SEBI" : ""}`,
          hi: `${m.name} — ${m.reg} (${typeName(m.type).hi})${m.via === "web+sebi" ? ", नंबर वेब पर मिला और SEBI से पुष्टि हुई" : ""}`,
        })),
        searchedEv,
      ],
      link: { label: { en: "Open SEBI's registry", hi: "SEBI की सूची खोलें" }, href: "https://www.sebi.gov.in/intermediaries.html" },
      term: "registered_ra",
    });
  } else if (l.outcome === "web_unverified") {
    signals.push({
      id: "sebi_name_web_unverified", level: "orange", category: "source",
      title: { en: `The web says “${l.name}” is registered, but SEBI's records didn't confirm it`, hi: `वेब के अनुसार “${l.name}” रजिस्टर्ड है, पर SEBI के रिकॉर्ड से पुष्टि नहीं हुई` },
      why: {
        en: "Only SEBI's own registry is proof. The number may be wrong, old, cancelled, or belong to someone else.",
        hi: "सिर्फ़ SEBI की अपनी सूची ही सबूत है। नंबर ग़लत, पुराना, रद्द या किसी और का हो सकता है।",
      },
      evidence: [
        ...(l.webNumbers.length ? [{ en: `Number(s) mentioned on the web: ${l.webNumbers.join(", ")}`, hi: `वेब पर बताए गए नंबर: ${l.webNumbers.join(", ")}` }] : []),
        searchedEv,
      ],
      link: srcLink ? { label: { en: "Open source", hi: "स्रोत खोलें" }, href: srcLink.url } : undefined,
      term: "registered_ra",
    });
  } else if (l.outcome === "not_found") {
    signals.push({
      id: "sebi_name_not_found", level: givesTips && !opts.newsGuest ? "orange" : "info", category: "source",
      title: { en: `“${l.name}” was not found among SEBI-registered advisers or analysts`, hi: `“${l.name}” SEBI-रजिस्टर्ड एडवाइज़र या एनालिस्ट में नहीं मिला` },
      why: opts.newsGuest
        ? {
            en: "Guests on news channels are often fund managers or analysts who work for a SEBI-registered company (a mutual fund, PMS or broker) instead of being registered in their own name — so this alone is not a warning. Their view is still an opinion, not advice for you.",
            hi: "न्यूज़ चैनल पर आने वाले मेहमान अक्सर फ़ंड मैनेजर या एनालिस्ट होते हैं जो किसी SEBI-रजिस्टर्ड कंपनी (म्यूचुअल फ़ंड, PMS या ब्रोकर) में काम करते हैं, ख़ुद के नाम से रजिस्टर्ड नहीं होते — इसलिए सिर्फ़ इससे ख़तरा नहीं माना जाता। उनकी बात फिर भी एक राय है, आपके लिए सलाह नहीं।",
          }
        : {
            en: "Creators sometimes register under a different (legal or company) name, so this is not final. But anyone giving specific buy/sell calls as a service should be able to show a SEBI number (INH… or INA…).",
            hi: "क्रिएटर कभी-कभी किसी दूसरे (क़ानूनी या कंपनी के) नाम से रजिस्टर होते हैं, इसलिए यह अंतिम नहीं है। पर जो सेवा के रूप में ख़ास ख़रीद/बिक्री कॉल देता है, उसे SEBI नंबर (INH… या INA…) दिखाना चाहिए।",
          },
      evidence: [searchedEv],
      action: { en: "Ask them for their SEBI registration number before trusting the tip.", hi: "टिप पर भरोसा करने से पहले उनसे SEBI रजिस्ट्रेशन नंबर माँगें।" },
      term: "registered_ra",
    });
  } else {
    notChecked.push({
      en: `Whether “${l.name}” is SEBI-registered: SEBI's website couldn't be searched just now${geminiEnabled() ? " and the web search didn't answer" : ""}. Search it yourself: sebi.gov.in → Intermediaries → Research Analysts / Investment Advisers → type the name.`,
      hi: `“${l.name}” SEBI-रजिस्टर्ड है या नहीं: अभी SEBI की वेबसाइट पर खोज नहीं हो पाई${geminiEnabled() ? " और वेब खोज से भी जवाब नहीं मिला" : ""}। ख़ुद खोजें: sebi.gov.in → Intermediaries → Research Analysts / Investment Advisers → नाम लिखें।`,
    });
  }

  if (l.sebiActions.length) {
    signals.push({
      id: "sebi_action_mention", level: "orange", category: "source",
      title: { en: `SEBI orders or warnings mention someone named “${l.name}”`, hi: `SEBI के आदेश या चेतावनियाँ “${l.name}” नाम के किसी व्यक्ति का ज़िक्र करती हैं` },
      why: {
        en: "Different people can share a name, so check the source to see if it is the same person. If it is, be very careful.",
        hi: "एक जैसे नाम के अलग-अलग लोग हो सकते हैं, इसलिए स्रोत देखकर पक्का करें कि क्या यह वही व्यक्ति है। अगर हाँ, तो बहुत सावधान रहें।",
      },
      evidence: l.sebiActions.map((a) => ({ en: a, hi: a })),
      link: srcLink ? { label: { en: "Open source", hi: "स्रोत खोलें" }, href: srcLink.url } : undefined,
    });
  }
  return { signals, notChecked };
}

/** Short chat answer for "Is <name> SEBI registered?" */
export function adviserChatAnswer(l: AdviserLookup, lang: "en" | "hi"): string {
  const { signals, notChecked } = adviserSignals(l, true);
  const parts: string[] = [];
  for (const s of signals) {
    parts.push(`${s.level === "info" ? "ℹ️" : "⚠️"} ${s.title[lang]}`);
    if (s.evidence?.length) parts.push(s.evidence.map((e) => "• " + e[lang]).join("\n"));
    parts.push(s.why[lang]);
  }
  for (const n of notChecked) parts.push("ℹ️ " + n[lang]);
  return parts.join("\n\n");
}
