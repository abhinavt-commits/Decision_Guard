"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp } from "@/lib/app-state";
import { AppPage, inr } from "@/components/app-shell";
import { readScreenshot } from "@/lib/client/ocr";
import { speechSupported, useVoiceInput } from "@/lib/client/voice";
import { searchStocks, findStock, STOCKS } from "@/lib/stocks";
import type { StockHit } from "@/lib/stock-universe";
import type { CheckResult, ReasonChip, SourceType } from "@/lib/types";
import type { UIKey } from "@/lib/ui-strings";
import { IconCamera, IconChat, IconDots, IconInsta, IconMic, IconNews, IconPhone, IconSend, IconStar, IconUsers, IconYoutube } from "@/components/icons";

const SOURCES: { id: SourceType; icon: React.ReactNode }[] = [
  { id: "youtube", icon: <IconYoutube /> },
  { id: "whatsapp", icon: <IconChat /> },
  { id: "telegram", icon: <IconSend /> },
  { id: "instagram", icon: <IconInsta /> },
  { id: "influencer", icon: <IconStar /> },
  { id: "friend", icon: <IconUsers /> },
  { id: "news", icon: <IconNews /> },
  { id: "sms", icon: <IconPhone /> },
  { id: "other", icon: <IconDots /> },
];
const REASONS: ReasonChip[] = ["recommended", "news", "recover_loss", "friends_buying", "price_falling", "fear_missing", "own_research"];

function parseViews(s: string): number | undefined {
  const t = s.trim().toLowerCase().replace(/,/g, "");
  if (!t) return undefined;
  const m = t.match(/^([\d.]+)\s*(k|m|lakh|lac|l|cr|crore|हज़ार|लाख|करोड़)?/);
  if (!m) return undefined;
  const n = parseFloat(m[1]);
  const mult: Record<string, number> = { k: 1e3, "हज़ार": 1e3, m: 1e6, lakh: 1e5, lac: 1e5, l: 1e5, "लाख": 1e5, cr: 1e7, crore: 1e7, "करोड़": 1e7 };
  return Math.round(n * (m[2] ? mult[m[2]] ?? 1 : 1));
}

function CheckForm() {
  const { t, b, lang, myTrades, saveCheck } = useApp();
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = useState(1);
  const [sourceType, setSource] = useState<SourceType | null>(null);
  const [knows, setKnows] = useState<"yes" | "no" | "unsure" | undefined>();
  const [message, setMessage] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [tipAge, setTipAge] = useState<"today" | "week" | "month" | "older" | "unknown" | undefined>();
  const [url, setUrl] = useState("");
  const [views, setViews] = useState("");
  const [shot, setShot] = useState<string | null>(null);
  const [ocrState, setOcr] = useState<"idle" | "busy" | "done" | "fail">("idle");
  const [q, setQ] = useState("");
  const [symbol, setSymbol] = useState<string | null>(null);
  const [picked, setPicked] = useState<StockHit | null>(null);
  const [hits, setHits] = useState<StockHit[]>(() => STOCKS.map((c) => ({ symbol: c.symbol, name: c.name, exchange: "NSE" as const, curated: true })));
  const [searching, setSearching] = useState(false);
  const [otherName, setOther] = useState("");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [qty, setQty] = useState("");
  const [amount, setAmount] = useState("");
  const [amountAuto, setAmountAuto] = useState(false);
  const [price, setPrice] = useState<number | null>(null);
  const [reasons, setReasons] = useState<ReasonChip[]>([]);
  const [reasonText, setReasonText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [voiceOk, setVoiceOk] = useState(false);
  useEffect(() => setVoiceOk(speechSupported()), []);

  const voiceMsg = useVoiceInput(lang, (txt) => setMessage((m) => (m ? m + " " : "") + txt));
  const voiceReason = useVoiceInput(lang, (txt) => setReasonText((m) => (m ? m + " " : "") + txt));

  // Shared from another app (Android share sheet) or opened in a special mode.
  useEffect(() => {
    const text = params.get("text");
    if (text) {
      setMessage(text);
      const link = text.match(/https?:\/\/\S+/)?.[0];
      if (link) setUrl(link);
      if (/youtu/.test(text)) setSource("youtube");
      setNotice(t("share_received"));
    }
    if (params.get("shared") === "1" && "caches" in window) {
      (async () => {
        try {
          const cache = await caches.open("share-inbox");
          const tRes = await cache.match("/shared/text");
          if (tRes) {
            const txt = await tRes.text();
            if (txt) {
              setMessage(txt);
              const link = txt.match(/https?:\/\/\S+/)?.[0];
              if (link) setUrl(link);
            }
          }
          const iRes = await cache.match("/shared/image");
          if (iRes) {
            const blob = await iRes.blob();
            handleFile(blob);
          }
          await caches.delete("share-inbox");
          setNotice(t("share_received"));
        } catch { /* ignore */ }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch latest price to pre-fill amount
  useEffect(() => {
    if (!symbol || symbol === "OTHER") { setPrice(null); return; }
    let cancelled = false;
    fetch(`/api/quote?s=${symbol}`).then((r) => r.json()).then((j) => { if (!cancelled) setPrice(j.price ?? null); }).catch(() => {});
    return () => { cancelled = true; };
  }, [symbol]);
  useEffect(() => {
    const n = Number(qty);
    if (price && n > 0 && (amountAuto || !amount)) {
      setAmount(String(Math.round(price * n)));
      setAmountAuto(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [price, qty]);

  // Company search: popular stocks instantly, then every NSE-listed company from the server.
  useEffect(() => {
    const query = q.trim();
    const local = searchStocks(query).map((c) => ({ symbol: c.symbol, name: c.name, exchange: "NSE" as const, curated: true }));
    setHits(local);
    if (query.length < 2) return;
    setSearching(true);
    const ctl = new AbortController();
    const id = setTimeout(() => {
      fetch(`/api/stocks?q=${encodeURIComponent(query)}`, { signal: ctl.signal })
        .then((r) => r.json())
        .then((j: { hits: StockHit[] }) => {
          const seen = new Set(local.map((x) => x.symbol));
          setHits([...local, ...j.hits.filter((h) => !seen.has(h.symbol))].slice(0, 15));
        })
        .catch(() => {})
        .finally(() => setSearching(false));
    }, 250);
    return () => { clearTimeout(id); ctl.abort(); };
  }, [q]);

  async function handleFile(f: Blob) {
    setShot(URL.createObjectURL(f));
    setOcr("busy");
    try {
      const text = await readScreenshot(f);
      if (!text) throw new Error();
      setMessage((m) => (m ? m + "\n" : "") + text);
      const link = text.match(/https?:\/\/\S+/)?.[0];
      if (link) setUrl((u) => u || link);
      setOcr("done");
    } catch {
      setOcr("fail");
    }
  }

  async function submit() {
    setError(null);
    if (!symbol) { setStep(2); setError(t("need_company")); return; }
    if (!(Number(qty) > 0)) { setStep(2); setError(t("need_qty")); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol, otherName: symbol === "OTHER" ? otherName : undefined, stockName: picked && !picked.curated ? picked.name : undefined, side, qty: Number(qty),
          amount: Number(amount) || undefined, sourceType: sourceType ?? "other", knowsSender: knows, sourceName: sourceName.trim() || undefined, tipAge,
          url: url || undefined, message: message || undefined, views: parseViews(views),
          reasonChips: reasons, reasonText: reasonText || undefined, lang, extraTrades: myTrades,
        }),
      });
      if (r.status === 401) { router.replace("/login"); return; }
      if (!r.ok) throw new Error();
      const result = (await r.json()) as CheckResult;
      saveCheck(result);
      router.push(`/result/${result.id}`);
    } catch {
      setError(typeof navigator !== "undefined" && !navigator.onLine ? t("error_offline") : t("error_generic"));
      setBusy(false);
    }
  }

  if (busy) {
    return (
      <div className="center" role="status" aria-live="polite">
        <div className="spinner" />
        <h2>{t("checking")}</h2>
        <p className="muted">{t("checking_steps")}</p>
        {/youtu\.?be/i.test(url) && <p className="alert alert-info small">🎬 {t("checking_video")}</p>}
      </div>
    );
  }

  const curatedSel = symbol ? findStock(symbol) : undefined;
  const sel = symbol && symbol !== "OTHER" ? picked : null;

  return (
    <div>
      <div className="progress" aria-hidden>{[1, 2, 3].map((i) => <span key={i} className={i <= step ? "on" : ""} />)}</div>
      <p className="small muted" style={{ margin: 0 }}>{t("step_of")} {step}/3</p>
      {notice && <p className="alert alert-info">{notice}</p>}
      {error && <p className="alert alert-err" role="alert">{error}</p>}

      {step === 1 && (
        <section>
          <h1>{t("step1")}</h1>
          <label className="label">{t("where_from")}</label>
          <div className="grid3">
            {SOURCES.map((s) => (
              <button key={s.id} type="button" className="tile" aria-pressed={sourceType === s.id} onClick={() => setSource(s.id)}>
                {s.icon}<span>{t(`src_${s.id}` as UIKey)}</span>
              </button>
            ))}
          </div>

          {sourceType && ["whatsapp", "telegram", "sms", "instagram"].includes(sourceType) && (
            <>
              <label className="label">{t("know_sender")}</label>
              <div className="chips">
                {(["yes", "no", "unsure"] as const).map((k) => (
                  <button key={k} type="button" className="chip" aria-pressed={knows === k} onClick={() => setKnows(k)}>
                    {k === "yes" ? t("yes") : k === "no" ? t("no") : t("not_sure")}
                  </button>
                ))}
              </div>
            </>
          )}

          {sourceType && sourceType !== "friend" && sourceType !== "news" && (
            <>
              <label className="label" htmlFor="sname">{t("source_name_label")}</label>
              <input id="sname" className="input" placeholder={t("source_name_ph")} value={sourceName} onChange={(e) => setSourceName(e.target.value)} maxLength={80} />
              <p className="small muted" style={{ margin: "6px 0 0" }}>{t("source_name_help")}</p>
            </>
          )}

          <label className="label">{t("tip_age_q")}</label>
          <div className="chips">
            {(["today", "week", "month", "older", "unknown"] as const).map((k) => (
              <button key={k} type="button" className="chip" aria-pressed={tipAge === k} onClick={() => setTipAge(k)}>{t(`tip_age_${k}` as UIKey)}</button>
            ))}
          </div>

          <div className="row" style={{ marginTop: 16 }}>
            <button type="button" className={`btn btn-sm ${params.get("mode") === "screenshot" ? "btn-primary" : "btn-outline"}`} style={{ width: "100%" }} onClick={() => fileRef.current?.click()}>
              <IconCamera /> {t("add_screenshot")}
            </button>
            {voiceOk && (
              <button type="button" className={`btn btn-sm ${params.get("mode") === "voice" || voiceMsg.listening ? "btn-primary" : "btn-outline"}`} style={{ width: "100%" }}
                onClick={() => (voiceMsg.listening ? voiceMsg.stop() : voiceMsg.start())}>
                <IconMic /> {voiceMsg.listening ? t("listening") : t("speak_btn")}
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
          {shot && <img src={shot} alt="" className="thumb" />}
          {ocrState === "busy" && <p className="alert alert-info" role="status" style={{ marginTop: 8 }}>{t("reading_screenshot")}</p>}
          {ocrState === "done" && <p className="alert alert-info" style={{ marginTop: 8 }}>{t("screenshot_done")}</p>}
          {ocrState === "fail" && <p className="alert alert-warn" style={{ marginTop: 8 }}>{t("screenshot_fail")}</p>}

          <label className="label" htmlFor="msg">{t("paste_label")}</label>
          <textarea id="msg" className="textarea" placeholder={t("paste_ph")} value={message} onChange={(e) => setMessage(e.target.value)} />
          <label className="label" htmlFor="url">{t("link_label")}</label>
          <input id="url" className="input" inputMode="url" placeholder={t("link_ph")} value={url} onChange={(e) => setUrl(e.target.value)} />
          {(sourceType === "youtube" || sourceType === "instagram" || sourceType === "influencer") && (
            <>
              <label className="label" htmlFor="views">{t("views_label")}</label>
              <input id="views" className="input" placeholder="10 lakh / 1M / 250000" value={views} onChange={(e) => setViews(e.target.value)} />
            </>
          )}
          <button className="btn btn-primary" style={{ marginTop: 18 }} onClick={() => setStep(2)} disabled={ocrState === "busy"}>{t("next")}</button>
        </section>
      )}

      {step === 2 && (
        <section>
          <h1>{t("step2")}</h1>
          <div className="seg" role="group">
            <button type="button" aria-pressed={side === "BUY"} onClick={() => setSide("BUY")}>{t("buy")}</button>
            <button type="button" aria-pressed={side === "SELL"} onClick={() => setSide("SELL")}>{t("sell")}</button>
          </div>
          <label className="label" htmlFor="q">{t("which_share")}</label>
          {sel ? (
            <div className="card flat" style={{ display: "flex", alignItems: "center", gap: 10, borderColor: "var(--blue)" }}>
              <div style={{ flex: 1 }}>
                <b>{b(sel.name)}</b>
                <div className="small muted">{sel.symbol} · {curatedSel ? b(curatedSel.about) : sel.exchange}{sel.sme ? " · SME" : ""}</div>
              </div>
              <button type="button" className="linkbtn" onClick={() => { setSymbol(null); setPicked(null); setAmount(""); setAmountAuto(false); }}>✕</button>
            </div>
          ) : symbol === "OTHER" ? (
            <>
              <input className="input" placeholder={t("other_company_name")} value={otherName} onChange={(e) => setOther(e.target.value)} />
              <button type="button" className="linkbtn" onClick={() => setSymbol(null)}>✕ {t("search_company")}</button>
            </>
          ) : (
            <>
              <input id="q" className="input" placeholder={t("search_company_all")} value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
              <div className="card flat" style={{ padding: "4px 12px", marginTop: 8, maxHeight: 300, overflow: "auto" }}>
                {!q.trim() && <p className="small muted" style={{ margin: "8px 0 2px" }}>{t("popular_stocks")}</p>}
                {hits.map((s) => (
                  <button key={s.symbol} type="button" className="list-item" style={{ width: "100%", background: "none", border: 0, borderBottom: "1px solid var(--line)", textAlign: "left", cursor: "pointer" }}
                    onClick={() => { setSymbol(s.symbol); setPicked(s); setAmount(""); setAmountAuto(false); }}>
                    <span style={{ flex: 1 }}>
                      <b>{b(s.name)}</b>
                      <span className="small muted" style={{ display: "block" }}>{s.symbol} · {s.exchange}</span>
                    </span>
                    {s.sme && <span className="pill pill-orange">SME</span>}
                  </button>
                ))}
                {searching && <p className="small muted" style={{ margin: "8px 0" }}>{t("searching")}</p>}
                {!searching && q.trim().length >= 2 && hits.length === 0 && <p className="small muted" style={{ margin: "8px 0" }}>{t("no_company_found")}</p>}
                <button type="button" className="list-item" style={{ width: "100%", background: "none", border: 0, textAlign: "left", cursor: "pointer", color: "var(--blue)", fontWeight: 700 }} onClick={() => setSymbol("OTHER")}>
                  + {t("other_company")}
                </button>
              </div>
            </>
          )}
          <label className="label" htmlFor="qty">{t("how_many")}</label>
          <input id="qty" className="input" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value.replace(/[^\d]/g, ""))} placeholder="100" />
          <label className="label" htmlFor="amt">{t("amount")}</label>
          <input id="amt" className="input" inputMode="numeric" value={amount} onChange={(e) => { setAmount(e.target.value.replace(/[^\d]/g, "")); setAmountAuto(false); }} placeholder="40000" />
          {amountAuto && price && <p className="small muted" style={{ marginTop: 6 }}>{t("amount_auto")} ({inr(price)} × {qty})</p>}
          <div className="row" style={{ marginTop: 18 }}>
            <button className="btn btn-outline" onClick={() => setStep(1)}>{t("back")}</button>
            <button className="btn btn-primary" onClick={() => { if (!symbol) setError(t("need_company")); else if (!(Number(qty) > 0)) setError(t("need_qty")); else { setError(null); setStep(3); } }}>{t("next")}</button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section>
          <h1>{t("step3")}</h1>
          <label className="label">{t("why_q")}</label>
          <div className="chips">
            {REASONS.map((r) => (
              <button key={r} type="button" className="chip" aria-pressed={reasons.includes(r)} onClick={() => setReasons((x) => (x.includes(r) ? x.filter((y) => y !== r) : [...x, r]))}>
                {t(`r_${r}` as UIKey)}
              </button>
            ))}
          </div>
          <label className="label" htmlFor="why">{t("reason_more")}</label>
          <textarea id="why" className="textarea" style={{ minHeight: 90 }} value={reasonText} onChange={(e) => setReasonText(e.target.value)} />
          {voiceOk && (
            <button type="button" className="btn btn-ghost" onClick={() => (voiceReason.listening ? voiceReason.stop() : voiceReason.start())}>
              <IconMic /> {voiceReason.listening ? t("listening") : t("speak_hint")}
            </button>
          )}
          <div className="row" style={{ marginTop: 14 }}>
            <button className="btn btn-outline" onClick={() => setStep(2)}>{t("back")}</button>
            <button className="btn btn-primary" onClick={submit}>{t("check_now")}</button>
          </div>
        </section>
      )}
    </div>
  );
}

export default function CheckPage() {
  return (
    <AppPage>
      <Suspense fallback={<div className="spinner" />}>
        <CheckForm />
      </Suspense>
    </AppPage>
  );
}
