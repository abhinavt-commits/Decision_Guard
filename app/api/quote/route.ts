import { NextResponse } from "next/server";
import { resolveStock } from "@/lib/stock-universe";

export const revalidate = 900;

// Latest price for pre-filling the amount. Fails quietly.
export async function GET(req: Request) {
  const sym = new URL(req.url).searchParams.get("s") ?? "";
  const st = resolveStock(sym);
  if (!st) return NextResponse.json({ price: null });
  try {
    const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${st.yahoo}?range=5d&interval=1d`, {
      headers: { "User-Agent": "Mozilla/5.0 (DecisionGuard)" }, signal: AbortSignal.timeout(5000), next: { revalidate: 900 },
    } as RequestInit);
    const j = await r.json();
    const price = j.chart?.result?.[0]?.meta?.regularMarketPrice;
    return NextResponse.json({ price: typeof price === "number" ? price : null });
  } catch {
    return NextResponse.json({ price: null });
  }
}
