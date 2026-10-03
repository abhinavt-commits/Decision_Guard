import { NextResponse } from "next/server";
import { searchUniverse } from "@/lib/stock-universe";

// Company search for the check form: curated stocks first, then all NSE (main + SME), else Yahoo search.
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").slice(0, 60);
  const res = await searchUniverse(q);
  return NextResponse.json(res, { headers: { "Cache-Control": "public, max-age=300" } });
}
