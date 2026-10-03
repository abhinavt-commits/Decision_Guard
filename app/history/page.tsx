"use client";

import { useApp } from "@/lib/app-state";
import { AppPage } from "@/components/app-shell";
import { CheckRow } from "@/components/check-row";

export default function History() {
  const { t, checks } = useApp();
  const counts = { red: 0, orange: 0, green: 0 };
  checks.forEach((c) => counts[c.verdict]++);
  return (
    <AppPage>
      <h1>{t("history_title")}</h1>
      <div className="stats" style={{ marginTop: 16 }}>
        <div><b style={{ color: "var(--red)" }}>{counts.red}</b><span>{t("verdict_red")}</span></div>
        <div><b style={{ color: "var(--orange)" }}>{counts.orange}</b><span>{t("verdict_orange")}</span></div>
        <div><b style={{ color: "var(--green)" }}>{counts.green}</b><span>{t("verdict_green")}</span></div>
      </div>
      <section className="card" style={{ paddingTop: 2, paddingBottom: 2 }}>
        {checks.length === 0 ? <p className="muted" style={{ padding: "12px 0" }}>{t("no_checks")}</p> : checks.map((c) => <CheckRow key={c.id} c={c} />)}
      </section>
    </AppPage>
  );
}
