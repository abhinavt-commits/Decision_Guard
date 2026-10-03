import { NextResponse } from "next/server";
import { generate, geminiKey } from "@/lib/engine/gemini";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const HINT: Record<string, string> = {
  ok: "AI is working.",
  no_key: "GEMINI_API_KEY is not set on this server. Vercel → Settings → Environment Variables → add it → Deployments → Redeploy.",
  bad_key: "Google says the key is not valid. Copy it again from aistudio.google.com/apikey (it starts with AIza), paste ONLY the key, then Redeploy.",
  forbidden: "The key is blocked for this use. In Google AI Studio / Cloud Console, remove any 'website' or 'IP' restriction on the key, or make a new key.",
  quota: "The free daily/minute limit is used up. Wait a few minutes (minute limit) or until tomorrow (daily limit), or make a key in a new Google project.",
  timeout: "Google took too long. Try again.",
  network: "The server could not reach Google. Try again in a minute.",
};

// Open /api/ai-status in a browser to see whether Gemini works on this server (the key itself is never shown).
export async function GET(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (!rateLimit("aistatus:" + ip, 5, 60_000)) return NextResponse.json({ error: "slow_down" }, { status: 429 });
  const key = geminiKey();
  const r = await generate({ contents: [{ role: "user", parts: [{ text: "Reply with the single word OK." }] }] }, 20000, "ai-status");
  const status = r.text ? "ok" : r.error ?? "unknown";
  return NextResponse.json({
    status,
    hint: HINT[status] ?? (status.startsWith("empty") ? "Google answered but empty. Try again." : `Unexpected: ${status}`),
    keySet: Boolean(key),
    keyLooksLikeGeminiKey: /^AIza[0-9A-Za-z_-]{35}$/.test(key),
    keyLength: key.length,
    serverRegion: process.env.VERCEL_REGION ?? "local",
  });
}
