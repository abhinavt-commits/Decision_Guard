import dns from "dns/promises";
import net from "net";
import type { Bi } from "../types";

/**
 * Opens a website link (not YouTube) and reads what the page says, so the same checks
 * that run on a pasted message also run on the page: promises, payment requests, SEBI numbers, dates.
 *
 * Safety: only http/https, never private/internal addresses, max 4 redirects (each one checked),
 * max 1.5 MB, 9-second limit. Nothing is executed — we only read the HTML text.
 */

export type PageFail = "bad_url" | "blocked_host" | "timeout" | "http_error" | "not_html" | "app_download" | "login_wall" | "empty" | "network" | "too_many_redirects";

export interface PageRead {
  status: "ok" | "failed";
  reason?: PageFail;
  url: string;
  finalUrl?: string;
  host?: string;
  finalHost?: string;
  redirected?: boolean;
  title?: string;
  description?: string;
  siteName?: string;
  published?: string;
  text?: string;
  httpStatus?: number;
  contentType?: string;
}

export const PAGE_FAIL: Record<PageFail, Bi> = {
  bad_url: { en: "the link is not a valid web address.", hi: "लिंक सही वेब पता नहीं है।" },
  blocked_host: { en: "the link points to a private or local address, so we did not open it.", hi: "लिंक किसी प्राइवेट/लोकल पते का है, इसलिए हमने इसे नहीं खोला।" },
  timeout: { en: "the website took too long to open.", hi: "वेबसाइट खुलने में बहुत देर लगी।" },
  http_error: { en: "the website returned an error (page missing or blocked).", hi: "वेबसाइट ने एरर दिया (पेज नहीं मिला या ब्लॉक है)।" },
  not_html: { en: "the link is a file, not a web page.", hi: "लिंक वेब पेज नहीं, कोई फ़ाइल है।" },
  app_download: { en: "the link downloads an app file instead of opening a page.", hi: "लिंक पेज खोलने की जगह ऐप फ़ाइल डाउनलोड करता है।" },
  login_wall: { en: "this site needs a login to show the post (Instagram, Facebook, X and similar).", hi: "इस साइट पर पोस्ट देखने के लिए लॉगिन चाहिए (Instagram, Facebook, X आदि)।" },
  empty: { en: "the page had almost no readable text (it may need JavaScript or a login).", hi: "पेज पर पढ़ने लायक़ टेक्स्ट लगभग नहीं था (शायद JavaScript या लॉगिन चाहिए)।" },
  network: { en: "the website could not be reached.", hi: "वेबसाइट तक नहीं पहुँच पाए।" },
  too_many_redirects: { en: "the link kept redirecting to other pages.", hi: "लिंक बार-बार दूसरे पेज पर भेजता रहा।" },
};

const LOGIN_WALL = ["instagram.com", "facebook.com", "fb.com", "fb.watch", "x.com", "twitter.com", "linkedin.com", "threads.net", "snapchat.com"];
const MAX_BYTES = 1_500_000;
const UA = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36";

const endsWith = (host: string, d: string) => host === d || host.endsWith("." + d);

function privateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
  }
  const x = ip.toLowerCase();
  if (x.startsWith("::ffff:")) return privateIp(x.slice(7));
  return x === "::1" || x === "::" || x.startsWith("fc") || x.startsWith("fd") || x.startsWith("fe8") || x.startsWith("fe9") || x.startsWith("fea") || x.startsWith("feb");
}

async function hostIsSafe(host: string): Promise<boolean> {
  if (process.env.LINK_ALLOW_PRIVATE === "1") return true; // tests only
  if (!host || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return false;
  if (net.isIP(host)) return !privateIp(host);
  try {
    const addrs = await dns.lookup(host, { all: true });
    return addrs.length > 0 && addrs.every((a) => !privateIp(a.address));
  } catch {
    return false;
  }
}

/** Telegram public posts can be read through Telegram's own embed page. */
function telegramEmbed(u: URL): string | null {
  if (!endsWith(u.hostname, "t.me") && !endsWith(u.hostname, "telegram.me")) return null;
  const m = u.pathname.match(/^\/(?:s\/)?([A-Za-z0-9_]{4,})\/(\d+)/);
  return m ? `https://t.me/${m[1]}/${m[2]}?embed=1&mode=tme` : null;
}

const ENT: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", ndash: "–", mdash: "—", hellip: "…", rupee: "₹" };
function decode(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m);
}

function meta(html: string, keys: string[]): string | undefined {
  for (const k of keys) {
    const re1 = new RegExp(`<meta[^>]+(?:property|name|itemprop)=["']${k}["'][^>]*content=["']([^"']+)["']`, "i");
    const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name|itemprop)=["']${k}["']`, "i");
    const m = html.match(re1) ?? html.match(re2);
    if (m) return decode(m[1]).trim();
  }
  return undefined;
}

function toText(fragment: string): string {
  return decode(
    fragment
      .replace(/<(script|style|noscript|svg|template|iframe|form)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr)[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/[ \t\f\v\r]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

/** Pulls the readable parts out of an HTML page (pure function, unit-tested). */
export function extractPage(html: string, host: string) {
  const title = meta(html, ["og:title", "twitter:title"]) ?? decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").trim();
  const description = meta(html, ["og:description", "description", "twitter:description"]);
  const siteName = meta(html, ["og:site_name", "application-name"]);
  let published =
    meta(html, ["article:published_time", "og:published_time", "datePublished", "publish-date", "pubdate", "date", "DC.date.issued"]) ??
    html.match(/"datePublished"\s*:\s*"([^"]+)"/)?.[1] ??
    html.match(/<time[^>]+datetime=["']([^"']+)["']/i)?.[1];
  if (published && isNaN(+new Date(published))) published = undefined;

  let body: string;
  const tg = html.match(/<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  if (endsWith(host, "t.me") && tg) body = tg[1];
  else {
    const cleaned = html.replace(/<(nav|footer|header|aside)[\s\S]*?<\/\1>/gi, " ");
    body = cleaned.match(/<article[\s\S]*?<\/article>/i)?.[0] ?? cleaned.match(/<main[\s\S]*?<\/main>/i)?.[0] ?? cleaned.match(/<body[\s\S]*<\/body>/i)?.[0] ?? cleaned;
  }
  const text = toText(body).slice(0, 8000);
  return { title: title || undefined, description, siteName, published, text };
}

async function readLimited(r: Response): Promise<string> {
  const reader = r.body?.getReader();
  if (!reader) return await r.text();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    chunks.push(value);
    size += value.length;
    if (size > MAX_BYTES) { await reader.cancel().catch(() => {}); break; }
  }
  const buf = new Uint8Array(size > MAX_BYTES ? MAX_BYTES : size);
  let off = 0;
  for (const c of chunks) {
    const n = Math.min(c.length, buf.length - off);
    buf.set(c.subarray(0, n), off);
    off += n;
    if (off >= buf.length) break;
  }
  const charset = r.headers.get("content-type")?.match(/charset=([\w-]+)/i)?.[1];
  try { return new TextDecoder(charset || "utf-8").decode(buf); } catch { return new TextDecoder().decode(buf); }
}

export async function readWebPage(raw: string, timeoutMs = 9000): Promise<PageRead> {
  let u: URL;
  try {
    u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!/^https?:$/.test(u.protocol)) throw new Error();
  } catch {
    return { status: "failed", reason: "bad_url", url: raw };
  }
  const first = u.hostname.toLowerCase();
  const res: PageRead = { status: "failed", url: u.toString(), host: first };
  const deadline = Date.now() + timeoutMs;
  let current = u;
  try {
    for (let hop = 0; hop <= 4; hop++) {
      const host = current.hostname.toLowerCase();
      if (LOGIN_WALL.some((d) => endsWith(host, d))) {
        return { ...res, reason: "login_wall", finalUrl: current.toString(), finalHost: host, redirected: host !== first };
      }
      if (!(await hostIsSafe(host))) return { ...res, reason: "blocked_host", finalUrl: current.toString(), finalHost: host };
      const target = telegramEmbed(current) ?? current.toString();
      const r = await fetch(target, {
        redirect: "manual",
        headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5", "Accept-Language": "en-IN,en;q=0.9,hi;q=0.8" },
        signal: AbortSignal.timeout(Math.max(1000, deadline - Date.now())),
      });
      if (r.status >= 300 && r.status < 400 && r.headers.get("location")) {
        current = new URL(r.headers.get("location")!, current);
        if (!/^https?:$/.test(current.protocol)) return { ...res, reason: "bad_url" };
        continue;
      }
      const finalHost = current.hostname.toLowerCase();
      const out: PageRead = { ...res, finalUrl: current.toString(), finalHost, redirected: finalHost !== first, httpStatus: r.status };
      const ct = (r.headers.get("content-type") ?? "").toLowerCase();
      out.contentType = ct;
      if (/android\.package-archive|octet-stream/.test(ct) || /\.apk(\?|$)/i.test(current.pathname)) {
        await r.body?.cancel().catch(() => {});
        return { ...out, reason: "app_download" };
      }
      if (!r.ok) { await r.body?.cancel().catch(() => {}); return { ...out, reason: "http_error" }; }
      if (ct && !/html|xml|text\/plain/.test(ct)) { await r.body?.cancel().catch(() => {}); return { ...out, reason: "not_html" }; }
      const html = await readLimited(r);
      const page = /text\/plain/.test(ct) ? { title: undefined, description: undefined, siteName: undefined, published: undefined, text: html.slice(0, 8000) } : extractPage(html, finalHost);
      const words = (page.text ?? "").split(/\s+/).filter(Boolean).length + (page.description ?? "").split(/\s+/).length;
      if (words < 12 && !page.title) return { ...out, reason: "empty" };
      return { ...out, ...page, status: "ok" };
    }
    return { ...res, reason: "too_many_redirects" };
  } catch (e) {
    const m = (e as Error).message ?? "";
    return { ...res, reason: /timeout|aborted/i.test(m) ? "timeout" : "network", finalUrl: current.toString() };
  }
}
