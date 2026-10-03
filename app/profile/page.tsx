"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/app-state";
import { AppPage, inr, LangToggle, useToast } from "@/components/app-shell";
import { STOCKS, findStock } from "@/lib/stocks";
import { parseTradebook, SAMPLE_CSV } from "@/lib/client/csv";
import { HELP_LINKS } from "@/lib/glossary";
import { IoAdd, IoCallOutline, IoChevronForward, IoCloudUploadOutline, IoLogOutOutline, IoPersonCircleOutline, IoTrashOutline } from "react-icons/io5";

export default function Profile() {
  const { t, b, me, trades, myTrades, addTrades, removeTrade, logout, features } = useApp();
  const router = useRouter();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [adding, setAdding] = useState(false);
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [f, setF] = useState({ date: new Date().toISOString().slice(0, 10), symbol: STOCKS[0].symbol, qty: "", price: "", pnl: "" });

  const sorted = [...trades].sort((a, b) => +new Date(b.date) - +new Date(a.date));
  const amounts = trades.map((x) => x.amount).sort((a, b) => a - b);
  const median = amounts.length ? amounts[Math.floor(amounts.length / 2)] : 0;
  const last7 = trades.filter((x) => Date.now() - +new Date(x.date) <= 7 * 86400000).length;
  const mine = new Set(myTrades.map((x) => x.id));

  return (
    <AppPage>
      <h1>{t("profile_title")}</h1>
      {me && (
        <section className="card" style={{ display: "flex", gap: 14, alignItems: "flex-start", marginTop: 16 }}>
          <span className="ibadge" style={{ width: 48, height: 48, borderRadius: 16 }}><IoPersonCircleOutline style={{ width: 26, height: 26 }} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontSize: 18 }}>{b(me.displayName)}</h3>
            {me.kind === "user" && <p style={{ margin: "0 0 6px" }}>{t("your_login_id")}: <b style={{ color: "var(--blue)" }}>{me.username}</b></p>}
            <p className="small muted" style={{ margin: 0 }}>{me.city ? me.city + " · " : ""}{b(me.story)}</p>
          </div>
        </section>
      )}
      <div className="stats">
        <div><b>{trades.length}</b><span>{t("total_trades")}</span></div>
        <div><b style={{ fontSize: 20, lineHeight: "30px" }}>{inr(median)}</b><span>{t("usual_trade")}</span></div>
        <div><b>{last7}</b><span>{t("trades_7d")}</span></div>
      </div>

      <section className="panel" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <b style={{ fontWeight: 650 }}>{t("language")}</b>
        <LangToggle />
      </section>

      <h2>{t("my_trades")}</h2>
      <p className="small muted">{t("my_trades_sub")}</p>
      <div className="row" style={{ marginBottom: 10 }}>
        <button className="btn btn-outline btn-sm" style={{ width: "100%" }} onClick={() => setAdding((x) => !x)}><IoAdd /> {t("add_trade")}</button>
        <button className="btn btn-outline btn-sm" style={{ width: "100%" }} onClick={() => fileRef.current?.click()}><IoCloudUploadOutline /> {t("import_csv")}</button>
      </div>
      {/* Broad "accept" list: Android often labels CSV files as Excel or plain text. */}
      <input ref={fileRef} type="file" accept=".csv,.txt,text/csv,text/comma-separated-values,text/plain,application/csv,application/vnd.ms-excel" hidden onChange={async (e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        setImportMsg(null);
        if (/\.xlsx?$/i.test(file.name)) { setImportMsg({ ok: false, text: t("import_excel") }); return; }
        let res;
        try { res = parseTradebook(await file.text()); } catch { setImportMsg({ ok: false, text: t("import_fail") }); return; }
        if (res.error === "excel") { setImportMsg({ ok: false, text: t("import_excel") }); return; }
        if (res.error === "no_header") {
          const names: Record<string, string> = { symbol: t("col_symbol"), date: t("col_date"), qty: t("col_qty"), price: t("col_price") };
          setImportMsg({ ok: false, text: `${t("import_missing")} ${(res.missing ?? []).map((m) => names[m] ?? m).join(", ")}` });
          return;
        }
        if (!res.trades.length) { setImportMsg({ ok: false, text: t("import_fail") }); return; }
        const existing = new Set(myTrades.map((x) => x.id));
        const fresh = res.trades.filter((x) => !existing.has(x.id));
        addTrades(fresh);
        setImportMsg({ ok: true, text: `${fresh.length} ${t("import_done")}${res.skipped ? ` · ${res.skipped} ${t("import_skipped")}` : ""}${fresh.length < res.trades.length ? ` · ${res.trades.length - fresh.length} ${t("import_dupes")}` : ""}` });
      }} />
      {importMsg && <p className={`alert ${importMsg.ok ? "alert-info" : "alert-err"} small`} role="status">{importMsg.text}</p>}
      <p className="small muted" style={{ marginTop: 0 }}>
        {t("import_help")}{" "}
        <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(SAMPLE_CSV)}`} download="sample-trades.csv">{t("import_sample")}</a>
      </p>

      {adding && (
        <form className="card" onSubmit={(e) => {
          e.preventDefault();
          const qty = Number(f.qty), price = Number(f.price);
          if (!(qty > 0 && price > 0)) return;
          addTrades([{ id: "u-" + Date.now(), date: new Date(f.date + "T12:00:00").toISOString(), symbol: f.symbol, side: f.pnl ? "SELL" : "BUY", qty, price, amount: Math.round(qty * price), pnl: f.pnl === "" ? null : Number(f.pnl) }]);
          setAdding(false);
          setF({ ...f, qty: "", price: "", pnl: "" });
        }}>
          <label className="label" style={{ marginTop: 0 }}>{t("date")}</label>
          <input type="date" className="input" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
          <label className="label">{t("which_share")}</label>
          <select className="select" value={f.symbol} onChange={(e) => setF({ ...f, symbol: e.target.value })}>
            {STOCKS.map((s) => <option key={s.symbol} value={s.symbol}>{b(s.name)}</option>)}
          </select>
          <div className="row">
            <div><label className="label">{t("how_many")}</label><input className="input" inputMode="numeric" value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} /></div>
            <div><label className="label">₹ / share</label><input className="input" inputMode="decimal" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></div>
          </div>
          <label className="label">{t("profit_loss")}</label>
          <input className="input" inputMode="numeric" placeholder="-1200 / 900" value={f.pnl} onChange={(e) => setF({ ...f, pnl: e.target.value })} />
          <div className="row" style={{ marginTop: 14 }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setAdding(false)}>{t("cancel")}</button>
            <button className="btn btn-primary btn-sm">{t("save")}</button>
          </div>
        </form>
      )}

      <section className="card" style={{ paddingTop: 2, paddingBottom: 2 }}>
        {sorted.slice(0, 25).map((x) => {
          const st = findStock(x.symbol);
          return (
            <div key={x.id} className="list-item">
              <span style={{ flex: 1, minWidth: 0 }}>
                <b>{st ? b(st.name) : x.symbol}</b>
                <span className="small muted" style={{ display: "block" }}>{new Date(x.date).toLocaleDateString("en-IN")} · {x.qty} × {inr(x.price)}</span>
              </span>
              {x.pnl !== null ? (
                <b style={{ color: x.pnl >= 0 ? "var(--green)" : "var(--red)" }}>{x.pnl >= 0 ? "+" : "−"}{inr(Math.abs(x.pnl))}</b>
              ) : <span className="pill pill-gray">{t("buy")}</span>}
              {mine.has(x.id) && <button className="linkbtn" aria-label={t("delete")} onClick={() => removeTrade(x.id)} style={{ color: "var(--ink-3)" }}><IoTrashOutline /></button>}
            </div>
          );
        })}
      </section>

      <p className="alert alert-info small">{t("data_note")}</p>
      <p className="small muted">
        {features.ai ? t("ai_on") : t("ai_off")}
        {features.sebiList ? ` · ${t("sebi_list_note")}: ${features.sebiList.count} (${features.sebiList.fetchedAt})` : ""}
      </p>

      <h2>{t("help_title")}</h2>
      <div className="card" style={{ paddingTop: 2, paddingBottom: 2 }}>
        {HELP_LINKS.map((h) => (
          <a key={h.href} className="list-item" href={h.href} target={h.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
            <span className="ibadge" style={{ width: 34, height: 34, borderRadius: 10 }}><IoCallOutline /></span>
            <span style={{ flex: 1, fontWeight: 650, color: "var(--ink)" }}>{b(h.label)}</span>
            <IoChevronForward className="chev" aria-hidden />
          </a>
        ))}
      </div>

      <button className="btn btn-outline" style={{ marginTop: 16, color: "var(--red)" }} onClick={async () => { await logout(); router.replace("/login"); }}><IoLogOutOutline style={{ color: "var(--red)" }} /> {t("logout")}</button>
      {toast.node}
    </AppPage>
  );
}
