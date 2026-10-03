import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { demoHistory } from "@/lib/demo-accounts";
import { runCheck } from "@/lib/engine";
import type { CheckInput, PastTrade } from "@/lib/types";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const SOURCES = ["youtube", "whatsapp", "telegram", "instagram", "friend", "news", "influencer", "sms", "other"];
const CHIPS = ["recommended", "news", "recover_loss", "friends_buying", "price_falling", "own_research", "fear_missing"];

function cleanTrades(x: unknown): PastTrade[] {
  if (!Array.isArray(x)) return [];
  return x.slice(0, 500).flatMap((t, i) => {
    const date = new Date(t?.date);
    const amount = Number(t?.amount);
    if (isNaN(+date) || !(amount > 0)) return [];
    const pnl = t?.pnl === null || t?.pnl === undefined || t?.pnl === "" ? null : Number(t.pnl);
    return [{
      id: String(t?.id ?? "u" + i).slice(0, 40), date: date.toISOString(), symbol: String(t?.symbol ?? "").toUpperCase().slice(0, 20),
      side: t?.side === "SELL" ? "SELL" : "BUY", qty: Number(t?.qty) || 0, price: Number(t?.price) || 0, amount,
      pnl: pnl === null || isNaN(pnl) ? null : pnl,
    } as PastTrade];
  });
}

export async function POST(req: Request) {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: "login" }, { status: 401 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (!rateLimit(ip, 20, 60_000)) return NextResponse.json({ error: "slow_down" }, { status: 429 });

  const b = await req.json().catch(() => null);
  if (!b) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const input: CheckInput = {
    symbol: String(b.symbol || "OTHER").toUpperCase().replace(/[^A-Z0-9&.-]/g, "").slice(0, 24) || "OTHER",
    otherName: b.otherName ? String(b.otherName).slice(0, 80) : undefined,
    stockName: b.stockName && typeof b.stockName.en === "string" ? { en: String(b.stockName.en).slice(0, 80), hi: String(b.stockName.hi ?? b.stockName.en).slice(0, 80) } : undefined,
    side: b.side === "SELL" ? "SELL" : "BUY",
    qty: Math.max(0, Math.min(1e7, Number(b.qty) || 0)),
    amount: Number(b.amount) > 0 ? Math.min(1e10, Number(b.amount)) : undefined,
    sourceType: SOURCES.includes(b.sourceType) ? b.sourceType : "other",
    knowsSender: ["yes", "no", "unsure"].includes(b.knowsSender) ? b.knowsSender : undefined,
    tipAge: ["today", "week", "month", "older", "unknown"].includes(b.tipAge) ? b.tipAge : undefined,
    sourceName: b.sourceName ? String(b.sourceName).replace(/[<>]/g, "").trim().slice(0, 80) : undefined,
    url: b.url ? String(b.url).slice(0, 500) : undefined,
    message: b.message ? String(b.message).slice(0, 8000) : undefined,
    views: Number(b.views) > 0 ? Number(b.views) : undefined,
    reasonChips: Array.isArray(b.reasonChips) ? b.reasonChips.filter((c: string) => CHIPS.includes(c)) : [],
    reasonText: b.reasonText ? String(b.reasonText).slice(0, 1000) : undefined,
    lang: b.lang === "hi" ? "hi" : "en",
  };
  // Demo history from the server + trades the user added on their phone.
  const history = [...demoHistory(u), ...cleanTrades(b.extraTrades)];
  try {
    const result = await runCheck(input, history);
    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
