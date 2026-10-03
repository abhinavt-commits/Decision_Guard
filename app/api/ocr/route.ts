import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { geminiEnabled, ocrWithGemini } from "@/lib/engine/gemini";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Reads text from a screenshot with Gemini (handles Hindi well).
// If no key is configured, the browser falls back to on-device OCR (Tesseract).
export async function POST(req: Request) {
  if (!(await currentUser())) return NextResponse.json({ error: "login" }, { status: 401 });
  if (!geminiEnabled()) return NextResponse.json({ error: "no_ai" }, { status: 501 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (!rateLimit("ocr:" + ip, 15, 60_000)) return NextResponse.json({ error: "slow_down" }, { status: 429 });
  const { image } = await req.json().catch(() => ({}));
  const m = typeof image === "string" ? image.match(/^data:(image\/(png|jpeg|webp));base64,(.+)$/) : null;
  if (!m || m[3].length > 6_000_000) return NextResponse.json({ error: "bad_image" }, { status: 400 });
  const text = await ocrWithGemini(m[3], m[1]);
  if (!text) return NextResponse.json({ error: "failed" }, { status: 502 });
  return NextResponse.json({ text });
}
