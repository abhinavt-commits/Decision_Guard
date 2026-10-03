"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { lsGet, lsSet, useApp } from "@/lib/app-state";
import { APP_NAME, APP_SHORT } from "@/lib/ui-strings";
import { LangToggle } from "@/components/app-shell";
import { IconShield } from "@/components/icons";
import { IoCheckmarkCircle, IoChevronForward, IoCopyOutline, IoPersonAddOutline, IoShieldCheckmarkOutline, IoTrendingDown, IoTrendingUp } from "react-icons/io5";

const DEMOS = [
  { u: "demo-loss", p: "loss123", en: "Ramesh — recent losses", hi: "रमेश — हाल में नुकसान", tone: "red" as const },
  { u: "demo-profit", p: "profit123", en: "Sunita — recent profits", hi: "सुनीता — हाल में मुनाफ़ा", tone: "green" as const },
];

export default function Login() {
  const { t, lang, me, refresh } = useApp();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup" | "created">("login");
  const [username, setU] = useState("");
  const [password, setP] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [created, setCreated] = useState<{ id: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (me && mode !== "created") router.replace("/home");
  }, [me, mode, router]);
  useEffect(() => {
    const last = lsGet<string | null>("dg_last_id", null);
    if (last) setU(last);
  }, []);

  async function login(u = username, p = password) {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: u, password: p }) });
      if (r.status === 429) throw new Error(t("slow_down"));
      if (r.status === 401) throw new Error(t("login_fail"));
      if (!r.ok) throw new Error(`${t("server_problem")} (${r.status})`);
      if (!u.startsWith("demo-")) lsSet("dg_last_id", u.trim().toLowerCase());
      await refresh();
      router.replace("/home");
    } catch (e) {
      setErr((e as Error).message || t("login_fail"));
    } finally {
      setBusy(false);
    }
  }

  async function signup() {
    setErr(null);
    if (name.trim().length < 2) return setErr(t("signup_need_name"));
    if (!/^\d{4}$/.test(pin)) return setErr(t("signup_need_pin"));
    if (pin !== pin2) return setErr(t("signup_pin_mismatch"));
    setBusy(true);
    try {
      const r = await fetch("/api/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), pin }) });
      if (r.status === 429) throw new Error(t("slow_down"));
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(t("error_generic"));
      lsSet(`dg_name_${j.loginId}`, j.name);
      lsSet("dg_last_id", j.loginId);
      setCreated({ id: j.loginId, name: j.name });
      setMode("created");
    } catch (e) {
      setErr((e as Error).message || t("error_generic"));
    } finally {
      setBusy(false);
    }
  }

  const header = (
    <header className="topbar">
      <span className="brand"><span className="brand-mark"><IconShield size={20} /></span><span className="brand-long">{APP_NAME[lang]}</span><span className="brand-short">{APP_SHORT[lang]}</span></span>
      <LangToggle />
    </header>
  );
  const pinInput = (id: string, value: string, set: (v: string) => void) => (
    <input id={id} className="input" type="password" inputMode="numeric" autoComplete="new-password" maxLength={4} placeholder="••••"
      style={{ letterSpacing: 8, fontSize: 24, textAlign: "center" }} value={value} onChange={(e) => set(e.target.value.replace(/\D/g, "").slice(0, 4))} />
  );

  if (mode === "created" && created) {
    return (
      <div className="shell" style={{ paddingBottom: 24 }}>
        {header}
        <main>
          <div className="card" style={{ marginTop: 8 }}>
            <span className="ibadge ibadge-green" style={{ width: 48, height: 48, borderRadius: 16, marginBottom: 12 }}><IoCheckmarkCircle style={{ width: 26, height: 26 }} /></span>
            <h1 style={{ marginTop: 0 }}>{t("signup_done_title")}</h1>
            <p>{t("signup_done_sub")}</p>
            <div className="label">{t("your_login_id")}</div>
            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: 1, background: "var(--blue-2)", color: "var(--blue)", borderRadius: 16, padding: "16px", textAlign: "center", wordBreak: "break-all", border: "1px dashed #b9cbfa" }}>
              {created.id}
            </div>
            <button className="btn btn-outline btn-sm" style={{ width: "100%", marginTop: 10 }}
              onClick={async () => { try { await navigator.clipboard.writeText(created.id); setCopied(true); } catch { /* ignore */ } }}>
              {copied ? <><IoCheckmarkCircle /> {t("copied")}</> : <><IoCopyOutline /> {t("copy_id")}</>}
            </button>
            <p className="alert alert-warn small" style={{ marginTop: 12 }}>{t("signup_write_down")}</p>
            <button className="btn btn-primary" style={{ marginTop: 6 }} onClick={async () => { await refresh(); router.replace("/home"); }}>{t("continue")}</button>
          </div>
          <p className="small muted center">{t("privacy_line")}</p>
        </main>
      </div>
    );
  }

  if (mode === "signup") {
    return (
      <div className="shell" style={{ paddingBottom: 24 }}>
        {header}
        <main>
          <form className="card" style={{ marginTop: 8 }} onSubmit={(e) => { e.preventDefault(); signup(); }}>
            <h1 style={{ marginTop: 0 }}>{t("signup_title")}</h1>
            <p className="muted">{t("signup_sub")}</p>
            <label className="label" htmlFor="n">{t("your_name")}</label>
            <input id="n" className="input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={lang === "hi" ? "जैसे: अर्नव" : "e.g. Arnav"} />
            <label className="label" htmlFor="pin">{t("choose_pin")}</label>
            {pinInput("pin", pin, setPin)}
            <label className="label" htmlFor="pin2">{t("confirm_pin")}</label>
            {pinInput("pin2", pin2, setPin2)}
            {err && <p className="alert alert-err" style={{ marginTop: 12 }} role="alert">{err}</p>}
            <button className="btn btn-primary" style={{ marginTop: 16 }} disabled={busy}>{t("create_account")}</button>
            <button type="button" className="btn btn-ghost" onClick={() => { setMode("login"); setErr(null); }}>{t("back")}</button>
          </form>
          <p className="small muted center">{t("signup_privacy")}</p>
        </main>
      </div>
    );
  }

  return (
    <div className="shell" style={{ paddingBottom: 24 }}>
      {header}
      <main>
        <div className="hero" style={{ marginTop: 4 }}>
          <span className="hero-badge"><IoShieldCheckmarkOutline size={14} /> {t("hero_badge")}</span>
          <h1>{t("tagline")}</h1>
          <p style={{ marginBottom: 0 }}>{t("home_ask_sub")}</p>
        </div>

        <p className="eyebrow" style={{ marginTop: 28 }}>{t("demo_accounts")}</p>
        <div className="stack" style={{ marginBottom: 8 }}>
          {DEMOS.map((d) => (
            <button key={d.u} className="btn btn-outline" disabled={busy} onClick={() => login(d.u, d.p)} style={{ justifyContent: "flex-start", textAlign: "left", minHeight: 68, borderRadius: 18 }}>
              <span className={`ibadge ibadge-${d.tone}`}>{d.tone === "red" ? <IoTrendingDown /> : <IoTrendingUp />}</span>
              <span style={{ flex: 1, color: "var(--ink)" }}>
                {lang === "hi" ? d.hi : d.en}
                <span className="small muted" style={{ display: "block", fontWeight: 500 }}>{d.u} / {d.p}</span>
              </span>
              <IoChevronForward style={{ color: "var(--ink-3)" }} />
            </button>
          ))}
        </div>

        <div className="card" style={{ marginTop: 24, display: "flex", gap: 14, alignItems: "flex-start" }}>
          <span className="ibadge ibadge-green"><IoPersonAddOutline /></span>
          <div style={{ flex: 1 }}>
            <h3>{t("new_user")}</h3>
            <p className="small muted">{t("new_user_sub")}</p>
            <button className="btn btn-green btn-sm" style={{ width: "100%" }} onClick={() => { setMode("signup"); setErr(null); }}>{t("create_account")}</button>
          </div>
        </div>

        <form className="card" onSubmit={(e) => { e.preventDefault(); login(); }}>
          <h3>{t("login_title")}</h3>
          <label className="label" htmlFor="u">{t("username")}</label>
          <input id="u" className="input" autoComplete="username" autoCapitalize="none" placeholder="arnav-7f3k" value={username} onChange={(e) => setU(e.target.value)} />
          <label className="label" htmlFor="p">{t("password")}</label>
          <input id="p" className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setP(e.target.value)} />
          {err && <p className="alert alert-err" style={{ marginTop: 12 }} role="alert">{err}</p>}
          <button className="btn btn-primary" style={{ marginTop: 16 }} disabled={busy || !username || !password}>{t("login_btn")}</button>
        </form>
        <p className="small muted center">{t("privacy_line")}</p>
        <p className="footer-note">{t("disclaimer_footer")}</p>
      </main>
    </div>
  );
}
