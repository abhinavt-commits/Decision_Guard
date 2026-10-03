import type { CheckInput, PastTrade, Signal } from "../types";
import { findStock } from "../stocks";

const inr = (n: number) => "₹" + Math.round(Math.abs(n)).toLocaleString("en-IN");
const HOUR = 3600_000;
const DAY = 24 * HOUR;

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export interface BehaviourOutput {
  signals: Signal[];
  stats: { trades: number; medianAmount: number; last7: number; weeklyAvg: number };
}

/**
 * Looks at the user's own past trades and the trade they are about to make.
 * Describes patterns from the past. Never predicts the result of the new trade.
 */
export function analyseBehaviour(
  input: CheckInput,
  amount: number,
  history: PastTrade[],
  now = Date.now()
): BehaviourOutput {
  const signals: Signal[] = [];
  const trades = [...history].sort((a, b) => +new Date(b.date) - +new Date(a.date)); // newest first
  const closed = trades.filter((t) => t.pnl !== null);

  if (trades.length < 3) {
    signals.push({
      id: "behaviour_little_history",
      level: "info",
      category: "behaviour",
      title: { en: "Not enough past trades to look for patterns", hi: "पैटर्न देखने के लिए पुराने ट्रेड कम हैं" },
      why: {
        en: "Add a few of your past trades in Profile and we can check for habits like loss-chasing.",
        hi: "प्रोफ़ाइल में अपने कुछ पुराने ट्रेड जोड़ें, तब हम घाटा-वसूली जैसी आदतें जाँच पाएँगे।",
      },
    });
    return { signals, stats: { trades: trades.length, medianAmount: 0, last7: 0, weeklyAvg: 0 } };
  }

  const medAmt = median(trades.map((t) => t.amount));
  const ratio = medAmt ? amount / medAmt : 1;

  // --- 1. Loss streak --------------------------------------------------------
  let lossStreak = 0;
  for (const t of closed) {
    if ((t.pnl ?? 0) < 0) lossStreak++;
    else break;
  }
  const streakTrades = closed.slice(0, lossStreak);
  const streakTotal = streakTrades.reduce((s, t) => s + (t.pnl ?? 0), 0);

  // --- 2. Win streak ---------------------------------------------------------
  let winStreak = 0;
  for (const t of closed) {
    if ((t.pnl ?? 0) > 0) winStreak++;
    else break;
  }
  const winTrades = closed.slice(0, winStreak);

  // --- 3. Time since last loss ---------------------------------------------
  const lastLoss = closed.find((t) => (t.pnl ?? 0) < 0);
  const hoursSinceLoss = lastLoss ? (now - +new Date(lastLoss.date)) / HOUR : Infinity;

  // --- 4. Frequency ----------------------------------------------------------
  const last7 = trades.filter((t) => now - +new Date(t.date) <= 7 * DAY).length;
  const prior = trades.filter((t) => {
    const age = now - +new Date(t.date);
    return age > 7 * DAY && age <= 63 * DAY;
  }).length;
  const weeklyAvg = prior / 8;
  const today = trades.filter((t) => now - +new Date(t.date) <= DAY).length;

  // Self-reported reason
  const saysRecover = input.reasonChips.includes("recover_loss");

  if (lossStreak >= 2) {
    signals.push({
      id: "loss_streak",
      level: "orange",
      category: "behaviour",
      title: {
        en: `Your last ${lossStreak} trades ended in a loss`,
        hi: `आपके पिछले ${lossStreak} ट्रेड नुकसान में रहे`,
      },
      why: {
        en: "After a few losses, many people make faster and bigger decisions to win the money back. That is normal, but it is worth slowing down.",
        hi: "कुछ नुकसान के बाद बहुत से लोग पैसा वापस पाने के लिए जल्दी और बड़े फ़ैसले लेते हैं। यह स्वाभाविक है, पर ऐसे समय में थोड़ा रुकना अच्छा है।",
      },
      evidence: streakTrades.map((t) => ({
        en: `${findStock(t.symbol)?.name.en ?? t.symbol}: −${inr(t.pnl ?? 0)} (${new Date(t.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })})`,
        hi: `${findStock(t.symbol)?.name.hi ?? t.symbol}: −${inr(t.pnl ?? 0)} (${new Date(t.date).toLocaleDateString("hi-IN", { day: "numeric", month: "short" })})`,
      })).concat([{ en: `Total: −${inr(streakTotal)}`, hi: `कुल: −${inr(streakTotal)}` }]),
      term: "loss_chasing",
    });
  }

  const chasingWindow = hoursSinceLoss <= 72;
  if ((chasingWindow && ratio >= 1.5) || saysRecover) {
    const strong = (chasingWindow && ratio >= 2) || (saysRecover && chasingWindow);
    signals.push({
      id: "loss_chasing",
      level: strong ? "red" : "orange",
      category: "behaviour",
      title: {
        en: saysRecover
          ? "You said this trade is to recover a loss"
          : "A bigger trade soon after a loss",
        hi: saysRecover
          ? "आपने बताया कि यह ट्रेड नुकसान की भरपाई के लिए है"
          : "नुकसान के तुरंत बाद एक बड़ा ट्रेड",
      },
      why: {
        en: "Trying to win back a loss quickly is called \"loss-chasing\". The market does not know about your earlier loss — each trade should stand on its own evidence.",
        hi: "नुकसान जल्दी वापस पाने की कोशिश को \"घाटा-वसूली\" (loss-chasing) कहते हैं। बाज़ार को आपके पुराने नुकसान से कोई मतलब नहीं — हर ट्रेड अपने सबूत पर होना चाहिए।",
      },
      evidence: [
        ...(lastLoss && chasingWindow
          ? [{
              en: `Last loss: −${inr(lastLoss.pnl ?? 0)}, about ${Math.max(1, Math.round(hoursSinceLoss))} hours ago`,
              hi: `पिछला नुकसान: −${inr(lastLoss.pnl ?? 0)}, लगभग ${Math.max(1, Math.round(hoursSinceLoss))} घंटे पहले`,
            }]
          : []),
        {
          en: `This trade: ${inr(amount)} — ${ratio.toFixed(1)}× your usual trade (${inr(medAmt)})`,
          hi: `यह ट्रेड: ${inr(amount)} — आपके आम ट्रेड (${inr(medAmt)}) का ${ratio.toFixed(1)} गुना`,
        },
      ],
      action: {
        en: "Ask yourself: would I make this exact trade if I had not lost money this week?",
        hi: "ख़ुद से पूछें: अगर इस हफ़्ते नुकसान न हुआ होता, तो क्या मैं यही ट्रेड करता/करती?",
      },
      term: "loss_chasing",
    });
  } else if (ratio >= 2 && winStreak >= 2) {
    // --- Greed / overconfidence after wins ---
    signals.push({
      id: "overconfidence",
      level: ratio >= 3 ? "red" : "orange",
      category: "behaviour",
      title: {
        en: `Trade size jumps to ${ratio.toFixed(1)}× your usual after ${winStreak} wins`,
        hi: `${winStreak} बार मुनाफ़े के बाद ट्रेड का साइज़ आम से ${ratio.toFixed(1)} गुना`,
      },
      why: {
        en: "After a winning streak, people often feel they \"can't lose\" and put in much more money. Past wins do not make the next trade safer.",
        hi: "लगातार मुनाफ़े के बाद अक्सर लगता है कि \"अब नुकसान नहीं होगा\" और लोग ज़्यादा पैसा लगा देते हैं। पुराने मुनाफ़े से अगला ट्रेड सुरक्षित नहीं हो जाता।",
      },
      evidence: [
        ...winTrades.map((t) => ({
          en: `${findStock(t.symbol)?.name.en ?? t.symbol}: +${inr(t.pnl ?? 0)}`,
          hi: `${findStock(t.symbol)?.name.hi ?? t.symbol}: +${inr(t.pnl ?? 0)}`,
        })),
        {
          en: `Usual trade: ${inr(medAmt)} → this trade: ${inr(amount)}`,
          hi: `आम ट्रेड: ${inr(medAmt)} → यह ट्रेड: ${inr(amount)}`,
        },
      ],
      action: {
        en: "If this trade went wrong, how much of the money could you afford to lose?",
        hi: "अगर यह ट्रेड उल्टा पड़े, तो इसमें से कितना पैसा खोना आप सह सकते हैं?",
      },
      term: "overconfidence",
    });
  } else if (ratio >= 2.5) {
    signals.push({
      id: "size_jump",
      level: "orange",
      category: "behaviour",
      title: {
        en: `This trade is ${ratio.toFixed(1)}× bigger than your usual`,
        hi: `यह ट्रेड आपके आम ट्रेड से ${ratio.toFixed(1)} गुना बड़ा है`,
      },
      why: {
        en: "A much bigger amount than normal means a much bigger possible loss. Check that the reason for the bigger size is clear to you.",
        hi: "आम से बहुत ज़्यादा पैसा लगाने का मतलब है बड़ा नुकसान भी हो सकता है। पक्का करें कि ज़्यादा पैसा लगाने की वजह आपको साफ़ पता है।",
      },
      evidence: [{ en: `Usual: ${inr(medAmt)} → now: ${inr(amount)}`, hi: `आम: ${inr(medAmt)} → अभी: ${inr(amount)}` }],
    });
  } else if (ratio <= 1.5) {
    signals.push({
      id: "size_normal",
      level: "ok",
      category: "behaviour",
      title: { en: "Trade size is close to your usual", hi: "ट्रेड का साइज़ आपके आम ट्रेड जैसा है" },
      why: {
        en: `Your usual trade is about ${inr(medAmt)}.`,
        hi: `आपका आम ट्रेड लगभग ${inr(medAmt)} का होता है।`,
      },
    });
  }

  if ((last7 >= 4 && last7 >= weeklyAvg * 2) || today >= 3) {
    signals.push({
      id: "overtrading",
      level: "orange",
      category: "behaviour",
      title: {
        en: `${last7} trades in the last 7 days — more than usual`,
        hi: `पिछले 7 दिनों में ${last7} ट्रेड — आम से ज़्यादा`,
      },
      why: {
        en: "Trading much more often than usual can be a sign of acting in a hurry or under stress. Each trade also has costs (brokerage, taxes).",
        hi: "आम से बहुत ज़्यादा ट्रेड करना जल्दबाज़ी या तनाव का संकेत हो सकता है। हर ट्रेड पर खर्च (ब्रोकरेज, टैक्स) भी लगता है।",
      },
      evidence: [{
        en: `Usually about ${weeklyAvg.toFixed(1)} trades a week (previous 8 weeks)`,
        hi: `आम तौर पर हफ़्ते में लगभग ${weeklyAvg.toFixed(1)} ट्रेड (पिछले 8 हफ़्ते)`,
      }],
      term: "overtrading",
    });
  } else {
    signals.push({
      id: "frequency_normal",
      level: "ok",
      category: "behaviour",
      title: { en: "How often you trade looks normal for you", hi: "आप जितनी बार ट्रेड करते हैं, वह आपके हिसाब से सामान्य है" },
      why: {
        en: `${last7} trade(s) in the last 7 days; usually about ${weeklyAvg.toFixed(1)} a week.`,
        hi: `पिछले 7 दिनों में ${last7} ट्रेड; आम तौर पर हफ़्ते में लगभग ${weeklyAvg.toFixed(1)}।`,
      },
    });
  }

  // --- Re-entering a stock that recently lost money -------------------------
  const sameLosses = closed.filter(
    (t) => t.symbol === input.symbol && (t.pnl ?? 0) < 0 && now - +new Date(t.date) <= 45 * DAY
  );
  if (sameLosses.length && input.side === "BUY") {
    const total = sameLosses.reduce((s, t) => s + (t.pnl ?? 0), 0);
    const name = findStock(input.symbol)?.name;
    signals.push({
      id: "repeat_loser",
      level: "orange",
      category: "behaviour",
      title: {
        en: `You lost money on ${name?.en ?? input.symbol} recently`,
        hi: `हाल ही में ${name?.hi ?? input.symbol} में आपको नुकसान हुआ`,
      },
      why: {
        en: "Going back into the same stock right after a loss is often about \"getting even\" with it. What is different now compared to last time?",
        hi: "नुकसान के तुरंत बाद उसी शेयर में वापस जाना अक्सर \"हिसाब बराबर\" करने की भावना से होता है। पिछली बार से अब क्या अलग है?",
      },
      evidence: sameLosses.map((t) => ({
        en: `−${inr(t.pnl ?? 0)} on ${new Date(t.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`,
        hi: `−${inr(t.pnl ?? 0)}, ${new Date(t.date).toLocaleDateString("hi-IN", { day: "numeric", month: "short" })} को`,
      })).concat(sameLosses.length > 1 ? [{ en: `Total: −${inr(total)}`, hi: `कुल: −${inr(total)}` }] : []),
      action: {
        en: "Write down one new fact that has changed since your last trade in this stock.",
        hi: "इस शेयर में पिछले ट्रेड के बाद बदली हुई एक नई बात लिखें।",
      },
    });
  }

  // --- Herd / FOMO self-reported --------------------------------------------
  if (input.reasonChips.includes("friends_buying") || input.reasonChips.includes("fear_missing")) {
    signals.push({
      id: "herd",
      level: "orange",
      category: "behaviour",
      title: {
        en: "Part of the reason is that others are buying / fear of missing out",
        hi: "वजह का एक हिस्सा है कि दूसरे ख़रीद रहे हैं / मौका छूटने का डर",
      },
      why: {
        en: "When many people buy because others are buying, prices can rise for reasons that have nothing to do with the company. This is called herd behaviour or FOMO.",
        hi: "जब लोग सिर्फ़ इसलिए ख़रीदते हैं कि दूसरे ख़रीद रहे हैं, तो दाम ऐसी वजहों से बढ़ सकते हैं जिनका कंपनी से कोई लेना-देना नहीं। इसे भेड़चाल (herd behaviour) या FOMO कहते हैं।",
      },
      term: "fomo",
    });
  }

  return { signals, stats: { trades: trades.length, medianAmount: medAmt, last7, weeklyAvg } };
}
