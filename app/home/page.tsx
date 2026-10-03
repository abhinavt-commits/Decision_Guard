"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/app-state";
import { AppPage, timeAgo, useToast } from "@/components/app-shell";
import { stockLabel } from "@/lib/stocks";
import { CheckRow } from "@/components/check-row";
import { AlertCard, useAlerts } from "@/components/alerts";
import {
  IoAdd, IoCameraOutline, IoHappyOutline, IoHourglassOutline, IoMicOutline, IoRemoveCircleOutline,
  IoSadOutline, IoShieldCheckmarkOutline, IoWarningOutline, IoChevronForward,
} from "react-icons/io5";

function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

export default function Home() {
  const { t, b, me, checks, updateCheck, lang } = useApp();
  const now = useNow();
  const { feed } = useAlerts();
  const latestAlert = feed?.items?.[0];
  const toast = useToast();

  const waiting = checks.filter((c) => c.decision === "waiting" && c.waitUntil);
  const followUps = checks.filter((c) => !c.followUp && c.decision && c.decision !== "waiting" && now - +new Date(c.createdAt) > 7 * 86400000).slice(0, 1);
  const paused = checks.filter((c) => c.decision === "skipped" || c.decision === "waiting" || (c.journal && c.journal.length)).length;
  const firstName = me ? b(me.displayName).split(" ")[0] : "";

  const fmtLeft = (ms: number) => {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}:${String(s).padStart(2, "0")}`;
  };
  const FEEL = {
    glad: { icon: <IoHappyOutline />, label: t("followup_glad") },
    neutral: { icon: <IoRemoveCircleOutline />, label: t("followup_neutral") },
    regret: { icon: <IoSadOutline />, label: t("followup_regret") },
  };

  return (
    <AppPage>
      <p className="muted" style={{ margin: "0 0 14px", fontSize: 16 }}>
        {t("hello")}, <b style={{ fontWeight: 700 }}>{firstName}</b>
      </p>

      <section className="hero">
        <span className="hero-badge"><IoShieldCheckmarkOutline size={14} /> {t("hero_badge")}</span>
        <h1>{t("home_ask")}</h1>
        <p>{t("home_ask_sub")}</p>
        <Link href="/check" className="btn btn-primary btn-pill">
          <IoAdd /> {t("check_btn")}
        </Link>
        <div className="row" style={{ marginTop: 10 }}>
          <Link href="/check?mode=screenshot" className="btn btn-soft btn-sm" style={{ width: "100%" }}>
            <IoCameraOutline /> {t("upload_btn")}
          </Link>
          <Link href="/check?mode=voice" className="btn btn-soft btn-sm" style={{ width: "100%" }}>
            <IoMicOutline /> {t("speak_btn")}
          </Link>
        </div>
      </section>

      {waiting.map((c) => {
        const left = +new Date(c.waitUntil!) - now;
        const stockName = b(stockLabel(c.input.symbol, c.input.stockName, c.input.otherName));
        return (
          <section key={c.id} className="card">
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span className="ibadge ibadge-orange"><IoHourglassOutline /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b>{t("waiting_title")}</b>
                <div className="small muted">{stockName}</div>
              </div>
              {left > 0 ? (
                <div className="stat"><b style={{ fontSize: 22, fontVariantNumeric: "tabular-nums" }}>{fmtLeft(left)}</b><span className="small">{t("waiting_left")}</span></div>
              ) : null}
            </div>
            {left <= 0 && (
              <>
                <p className="alert alert-info" style={{ marginTop: 12 }}>{t("waiting_done")}</p>
                <Link href={`/result/${c.id}`} className="btn btn-outline btn-sm" style={{ width: "100%" }}>{t("open_result")}</Link>
              </>
            )}
          </section>
        );
      })}

      {followUps.map((c) => {
        const stockName = b(stockLabel(c.input.symbol, c.input.stockName, c.input.otherName));
        return (
          <section key={c.id} className="card">
            <h3>{t("followup_title")}</h3>
            <p className="small muted">{t("followup_sub")}</p>
            <p style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className={`cdot cdot-${c.verdict}`} />
              <span><b>{c.input.side === "BUY" ? t("buy") : t("sell")} · {stockName}</b> <span className="muted small">· {timeAgo(c.createdAt, lang)}</span></span>
            </p>
            <div className="stack">
              {(["glad", "neutral", "regret"] as const).map((f) => (
                <button key={f} className="btn btn-outline btn-sm" style={{ width: "100%", justifyContent: "flex-start" }}
                  onClick={() => { updateCheck(c.id, { followUp: { at: new Date().toISOString(), feeling: f } }); toast.show(t("followup_thanks")); }}>
                  {FEEL[f].icon} {FEEL[f].label}
                </button>
              ))}
            </div>
          </section>
        );
      })}

      {paused > 0 && (
        <section className="panel" style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span className="ibadge ibadge-green"><IoShieldCheckmarkOutline /></span>
          <div style={{ flex: 1 }}>
            <b style={{ fontSize: 22, display: "block", lineHeight: 1.1 }}>{paused}</b>
            <span className="small muted">{t("paused_count")}</span>
          </div>
        </section>
      )}

      {latestAlert && (
        <section>
          <div className="h-row" style={{ margin: "32px 0 12px" }}>
            <h2 className="h-icon"><IoWarningOutline style={{ color: "var(--orange)" }} /> {t("home_alert_title")}</h2>
            <Link href="/learn?tab=alerts" className="linkbtn">{t("home_alert_more")} <IoChevronForward /></Link>
          </div>
          <AlertCard a={latestAlert} compact />
        </section>
      )}

      <div className="h-row" style={{ margin: "32px 0 12px" }}>
        <h2>{t("recent_checks")}</h2>
        {checks.length > 4 && <Link href="/history" className="linkbtn">{t("see_all")} <IoChevronForward /></Link>}
      </div>
      <section className="card" style={{ paddingTop: 2, paddingBottom: 2 }}>
        {checks.length === 0 ? <p className="muted" style={{ padding: "14px 0", margin: 0 }}>{t("no_checks")}</p> : checks.slice(0, 4).map((c) => <CheckRow key={c.id} c={c} />)}
      </section>
      {toast.node}
    </AppPage>
  );
}
