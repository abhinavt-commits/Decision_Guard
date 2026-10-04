import type { Bi, CheckInput, CheckResult, PastTrade, Signal } from "../types";
import { findStock, REFERENCE_PRICE } from "../stocks";
import { resolveStock } from "../stock-universe";
import { analyseBehaviour } from "./behaviour";
import { analyseClaims, RULES } from "./claims";
import { analyseSource, extractUpiIds, fetchYoutube, isNewsChannel, isValidSebiUpi, youtubeId } from "./source";
import { checkRegistrations } from "./sebi";
import { adviserSignals, lookupAdviser } from "./adviser";
import { analyseFreshness } from "./freshness";
import { getMarketContext, marketSignals } from "./market";
import { analyzeYoutubeVideo, geminiEnabled, readWithGemini, type VideoReading } from "./gemini";
import { isAdviceQuestion } from "./guardrail";
import { PAGE_FAIL, readWebPage } from "./webpage";

export interface EngineOptions {
  offline?: boolean; // no network calls (tests / eval)
  now?: number;
}

const VIDEO_FAIL: Record<string, Bi> = {
  no_key: { en: "AI video reading is off (no Gemini key set).", hi: "AI से वीडियो देखना बंद है (Gemini key नहीं है)।" },
  timeout: { en: "the video took too long to analyse.", hi: "वीडियो जाँचने में बहुत समय लगा।" },
  quota: { en: "the free AI limit for videos was reached for now.", hi: "अभी वीडियो के लिए मुफ़्त AI सीमा पूरी हो गई।" },
  private_or_unavailable: { en: "the video is private, unlisted, age-restricted or too long for AI to open.", hi: "वीडियो प्राइवेट, अनलिस्टेड, उम्र-प्रतिबंधित या AI के लिए बहुत लंबा है।" },
  bad_key: { en: "the Gemini key was rejected.", hi: "Gemini key स्वीकार नहीं हुई।" },
  google_busy: { en: "Google's AI service was busy or had an error. Try again in a minute.", hi: "Google की AI सेवा व्यस्त थी या उसमें गड़बड़ी हुई। एक मिनट बाद फिर कोशिश करें।" },
  recitation: { en: "Google blocked the answer because it would repeat the broadcast word-for-word (common with TV news videos).", hi: "Google ने जवाब रोक दिया क्योंकि उसमें प्रसारण शब्दशः दोहराया जाता (TV न्यूज़ वीडियो में आम है)।" },
  blocked: { en: "Google's safety filter blocked the answer for this video.", hi: "Google के सुरक्षा फ़िल्टर ने इस वीडियो का जवाब रोक दिया।" },
  empty: { en: "the AI returned an empty answer.", hi: "AI ने ख़ाली जवाब दिया।" },
  bad_answer: { en: "the AI's answer could not be read.", hi: "AI का जवाब पढ़ा नहीं जा सका।" },
  network: { en: "the internet connection to Google failed.", hi: "Google से इंटरनेट कनेक्शन नहीं हो पाया।" },
  forbidden: { en: "the AI service refused the request.", hi: "AI सेवा ने अनुरोध मना कर दिया।" },
  unknown: { en: "the AI could not analyse the video.", hi: "AI वीडियो की जाँच नहीं कर पाया।" },
};

const POINTS = { red: 3, orange: 1, ok: 0, info: 0 } as const;

export function verdictFor(signals: Signal[]): CheckResult["verdict"] {
  const reds = signals.filter((s) => s.level === "red").length;
  const oranges = signals.filter((s) => s.level === "orange").length;
  const points = reds * POINTS.red + oranges * POINTS.orange;
  if (reds >= 2 || (reds >= 1 && oranges >= 2) || points >= 6) return "red";
  if (reds >= 1 || oranges >= 1) return "orange";
  return "green";
}

const HEADLINES: Record<CheckResult["verdict"], (n: number) => Bi> = {
  red: (n) => ({ en: `We found ${n} things you should check first`, hi: `हमें ${n} बातें मिलीं जो पहले जाँचनी चाहिए` }),
  orange: (n) => ({ en: `${n} thing${n > 1 ? "s" : ""} worth checking before you decide`, hi: `फ़ैसले से पहले ${n} बात${n > 1 ? "ें" : ""} जाँचने लायक` }),
  green: () => ({
    en: "We did not find major warning signs in what we checked",
    hi: "जो हमने जाँचा, उसमें कोई बड़ा ख़तरे का संकेत नहीं मिला",
  }),
};

export async function runCheck(input: CheckInput, history: PastTrade[], opts: EngineOptions = {}): Promise<CheckResult> {
  const offline = Boolean(opts.offline);
  const notChecked: Bi[] = [];
  const signals: Signal[] = [];
  let checked = 0;

  // --- Amount -----------------------------------------------------------------
  const ytId = input.url ? youtubeId(input.url) : null;
  const ytUrl = ytId ? input.url : undefined;
  // Any other link (website, Telegram post, short link): open it and read the page.
  const linkUrl = input.url && !ytId
    ? input.url.trim()
    : (input.message ?? "").match(/https?:\/\/[^\s<>"')]+/gi)?.find((l) => !youtubeId(l));
  const [market, yt, page, video] = await Promise.all([
    input.symbol !== "OTHER" ? getMarketContext(input.symbol, input.lang, offline) : Promise.resolve(undefined),
    !offline && ytUrl ? fetchYoutube(ytUrl) : Promise.resolve(null),
    !offline && linkUrl ? readWebPage(linkUrl) : Promise.resolve(null),
    // Actually watch the video (Gemini). Without a key: status "off".
    ytId && !offline ? analyzeYoutubeVideo(ytId) : Promise.resolve(null),
  ]);
  // AI reads the message together with the YouTube title/description (finds the speaker's name too).
  const pageOk = page?.status === "ok" ? page : null;
  const pageText = pageOk ? [pageOk.title, pageOk.description, pageOk.text?.slice(0, 6000)].filter(Boolean).join("\n") : "";
  const readable = [
    input.message ?? "",
    yt?.title ? `Video title: ${yt.title}` : "",
    yt?.description ? `Video description: ${yt.description}` : "",
    pageOk ? `Linked web page (${pageOk.finalHost}):\n${pageText.slice(0, 3500)}` : "",
  ].filter(Boolean).join("\n");
  const ai = !offline && geminiEnabled() && readable.length > 30 ? await readWithGemini({ text: readable }) : null;
  // Without AI: "Parag Thakkar's view on ITC" → "Parag Thakkar"
  const titleSpeaker = yt?.title?.match(/^([A-Z][a-z]+(?:\s[A-Z][a-z]+){1,2})(?:'s|’s|\s(?:on|says|explains|bets|bullish|bearish))\b/)?.[1];
  const price = market?.price ?? REFERENCE_PRICE[input.symbol];
  const amount = input.amount && input.amount > 0 ? input.amount : price ? Math.round(price * input.qty) : 0;

  // --- What did the recommendation say? ----------------------------------------
  const textParts = [input.message ?? ""];
  if (yt?.title) textParts.push(yt.title);
  if (yt?.description) textParts.push(yt.description);
  if (pageText) textParts.push(pageText);
  if (page?.redirected && page.finalUrl) textParts.push(`Link opens: ${page.finalUrl}`);
  if (ai?.claims?.length) textParts.push(ai.claims.map((c) => c.quote).join("\n"));
  const videoOk = video?.status === "ok" ? video : null;
  if (videoOk) {
    // What was said/shown in the video is checked by the same rules as a typed message.
    textParts.push(videoOk.claims.map((c) => c.quote).join("\n"));
    if (videoOk.regNumbers.length) textParts.push(videoOk.regNumbers.join(" "));
    if (videoOk.links.length) textParts.push(videoOk.links.join("\n"));
    if (videoOk.disclaimer) textParts.push("Investments are subject to market risk.");
    if (videoOk.saysSebiRegistered) textParts.push("SEBI registered");
  }
  const fullText = textParts.filter(Boolean).join("\n");

  const claims = analyseClaims(fullText);
  checked += RULES.length > 0 && fullText.trim() ? 1 : 0;
  signals.push(...claims.signals);

  // AI-found claims that rules didn't catch (e.g. spoken in a video)
  const aiClaims = [
    ...(ai?.claims ?? []).map((c) => ({ ...c, where: "text" as const, time: undefined as string | undefined })),
    ...(videoOk?.claims ?? []).map((c) => ({ ...c, where: "video" as const })),
  ];
  if (aiClaims.length) {
    for (const c of aiClaims) {
      if (c.flag === "none" || claims.matchedIds.includes(c.flag)) continue;
      const rule = RULES.find((r) => r.id === c.flag);
      if (!rule) continue;
      claims.matchedIds.push(rule.id);
      signals.push({
        id: rule.id, level: rule.level, category: "message", title: rule.title, why: rule.why, action: rule.action, term: rule.term,
        evidence: [c.where === "video"
          ? { en: `“${c.quote}”${c.time ? ` (at ${c.time} in the video)` : " (in the video)"} — found by AI, please confirm`, hi: `“${c.quote}”${c.time ? ` (वीडियो में ${c.time} पर)` : " (वीडियो में)"} — AI ने पाया, कृपया ख़ुद पुष्टि करें` }
          : { en: `“${c.quote}” (found by AI reading — please confirm)`, hi: `“${c.quote}” (AI ने पढ़कर पाया — कृपया ख़ुद पुष्टि करें)` }],
      });
    }
  }
  if (!fullText.trim()) {
    notChecked.push({
      en: "The recommendation itself: no message, screenshot or link was given, so we could not read what was promised.",
      hi: "सलाह ख़ुद: कोई मैसेज, स्क्रीनशॉट या लिंक नहीं दिया गया, इसलिए हम यह नहीं पढ़ पाए कि क्या वादा किया गया।",
    });
  }
  if (page && page.status !== "ok" && page.reason !== "app_download") {
    const why = PAGE_FAIL[page.reason ?? "network"];
    notChecked.push({
      en: `What the linked page says: ${why.en} Paste the key lines or add a screenshot to check them too.`,
      hi: `लिंक वाले पेज में क्या लिखा है: ${why.hi} मुख्य बातें पेस्ट करें या स्क्रीनशॉट डालें ताकि उन्हें भी जाँच सकें।`,
    });
  }
  if (ytUrl && !yt) {
    notChecked.push({ en: "YouTube video details could not be loaded.", hi: "YouTube वीडियो की जानकारी लोड नहीं हो पाई।" });
  }
  if (ytUrl && video && video.status !== "ok") {
    const why = VIDEO_FAIL[video.reason ?? "unknown"] ?? VIDEO_FAIL.unknown;
    notChecked.push({
      en: `What is said inside the video: ${why.en} We read only the title/description. Paste key lines from the video to check them too.`,
      hi: `वीडियो के अंदर क्या कहा गया: ${why.hi} हमने सिर्फ़ टाइटल/विवरण पढ़ा। वीडियो की मुख्य बातें पेस्ट करें ताकि उन्हें भी जाँच सकें।`,
    });
  }

  // --- Who said it? -------------------------------------------------------------
  const views = input.views || yt?.views;
  const src = analyseSource({ ...input, views }, fullText, yt?.channel);
  signals.push(...src.signals);
  if (page?.reason === "app_download" && !signals.some((x) => x.id === "apk_link")) {
    signals.push({
      id: "apk_link", level: "red", category: "source",
      title: { en: "Link downloads an app file instead of opening a page", hi: "लिंक पेज खोलने की जगह ऐप फ़ाइल डाउनलोड करता है" },
      why: {
        en: "Apps from outside the Play Store can steal data or show fake profits. Install trading apps only from the official store.",
        hi: "Play Store के बाहर से आए ऐप डेटा चुरा सकते हैं या नकली मुनाफ़ा दिखा सकते हैं। ट्रेडिंग ऐप सिर्फ़ आधिकारिक स्टोर से इंस्टॉल करें।",
      },
      evidence: [{ en: `Opens: ${page.finalUrl ?? page.url}`, hi: `खुलता है: ${page.finalUrl ?? page.url}` }],
      term: "fake_app",
    });
  }
  // If the only payment details are SEBI-validated @valid UPI IDs, a payment mention is not a warning.
  const upis = extractUpiIds(fullText);
  if (upis.length && upis.every(isValidSebiUpi)) {
    const i = signals.findIndex((s) => s.id === "payment_request");
    if (i >= 0) signals.splice(i, 1);
  }
  checked++;

  const givesTips =
    claims.matchedIds.some((id) => ["price_target", "specific_return", "guaranteed_return", "urgency", "insider_secret"].includes(id)) ||
    /\b(buy|sell|accumulate|kharido|khareedo)\b|ख़रीदें|खरीदें|खरीदो|ख़रीदो/i.test(fullText);
  const claimsRegistered = /sebi\s*[-.]?\s*(registered|regd|reg\.?|रजिस्टर्ड)|सेबी\s*(रजिस्टर्ड|पंजीकृत)/i.test(fullText);
  const sourceName = [input.sourceName, yt?.channel, videoOk?.speaker, ai?.speaker].filter(Boolean).join(" ");
  const reg = await checkRegistrations(fullText, { offline, sourceName, givesTips: givesTips && fullText.trim().length > 0, claimsRegistered });
  signals.push(...reg.signals);
  notChecked.push(...reg.notChecked);

  // No number shown → look the person/channel up by name (SEBI registry, then web search if AI is on).
  const hasNumber = reg.signals.some((x) => x.id.startsWith("sebi_reg_"));
  // Prefer the person speaking over a news channel's name (news channels host guests).
  const channelForLookup = yt?.channel && !isNewsChannel(yt.channel) ? yt.channel : "";
  const speakerName = [videoOk?.speaker, ai?.speaker, titleSpeaker].find((x) => x && !isNewsChannel(x));
  const lookupName = (input.sourceName || speakerName || channelForLookup || "").trim().slice(0, 80);
  if (!hasNumber && lookupName && input.sourceType !== "friend" && input.sourceType !== "news") {
    const l = await lookupAdviser(lookupName, offline);
    const a = adviserSignals(l, givesTips, { newsGuest: isNewsChannel(yt?.channel) });
    signals.push(...a.signals);
    notChecked.push(...a.notChecked);
  }

  // --- The company (facts only) ----------------------------------------------------
  const mk = marketSignals(market, claims);
  signals.push(...mk.signals);
  notChecked.push(...mk.notChecked);

  // --- How old is the tip? ----------------------------------------------------------
  const fresh = analyseFreshness({ input, text: fullText, youtubePublished: yt?.published, pagePublished: pageOk?.published, market, urgency: claims.matchedIds.includes("urgency"), now: opts.now });
  signals.push(...fresh.signals);
  notChecked.push(...fresh.notChecked);
  if (market) delete market._series; // big array, not needed on the phone
  checked++;

  // --- The user ------------------------------------------------------------------
  const beh = analyseBehaviour(input, amount, history, opts.now);
  signals.push(...beh.signals);
  checked++;

  // Reason the user gave
  if (input.reasonText && isAdviceQuestion(input.reasonText)) {
    signals.push({
      id: "advice_question", level: "info", category: "behaviour",
      title: { en: "You asked whether to buy or sell", hi: "आपने पूछा कि ख़रीदें या बेचें" },
      why: {
        en: "We don't tell anyone to buy or sell — nobody can know where a price will go. Use the checks below to decide for yourself.",
        hi: "हम किसी को ख़रीदने या बेचने की सलाह नहीं देते — दाम कहाँ जाएगा, यह कोई नहीं जानता। नीचे की जाँच से ख़ुद फ़ैसला लें।",
      },
    });
  }
  if (input.reasonChips.includes("own_research") && !fullText.trim()) {
    signals.push({
      id: "own_research", level: "ok", category: "behaviour",
      title: { en: "You said this is based on your own research", hi: "आपने बताया कि यह आपकी अपनी रिसर्च पर आधारित है" },
      why: { en: "Good. Write down the 2–3 facts it rests on in the journal below.", hi: "अच्छा है। नीचे जर्नल में वे 2–3 तथ्य लिखें जिन पर यह टिका है।" },
    });
  }

  // Sort: red, orange, info, ok
  const order = { red: 0, orange: 1, info: 2, ok: 3 } as const;
  signals.sort((a, b) => order[a.level] - order[b.level]);
  // De-duplicate by id
  const seen = new Set<string>();
  const uniq = signals.filter((s) => (seen.has(s.id) ? false : (seen.add(s.id), true)));

  const verdict = verdictFor(uniq);
  const warnCount = uniq.filter((s) => s.level === "red" || s.level === "orange").length;

  return {
    id: Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4),
    createdAt: new Date(opts.now ?? Date.now()).toISOString(),
    input: { ...input, amount, stockName: input.stockName ?? (input.symbol !== "OTHER" ? resolveStock(input.symbol)?.name : undefined) },
    verdict,
    headline: HEADLINES[verdict](warnCount),
    signals: uniq,
    notChecked,
    checkedCount: checked,
    market,
    aiUsed: Boolean(ai || videoOk),
    video: video ? { status: video.status, reason: video.reason, reasonText: video.status !== "ok" ? VIDEO_FAIL[video.reason ?? "unknown"] ?? VIDEO_FAIL.unknown : undefined, debug: video.debug, speaker: video.speaker, claims: video.claims, regNumbers: video.regNumbers, links: video.links, disclaimer: video.disclaimer, minutesWatched: video.minutesWatched, id: ytId ?? undefined } : undefined,
    freshness: fresh.freshness,
    page: page ? { status: page.status, reason: page.reason, reasonText: page.status !== "ok" ? PAGE_FAIL[page.reason ?? "network"] : undefined, url: page.url, finalUrl: page.finalUrl, host: page.finalHost ?? page.host, redirected: page.redirected, title: pageOk?.title, siteName: pageOk?.siteName, description: pageOk?.description?.slice(0, 300), published: pageOk?.published } : undefined,
    youtube: yt ? { title: yt.title, channel: yt.channel, views: yt.views, published: yt.published } : undefined,
    aiSummary: videoOk?.summary ?? ai?.summary,
  };
}

export { findStock };
