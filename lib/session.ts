import crypto from "crypto";
import { cookies } from "next/headers";
import { findDemoAccount } from "./demo-accounts";

/**
 * Login without a database.
 *  - Demo accounts: fixed usernames/passwords (lib/demo-accounts.ts).
 *  - New users: a Login ID like "arnav-7f3k". The last 4 characters are a signature of
 *    (name + PIN), so the server can check the PIN on any device without storing anything.
 * Session = signed cookie.
 */

const COOKIE = "dg_session";
const secret = () => process.env.SESSION_SECRET || "dev-only-change-me-in-vercel-settings";

function sign(v: string) {
  return crypto.createHmac("sha256", secret()).update(v).digest("base64url");
}

export interface Session {
  username: string;
  name: string;
  kind: "demo" | "user";
}

export function makeToken(s: Session) {
  const payload = Buffer.from(JSON.stringify({ u: s.username, n: s.name, k: s.kind, t: Date.now() })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readToken(token?: string): Session | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const { u, n, k } = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (k === "user" && isUserId(u)) return { username: u, name: String(n || u).slice(0, 40), kind: "user" };
    const demo = findDemoAccount(u);
    return demo ? { username: u, name: demo.displayName.en, kind: "demo" } : null;
  } catch {
    return null;
  }
}

export async function currentSession(): Promise<Session | null> {
  const c = await cookies();
  return readToken(c.get(COOKIE)?.value);
}

export async function currentUser(): Promise<string | null> {
  return (await currentSession())?.username ?? null;
}

// ---- New-user Login IDs --------------------------------------------------------------

const ID_RE = /^([a-z0-9]{1,16})-([a-z0-9]{4})$/;

export function isUserId(id: string): boolean {
  return typeof id === "string" && ID_RE.test(id) && !findDemoAccount(id);
}

export function slugify(name: string): string {
  const s = name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]/g, "").slice(0, 16);
  return s || "user";
}

function tag(slug: string, pin: string): string {
  // 4 characters from an HMAC of slug + PIN, using only easy-to-read letters/digits.
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const h = crypto.createHmac("sha256", secret()).update(`user:${slug}:${pin}`).digest();
  return Array.from(h.subarray(0, 4)).map((b) => alphabet[b % alphabet.length]).join("");
}

export function makeUserId(name: string, pin: string): string {
  const slug = slugify(name);
  return `${slug}-${tag(slug, pin)}`;
}

export function checkUserLogin(id: string, pin: string): boolean {
  const m = id.trim().toLowerCase().match(ID_RE);
  if (!m || !/^\d{4}$/.test(pin)) return false;
  const expected = tag(m[1], pin);
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(m[2]));
}

export const SESSION_COOKIE = COOKIE;
export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};
