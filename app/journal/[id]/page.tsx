"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useApp } from "@/lib/app-state";
import { AppPage, useToast } from "@/components/app-shell";
import { IconMic } from "@/components/icons";
import { speechSupported, useVoiceInput } from "@/lib/client/voice";
import type { UIKey } from "@/lib/ui-strings";

const QS: UIKey[] = ["jq1", "jq2", "jq3", "jq4"];

function Question({ k, value, onChange }: { k: UIKey; value: string; onChange: (v: string) => void }) {
  const { t, lang } = useApp();
  const [ok, setOk] = useState(false);
  useEffect(() => setOk(speechSupported()), []);
  const v = useVoiceInput(lang, (txt) => onChange((value ? value + " " : "") + txt));
  return (
    <div className="card">
      <label className="label" style={{ marginTop: 0 }} htmlFor={k}>{t(k)}</label>
      <textarea id={k} className="textarea" style={{ minHeight: 90 }} value={value} onChange={(e) => onChange(e.target.value)} />
      {ok && (
        <button type="button" className="btn btn-ghost" onClick={() => (v.listening ? v.stop() : v.start())}>
          <IconMic /> {v.listening ? t("listening") : t("speak_hint")}
        </button>
      )}
    </div>
  );
}

export default function Journal({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { checks, t, updateCheck } = useApp();
  const toast = useToast();
  const c = checks.find((x) => x.id === id);
  const [answers, setAnswers] = useState<string[]>(() => QS.map((q) => c?.journal?.find((j) => j.q === q)?.a ?? ""));
  useEffect(() => {
    if (c?.journal) setAnswers(QS.map((q) => c.journal!.find((j) => j.q === q)?.a ?? ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c?.id]);

  // Prefill Q1 with the user's own reason, if given.
  useEffect(() => {
    if (c && !answers[0] && c.input.reasonText) setAnswers((a) => [c.input.reasonText!, ...a.slice(1)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c?.id]);

  if (!c) return <AppPage><p className="muted">{t("no_checks")}</p></AppPage>;

  return (
    <AppPage>
      <h1>{t("journal_title")}</h1>
      <p className="muted">{t("journal_sub")}</p>
      {QS.map((q, i) => (
        <Question key={q} k={q} value={answers[i]} onChange={(v) => setAnswers((a) => a.map((x, j) => (j === i ? (typeof v === "string" ? v : x) : x)))} />
      ))}
      <button className="btn btn-primary" onClick={() => {
        updateCheck(c.id, { journal: QS.map((q, i) => ({ q, a: answers[i] })).filter((x) => x.a.trim()) });
        toast.show(t("journal_saved"));
      }}>{t("journal_save")}</button>
      <Link className="btn btn-ghost" href={`/result/${c.id}`} style={{ marginTop: 8 }}>{t("back")}</Link>
      {toast.node}
    </AppPage>
  );
}
