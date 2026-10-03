"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { lsGet, lsSet, useApp } from "@/lib/app-state";
import { AppPage, useTerm } from "@/components/app-shell";
import { IconMic, IconSend, IconSpeaker } from "@/components/icons";
import { speak, speechSupported, stopSpeaking, useCanSpeak, useVoiceInput } from "@/lib/client/voice";
import { IoChatbubbleEllipsesOutline, IoLockClosedOutline, IoSparklesOutline } from "react-icons/io5";
import { FAQ } from "@/lib/chat";
import type { Bi } from "@/lib/types";

interface Msg {
  role: "user" | "bot";
  text: string;
  action?: "check" | "learn" | "profile" | "help";
  term?: string;
  source?: "ai" | "faq" | "rule" | "lookup";
  refused?: boolean;
}

const SUGGESTIONS: Bi[] = [
  { en: "How do I check a tip?", hi: "टिप कैसे जाँचें?" },
  { en: "What is a stop-loss?", hi: "स्टॉप-लॉस क्या होता है?" },
  { en: "How do I know if an adviser is real?", hi: "कैसे पता करें कि एडवाइज़र असली है?" },
  { en: "What is F&O and why is it risky?", hi: "F&O क्या है और इसमें जोखिम क्यों है?" },
  { en: "I lost money to a scam. What now?", hi: "धोखे में पैसा गया। अब क्या करें?" },
  { en: "Should I buy Tata Motors?", hi: "क्या मुझे टाटा मोटर्स ख़रीदना चाहिए?" },
];

export default function Ask() {
  const { t, b, lang, me } = useApp();
  const openTerm = useTerm();
  const key = me ? `dg_chat_${me.username}` : "";
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [voiceOk, setVoiceOk] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const canSpeak = useCanSpeak(lang);
  const endRef = useRef<HTMLDivElement>(null);
  const voice = useVoiceInput(lang, (v) => setText((x) => (x ? x + " " : "") + v));

  useEffect(() => setVoiceOk(speechSupported()), []);
  useEffect(() => { if (key) setMsgs(lsGet<Msg[]>(key, [])); }, [key]);
  useEffect(() => { if (key) lsSet(key, msgs.slice(-30)); endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs, key]);

  async function send(q: string) {
    const question = q.trim();
    if (!question || busy) return;
    const next = [...msgs, { role: "user" as const, text: question }];
    setMsgs(next);
    setText("");
    setBusy(true);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lang, messages: next.slice(-10).map((m) => ({ role: m.role, text: m.text })) }),
      });
      if (r.status === 429) throw new Error(t("slow_down"));
      if (!r.ok) throw new Error(t("error_generic"));
      const j = await r.json();
      setMsgs((m) => [...m, { role: "bot", text: j.answer, action: j.action, term: j.term, source: j.source, refused: j.refused }]);
    } catch (e) {
      const offline = typeof navigator !== "undefined" && !navigator.onLine;
      setMsgs((m) => [...m, { role: "bot", text: offline ? t("error_offline") : (e as Error).message || t("error_generic") }]);
    } finally {
      setBusy(false);
    }
  }

  const ACTIONS: Record<NonNullable<Msg["action"]>, { href: string; label: string }> = {
    check: { href: "/check", label: t("check_btn") },
    learn: { href: "/learn", label: t("nav_learn") },
    profile: { href: "/profile", label: t("nav_profile") },
    help: { href: "tel:1930", label: t("call_1930") },
  };

  return (
    <AppPage>
      <h1 className="h-icon" style={{ marginBottom: 4 }}><IoChatbubbleEllipsesOutline style={{ width: 26, height: 26 }} /> {t("ask_title")}</h1>
      <p className="page-sub" style={{ marginBottom: 14 }}>{t("ask_sub")}</p>
      <p className="alert alert-info small"><IoLockClosedOutline /><span>{t("ask_rule")}</span></p>

      <div aria-live="polite">
        {msgs.length === 0 && (
          <div className="card" style={{ display: "flex", gap: 12 }}>
            <span className="ibadge"><IoSparklesOutline /></span>
            <div>
            <p style={{ marginTop: 0, marginBottom: 4 }}><b>{t("ask_hello")}</b></p>
            <p className="small muted" style={{ marginBottom: 0 }}>{t("ask_try")}</p>
            </div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} data-role={m.role} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", margin: "8px 0" }}>
            <div
              style={{
                maxWidth: "88%",
                background: m.role === "user" ? "var(--blue)" : "#fff",
                color: m.role === "user" ? "#fff" : "var(--ink)",
                border: m.role === "user" ? 0 : `1px solid ${m.refused ? "var(--orange-line)" : "rgba(226,232,240,.9)"}`,
                borderRadius: m.role === "user" ? "20px 20px 6px 20px" : "20px 20px 20px 6px",
                padding: "12px 16px",
                boxShadow: m.role === "user" ? "var(--shadow-brand)" : "var(--shadow)",
                whiteSpace: "pre-wrap",
                fontSize: 16.5,
              }}
            >
              {m.text}
              {m.role === "bot" && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", marginTop: 8, alignItems: "center" }}>
                  {m.action && (
                    <Link className="btn btn-primary btn-sm" href={ACTIONS[m.action].href} style={{ minHeight: 40 }}>{ACTIONS[m.action].label}</Link>
                  )}
                  {m.term && <button className="linkbtn" onClick={() => openTerm(m.term!)}>{t("explain_term")}</button>}
                  {canSpeak && (
                    <button className="linkbtn" aria-label={t("read_aloud")} onClick={() => {
                      if (speakingIdx === i) { stopSpeaking(); setSpeakingIdx(null); return; }
                      if (speak(m.text, lang, () => setSpeakingIdx(null))) setSpeakingIdx(i);
                    }}>
                      <IconSpeaker size={16} /> {speakingIdx === i ? t("stop_reading") : t("read_aloud")}
                    </button>
                  )}
                  {m.source && <span className="small muted">{m.source === "ai" ? t("ask_src_ai") : m.source === "rule" ? t("ask_src_rule") : m.source === "lookup" ? t("ask_src_lookup") : t("ask_src_faq")}</span>}
                </div>
              )}
            </div>
          </div>
        ))}
        {busy && <p className="small muted">{t("ask_thinking")}</p>}
        <div ref={endRef} />
      </div>

      <div className="chips" style={{ margin: "12px 0" }}>
        {(msgs.length === 0 ? SUGGESTIONS : FAQ.slice(0, 4).map((f) => f.q)).map((s) => (
          <button key={s.en} className="chip" onClick={() => send(b(s))} disabled={busy}>{b(s)}</button>
        ))}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(text); }} style={{ display: "flex", gap: 8, alignItems: "flex-end", position: "sticky", bottom: 92, background: "linear-gradient(to bottom, rgba(248,250,252,0), var(--bg) 30%)", padding: "14px 0 8px" }}>
        <textarea className="textarea" style={{ minHeight: 52, height: 52, flex: 1 }} rows={1} maxLength={800} placeholder={t("ask_placeholder")} value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(text); } }} />
        {voiceOk && (
          <button type="button" className={`btn btn-sm ${voice.listening ? "btn-primary" : "btn-outline"}`} style={{ width: 52, padding: 0 }} aria-label={t("speak_btn")}
            onClick={() => (voice.listening ? voice.stop() : voice.start())}><IconMic /></button>
        )}
        <button className="btn btn-primary btn-sm" style={{ width: 52, padding: 0 }} aria-label={t("ask_send")} disabled={busy || !text.trim()}><IconSend /></button>
      </form>
      {msgs.length > 0 && <button className="btn btn-ghost" onClick={() => setMsgs([])}>{t("ask_clear")}</button>}
    </AppPage>
  );
}
