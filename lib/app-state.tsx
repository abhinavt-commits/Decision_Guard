"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Bi, CheckResult, Lang, PastTrade } from "./types";
import { UI, type UIKey } from "./ui-strings";

interface Me {
  username: string;
  displayName: Bi;
  story: Bi;
  city: string;
  kind?: "demo" | "user";
}

interface AppState {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: UIKey) => string;
  b: (x: Bi | undefined) => string;
  me: Me | null | undefined; // undefined = loading
  trades: PastTrade[]; // server demo trades + my own
  myTrades: PastTrade[];
  addTrades: (t: PastTrade[]) => void;
  removeTrade: (id: string) => void;
  features: { ai: boolean; sebiList?: { complete: boolean; fetchedAt: string; count: number } };
  checks: CheckResult[];
  saveCheck: (c: CheckResult) => void;
  updateCheck: (id: string, patch: Partial<CheckResult>) => void;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AppState | null>(null);

// Safe localStorage helpers (can throw in private mode).
export function lsGet<T>(k: string, fallback: T): T {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
export function lsSet(k: string, v: unknown) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* ignore */
  }
}

function seedChecks(username: string): CheckResult[] {
  const ago = (d: number) => new Date(Date.now() - d * 86400000).toISOString();
  const base = (o: Partial<CheckResult>): CheckResult => ({
    id: "seed-" + Math.random().toString(36).slice(2, 8),
    createdAt: ago(1),
    input: { symbol: "ITC", side: "BUY", qty: 10, sourceType: "whatsapp", reasonChips: [], lang: "en" },
    verdict: "orange",
    headline: { en: "", hi: "" },
    signals: [],
    notChecked: [],
    checkedCount: 4,
    aiUsed: false,
    ...o,
  });
  if (username === "demo-loss") {
    return [
      base({
        createdAt: ago(2),
        input: { symbol: "RELIANCE", side: "BUY", qty: 8, amount: 11280, sourceType: "telegram", reasonChips: ["recover_loss"], lang: "hi", message: "JACKPOT CALL 🚀 Reliance target 1600 tomorrow. Join VIP!" },
        verdict: "red",
        headline: { en: "We found 4 things you should check first", hi: "हमें 4 बातें मिलीं जो पहले जाँचनी चाहिए" },
        decision: "skipped",
      }),
      base({
        createdAt: ago(9),
        input: { symbol: "ETERNAL", side: "BUY", qty: 30, amount: 9540, sourceType: "friend", reasonChips: ["friends_buying"], lang: "hi" },
        verdict: "orange",
        headline: { en: "2 things worth checking before you decide", hi: "फ़ैसले से पहले 2 बातें जाँचने लायक" },
        decision: "went_ahead",
      }),
    ];
  }
  if (username === "demo-profit") {
    return [
      base({
        createdAt: ago(8),
        input: { symbol: "HDFCBANK", side: "BUY", qty: 21, amount: 20160, sourceType: "news", reasonChips: ["own_research"], lang: "en" },
        verdict: "green",
        headline: { en: "No major warning signs in what we checked", hi: "जो हमने जाँचा, उसमें कोई बड़ा ख़तरे का संकेत नहीं मिला" },
        decision: "went_ahead",
      }),
    ];
  }
  return [];
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [serverTrades, setServerTrades] = useState<PastTrade[]>([]);
  const [myTrades, setMyTrades] = useState<PastTrade[]>([]);
  const [checks, setChecks] = useState<CheckResult[]>([]);
  const [features, setFeatures] = useState<AppState["features"]>({ ai: false });

  useEffect(() => {
    const l = lsGet<Lang | null>("dg_lang", null);
    if (l === "en" || l === "hi") setLangState(l);
    else if (typeof navigator !== "undefined" && navigator.language.startsWith("hi")) setLangState("hi");
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    lsSet("dg_lang", l);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/me", { cache: "no-store" });
      if (!r.ok) {
        setMe(null);
        return;
      }
      const j = await r.json();
      if (!j.user) {
        setMe(null);
        return;
      }
      const savedName = lsGet<string | null>(`dg_name_${j.user.username}`, null);
      setMe(j.user.kind === "user" && savedName ? { ...j.user, displayName: { en: savedName, hi: savedName } } : j.user);
      setServerTrades(j.trades);
      setFeatures(j.features);
      const u = j.user.username;
      setMyTrades(lsGet<PastTrade[]>(`dg_trades_${u}`, []));
      let c = lsGet<CheckResult[] | null>(`dg_checks_${u}`, null);
      if (!c) {
        c = seedChecks(u);
        lsSet(`dg_checks_${u}`, c);
      }
      setChecks(c);
    } catch {
      setMe(null);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const persistChecks = useCallback(
    (next: CheckResult[]) => {
      setChecks(next);
      if (me) lsSet(`dg_checks_${me.username}`, next.slice(0, 100));
    },
    [me]
  );

  const value = useMemo<AppState>(() => {
    const dict = UI[lang];
    return {
      lang,
      setLang,
      t: (k) => dict[k] ?? UI.en[k] ?? k,
      b: (x) => (x ? x[lang] || x.en : ""),
      me,
      trades: [...serverTrades, ...myTrades],
      myTrades,
      addTrades: (t) => {
        const next = [...myTrades, ...t];
        setMyTrades(next);
        if (me) lsSet(`dg_trades_${me.username}`, next);
      },
      removeTrade: (id) => {
        const next = myTrades.filter((x) => x.id !== id);
        setMyTrades(next);
        if (me) lsSet(`dg_trades_${me.username}`, next);
      },
      features,
      checks,
      saveCheck: (c) => persistChecks([c, ...checks.filter((x) => x.id !== c.id)]),
      updateCheck: (id, patch) => persistChecks(checks.map((x) => (x.id === id ? { ...x, ...patch } : x))),
      refresh,
      logout: async () => {
        await fetch("/api/logout", { method: "POST" });
        setMe(null);
        setChecks([]);
      },
    };
  }, [lang, setLang, me, serverTrades, myTrades, features, checks, persistChecks, refresh]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const c = useContext(Ctx);
  if (!c) throw new Error("AppProvider missing");
  return c;
}
