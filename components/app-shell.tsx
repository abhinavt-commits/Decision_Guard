"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useApp } from "@/lib/app-state";
import { APP_NAME, APP_SHORT } from "@/lib/ui-strings";
import { findTerm } from "@/lib/glossary";
import { IconShield } from "./icons";
import { IoBook, IoBookOutline, IoChatbubbleEllipses, IoChatbubbleEllipsesOutline, IoHome, IoHomeOutline, IoPerson, IoPersonOutline, IoTime, IoTimeOutline } from "react-icons/io5";

export function LangToggle() {
  const { lang, setLang } = useApp();
  return (
    <div className="lang-toggle" role="group" aria-label="Language / भाषा">
      <button aria-pressed={lang === "en"} onClick={() => setLang("en")}>English</button>
      <button aria-pressed={lang === "hi"} onClick={() => setLang("hi")}>हिंदी</button>
    </div>
  );
}

export function TopBar() {
  const { lang } = useApp();
  return (
    <header className="topbar">
      <Link href="/home" className="brand" aria-label={APP_NAME[lang]}>
        <span className="brand-mark"><IconShield size={20} /></span>
        <span className="brand-long">{APP_NAME[lang]}</span>
        <span className="brand-short">{APP_SHORT[lang]}</span>
      </Link>
      <LangToggle />
    </header>
  );
}

export function BottomNav() {
  const { t } = useApp();
  const path = usePathname() ?? "";
  // Pages without their own tab highlight the closest one.
  const activeHref = path.startsWith("/check") ? "/home" : path.startsWith("/result") || path.startsWith("/journal") ? "/history" : path;
  const items = [
    { href: "/home", title: t("nav_home"), icon: <IoHomeOutline />, on: <IoHome /> },
    { href: "/history", title: t("nav_history"), icon: <IoTimeOutline />, on: <IoTime /> },
    { href: "/ask", title: t("nav_ask"), icon: <IoChatbubbleEllipsesOutline />, on: <IoChatbubbleEllipses /> },
    { href: "/learn", title: t("nav_learn"), icon: <IoBookOutline />, on: <IoBook /> },
    { href: "/profile", title: t("nav_profile"), icon: <IoPersonOutline />, on: <IoPerson /> },
  ];
  return (
    <div className="dock-wrap">
      <nav className="dock" aria-label="Main">
        {items.map((it) => {
          const active = activeHref === it.href || activeHref.startsWith(it.href + "/");
          return (
            <Link key={it.href} href={it.href} aria-current={active ? "page" : undefined}>
              <span className="ic" aria-hidden>{active ? it.on : it.icon}</span>
              <span>{it.title}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

/** Wraps logged-in pages: redirects to /login if not logged in. */
export function AppPage({ children, nav = true }: { children: React.ReactNode; nav?: boolean }) {
  const { me, t } = useApp();
  const router = useRouter();
  useEffect(() => {
    if (me === null) router.replace("/login");
  }, [me, router]);
  return (
    <div className="shell">
      <TopBar />
      <main>
        {me ? children : <div className="spinner" aria-label="Loading" />}
        <p className="footer-note">{t("disclaimer_footer")}</p>
      </main>
      {nav && <BottomNav />}
    </div>
  );
}

// ---- Glossary sheet: tap any dotted word to see a simple explanation ----------------
const TermCtx = createContext<(id: string) => void>(() => {});

export function TermProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState<string | null>(null);
  const { b, t } = useApp();
  const term = open ? findTerm(open) : null;
  return (
    <TermCtx.Provider value={setOpen}>
      {children}
      {term && (
        <div className="sheet-backdrop" onClick={() => setOpen(null)} role="dialog" aria-modal="true" aria-label={b(term.word)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="grab" />
            <p className="eyebrow">{t("explain_term")}</p>
            <h2 style={{ marginTop: 0, fontSize: 22 }}>{b(term.word)}</h2>
            <p style={{ fontSize: 18, color: "var(--ink)" }}>{b(term.simple)}</p>
            {term.example && <p className="alert alert-info">{b(term.example)}</p>}
            <button className="btn btn-outline" onClick={() => setOpen(null)} style={{ marginTop: 10 }}>{t("close")}</button>
          </div>
        </div>
      )}
    </TermCtx.Provider>
  );
}

export const useTerm = () => useContext(TermCtx);

export function Term({ id, children }: { id: string; children?: React.ReactNode }) {
  const openTerm = useTerm();
  const { b } = useApp();
  const term = findTerm(id);
  if (!term) return <>{children}</>;
  return (
    <button type="button" className="linkbtn term" onClick={() => openTerm(id)}>
      {children ?? b(term.word)}
    </button>
  );
}

// ---- Toast ---------------------------------------------------------------------------
export function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!msg) return;
    const id = setTimeout(() => setMsg(null), 3200);
    return () => clearTimeout(id);
  }, [msg]);
  const show = useCallback((m: string) => setMsg(m), []);
  const node = msg ? <div className="toast" role="status">{msg}</div> : null;
  return { show, node };
}

export const inr = (n?: number) => (n === undefined || n === null ? "–" : "₹" + Math.round(n).toLocaleString("en-IN"));

export function timeAgo(iso: string, lang: "en" | "hi") {
  const d = (Date.now() - +new Date(iso)) / 1000;
  const rtf = new Intl.RelativeTimeFormat(lang === "hi" ? "hi-IN" : "en-IN", { numeric: "auto" });
  if (d < 3600) return rtf.format(-Math.max(1, Math.round(d / 60)), "minute");
  if (d < 86400) return rtf.format(-Math.round(d / 3600), "hour");
  return rtf.format(-Math.round(d / 86400), "day");
}
