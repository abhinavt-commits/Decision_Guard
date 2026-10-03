import { NextResponse } from "next/server";
import { getAlerts } from "@/lib/alerts";

export const dynamic = "force-dynamic";
export const maxDuration = 40;

// Public awareness feed (no login needed). Cached for 1 hour on the server.
export async function GET() {
  try {
    const data = await getAlerts();
    return NextResponse.json(data, { headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" } });
  } catch {
    return NextResponse.json({ items: [], sources: { ok: 0, failed: 1 }, fetchedAt: new Date().toISOString() });
  }
}
