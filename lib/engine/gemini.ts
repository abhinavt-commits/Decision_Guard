import fs from "node:fs";
import path from "node:path";
import { containsDirectAdvice as containsAdvice } from "./guardrail";
import { RULES } from "./claims";

/**
 * Optional AI layer (Google Gemini). Used for:
 *  - reading screenshots (OCR, incl. Hindi)
 *  - finding claims in a YouTube video / long text, and a plain-language summary
 * The final verdict is ALWAYS computed by the transparent rules, never by the AI.
 */

// Model names change over time, so we try a list and remember the first one that works.
// Set GEMINI_MODEL in .env.local to force a specific model.
const MODELS = Array.from(new Set([process.env.GEMINI_MODEL, "gemini-flash-latest", "gemini-2.5-flash", "gemini-2.0-flash"].filter(Boolean) as string[]));
// Used only when the main models hit the free-tier limit (each model has its own quota).
const QUOTA_FALLBACK = ["gemini-flash-lite-latest", "gemini-2.5-flash-lite", "gemini-2.0-flash-lite"];
let workingModel: string | null = null;


export const geminiEnabled = () => Boolean(process.env.GEMINI_API_KEY);

/** Low-level request with model fallback and clear error logs in the terminal. */
export async function generate(body: Record<string, unknown>, timeoutMs: number, label: string): Promise<{ text: string | null; error?: string; sources?: { title: string; url: string }[] }> {
  if (!geminiEnabled()) return { text: null, error: "no_key" };
  const models = workingModel ? [workingModel, ...MODELS.filter((m) => m !== workingModel)] : [...MODELS];
  let lastError = "unknown";
  let quotaHit = false;
  const retried = new Set<string>();
  const started = Date.now();
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const remaining = timeoutMs - (Date.now() - started);
    if (remaining < 4000) { lastError = quotaHit ? "quota" : "timeout"; break; }
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(remaining),
      });
      if (!r.ok) {
        const msg = (await r.text()).slice(0, 600);
        lastError = `HTTP ${r.status}`;
        console.warn(`[gemini] ${label} failed with ${model}: HTTP ${r.status} ${msg.slice(0, 300)}`);
        // Unknown/retired model → try the next one.
        if (r.status === 404 || /not found|not supported|is not available/i.test(msg)) continue;
        // Free-tier limit → wait briefly if Google says so, then try the next model (separate quota).
        if (r.status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(msg)) {
          quotaHit = true;
          lastError = "quota";
          const wait = Number((msg.match(/retryDelay"?\s*:\s*"?(\d+)/) ?? [])[1] ?? 0);
          if (wait > 0 && wait <= 12 && !retried.has(model) && timeoutMs - (Date.now() - started) > wait * 1000 + 8000) {
            console.warn(`[gemini] ${label}: free-tier limit hit, waiting ${wait}s`);
            await new Promise((res) => setTimeout(res, wait * 1000));
            if (!retried.has(model)) { retried.add(model); models.splice(i + 1, 0, model); } // retry same model once
          }
          for (const m of QUOTA_FALLBACK) if (!models.includes(m)) models.push(m);
          continue;
        }
        // Google temporarily busy / internal error → wait 2 s and retry the same model once.
        if (r.status >= 500 && !retried.has(model) && timeoutMs - (Date.now() - started) > 15000) {
          retried.add(model);
          await new Promise((res) => setTimeout(res, 2000));
          models.splice(i + 1, 0, model);
          continue;
        }
        if (r.status === 400 && /api key/i.test(msg)) lastError = "bad_key";
        if (r.status === 403) lastError = "forbidden";
        return { text: null, error: lastError };
      }
      if (!quotaHit) workingModel = model;
      const j = await r.json();
      const text = j.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? null;
      const chunks = j.candidates?.[0]?.groundingMetadata?.groundingChunks;
      let sources: { title: string; url: string }[] | undefined;
      if (Array.isArray(chunks)) {
        sources = chunks
          .map((c: { web?: { uri?: string; title?: string } }) => ({ url: c.web?.uri ?? "", title: c.web?.title ?? "" }))
          .filter((c: { url: string }) => c.url);
      }
      if (!text) {
        const why = j.candidates?.[0]?.finishReason ?? j.promptFeedback?.blockReason ?? "NO_CANDIDATES";
        console.warn(`[gemini] ${label}: empty answer (${why})`);
        return { text: null, error: `empty:${why}`, sources };
      }
      return { text, sources };
    } catch (e) {
      const m = (e as Error).message;
      lastError = /timeout|aborted/i.test(m) ? "timeout" : "network";
      console.warn(`[gemini] ${label} error with ${model}: ${m}`);
      return { text: null, error: lastError };
    }
  }
  return { text: null, error: lastError };
}

async function call(parts: unknown[], json: boolean, timeoutMs = 20000): Promise<string | null> {
  const r = await generate(
    { contents: [{ role: "user", parts }], generationConfig: { temperature: 0.1, ...(json ? { responseMimeType: "application/json" } : {}) } },
    timeoutMs,
    "request"
  );
  return r.text;
}

export async function ocrWithGemini(base64: string, mime: string): Promise<string | null> {
  const text = await call(
    [
      { text: "Transcribe ALL text visible in this screenshot exactly as written (keep Hindi in Devanagari, keep numbers, links, UPI IDs and emojis). Output only the text, no comments." },
      { inline_data: { mime_type: mime, data: base64 } },
    ],
    false,
    15000
  );
  return text?.trim() || null;
}

const FLAG_IDS = RULES.map((r) => r.id);

export interface AiReading {
  claims: { quote: string; flag: string }[];
  summary?: { en: string; hi: string };
  speaker?: string;
}

export async function readWithGemini(opts: { text: string }): Promise<AiReading | null> {
  const prompt = `You help Indian retail investors check stock tips BEFORE they act. You never give investment advice.
Read the content and list the specific claims it makes. For each claim give:
- "quote": the exact words (or a faithful short paraphrase for video), max 160 chars
- "flag": one of ${JSON.stringify(FLAG_IDS)} if it matches that warning type, else "none"
Also give:
- "speaker": who is making the recommendation, if stated (name/channel), else ""
- "summary": {"en": "...", "hi": "..."} — 2 short, neutral sentences describing WHAT the content claims, in very simple words (Hindi in simple Devanagari). Do NOT say whether to buy/sell/hold, do NOT predict prices, do NOT judge if the stock is good.
Return JSON: {"claims":[...], "speaker":"", "summary":{"en":"","hi":""}}

User-provided text (may be empty):
"""${opts.text.slice(0, 6000)}"""`;

  const raw = await call([{ text: prompt }], true, 15000);
  if (!raw) return null;
  try {
    const j = JSON.parse(raw);
    const out: AiReading = {
      claims: (Array.isArray(j.claims) ? j.claims : [])
        .filter((c: { quote?: string }) => typeof c?.quote === "string")
        .slice(0, 8)
        .map((c: { quote: string; flag?: string }) => ({ quote: c.quote.slice(0, 200), flag: FLAG_IDS.includes(c.flag ?? "") ? c.flag! : "none" })),
      speaker: typeof j.speaker === "string" ? j.speaker.slice(0, 80) : undefined,
    };
    const s = j.summary;
    if (s && typeof s.en === "string" && typeof s.hi === "string" && !containsAdvice(s.en) && !containsAdvice(s.hi)) {
      out.summary = { en: s.en.slice(0, 400), hi: s.hi.slice(0, 400) };
    }
    return out;
  } catch {
    return null;
  }
}

/** Translates news headlines into simple Hindi / plain English (no added facts). */
export async function translateHeadlines(items: { id: string; title: string; lang: "en" | "hi" }[]): Promise<Record<string, { en: string; hi: string }>> {
  if (!geminiEnabled() || !items.length) return {};
  const prompt = `Translate each news headline so it exists in BOTH plain English and very simple everyday Hindi (Devanagari).
Keep the meaning exactly; do not add any facts, opinions or advice. Keep names and numbers. Max 140 characters each.
Return JSON: {"items":[{"id":"...","en":"...","hi":"..."}]}

Headlines:
${JSON.stringify(items.map((i) => ({ id: i.id, title: i.title })))}`;
  const raw = await call([{ text: prompt }], true, 15000);
  if (!raw) return {};
  try {
    const j = JSON.parse(raw);
    const out: Record<string, { en: string; hi: string }> = {};
    for (const it of Array.isArray(j.items) ? j.items : []) {
      if (typeof it?.id === "string" && typeof it.en === "string" && typeof it.hi === "string" && !containsAdvice(it.en) && !containsAdvice(it.hi)) {
        out[it.id] = { en: it.en.slice(0, 200), hi: it.hi.slice(0, 200) };
      }
    }
    return out;
  } catch {
    return {};
  }
}

/** Help-assistant reply, grounded in the app's own help/glossary text. */
export async function chatWithGemini(
  history: { role: "user" | "bot"; text: string }[],
  lang: "en" | "hi",
  knowledge: string
): Promise<{ answer: string; suggestCheck: boolean; term?: string } | null> {
  if (!geminiEnabled()) return null;
  const system = `You are "Saathi", the help assistant inside an Indian investor-safety app used by first-time investors in small towns.
You help with: (1) how to use the app, (2) meanings of trading/investing terms, (3) how common investment scams work and what to do, (4) official helplines and SEBI tools.

STRICT RULES (hackathon and SEBI rules):
- NEVER tell anyone to buy, sell, hold, enter or exit any share, fund, IPO, crypto or F&O position.
- NEVER predict prices, targets, returns or market direction. NEVER say whether a specific company/share is good, bad, safe or risky.
- NEVER suggest how much money to invest or build a portfolio. Not a financial adviser.
- If asked for any of the above, politely say you can't, and offer to help check the tip in the app (set "suggest_check": true).
- Explain general concepts with neutral, made-up examples (e.g. "Company ABC"), never with real share recommendations.
- If someone has lost money to fraud: tell them to call 1930 immediately and file at cybercrime.gov.in, inform their bank, keep evidence, and beware of "recovery agents".
- Use the KNOWLEDGE below as your main source. If unsure, say so and point to the Learn section or official links. Don't invent rules, dates or numbers.
- Reply in ${lang === "hi" ? "very simple everyday Hindi (Devanagari). Use common English words like share, app, UPI, SEBI where natural." : "simple, plain English. If the user writes in Hindi or Hinglish, reply in simple Hindi."}
- Keep it short: at most 110 words, short sentences, numbered steps when explaining how to do something. No markdown headings.

Return JSON: {"answer": "...", "suggest_check": true|false, "term": "<glossary id if one term is central, else empty>"}

KNOWLEDGE:
${knowledge}`;
  const contents = history.slice(-8).map((m) => ({ role: m.role === "user" ? "user" : "model", parts: [{ text: m.text.slice(0, 1500) }] }));
  const r = await generate(
    { systemInstruction: { parts: [{ text: system }] }, contents, generationConfig: { temperature: 0.3, responseMimeType: "application/json" } },
    20000,
    "chat"
  );
  if (!r.text) return null;
  try {
    const o = JSON.parse(r.text);
    if (typeof o.answer !== "string" || !o.answer.trim()) return null;
    return { answer: o.answer.trim().slice(0, 1200), suggestCheck: Boolean(o.suggest_check), term: typeof o.term === "string" && o.term ? o.term : undefined };
  } catch {
    return null;
  }
}

// ---- YouTube: actually watch the video ----------------------------------------------------

export interface VideoReading {
  status: "ok" | "failed" | "off";
  reason?: string; // why it failed (no_key, timeout, quota, forbidden, private_or_unavailable, …)
  debug?: string; // technical detail for troubleshooting (HTTP code / finish reason)
  speaker?: string;
  saysSebiRegistered?: boolean;
  regNumbers: string[];
  claims: { time?: string; quote: string; flag: string }[];
  links: string[]; // Telegram/WhatsApp/UPI/app links or IDs mentioned or shown
  disclaimer?: boolean;
  summary?: { en: string; hi: string };
  minutesWatched?: number;
}

/**
 * Gemini watches a public YouTube video (first 15 minutes, low resolution to keep it fast)
 * and reports what is SAID and SHOWN: claims with timestamps, registration numbers, links, disclaimers.
 */
// Same video checked again (e.g. during a demo) → reuse the analysis instead of spending quota.
// Kept in memory and saved to data/video-cache/<id>.json, so it survives restarts and can be
// committed to GitHub (then the deployed app already "knows" the demo video).
const VIDEO_CACHE = new Map<string, { at: number; reading: VideoReading }>();
const cacheFile = (id: string) => path.join(process.cwd(), "data", "video-cache", `${id.replace(/[^A-Za-z0-9_-]/g, "")}.json`);
function readVideoCache(id: string): VideoReading | null {
  const mem = VIDEO_CACHE.get(id);
  if (mem && Date.now() - mem.at < 6 * 3600_000) return mem.reading;
  try {
    const saved = JSON.parse(fs.readFileSync(cacheFile(id), "utf8")) as VideoReading;
    if (saved?.status === "ok") return saved;
  } catch { /* not saved yet */ }
  return null;
}
function writeVideoCache(id: string, reading: VideoReading) {
  VIDEO_CACHE.set(id, { at: Date.now(), reading });
  try {
    fs.mkdirSync(path.dirname(cacheFile(id)), { recursive: true });
    fs.writeFileSync(cacheFile(id), JSON.stringify({ ...reading, savedAt: new Date().toISOString() }, null, 1));
  } catch { /* read-only on some hosts (e.g. Vercel) — memory cache still works */ }
}

export async function analyzeYoutubeVideo(videoId: string): Promise<VideoReading> {
  if (!geminiEnabled()) return { status: "off", reason: "no_key", regNumbers: [], claims: [], links: [] };
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const prompt = `You are helping an Indian retail investor check a stock-market video BEFORE they act on it. You never give investment advice.
Watch the video (speech in Hindi, English or Hinglish, plus any text shown on screen) and report ONLY what is actually said or shown:
- "speaker": name of the person/channel giving the recommendation, if said or shown ("" if not)
- "says_sebi_registered": true only if the video says or shows that the speaker is SEBI registered
- "registration_numbers": any SEBI registration numbers said or shown (format INH/INA/INZ followed by 9 digits), exactly as shown
- "claims": up to 8 key claims or calls, each {"time": "mm:ss", "quote": "a SHORT paraphrase in your own words in English, max 20 words — do not copy long speech word for word", "flag": one of ${JSON.stringify(FLAG_IDS)} or "none"}
  Include: promised returns or targets, "guaranteed"/"sure" language, urgency, insider/operator claims, requests to pay or join a paid/VIP group, app downloads.
- "links": Telegram/WhatsApp groups, websites, apps, phone numbers or UPI IDs mentioned or shown
- "disclaimer": true if a risk disclaimer is said or shown
- "summary": {"en": "...", "hi": "..."} — 2 neutral sentences on WHAT the video claims (simple Hindi in Devanagari). Never say whether to buy/sell, never predict prices.
If you cannot watch the video, return {"watched": false}. Otherwise include "watched": true.
Return JSON only.`;
  const cached = readVideoCache(videoId);
  if (cached) {
    console.log(`[gemini] youtube: using saved analysis for ${videoId}`);
    return cached;
  }
  const ask = (seconds: number | null, extras = true) => generate(
    {
      contents: [{ role: "user", parts: [
        seconds ? { file_data: { file_uri: url, mime_type: "video/*" }, video_metadata: { start_offset: "0s", end_offset: `${seconds}s` } } : { file_data: { file_uri: url } },
        { text: prompt },
      ] }],
      generationConfig: { temperature: 0.1, responseMimeType: "application/json", ...(extras ? { mediaResolution: "MEDIA_RESOLUTION_LOW" } : {}) },
    },
    85000,
    seconds ? `youtube-${seconds / 60}min` : "youtube-plain"
  );
  // 10 minutes is enough for most tip videos and uses about a third less of the free quota than 15.
  let minutes = 10;
  let r = await ask(600);
  if (!r.text && r.error === "quota") {
    // Free-tier token limit: try a shorter part of the video (fewer tokens).
    minutes = 3;
    r = await ask(180);
  }
  if (!r.text && r.error && /HTTP 400/.test(r.error)) {
    // Some models reject clipping/resolution options — retry with the plain video.
    minutes = 0;
    r = await ask(null, false);
  }
  if (!r.text && /^empty:(RECITATION|MAX_TOKENS|OTHER)/.test(r.error ?? "")) {
    // Answer was blocked for repeating the video word-for-word (common with news broadcasts) → shorter, paraphrased answer.
    r = await generate(
      {
        contents: [{ role: "user", parts: [
          { file_data: { file_uri: url, mime_type: "video/*" }, video_metadata: { start_offset: "0s", end_offset: "300s" } },
          { text: prompt + "\nIMPORTANT: Use only your own short paraphrases. Never quote more than 5 words in a row. At most 5 claims." },
        ] }],
        generationConfig: { temperature: 0.3, responseMimeType: "application/json", maxOutputTokens: 4096 },
      },
      60000,
      "youtube-paraphrase"
    );
    minutes = 5;
  }
  if (!r.text) {
    const e = r.error ?? "unknown";
    const reason = e === "HTTP 400" ? "private_or_unavailable"
      : /^HTTP 5/.test(e) ? "google_busy"
      : /^empty:(SAFETY|PROHIBITED_CONTENT|BLOCKLIST|SPII)/.test(e) ? "blocked"
      : /^empty:RECITATION/.test(e) ? "recitation"
      : /^empty:/.test(e) ? "empty"
      : e;
    return { status: "failed", reason, debug: e, regNumbers: [], claims: [], links: [] };
  }
  try {
    const j = JSON.parse((r.text.match(/\{[\s\S]*\}/) ?? [r.text])[0]);
    if (j.watched === false) return { status: "failed", reason: "private_or_unavailable", regNumbers: [], claims: [], links: [] };
    const out: VideoReading = {
      status: "ok",
      speaker: typeof j.speaker === "string" ? j.speaker.slice(0, 80) : undefined,
      saysSebiRegistered: j.says_sebi_registered === true,
      regNumbers: (Array.isArray(j.registration_numbers) ? j.registration_numbers : [])
        .map((x: unknown) => String(x).replace(/[\s-]/g, "").toUpperCase())
        .filter((x: string) => /^IN[AHZ]\d{9}$/.test(x))
        .slice(0, 5),
      claims: (Array.isArray(j.claims) ? j.claims : [])
        .filter((c: { quote?: unknown }) => typeof c?.quote === "string")
        .slice(0, 8)
        .map((c: { time?: unknown; quote: string; flag?: string }) => ({
          time: typeof c.time === "string" && /^\d{1,3}:\d{2}$/.test(c.time) ? c.time : undefined,
          quote: c.quote.slice(0, 200),
          flag: FLAG_IDS.includes(c.flag ?? "") ? c.flag! : "none",
        })),
      links: (Array.isArray(j.links) ? j.links : []).map((x: unknown) => String(x).slice(0, 120)).slice(0, 6),
      disclaimer: j.disclaimer === true,
      minutesWatched: minutes || undefined,
    };
    const sm = j.summary;
    if (sm && typeof sm.en === "string" && typeof sm.hi === "string" && !containsAdvice(sm.en) && !containsAdvice(sm.hi)) out.summary = { en: sm.en.slice(0, 400), hi: sm.hi.slice(0, 400) };
    writeVideoCache(videoId, out);
    return out;
  } catch {
    console.warn("[gemini] youtube: answer was not valid JSON");
    return { status: "failed", reason: "bad_answer", debug: r.text.slice(0, 80), regNumbers: [], claims: [], links: [] };
  }
}

// ---- Web check of a name (Google Search grounding) -------------------------------------------

export interface WebSebiCheck {
  status: "ok" | "failed" | "off";
  regNumbers: string[]; // registration numbers the web sources give for this name (to be verified against SEBI)
  registeredName?: string;
  saysRegistered: boolean | null; // what the sources say; null = unclear
  sebiActions: string[]; // short descriptions of SEBI orders/warnings mentioning this name
  sources: { title: string; url: string }[];
}

/**
 * Uses Gemini with Google Search to look for public information about whether a person/channel
 * is SEBI-registered, and any SEBI action involving them. Results are leads to VERIFY, not facts:
 * numbers found are re-checked against SEBI's own registry by the caller.
 */
export async function webCheckSebi(name: string): Promise<WebSebiCheck> {
  const empty = { regNumbers: [], saysRegistered: null, sebiActions: [], sources: [] };
  if (!geminiEnabled()) return { status: "off", ...empty };
  const prompt = `Search the web for the Indian stock-market person or channel named "${name.slice(0, 80)}".
Find out ONLY from reliable sources (sebi.gov.in first, then major Indian news sites):
1. Are they registered with SEBI as a Research Analyst (number starts INH) or Investment Adviser (INA)? Give the registration number and registered name if a source states it.
2. Has SEBI passed any order, warning or ban that names them? Describe each in one short neutral line.
Do not guess. If sources don't say, use null / empty lists. Different people can share a name — only include results clearly about a stock-market person/channel with this name.
Reply with ONLY this JSON (no markdown):
{"says_registered": true|false|null, "registration_numbers": ["INH..."], "registered_name": "", "sebi_actions": ["..."]}`;
  const r = await generate(
    { contents: [{ role: "user", parts: [{ text: prompt }] }], tools: [{ google_search: {} }], generationConfig: { temperature: 0 } },
    25000,
    "web-sebi"
  );
  if (!r.text) return { status: r.error === "no_key" ? "off" : "failed", ...empty };
  try {
    const m = r.text.match(/\{[\s\S]*\}/);
    const j = m ? JSON.parse(m[0]) : {};
    return {
      status: "ok",
      saysRegistered: typeof j.says_registered === "boolean" ? j.says_registered : null,
      regNumbers: (Array.isArray(j.registration_numbers) ? j.registration_numbers : [])
        .map((x: unknown) => String(x).replace(/[\s-]/g, "").toUpperCase())
        .filter((x: string) => /^IN[AHZ]\d{9}$/.test(x))
        .slice(0, 3),
      registeredName: typeof j.registered_name === "string" && j.registered_name ? j.registered_name.slice(0, 100) : undefined,
      sebiActions: (Array.isArray(j.sebi_actions) ? j.sebi_actions : []).map((x: unknown) => String(x).slice(0, 200)).filter((x: string) => !containsAdvice(x)).slice(0, 3),
      sources: (r.sources ?? []).slice(0, 5),
    };
  } catch {
    console.warn("[gemini] web-sebi: answer was not valid JSON");
    return { status: "failed", ...empty };
  }
}
