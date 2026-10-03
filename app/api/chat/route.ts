import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { chatWithGemini, geminiEnabled } from "@/lib/engine/gemini";
import { ADVICE_REFUSAL, extractAdviserName, isAdviceRequest, knowledgeBase, mentionsStock, offlineAnswer } from "@/lib/chat";
import { adviserChatAnswer, lookupAdviser } from "@/lib/engine/adviser";
import { findTerm } from "@/lib/glossary";

export const dynamic = "force-dynamic";
export const maxDuration = 45;

// Output guard for the assistant: blocks direct advice and predictions about named shares.
const DIRECT_ADVICE = [
  /\byou\s+should\s+(buy|sell|hold|invest in|exit|avoid)\b/i,
  /\b(i|we)\s+(recommend|suggest|advise)\s+(you\s+)?(to\s+)?(buy|sell|hold|invest)/i,
  /\b(strong\s+)?(buy|sell|hold)\s+(rating|call|signal|now)\b/i,
  /(आपको|आप)\s*(यह|ये|इसे)?\s*(शेयर)?\s*(ख़रीदना|खरीदना|बेचना|होल्ड करना)\s*चाहिए/,
  /(ख़रीद|खरीद)\s*(लें|लीजिए|लो)\b|बेच\s*(दें|दीजिए|दो)\b/,
];
const PREDICTION = /\bwill\s+(go up|go down|rise|fall|increase|decrease|reach|cross|double)\b|बढ़ेगा|गिरेगा|ऊपर जाएगा|नीचे जाएगा/i;
const unsafe = (t: string) => DIRECT_ADVICE.some((re) => re.test(t)) || (mentionsStock(t) && PREDICTION.test(t));

export async function POST(req: Request) {
  if (!(await currentUser())) return NextResponse.json({ error: "login" }, { status: 401 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (!rateLimit("chat:" + ip, 20, 60_000)) return NextResponse.json({ error: "slow_down" }, { status: 429 });

  const body = await req.json().catch(() => null);
  const lang: "en" | "hi" = body?.lang === "hi" ? "hi" : "en";
  const history = (Array.isArray(body?.messages) ? body.messages : [])
    .filter((m: { role?: string; text?: unknown }) => (m?.role === "user" || m?.role === "bot") && typeof m.text === "string")
    .slice(-10) as { role: "user" | "bot"; text: string }[];
  const last = [...history].reverse().find((m) => m.role === "user")?.text?.trim() ?? "";
  if (!last) return NextResponse.json({ error: "empty" }, { status: 400 });
  if (last.length > 1000) return NextResponse.json({ answer: lang === "hi" ? "कृपया छोटा सवाल पूछें।" : "Please ask a shorter question.", source: "rule" });

  // 1. Advice / prediction requests are refused by fixed rules, before any AI is used.
  if (isAdviceRequest(last)) {
    return NextResponse.json({ answer: ADVICE_REFUSAL[lang], action: "check", source: "rule", refused: true });
  }

  // 2. "Is <name> SEBI registered?" → search SEBI's registry (and the web, if AI is on).
  const adviser = extractAdviserName(last);
  if (adviser) {
    const l = await lookupAdviser(adviser);
    return NextResponse.json({ answer: adviserChatAnswer(l, lang), action: "check", source: "lookup" });
  }

  // 3. AI answer grounded in the app's own help + glossary, then checked again.
  if (geminiEnabled()) {
    const ai = await chatWithGemini(history, lang, knowledgeBase());
    if (ai) {
      if (unsafe(ai.answer)) return NextResponse.json({ answer: ADVICE_REFUSAL[lang], action: "check", source: "rule", refused: true });
      return NextResponse.json({
        answer: ai.answer,
        action: ai.suggestCheck ? "check" : undefined,
        term: ai.term && findTerm(ai.term) ? ai.term : undefined,
        source: "ai",
      });
    }
  }

  // 3. Offline / fallback: best match from the app's help and glossary.
  const off = offlineAnswer(last, lang);
  if (off) return NextResponse.json({ ...off, source: "faq" });
  return NextResponse.json({
    answer: lang === "hi"
      ? "माफ़ कीजिए, इसका जवाब मेरे पास नहीं है। आप \"सीखें\" में शब्दों के मतलब और आम धोखों के बारे में पढ़ सकते हैं, या नीचे दिए सवालों में से कोई चुनें।"
      : "Sorry, I don't have an answer for that. You can read word meanings and common scams in \"Learn\", or pick one of the questions below.",
    action: "learn",
    source: "faq",
  });
}
