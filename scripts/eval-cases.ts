import type { SourceType } from "../lib/types";

// Labelled test messages (invented for testing; no real person or company is accused).
// expect: what a careful human reviewer would want — "red" (pause), "orange" (review), "green" (no major signs).
export interface Case { id: string; text: string; source: SourceType; knows?: "yes" | "no"; url?: string; expect: "red" | "orange" | "green"; note?: string }

export const CASES: Case[] = [
  // ---------- Clear scams (expect red) ----------
  { id: "s1", source: "whatsapp", expect: "red", text: "100% guaranteed profit! Buy XYZ Ltd now, target 450 in 7 days. Join VIP group, pay ₹1999 to stockguru@ybl" },
  { id: "s2", source: "telegram", expect: "red", text: "JACKPOT CALL 🚀🚀 Operator game started in ABC Industries. Inside news, upper circuit tomorrow. Last chance!" },
  { id: "s3", source: "whatsapp", expect: "red", text: "पक्का मुनाफ़ा! इस शेयर में 1 महीने में पैसा डबल। अभी खरीदें, आख़िरी मौका। VIP ग्रुप फ़ीस ₹999" },
  { id: "s4", source: "telegram", expect: "red", text: "Download our trading app to get institutional account access. IPO allotment guaranteed. Link: http://45.12.88.10/app.apk" },
  { id: "s5", source: "sms", expect: "red", text: "Dear investor your demat is blocked. Share OTP to reactivate. Visit https://zerodha-kyc-update.in" },
  { id: "s6", source: "influencer", expect: "red", text: "SEBI approved stock tip! Zero risk, fixed monthly return 10%. Join now, limited seats only today." },
  { id: "s7", source: "whatsapp", expect: "red", text: "Sure shot call: Buy now @ 120, tgt 200. Profit sharing 30%. Pay via GPay 98xxxxxx21@okaxis" },
  { id: "s8", source: "telegram", expect: "red", text: "अंदर की खबर: इस कंपनी का विलय होने वाला है, शेयर 300% बढ़ेगा। तुरंत खरीदो! गारंटी है।" },
  { id: "s9", source: "instagram", expect: "red", text: "Turn ₹10,000 into ₹1 lakh in 30 days 💰💰 risk-free trading. DM to join premium channel. bit.ly/rich-fast" },
  { id: "s10", source: "whatsapp", expect: "red", text: "SEBI Registered INH000999999 — guaranteed 40% return in 1 month. Pay subscription to advisor.calls@paytm" },
  { id: "s11", source: "telegram", expect: "red", text: "abhi kharido! pakka profit, operator ne bola hai kal upper circuit. join t.me/jackpotcalls" },
  { id: "s12", source: "whatsapp", expect: "red", text: "Exclusive QIB quota available. Guaranteed IPO allotment. Install our app from the link and deposit ₹50,000." },

  // ---------- Pressure / hype without payment (expect orange or red) ----------
  { id: "h1", source: "youtube", expect: "orange", text: "This stock will double in 6 months! Multibagger alert. Target 900." },
  { id: "h2", source: "influencer", expect: "orange", text: "Everyone is buying this smallcap. Don't miss out! Could be a 10x." },
  { id: "h3", source: "whatsapp", knows: "yes", expect: "orange", text: "Bhai ye share 50% upar jayega, sab log le rahe hai" },
  { id: "h4", source: "youtube", expect: "orange", text: "Top 3 stocks to buy now before it's too late 🚀 target price inside" },
  { id: "h5", source: "telegram", expect: "orange", text: "टारगेट 520, यह शेयर ऊपर जाएगा। सब लोग खरीद रहे हैं।" },
  { id: "h6", source: "friend", expect: "orange", text: "My office friend says buy this, it will reach 2000 soon." },
  { id: "h7", source: "instagram", expect: "orange", text: "This IT stock is going to the moon 🚀 load up" },
  { id: "h8", source: "youtube", expect: "orange", text: "Is this the next multibagger? My analysis of a small company" },
  { id: "h9", source: "whatsapp", knows: "yes", expect: "orange", text: "Join this group for daily calls https://chat.whatsapp.com/AbCdEf123" },
  { id: "h10", source: "news", expect: "orange", text: "Company says merger coming soon, shares to rise 25%" },

  // ---------- Legitimate / neutral (expect green) ----------
  { id: "g1", source: "news", expect: "green", url: "https://www.business-standard.com/markets/news/abc", text: "The company reported a 12% rise in quarterly profit. Revenue grew 8% year on year." },
  { id: "g2", source: "news", expect: "green", url: "https://www.nseindia.com/companies-listing/corporate-filings-announcements", text: "Board meeting scheduled to consider dividend." },
  { id: "g3", source: "friend", expect: "green", text: "I read the annual report. Debt is low and sales have grown for 5 years. Investments are subject to market risk." },
  { id: "g4", source: "other", expect: "green", text: "360 ONE Distribution Services Limited, SEBI Research Analyst INH000011431. Report on the banking sector. Investments in securities market are subject to market risks; returns are not guaranteed." },
  { id: "g5", source: "news", expect: "green", url: "https://economictimes.indiatimes.com/markets", text: "Markets closed flat today; IT shares were mixed." },
  { id: "g6", source: "friend", expect: "green", text: "I plan to invest a small amount every month in a large company I understand." },
  { id: "g7", source: "other", expect: "green", text: "Returns are not guaranteed. Please read the offer document carefully. This is not investment advice." },
  { id: "g8", source: "news", expect: "green", text: "कंपनी ने तिमाही नतीजे जारी किए, मुनाफ़ा 5% बढ़ा।" },
  { id: "g9", source: "news", expect: "green", url: "https://www.sebi.gov.in/media-and-notifications", text: "SEBI cautions investors against unregistered entities offering assured returns." },
  { id: "g10", source: "other", expect: "green", text: "Pay your broker only through validated UPI: abcbroking.brk@validhdfc. Verify on SEBI Check." },
  { id: "g11", source: "friend", expect: "green", text: "There is no guarantee of profit in shares, so I only invest what I can afford to lose." },
  { id: "g12", source: "news", expect: "green", text: "Bonus issue approved by the board in a filing to the exchange today." },

  // ---------- Held-out cases (added after tuning; NOT used to adjust rules) ----------
  { id: "x1", source: "whatsapp", expect: "red", text: "Earn ₹5000 daily from share market. No experience needed. Contact on Telegram, small registration fee only." },
  { id: "x2", source: "youtube", expect: "orange", text: "Ye stock 2026 me 3x ho sakta hai, mera view dekho" },
  { id: "x3", source: "news", expect: "green", text: "Shares fell 3% after the company missed estimates, analysts said." },
  { id: "x4", source: "telegram", expect: "red", text: "Free trial calls. 95% accuracy. Today intraday BUY above 250 SL 245 TGT 280. Premium members get 5 calls daily, ₹2999/month." },
  { id: "x5", source: "friend", expect: "green", text: "I am buying some shares of a big bank for the long term, I read their results." },
  { id: "x6", source: "sms", expect: "red", text: "Congratulations! You are selected for our stock-market mentorship. Deposit ₹10,000 refundable and get assured 20% monthly." },
  { id: "x7", source: "instagram", expect: "orange", text: "My portfolio is up 80% this year 🔥 copy my trades, link in bio" },
  { id: "x8", source: "news", expect: "green", text: "रिलायंस के शेयर आज 1% ऊपर बंद हुए।" },
];
