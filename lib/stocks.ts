import type { Bi } from "./types";

export interface Stock {
  symbol: string; // NSE symbol
  yahoo: string; // Yahoo Finance symbol
  name: Bi;
  newsQuery: string;
  aliases: string[];
  about: Bi;
  note?: Bi; // something confusing the user should know
}

// A small, well-covered set keeps the data reliable for the MVP.
export const STOCKS: Stock[] = [
  {
    symbol: "TMPV",
    yahoo: "TMPV.NS",
    name: { en: "Tata Motors Passenger Vehicles", hi: "टाटा मोटर्स पैसेंजर व्हीकल्स" },
    newsQuery: "Tata Motors Passenger Vehicles",
    aliases: ["tata motors", "tatamotors", "tata motor", "tmpv", "टाटा मोटर्स", "tata"],
    about: {
      en: "Makes cars and SUVs (Tata, and owns Jaguar Land Rover).",
      hi: "कारें और SUV बनाती है (टाटा, और जगुआर लैंड रोवर इसकी है)।",
    },
    note: {
      en: "Tata Motors split into two listed companies in 2025: Passenger Vehicles (TMPV) and Commercial Vehicles (TMCV). A tip that only says \"Tata Motors\" may not make clear which one it means.",
      hi: "2025 में टाटा मोटर्स दो अलग कंपनियों में बँट गई: पैसेंजर व्हीकल्स (TMPV) और कमर्शियल व्हीकल्स (TMCV)। सिर्फ़ \"टाटा मोटर्स\" कहने वाली टिप से साफ़ नहीं होता कि कौन-सी कंपनी की बात है।",
    },
  },
  {
    symbol: "TMCV",
    yahoo: "TMCV.NS",
    name: { en: "Tata Motors (Commercial Vehicles)", hi: "टाटा मोटर्स (कमर्शियल व्हीकल्स)" },
    newsQuery: "Tata Motors commercial vehicles TMCV",
    aliases: ["tata motors", "tmcv", "tata trucks", "टाटा मोटर्स", "tata"],
    about: { en: "Makes trucks and buses.", hi: "ट्रक और बसें बनाती है।" },
    note: {
      en: "Tata Motors split into two listed companies in 2025: Passenger Vehicles (TMPV) and Commercial Vehicles (TMCV). A tip that only says \"Tata Motors\" may not make clear which one it means.",
      hi: "2025 में टाटा मोटर्स दो अलग कंपनियों में बँट गई: पैसेंजर व्हीकल्स (TMPV) और कमर्शियल व्हीकल्स (TMCV)। सिर्फ़ \"टाटा मोटर्स\" कहने वाली टिप से साफ़ नहीं होता कि कौन-सी कंपनी की बात है।",
    },
  },
  {
    symbol: "RELIANCE",
    yahoo: "RELIANCE.NS",
    name: { en: "Reliance Industries", hi: "रिलायंस इंडस्ट्रीज़" },
    newsQuery: "Reliance Industries",
    aliases: ["reliance", "ril", "रिलायंस", "jio"],
    about: { en: "Oil, retail shops and Jio telecom.", hi: "तेल, रिटेल दुकानें और जियो टेलीकॉम।" },
  },
  {
    symbol: "TCS",
    yahoo: "TCS.NS",
    name: { en: "Tata Consultancy Services (TCS)", hi: "टाटा कंसल्टेंसी सर्विसेज़ (TCS)" },
    newsQuery: "TCS Tata Consultancy Services",
    aliases: ["tcs", "tata consultancy", "टीसीएस"],
    about: { en: "IT services company.", hi: "IT (सॉफ़्टवेयर) सेवाएँ देने वाली कंपनी।" },
  },
  {
    symbol: "INFY",
    yahoo: "INFY.NS",
    name: { en: "Infosys", hi: "इन्फ़ोसिस" },
    newsQuery: "Infosys",
    aliases: ["infosys", "infy", "इन्फोसिस"],
    about: { en: "IT services company.", hi: "IT (सॉफ़्टवेयर) सेवाएँ देने वाली कंपनी।" },
  },
  {
    symbol: "HDFCBANK",
    yahoo: "HDFCBANK.NS",
    name: { en: "HDFC Bank", hi: "HDFC बैंक" },
    newsQuery: "HDFC Bank",
    aliases: ["hdfc", "hdfc bank", "एचडीएफसी"],
    about: { en: "Large private bank.", hi: "बड़ा प्राइवेट बैंक।" },
  },
  {
    symbol: "ICICIBANK",
    yahoo: "ICICIBANK.NS",
    name: { en: "ICICI Bank", hi: "ICICI बैंक" },
    newsQuery: "ICICI Bank",
    aliases: ["icici", "icici bank", "आईसीआईसीआई"],
    about: { en: "Large private bank.", hi: "बड़ा प्राइवेट बैंक।" },
  },
  {
    symbol: "SBIN",
    yahoo: "SBIN.NS",
    name: { en: "State Bank of India (SBI)", hi: "स्टेट बैंक ऑफ़ इंडिया (SBI)" },
    newsQuery: "State Bank of India SBI",
    aliases: ["sbi", "state bank", "sbin", "एसबीआई", "स्टेट बैंक"],
    about: { en: "India's largest government bank.", hi: "भारत का सबसे बड़ा सरकारी बैंक।" },
  },
  {
    symbol: "ITC",
    yahoo: "ITC.NS",
    name: { en: "ITC", hi: "ITC" },
    newsQuery: "ITC Ltd",
    aliases: ["itc", "आईटीसी"],
    about: { en: "Cigarettes, packaged food, hotels and paper.", hi: "सिगरेट, पैकेट वाला खाना, होटल और कागज़।" },
  },
  {
    symbol: "ETERNAL",
    yahoo: "ETERNAL.NS",
    name: { en: "Eternal (Zomato)", hi: "इटरनल (ज़ोमैटो)" },
    newsQuery: "Eternal Zomato",
    aliases: ["zomato", "eternal", "blinkit", "ज़ोमैटो", "जोमैटो"],
    about: { en: "Food delivery (Zomato) and quick commerce (Blinkit).", hi: "खाना डिलीवरी (ज़ोमैटो) और जल्दी डिलीवरी (ब्लिंकिट)।" },
    note: {
      en: "Zomato Ltd changed its name to Eternal Ltd in 2025. The share is now listed as ETERNAL.",
      hi: "2025 में ज़ोमैटो लिमिटेड का नाम बदलकर इटरनल लिमिटेड हो गया। शेयर अब ETERNAL नाम से दिखता है।",
    },
  },
  {
    symbol: "BHARTIARTL",
    yahoo: "BHARTIARTL.NS",
    name: { en: "Bharti Airtel", hi: "भारती एयरटेल" },
    newsQuery: "Bharti Airtel",
    aliases: ["airtel", "bharti", "एयरटेल"],
    about: { en: "Mobile and internet company.", hi: "मोबाइल और इंटरनेट कंपनी।" },
  },
];

export function findStock(symbol: string): Stock | undefined {
  return STOCKS.find((s) => s.symbol === symbol);
}

export function searchStocks(q: string): Stock[] {
  const s = q.trim().toLowerCase();
  if (!s) return STOCKS;
  return STOCKS.filter(
    (x) =>
      x.symbol.toLowerCase().includes(s) ||
      x.name.en.toLowerCase().includes(s) ||
      x.name.hi.includes(q.trim()) ||
      x.aliases.some((a) => a.includes(s))
  );
}

/** Rough reference prices (₹) used ONLY to pre-fill the amount when live price is unavailable. */
export const REFERENCE_PRICE: Record<string, number> = {
  TMPV: 400,
  TMCV: 400,
  RELIANCE: 1400,
  TCS: 3100,
  INFY: 1500,
  HDFCBANK: 950,
  ICICIBANK: 1400,
  SBIN: 850,
  ITC: 410,
  ETERNAL: 320,
  BHARTIARTL: 1900,
};

/** Display name for any stock: curated Hindi/English name, else the name saved with the check. */
export function stockLabel(symbol: string, stockName?: Bi, otherName?: string): Bi {
  const c = findStock(symbol);
  if (c) return c.name;
  if (stockName) return stockName;
  const n = otherName || symbol;
  return { en: n, hi: n };
}
