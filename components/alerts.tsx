"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/app-state";
import type { AlertItem } from "@/lib/alerts-shared";
import { GOVT_MEASURES, TOPIC_INFO } from "@/lib/alerts-shared";
import { IconExternal } from "./icons";
import { IoArrowForwardCircleOutline, IoBusinessOutline } from "react-icons/io5";

type Feed = { items: AlertItem[]; sources: { ok: number; failed: number }; fetchedAt: string };
let memo: Promise<Feed> | null = null;

/** Loads the fraud-alert feed once per page session (server caches for 1 hour). */
export function useAlerts() {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    memo ??= fetch("/api/alerts").then((r) => r.json()).catch((e) => { memo = null; throw e; });
    let live = true;
    memo.then((f) => live && setFeed(f)).catch(() => live && setError(true));
    return () => { live = false; };
  }, []);
  return { feed, error, loading: !feed && !error };
}

export function AlertCard({ a, compact = false }: { a: AlertItem; compact?: boolean }) {
  const { b, lang, t } = useApp();
  const title = a.titleBi ? a.titleBi[lang] : a.title;
  const info = TOPIC_INFO[a.topic];
  const date = a.date ? new Date(a.date).toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", { day: "numeric", month: "short" }) : "";
  return (
    <article className="card">
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        <span className={`pill ${a.kind === "official" ? "pill-green" : "pill-gray"}`}>{a.kind === "official" ? t("alert_official") : t("alert_news")}</span>
        <span className="pill pill-orange">{b(info.label)}</span>
        {a.govtAction && <span className="pill pill-blue">{t("alert_govt")}</span>}
      </div>
      <h3 style={{ fontSize: 16.5, lineHeight: 1.45 }}>{title}</h3>
      <p className="small muted" style={{ margin: "0 0 6px" }}>{a.source}{date ? ` · ${date}` : ""}{a.titleBi && a.lang !== lang ? ` · ${t("alert_translated")}` : ""}</p>
      {!compact && <p className="small" style={{ margin: "0 0 6px" }}><b>{t("how_to_spot")}:</b> {b(info.spot)}</p>}
      <a className="linkbtn" href={a.link} target="_blank" rel="noopener noreferrer">{t("alert_read")} <IconExternal size={14} /></a>
    </article>
  );
}

export function GovtMeasures() {
  const { b, t } = useApp();
  return (
    <div>
      {GOVT_MEASURES.map((m) => (
        <details key={m.id} className="card">
          <summary style={{ fontWeight: 700, cursor: "pointer", fontSize: 16.5, color: "var(--ink)" }}><span className="ibadge" style={{ width: 34, height: 34, borderRadius: 10 }}><IoBusinessOutline /></span>{b(m.title)}</summary>
          <p style={{ marginTop: 10 }}>{b(m.what)}</p>
          <p className="alert alert-info small" style={{ marginBottom: 8 }}><IoArrowForwardCircleOutline /><span>{b(m.use)}</span></p>
          <a className="linkbtn" href={m.link} target="_blank" rel="noopener noreferrer">{t("alert_open_official")} <IconExternal size={14} /></a>
        </details>
      ))}
    </div>
  );
}
