/**
 * No-advice guardrail. The app must never tell the user to buy, sell or hold,
 * give target prices or predict returns. Any AI-generated text passes through here.
 */

const ADVICE_PATTERNS: RegExp[] = [
  /\byou\s+should\s+(buy|sell|hold|invest|not\s+(buy|sell|invest)|avoid)\b/i,
  /\b(i|we)\s+(recommend|suggest|advise)\s+(you\s+)?(to\s+)?(buy|sell|hold|invest|avoid)/i,
  /\b(strong\s+)?(buy|sell|hold)\s+(rating|call|signal|this\s+stock|now)\b/i,
  /\b(good|great|bad|safe)\s+(investment|stock|time\s+to\s+buy|time\s+to\s+sell)\b/i,
  /\bwill\s+(go\s+up|go\s+down|rise|fall|increase|decrease|reach|cross)\b/i,
  /\b(target\s+price|price\s+target|expected\s+return)\b/i,
  /(ख़रीदें|खरीदें|ख़रीद\s*लें|खरीद\s*लें|बेच\s*दें|बेचें|होल्ड\s*करें)\s*$/m,
  /(आपको|आप)\s*(यह|ये|इसे)?\s*(शेयर)?\s*(ख़रीदना|खरीदना|बेचना)\s*चाहिए/,
  /(बढ़ेगा|गिरेगा|ऊपर\s*जाएगा|नीचे\s*जाएगा)/,
];

export function containsAdvice(text: string): boolean {
  return ADVICE_PATTERNS.some((re) => re.test(text));
}

/**
 * Narrower check for AI summaries that REPORT what a video/message claims
 * ("the video claims the share will rise 40%" is allowed; "you should buy" is not).
 */
const DIRECT_ADVICE: RegExp[] = [
  /\byou\s+should\s+(buy|sell|hold|invest|not\s+(buy|sell|invest)|avoid)\b/i,
  /\b(i|we)\s+(recommend|suggest|advise)\s+(you\s+)?(to\s+)?(buy|sell|hold|invest|avoid)/i,
  /\b(it is|this is|it's)\s+(a\s+)?(good|great|safe|bad)\s+(investment|stock|buy|time to buy|time to sell)\b/i,
  /(आपको|आप)\s*(यह|ये|इसे)?\s*(शेयर)?\s*(ख़रीदना|खरीदना|बेचना)\s*चाहिए/,
];
export function containsDirectAdvice(text: string): boolean {
  return DIRECT_ADVICE.some((re) => re.test(text));
}

/** Detects when the user is asking the app for advice, e.g. "should I buy?" */
export function isAdviceQuestion(text: string): boolean {
  return [
    /\bshould\s+i\s+(buy|sell|hold|invest)\b/i,
    /\b(is|will)\s+(it|this|the\s+stock)\s+(go\s+up|rise|a\s+good\s+(buy|investment))\b/i,
    /\b(kharidu|kharidun|khareedu|bechu|bechun)\s*(kya)?\b/i,
    /(ख़रीदूँ|खरीदूँ|खरीदूं|ख़रीदूं|बेचूँ|बेचूं)\s*(क्या)?/,
    /क्या\s*(मुझे)?\s*(यह|ये)?\s*(शेयर)?\s*(ख़रीदना|खरीदना|बेचना)\s*चाहिए/,
  ].some((re) => re.test(text));
}

export const ADVICE_REPLY = {
  en: "We don't tell anyone to buy or sell — nobody can know where a price will go. What we can do is check the message, the source and your recent trades, so you decide with clear eyes.",
  hi: "हम किसी को ख़रीदने या बेचने की सलाह नहीं देते — दाम कहाँ जाएगा, यह कोई नहीं जानता। हम मैसेज, भेजने वाले और आपके हाल के ट्रेड जाँच सकते हैं, ताकि आप साफ़ नज़र से ख़ुद फ़ैसला लें।",
};
