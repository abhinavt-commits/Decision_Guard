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

/** Read text aloud in Hindi or English. */
export function speak(text: string, lang: "en" | "hi", onEnd?: () => void) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang === "hi" ? "hi-IN" : "en-IN";
  const voice = window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith(lang === "hi" ? "hi" : "en-in"));
  if (voice) u.voice = voice;
  u.rate = 0.95;
  u.onend = () => onEnd?.();
  window.speechSynthesis.speak(u);
  return true;
}
export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}
