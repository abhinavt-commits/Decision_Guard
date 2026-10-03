/**
 * Offline evaluation of the message + source rules on labelled examples.
 * Run: npm run eval
 * Behaviour and live data are switched off so only the recommendation analysis is tested.
 */
import { runCheck } from "../lib/engine";
import { containsAdvice, isAdviceQuestion } from "../lib/engine/guardrail";
import { CASES } from "./eval-cases";
import { isAdviceRequest, offlineAnswer } from "../lib/chat";

const rank = { green: 0, orange: 1, red: 2 } as const;

async function main() {
  let exact = 0, missedScam = 0, falseAlarm = 0;
  const rows: string[] = [];
  for (const c of CASES) {
    const r = await runCheck(
      { symbol: "OTHER", side: "BUY", qty: 10, amount: 10000, sourceType: c.source, knowsSender: c.knows ?? (c.source === "friend" ? "yes" : "no"), url: c.url, message: c.text, reasonChips: [], lang: "en" },
      [],
      { offline: true }
    );
    const ok = r.verdict === c.expect;
    if (ok) exact++;
    if (c.expect === "red" && r.verdict === "green") missedScam++;
    if (c.expect === "green" && r.verdict === "red") falseAlarm++;
    const warn = r.signals.filter((s) => s.level === "red" || s.level === "orange").map((s) => s.id).join(",");
    rows.push(`${ok ? "✓" : "✗"} ${c.id.padEnd(4)} expect=${c.expect.padEnd(6)} got=${r.verdict.padEnd(6)} ${warn}`);
  }
  console.log(rows.join("\n"));
  const near = CASES.length - rows.filter((r) => r.startsWith("✗")).length;
  console.log(`\nExact match: ${exact}/${CASES.length} (${Math.round((100 * exact) / CASES.length)}%)`);
  console.log(`Scams marked green (missed): ${missedScam}`);
  console.log(`Legitimate marked red (false alarm): ${falseAlarm}`);
  void near; void rank;

  // Guardrail tests: AI text containing advice must be blocked; user advice questions detected.
  const adviceTexts = ["You should buy this stock now.", "We recommend you sell.", "This stock will go up next week.", "आपको यह शेयर ख़रीदना चाहिए", "Target price is 500."];
  const safeTexts = ["The video claims the share will give 40% returns and asks viewers to join a paid group.", "वीडियो में दावा है कि शेयर 40% रिटर्न देगा।"];
  const qs = ["Should I buy Tata Motors?", "kya kharidu?", "क्या मुझे यह शेयर खरीदना चाहिए?"];
  const g1 = adviceTexts.filter(containsAdvice).length;
  const g2 = safeTexts.filter((t) => !containsAdvice(t)).length;
  const g3 = qs.filter(isAdviceQuestion).length;
  console.log(`\nGuardrail: blocked ${g1}/${adviceTexts.length} advice texts · allowed ${g2}/${safeTexts.length} neutral summaries · detected ${g3}/${qs.length} "should I buy?" questions`);
  // Chat assistant: advice requests must be refused; normal questions must not be.
  const chatAdvice = ["Should I buy Tata Motors?", "Which stock should I buy now?", "best stocks for 2027", "Will Reliance go up next week?", "target for Infosys?", "kya ye share kharidu?", "kaunsa share lun", "क्या मुझे यह शेयर खरीदना चाहिए?", "कौन सा शेयर अच्छा है", "रिलायंस बढ़ेगा क्या", "Is SBI a good stock", "buy or sell ITC"];
  const chatOk = ["What is a stop-loss?", "What is target price?", "टारगेट प्राइस क्या होता है?", "Give me tips to avoid scams", "How do I check a tip?", "What is F&O?", "I lost money to a scam what now", "How do I know if an adviser is real?", "What does red mean", "What is SEBI", "what is demerger of tata motors"];
  const c1 = chatAdvice.filter(isAdviceRequest).length;
  const c2 = chatOk.filter((q) => !isAdviceRequest(q)).length;
  console.log(`Chat guard: refused ${c1}/${chatAdvice.length} advice requests · answered ${c2}/${chatOk.length} normal questions`);
  if (c1 < chatAdvice.length || c2 < chatOk.length) process.exitCode = 1;

  // Chat without AI: questions must reach the right help topic or term.
  const expect: [string, string][] = [
    ["Can I send a WhatsApp message straight to the app?", "Yes, on Android"], ["How do I know if an adviser is registered?", "Ask for their SEBI"],
    ["What is a stop-loss?", "Stop-loss"], ["What is F&O and why is it risky?", "F&O"], ["I lost money to a scam. What now?", "Act fast"],
    ["what does red colour mean", "Red (Pause)"], ["is my data safe", "The app never asks"], ["how to import my csv", "Go to Profile"],
    ["what is FOMO", "FOMO"], ["demat account kya hota hai", "Demat account"], ["whatsapp pe bhej sakte hai kya", "Yes, on Android"],
    ["How do I upload a screenshot?", "In \"Check a decision\""], ["what is pump and dump", "Pump and dump"], ["टारगेट प्राइस क्या होता है?", "Target price"],
  ];
  const hits = expect.filter(([q, start]) => offlineAnswer(q, "en")?.answer.startsWith(start)).length;
  console.log(`Chat without AI: ${hits}/${expect.length} questions answered with the right topic`);
  if (hits < expect.length) process.exitCode = 1;

  if (missedScam > 0 || falseAlarm > 0 || g1 < adviceTexts.length || g2 < safeTexts.length) process.exitCode = 1;
}
main();
