import { NextResponse } from "next/server";
import { cookieOptions, makeToken, makeUserId, SESSION_COOKIE } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";

// Creates a new account without a database: returns a Login ID that encodes the PIN check.
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (!rateLimit("signup:" + ip, 10, 60_000)) return NextResponse.json({ ok: false, error: "slow_down" }, { status: 429 });

  const { name, pin } = await req.json().catch(() => ({}));
  const n = String(name ?? "").replace(/[<>]/g, "").trim().slice(0, 40);
  const p = String(pin ?? "").trim();
  if (n.length < 2) return NextResponse.json({ ok: false, error: "name" }, { status: 400 });
  if (!/^\d{4}$/.test(p)) return NextResponse.json({ ok: false, error: "pin" }, { status: 400 });

  const loginId = makeUserId(n, p);
  const res = NextResponse.json({ ok: true, loginId, name: n });
  res.cookies.set(SESSION_COOKIE, makeToken({ username: loginId, name: n, kind: "user" }), cookieOptions);
  return res;
}
