import { NextResponse } from "next/server";

// Fallback for Android "Share → Decision Guard" when the service worker isn't active yet.
// (The service worker normally handles this, including shared screenshots.)
export async function POST(req: Request) {
  const f = await req.formData().catch(() => null);
  const text = [f?.get("title"), f?.get("text"), f?.get("url")].filter(Boolean).join("\n").slice(0, 4000);
  const u = new URL("/check", req.url);
  if (text) u.searchParams.set("text", text);
  return NextResponse.redirect(u, 303);
}
export async function GET(req: Request) {
  const s = new URL(req.url).searchParams;
  const text = [s.get("title"), s.get("text"), s.get("url")].filter(Boolean).join("\n").slice(0, 4000);
  const u = new URL("/check", req.url);
  if (text) u.searchParams.set("text", text);
  return NextResponse.redirect(u, 303);
}
