import { NextResponse } from "next/server";
import { DEMO_ACCOUNTS } from "@/lib/demo-accounts";
import { checkUserLogin, cookieOptions, makeToken, SESSION_COOKIE } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (!rateLimit("login:" + ip, 12, 60_000)) return NextResponse.json({ ok: false, error: "slow_down" }, { status: 429 });

  const { username, password } = await req.json().catch(() => ({}));
  const u = String(username ?? "").trim().toLowerCase();
  const p = String(password ?? "").trim();

  const demo = DEMO_ACCOUNTS.find((a) => a.username === u && a.password === p);
  let token: string | null = null;
  if (demo) token = makeToken({ username: demo.username, name: demo.displayName.en, kind: "demo" });
  else if (checkUserLogin(u, p)) {
    const slug = u.split("-")[0];
    token = makeToken({ username: u, name: slug.charAt(0).toUpperCase() + slug.slice(1), kind: "user" });
  }
  if (!token) return NextResponse.json({ ok: false }, { status: 401 });

  const res = NextResponse.json({ ok: true, username: u });
  res.cookies.set(SESSION_COOKIE, token, cookieOptions);
  return res;
}
