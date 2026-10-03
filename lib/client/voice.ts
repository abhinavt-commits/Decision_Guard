"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* Minimal Web Speech API types */
type SR = {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null; onerror: (() => void) | null; start: () => void; stop: () => void;
};

export function speechSupported(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

/** Voice typing. Hindi uses hi-IN (also understands Hinglish reasonably). */
export function useVoiceInput(lang: "en" | "hi", onText: (t: string) => void) {
  const [listening, setListening] = useState(false);
  const recRef = useRef<SR | null>(null);
  const cb = useRef(onText);
  cb.current = onText;

  const stop = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const C = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!C) return false;
    const rec = new C();
    rec.lang = lang === "hi" ? "hi-IN" : "en-IN";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e) => {
      let text = "";
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) text += e.results[i][0].transcript;
      if (text) cb.current(text.trim());
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
    return true;
  }, [lang]);

  useEffect(() => () => recRef.current?.stop(), []);
  return { listening, start, stop };
}

// ---- Read aloud ------------------------------------------------------------------------
// Why Hindi failed before: (1) phones load their voice list late, so no Hindi voice was picked;
// (2) Chrome silently stops long utterances after ~15 s; (3) speak() right after cancel() is
// sometimes dropped. Fix: wait for the voice list, pick a real Hindi voice, speak in short chunks.
// If the phone has no Hindi voice at all, the button is hidden in Hindi (useCanSpeak).

const norm = (l: string) => l.toLowerCase().replace("_", "-");
let voiceCache: SpeechSynthesisVoice[] = [];

function synth(): SpeechSynthesis | null {
  return typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
}

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  const ss = synth();
  if (!ss) return Promise.resolve([]);
  const now = ss.getVoices();
  if (now.length) return Promise.resolve((voiceCache = now));
  return new Promise((res) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      voiceCache = ss.getVoices();
      res(voiceCache);
    };
    ss.addEventListener?.("voiceschanged", finish, { once: true });
    setTimeout(finish, 2000);
  });
}

function pickVoice(voices: SpeechSynthesisVoice[], lang: "en" | "hi"): SpeechSynthesisVoice | undefined {
  if (lang === "hi") {
    const hi = voices.filter((v) => norm(v.lang).startsWith("hi") || /hindi|हिन्दी|हिंदी/i.test(v.name));
    return hi.find((v) => /google/i.test(v.name)) ?? hi.find((v) => v.localService) ?? hi[0];
  }
  const en = voices.filter((v) => norm(v.lang).startsWith("en"));
  return en.find((v) => norm(v.lang) === "en-in") ?? en.find((v) => /google/i.test(v.name)) ?? en[0];
}

/** true when this phone/browser can read aloud in the given language (Hindi needs a Hindi voice). */
export function useCanSpeak(lang: "en" | "hi") {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    let live = true;
    if (!synth()) { setOk(false); return; }
    loadVoices().then((v) => {
      if (!live) return;
      // English: the default voice is fine even if the list is empty. Hindi: only with a Hindi voice.
      setOk(lang === "en" ? true : Boolean(pickVoice(v, "hi")));
    });
    return () => { live = false; };
  }, [lang]);
  return ok;
}

/** Splits text into short pieces at sentence ends (. ? ! ।), then commas, then spaces. */
function chunks(text: string, max = 180): string[] {
  const out: string[] = [];
  const sentences = text.replace(/\s+/g, " ").split(/(?<=[.!?।])\s+/);
  for (const sen of sentences) {
    let rest = sen.trim();
    while (rest.length > max) {
      let cut = Math.max(rest.lastIndexOf(",", max), rest.lastIndexOf("،", max));
      if (cut < max / 2) cut = rest.lastIndexOf(" ", max);
      if (cut < 20) cut = max;
      out.push(rest.slice(0, cut + 1).trim());
      rest = rest.slice(cut + 1).trim();
    }
    if (rest) out.push(rest);
  }
  return out;
}

let session = 0;

/** Read text aloud in Hindi or English. Returns false if the browser can't. */
export function speak(text: string, lang: "en" | "hi", onEnd?: () => void) {
  const ss = synth();
  if (!ss) return false;
  const my = ++session;
  ss.cancel();
  const voice = pickVoice(voiceCache.length ? voiceCache : ss.getVoices(), lang);
  if (lang === "hi" && !voice && (voiceCache.length || ss.getVoices().length)) return false;
  const parts = chunks(text);
  let i = 0;
  const next = () => {
    if (my !== session) return;
    if (i >= parts.length) { onEnd?.(); return; }
    const u = new SpeechSynthesisUtterance(parts[i++]);
    u.lang = voice?.lang ?? (lang === "hi" ? "hi-IN" : "en-IN");
    if (voice) u.voice = voice;
    u.rate = lang === "hi" ? 0.9 : 0.95;
    u.onend = next;
    u.onerror = (e) => {
      // "interrupted"/"canceled" = user pressed stop or a new reading started.
      if (my !== session) return;
      if ((e as SpeechSynthesisErrorEvent).error === "interrupted" || (e as SpeechSynthesisErrorEvent).error === "canceled") return;
      next();
    };
    ss.resume(); // Android Chrome can be stuck in "paused"
    ss.speak(u);
  };
  // Speaking immediately after cancel() is sometimes ignored by Chrome.
  setTimeout(next, 80);
  return true;
}

export function stopSpeaking() {
  session++;
  synth()?.cancel();
}
