"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/app-state";
import { AppPage, timeAgo, useToast } from "@/components/app-shell";
import { IconCamera, IconClock, IconMic, IconPlus } from "@/components/icons";
import { stockLabel } from "@/lib/stocks";
import { CheckRow } from "@/components/check-row";
import { AlertCard, useAlerts } from "@/components/alerts";

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

  return (
    <AppPage>
      <p className="muted" style={{ margin: "2px 0 8px" }}>{t("hello")}, {firstName} 🙏</p>
      <section className="card hero">
        <h1>{t("home_ask")}</h1>
        <p>{t("home_ask_sub")}</p>
        <Link href="/check" className="btn btn-white" style={{ marginTop: 6 }}>
          <IconPlus /> {t("check_btn")}
        </Link>
        <div className="row" style={{ marginTop: 10 }}>
          <Link href="/check?mode=screenshot" className="btn btn-sm" style={{ background: "rgba(255,255,255,.15)", color: "#fff", width: "100%" }}>
            <IconCamera /> {t("upload_btn")}
          </Link>
          <Link href="/check?mode=voice" className="btn btn-sm" style={{ background: "rgba(255,255,255,.15)", color: "#fff", width: "100%" }}>
            <IconMic /> {t("speak_btn")}
          </Link>
        </div>
      </section>

      {waiting.map((c) => {
        const left = +new Date(c.waitUntil!) - now;
        const stockName = b(stockLabel(c.input.symbol, c.input.stockName, c.input.otherName));
        return (
          <section key={c.id} className="card" style={{ borderColor: "var(--orange-line)" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <IconClock size={28} />
              <div style={{ flex: 1 }}>
                <b>{t("waiting_title")}</b>
                <div className="small muted">{stockName}</div>
              </div>
              {left > 0 ? (
                <div className="stat"><b style={{ fontSize: 24 }}>{fmtLeft(left)}</b><span className="small muted">{t("waiting_left")}</span></div>
              ) : null}
            </div>
            {left <= 0 && (
              <>
                <p className="alert alert-info" style={{ marginTop: 10 }}>{t("waiting_done")}</p>
                <Link href={`/result/${c.id}`} className="btn btn-outline btn-sm" style={{ width: "100%" }}>{t("open_result")}</Link>
              </>
            )}
          </section>
        );
      })}

      {followUps.map((c) => {
        const stockName = b(stockLabel(c.input.symbol, c.input.stockName, c.input.otherName));
        return (
          <section key={c.id} className="card" style={{ borderColor: "var(--blue)" }}>
            <h3>{t("followup_title")}</h3>
            <p className="small muted">{t("followup_sub")}</p>
            <p><span className={`cdot cdot-${c.verdict}`} style={{ display: "inline-block", verticalAlign: "middle", marginRight: 6 }} />
              <b>{c.input.side === "BUY" ? t("buy") : t("sell")} · {stockName}</b> · {timeAgo(c.createdAt, lang)}</p>
            <div className="stack">
              {(["glad", "neutral", "regret"] as const).map((f) => (
                <button key={f} className="btn btn-outline btn-sm" style={{ width: "100%" }}
                  onClick={() => { updateCheck(c.id, { followUp: { at: new Date().toISOString(), feeling: f } }); toast.show(t("followup_thanks")); }}>
                  {f === "glad" ? "🙂 " + t("followup_glad") : f === "neutral" ? "😐 " + t("followup_neutral") : "😟 " + t("followup_regret")}
                </button>
              ))}
            </div>
          </section>
        );
      })}

      {paused > 0 && (
        <section className="card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div className="stat"><b>{paused}</b></div>
          <div>{t("paused_count")} 👏</div>
        </section>
      )}

      {latestAlert && (
        <section>
          <h2 style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>⚠️ {t("home_alert_title")}</span>
            <Link href="/learn?tab=alerts" className="linkbtn" style={{ fontSize: 15 }}>{t("home_alert_more")}</Link>
          </h2>
          <AlertCard a={latestAlert} compact />
        </section>
      )}

      <h2>{t("recent_checks")}</h2>
      <section className="card" style={{ paddingTop: 4, paddingBottom: 4 }}>
        {checks.length === 0 ? <p className="muted" style={{ padding: "12px 0" }}>{t("no_checks")}</p> : checks.slice(0, 4).map((c) => <CheckRow key={c.id} c={c} />)}
      </section>
      {toast.node}
    </AppPage>
  );
}
