"use client";

import Link from "next/link";
import { use, useState } from "react";
import { useApp } from "@/lib/app-state";
import { AppPage, inr, Term, useTerm, useToast } from "@/components/app-shell";
import { IconClock, IconExternal, IconPen, IconShare, IconSpeaker } from "@/components/icons";
import { stockLabel } from "@/lib/stocks";
import { speak, stopSpeaking, useCanSpeak } from "@/lib/client/voice";
import { makeShareCard, shareText } from "@/lib/client/share-card";
import type { Category, CheckResult, Signal } from "@/lib/types";
import type { UIKey } from "@/lib/ui-strings";
import { AlertCard, useAlerts } from "@/components/alerts";
import { SIGNAL_TO_TOPIC } from "@/lib/alerts-shared";
import {
  IoAlertCircle, IoArrowForward, IoCheckmarkCircle, IoChevronDown, IoCloseCircle, IoFilmOutline, IoHandLeftOutline,
  IoInformationCircle, IoNewspaperOutline, IoShieldCheckmarkOutline, IoSparklesOutline, IoTimeOutline, IoTrendingUpOutline, IoWarning,
} from "react-icons/io5";

const SECTION: Record<Category, UIKey> = {
  message: "sec_message",
  source: "sec_source",
  behaviour: "sec_behaviour",
  company: "sec_company",
};
const ICON = { red: <IoAlertCircle />, orange: <IoWarning />, ok: <IoCheckmarkCircle />, info: <IoInformationCircle /> };

function SignalCard({ s }: { s: Signal }) {
  const { b, t } = useApp();
  const openTerm = useTerm();
  const [open, setOpen] = useState(s.level === "red");
  const hasMore = Boolean(s.evidence?.length || s.action || s.link);
  return (
    <article className={`sig sig-${s.level}`} id={`sig-${s.id}`}>
      <div className="t"><span className="dot" aria-hidden>{ICON[s.level]}</span><span>{b(s.title)}</span></div>
      <p className="why">{b(s.why)}</p>
      {open && s.evidence?.length ? (
        <div className="ev" aria-label={t("what_found")}>
          {s.evidence.map((e, i) => <div key={i}>{b(e)}</div>)}
        </div>
      ) : null}
      {open && s.action && <p className="act"><IoArrowForward /><span>{b(s.action)}</span></p>}
      <div className="more">
        {hasMore && !open && <button className="linkbtn" onClick={() => setOpen(true)}>{t("what_found")} <IoChevronDown /></button>}
        {s.term && <button className="linkbtn" onClick={() => openTerm(s.term!)}>{t("explain_term")}</button>}
        {open && s.link && (
          <a className="linkbtn" href={s.link.href} target="_blank" rel="noopener noreferrer">
            {b(s.link.label)} <IconExternal size={14} />
          </a>
        )}
      </div>
    </article>
  );
}

function spokenSummary(c: CheckResult, lang: "en" | "hi", t: (k: UIKey) => string) {
  const warn = c.signals.filter((s) => s.level === "red" || s.level === "orange");
  return [c.headline[lang] + ".", ...warn.slice(0, 6).map((s) => s.title[lang] + ". " + s.why[lang]), t("not_prediction")].join(" ");
}

export default function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { checks, b, t, lang, updateCheck } = useApp();
  const toast = useToast();
  const [speaking, setSpeaking] = useState(false);
  const canSpeak = useCanSpeak(lang);
  const [deciding, setDeciding] = useState(false);
  const c = checks.find((x) => x.id === id);
  const { feed } = useAlerts();
  const topics = new Set((c?.signals ?? []).filter((s) => s.level === "red" || s.level === "orange").map((s) => SIGNAL_TO_TOPIC[s.id]).filter(Boolean));
  const related = (feed?.items ?? []).filter((a) => topics.has(a.topic)).slice(0, 2);

  if (!c) {
    return (
      <AppPage>
        <p className="muted">{t("no_checks")}</p>
        <Link className="btn btn-primary" href="/check">{t("check_btn")}</Link>
      </AppPage>
    );
  }

  const name = b(stockLabel(c.input.symbol, c.input.stockName, c.input.otherName));
  const warn = c.signals.filter((s) => s.level === "red" || s.level === "orange" || s.level === "info");
  const ok = c.signals.filter((s) => s.level === "ok");
  const cats: Category[] = ["message", "behaviour", "source", "company"];
  // Top 3: the most serious sign from each area first (message, your trades, source, company).
  const warnAll = c.signals.filter((s) => s.level === "red" || s.level === "orange");
  const top: Signal[] = [];
  for (const s of warnAll) if (!top.some((x) => x.category === s.category)) top.push(s);
  for (const s of warnAll) if (top.length < 3 && !top.includes(s)) top.push(s);
  top.splice(3);
  top.sort((a, b) => (a.level === b.level ? 0 : a.level === "red" ? -1 : 1));
  const big = c.verdict === "red" ? t("verdict_red") : c.verdict === "orange" ? t("verdict_orange") : t("verdict_green");

  async function share() {
    const text = shareText(c!, lang);
    try {
      const blob = await makeShareCard(c!, lang);
      if (blob) {
        const file = new File([blob], "decision-check.png", { type: "image/png" });
        const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
        if (nav.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], text });
          return;
        }
      }
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  }

  function wait(mins: number) {
    updateCheck(c!.id, { decision: "waiting", waitUntil: new Date(Date.now() + mins * 60000).toISOString() });
    try {
      if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
    } catch { /* ignore */ }
    toast.show(t("decision_saved"));
  }

  return (
    <AppPage>
      <section className={`verdict verdict-${c.verdict}`} aria-live="polite">
        <div className="light" aria-hidden><i /><i /><i /></div>
        <p className="big">{c.verdict === "green" ? <IoShieldCheckmarkOutline /> : <IoHandLeftOutline />}{big}</p>
        <p className="head">{b(c.headline)}</p>
        <p className="meta">
          {c.input.side === "BUY" ? t("buy") : t("sell")} · <b>{name}</b> · {c.input.qty} · {inr(c.input.amount)}
        </p>
      </section>

      {c.freshness && c.freshness.level !== "unknown" && c.freshness.date && (
        <p className={`pill ${c.freshness.level === "fresh" ? "pill-green" : c.freshness.level === "weeks" ? "pill-gray" : "pill-orange"}`} style={{ fontSize: 13.5, padding: "6px 12px", marginBottom: 16 }}>
          <IoTimeOutline /> {t("fresh_published")} {new Date(c.freshness.date).toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", { day: "numeric", month: "short", year: "numeric" })}
          {" · "}{t(`fresh_${c.freshness.level}` as UIKey)}
        </p>
      )}

      {top.length > 0 && (
        <section className="card" aria-label={t("top_three")}>
          <p className="eyebrow">{t("top_three")}</p>
          <ol style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
            {top.map((s, i) => (
              <li key={s.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 0", borderTop: i ? "1px solid var(--line-soft)" : 0 }}>
                <span className={`cdot cdot-${s.level}`} aria-hidden />
                <a href={`#sig-${s.id}`} style={{ color: "var(--ink)", textDecoration: "none", fontWeight: 650, flex: 1 }}>{b(s.title)}</a>
              </li>
            ))}
          </ol>
        </section>
      )}
      <p className="small muted">{c.verdict === "green" ? t("green_note") : t("not_prediction")}</p>

      <div className="row" style={{ margin: "14px 0 6px" }}>
        {canSpeak && (
          <button className="btn btn-outline btn-sm" style={{ width: "100%" }}
            onClick={() => {
              if (speaking) { stopSpeaking(); setSpeaking(false); return; }
              if (speak(spokenSummary(c, lang, t), lang, () => setSpeaking(false))) setSpeaking(true);
            }}>
            <IconSpeaker /> {speaking ? t("stop_reading") : t("read_aloud")}
          </button>
        )}
        <button className="btn btn-outline btn-sm" style={{ width: "100%" }} onClick={share}><IconShare /> {t("share_family")}</button>
      </div>

      {c.aiSummary && (
        <section className="card flat" style={{ marginTop: 16 }}>
          <h3 className="h-icon"><IoSparklesOutline /> {t("ai_summary")}</h3>
          <p style={{ marginBottom: 6 }}>{b(c.aiSummary)}</p>
          <p className="small muted" style={{ margin: 0 }}>{t("ai_note")}</p>
        </section>
      )}

      {(c.youtube?.title || c.video) && (
        <section className="card" style={{ marginTop: 16 }}>
          <p className="eyebrow">YouTube</p>
          {c.youtube?.title && <b>{c.youtube.title}</b>}
          {c.youtube?.title && <div className="small muted">{c.youtube.channel}{c.youtube.views ? ` · ${c.youtube.views.toLocaleString("en-IN")} ${t("views_short")}` : ""}</div>}
          {c.video?.status === "ok" ? (
            <>
              <h3 className="h-icon" style={{ marginTop: 14 }}><IoFilmOutline /> {t("video_inside")}</h3>
              <p className="small muted" style={{ marginTop: 0 }}>{c.video.minutesWatched ? t("video_watched").replace("15", String(c.video.minutesWatched)) : t("video_watched_all")}{c.video.speaker ? ` · ${t("video_speaker")}: ${c.video.speaker}` : ""}</p>
              {c.video.claims.length === 0 && <p className="small">{t("video_no_claims")}</p>}
              <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
                {c.video.claims.map((cl, i) => {
                  const secs = cl.time ? cl.time.split(":").reduce((a, x) => a * 60 + Number(x), 0) : 0;
                  return (
                    <li key={i} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--line-soft)" }}>
                      {cl.time && c.video?.id ? (
                        <a href={`https://youtu.be/${c.video.id}?t=${secs}`} target="_blank" rel="noopener noreferrer" className="pill pill-gray" style={{ textDecoration: "none", alignSelf: "flex-start" }}>{cl.time}</a>
                      ) : <span className="pill pill-gray" style={{ alignSelf: "flex-start" }}>—</span>}
                      <span className="small">“{cl.quote}”{cl.flag !== "none" && <span className="pill pill-orange" style={{ marginLeft: 6, verticalAlign: "middle" }}><IoWarning /></span>}</span>
                    </li>
                  );
                })}
              </ul>
              {c.video.regNumbers.length > 0 && <p className="small" style={{ margin: "8px 0 0" }}><b>{t("video_regs")}:</b> {c.video.regNumbers.join(", ")}</p>}
              {c.video.links.length > 0 && <p className="small" style={{ margin: "6px 0 0", wordBreak: "break-word" }}><b>{t("video_links")}:</b> {c.video.links.join(" · ")}</p>}
              <p className="small" style={{ margin: "10px 0 0", display: "flex", gap: 6, alignItems: "center", color: c.video.disclaimer ? "var(--green)" : "var(--red)" }}>{c.video.disclaimer ? <IoCheckmarkCircle /> : <IoCloseCircle />}{c.video.disclaimer ? t("video_disclaimer_yes") : t("video_disclaimer_no")}</p>
              <p className="small muted" style={{ margin: "6px 0 0" }}>{t("video_ai_note")}</p>
            </>
          ) : c.video ? (
            <p className="alert alert-warn small" style={{ marginTop: 10, marginBottom: 0 }}>
              {t("video_not_watched_short")} <b>{c.video.reasonText ? b(c.video.reasonText) : ""}</b>
              {c.video.reason === "quota" && <><br />{t("video_quota_tip")}</>}
              {c.video.reason === "no_key" && <><br />{t("video_nokey_tip")}</>}
              {c.video.debug && <><br /><span className="small" style={{ opacity: 0.75 }}>({c.video.debug})</span></>}
            </p>
          ) : null}
        </section>
      )}

      {cats.map((cat) => {
        const list = warn.filter((s) => s.category === cat);
        if (!list.length) return null;
        return (
          <section key={cat}>
            <h2 className="section-title">{t(SECTION[cat])}</h2>
            {list.map((s) => <SignalCard key={s.id} s={s} />)}
          </section>
        );
      })}

      {c.market?.live && (
        <section className="card">
          <h3 className="h-icon"><IoTrendingUpOutline /> {name} — <Term id="volatility" /></h3>
          <div className="kv"><span>₹</span><b>{inr(c.market.price)}</b></div>
          <div className="kv"><span>1M</span><b>{(c.market.change1m ?? 0) >= 0 ? "+" : ""}{c.market.change1m?.toFixed(1)}%</b></div>
          <div className="kv"><span>52W</span><b>{inr(c.market.low1y)} – {inr(c.market.high1y)}</b></div>
          {c.market.headlines.slice(0, 3).map((h, i) => (
            <p key={i} className="small" style={{ margin: "10px 0 0", display: "flex", gap: 8 }}>
              <IoNewspaperOutline style={{ color: "var(--ink-3)", marginTop: 3 }} /><span>{h.link ? <a href={h.link} target="_blank" rel="noopener noreferrer">{h.title}</a> : h.title} <span className="muted"> — {h.source}</span></span>
            </p>
          ))}
        </section>
      )}

      {related.length > 0 && (
        <section>
          <h2 className="section-title"><IoNewspaperOutline /> {t("related_alerts")}</h2>
          {related.map((a) => <AlertCard key={a.id} a={a} compact />)}
        </section>
      )}

      {ok.length > 0 && (
        <section>
          <h2 className="section-title">{t("sec_ok")}</h2>
          {ok.map((s) => <SignalCard key={s.id} s={s} />)}
        </section>
      )}

      {c.notChecked.length > 0 && (
        <section>
          <h2 className="section-title">{t("sec_not_checked")}</h2>
          <div className="card flat">
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {c.notChecked.map((n, i) => <li key={i} className="small" style={{ marginBottom: 6 }}>{b(n)}</li>)}
            </ul>
          </div>
        </section>
      )}

      <h2 style={{ marginTop: 36 }}>{t("i_decided")}?</h2>
      <div className="stack">
        <button className="btn btn-primary" onClick={() => wait(15)}><IconClock /> {t("wait_15")}</button>
        <button className="btn btn-outline" onClick={() => wait(24 * 60)}><IconClock /> {t("wait_day")}</button>
        <Link className="btn btn-outline" href={`/journal/${c.id}`}><IconPen /> {t("write_journal")}</Link>
        {!deciding ? (
          <button className="btn btn-ghost" onClick={() => setDeciding(true)}>{t("i_decided")}</button>
        ) : (
          <div className="row">
            <button className="btn btn-outline btn-sm" onClick={() => { updateCheck(c.id, { decision: "skipped", waitUntil: undefined }); toast.show(t("decision_saved")); }}>{t("decided_skip")}</button>
            <button className="btn btn-outline btn-sm" onClick={() => { updateCheck(c.id, { decision: "went_ahead", waitUntil: undefined }); toast.show(t("decision_saved")); }}>{t("decided_go")}</button>
          </div>
        )}
      </div>
      <p className="small muted" style={{ marginTop: 14 }}>{t("we_checked")} {c.checkedCount} {t("things")} · {c.aiUsed ? t("ai_on") : t("ai_off")}</p>
      {toast.node}
    </AppPage>
  );
}
