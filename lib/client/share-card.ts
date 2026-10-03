"use client";

import type { CheckResult, Lang } from "../types";
import { stockLabel } from "../stocks";
import { APP_NAME, UI } from "../ui-strings";

const COLORS = {
  red: { bg: "#fde8e8", line: "#e5484d", ink: "#b3141b" },
  orange: { bg: "#fff1e0", line: "#f59e0b", ink: "#a54e00" },
  green: { bg: "#e3f6ea", line: "#2fb36a", ink: "#0b7a3e" },
};

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number, maxLines = 3): number {
  const words = text.split(/\s+/);
  let line = "";
  let lines = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line ? line + " " + words[i] : words[i];
    if (ctx.measureText(test).width > maxW && line) {
      lines++;
      if (lines === maxLines) {
        ctx.fillText(line + " …", x, y);
        return y + lh;
      }
      ctx.fillText(line, x, y);
      y += lh;
      line = words[i];
    } else line = test;
  }
  if (line) {
    ctx.fillText(line, x, y);
    y += lh;
  }
  return y;
}

/** Draws a WhatsApp-friendly result card (PNG) in the chosen language. */
export async function makeShareCard(c: CheckResult, lang: Lang): Promise<Blob | null> {
  const W = 1080, H = 1350;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d");
  if (!ctx) return null;
  const font = (w: number, s: number) => `${w} ${s}px system-ui, "Noto Sans Devanagari", "Noto Sans", sans-serif`;
  const col = COLORS[c.verdict];
  const t = UI[lang];

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#1749c9";
  ctx.fillRect(0, 0, W, 130);
  ctx.fillStyle = "#fff";
  ctx.font = font(800, 46);
  ctx.fillText("🛡 " + APP_NAME[lang], 60, 85);

  // Verdict box
  ctx.fillStyle = col.bg;
  ctx.strokeStyle = col.line;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.roundRect(50, 170, W - 100, 300, 36);
  ctx.fill();
  ctx.stroke();
  ["#e5484d", "#f59e0b", "#2fb36a"].forEach((cc, i) => {
    const on = (c.verdict === "red" && i === 0) || (c.verdict === "orange" && i === 1) || (c.verdict === "green" && i === 2);
    ctx.fillStyle = on ? cc : "#d9dee6";
    ctx.beginPath();
    ctx.arc(110 + i * 60, 230, 22, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = col.ink;
  ctx.font = font(900, 84);
  ctx.fillText(c.verdict === "red" ? t.verdict_red : c.verdict === "orange" ? t.verdict_orange : t.verdict_green, 90, 345);
  ctx.fillStyle = "#0f1b2d";
  ctx.font = font(700, 38);
  wrap(ctx, c.headline[lang], 90, 410, W - 180, 48, 2);

  // Trade
  ctx.fillStyle = "#44526a";
  ctx.font = font(600, 36);
  const name = stockLabel(c.input.symbol, c.input.stockName, c.input.otherName)[lang];
  ctx.fillText(`${c.input.side === "BUY" ? t.buy : t.sell} · ${name} · ${c.input.qty}`, 60, 540);

  // Top warnings
  let y = 610;
  const warn = c.signals.filter((s) => s.level === "red" || s.level === "orange").slice(0, 5);
  for (const s of warn) {
    ctx.fillStyle = s.level === "red" ? "#e5484d" : "#f59e0b";
    ctx.beginPath();
    ctx.arc(80, y - 12, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0f1b2d";
    ctx.font = font(700, 36);
    y = wrap(ctx, s.title[lang], 110, y, W - 170, 46, 2) + 20;
    if (y > 1150) break;
  }
  if (!warn.length) {
    ctx.fillStyle = "#0f1b2d";
    ctx.font = font(500, 34);
    y = wrap(ctx, t.green_note, 60, y, W - 120, 46, 4);
  }

  ctx.fillStyle = "#44526a";
  ctx.font = font(500, 28);
  wrap(ctx, t.not_prediction, 60, 1230, W - 120, 36, 2);
  return new Promise((res) => cv.toBlob((b) => res(b), "image/png"));
}

export function shareText(c: CheckResult, lang: Lang): string {
  const t = UI[lang];
  const name = stockLabel(c.input.symbol, c.input.stockName, c.input.otherName)[lang];
  const warn = c.signals.filter((s) => s.level === "red" || s.level === "orange").slice(0, 5);
  const icon = c.verdict === "red" ? "🔴" : c.verdict === "orange" ? "🟠" : "🟢";
  return [
    t.wa_share_text,
    `${icon} ${c.headline[lang]}`,
    `${c.input.side === "BUY" ? t.buy : t.sell} · ${name}`,
    ...warn.map((s) => `${s.level === "red" ? "🔴" : "🟠"} ${s.title[lang]}`),
    "",
    t.not_prediction,
  ].join("\n");
}
