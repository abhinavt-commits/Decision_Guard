"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/lib/app-state";
import { AppPage } from "@/components/app-shell";
import { AlertCard, GovtMeasures, useAlerts } from "@/components/alerts";
import { GLOSSARY, HELP_LINKS, SCAMS } from "@/lib/glossary";
import type { AlertTopic } from "@/lib/alerts-shared";
import { TOPIC_INFO } from "@/lib/alerts-shared";

type Tab = "alerts" | "scams" | "words";

function Alerts() {
  const { t, b } = useApp();
  const { feed, error, loading } = useAlerts();
  const [topic, setTopic] = useState<AlertTopic | "all">("all");
  const items = (feed?.items ?? []).filter((a) => topic === "all" || a.topic === topic);
  const topics = Array.from(new Set((feed?.items ?? []).map((a) => a.topic)));
  return (
    <>
      <p className="muted small">{t("alerts_sub")}</p>
      <h2>{t("alerts_govt")}</h2>
      <GovtMeasures />

      <h2>{t("alerts_recent")}</h2>
      {loading && <div className="spinner" aria-label="Loading" />}
      {(error || (feed && feed.items.length === 0)) && <p className="alert alert-warn small">{t("alerts_none")}</p>}
      {topics.length > 1 && (
        <div className="chips" style={{ marginBottom: 10 }}>
          <button className="chip" aria-pressed={topic === "all"} onClick={() => setTopic("all")}>{t("all")}</button>
          {topics.map((tp) => (
            <button key={tp} className="chip" aria-pressed={topic === tp} onClick={() => setTopic(tp)}>{b(TOPIC_INFO[tp].label)}</button>
          ))}
        </div>
      )}
      {items.map((a) => <AlertCard key={a.id} a={a} />)}
      {feed && feed.items.length > 0 && <p className="small muted">{t("alerts_note")}</p>}
    </>
  );
}

function LearnInner() {
  const { t, b, lang } = useApp();
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>((params.get("tab") as Tab) || "alerts");
  const [q, setQ] = useState("");
  const terms = GLOSSARY.filter((g) => !q || (g.word.en + g.word.hi + g.simple[lang]).toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <h1>{t("learn_title")}</h1>
      <div className="seg" role="tablist" style={{ marginBottom: 8 }}>
        <button role="tab" aria-pressed={tab === "alerts"} onClick={() => setTab("alerts")} style={{ fontSize: 16 }}>⚠️ {t("tab_alerts")}</button>
        <button role="tab" aria-pressed={tab === "scams"} onClick={() => setTab("scams")} style={{ fontSize: 16 }}>{t("learn_scams")}</button>
        <button role="tab" aria-pressed={tab === "words"} onClick={() => setTab("words")} style={{ fontSize: 16 }}>{t("tab_words")}</button>
      </div>

      {tab === "alerts" && <Alerts />}

      {tab === "scams" && SCAMS.map((s) => (
        <details key={s.id} className="card">
          <summary style={{ fontWeight: 800, cursor: "pointer", fontSize: 18 }}>{b(s.title)}</summary>
          <p style={{ marginTop: 10 }}><b>{t("how_it_works")}:</b> {b(s.how)}</p>
          <p style={{ margin: 0 }}><b>{t("how_to_spot")}:</b> {b(s.spot)}</p>
        </details>
      ))}

      {tab === "words" && (
        <>
          <input className="input" placeholder="🔍" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
          <div style={{ marginTop: 10 }}>
            {terms.map((g) => (
              <details key={g.id} className="card" id={g.id}>
                <summary style={{ fontWeight: 800, cursor: "pointer", fontSize: 18 }}>{b(g.word)}</summary>
                <p style={{ marginTop: 10 }}>{b(g.simple)}</p>
                {g.example && <p className="alert alert-info" style={{ margin: 0 }}>{b(g.example)}</p>}
              </details>
            ))}
          </div>
        </>
      )}

      <h2>{t("help_title")}</h2>
      <div className="card" style={{ paddingTop: 4, paddingBottom: 4 }}>
        {HELP_LINKS.map((h) => (
          <a key={h.href} className="list-item" href={h.href} target={h.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
            <span style={{ flex: 1, fontWeight: 700, color: "var(--blue)" }}>{b(h.label)}</span>
          </a>
        ))}
      </div>
    </>
  );
}

export default function Learn() {
  return (
    <AppPage>
      <Suspense fallback={<div className="spinner" />}>
        <LearnInner />
      </Suspense>
    </AppPage>
  );
}
