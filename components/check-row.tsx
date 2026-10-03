"use client";

import Link from "next/link";
import { useApp } from "@/lib/app-state";
import { timeAgo } from "@/components/app-shell";
import { stockLabel } from "@/lib/stocks";
import type { CheckResult } from "@/lib/types";

export function CheckRow({ c }: { c: CheckResult }) {
  const { b, t, lang } = useApp();
  const name = b(stockLabel(c.input.symbol, c.input.stockName, c.input.otherName));
  const v = c.verdict;
  const label = v === "red" ? t("verdict_red") : v === "orange" ? t("verdict_orange") : t("verdict_green");
  const dec = c.decision === "went_ahead" ? t("decision_went") : c.decision === "skipped" ? t("decision_skipped") : c.decision === "waiting" ? t("decision_waiting") : null;
  return (
    <Link href={`/result/${c.id}`} className="list-item">
      <span className={`cdot cdot-${v}`} aria-hidden />
      <span style={{ flex: 1, minWidth: 0 }}>
        <b style={{ display: "block" }}>{c.input.side === "BUY" ? t("buy") : t("sell")} · {name}</b>
        <span className="small muted">{label} · {timeAgo(c.createdAt, lang)}</span>
      </span>
      {dec && <span className="pill pill-gray">{dec}</span>}
    </Link>
  );
}

