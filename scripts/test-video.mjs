// Checks whether Gemini can watch a YouTube video with YOUR key, and prints exactly what Google replies.
//   npm run test-video -- https://www.youtube.com/watch?v=XXXXXXXXXXX
import fs from "node:fs";

// Read GEMINI_API_KEY / GEMINI_MODEL from .env.local (same file the app uses).
for (const f of [".env.local", ".env"]) {
  if (!fs.existsSync(f)) continue;
  for (const line of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const key = process.env.GEMINI_API_KEY;
const url = process.argv[2];
if (!key) { console.log("✗ No GEMINI_API_KEY found in .env.local (in this folder). The app can't watch videos without it."); process.exit(1); }
const id = (url ?? "").match(/(?:v=|youtu\.be\/|shorts\/|live\/|embed\/)([A-Za-z0-9_-]{11})/)?.[1];
if (!id) { console.log("Usage: npm run test-video -- <YouTube link>"); process.exit(1); }
console.log(`Key found (…${key.slice(-4)}). Video id: ${id}`);

const models = [process.env.GEMINI_MODEL, "gemini-flash-latest", "gemini-2.5-flash", "gemini-flash-lite-latest", "gemini-2.5-flash-lite"].filter(Boolean);
for (const model of models) {
  const t0 = Date.now();
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [
          { file_data: { file_uri: `https://www.youtube.com/watch?v=${id}`, mime_type: "video/*" }, video_metadata: { start_offset: "0s", end_offset: "300s" } },
          { text: "In 2 sentences, what is said in this video? Then list any stock names mentioned." },
        ] }],
        generationConfig: { temperature: 0.1, mediaResolution: "MEDIA_RESOLUTION_LOW" },
      }),
      signal: AbortSignal.timeout(90000),
    });
    const text = await r.text();
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    if (r.ok) {
      const j = JSON.parse(text);
      const out = j.candidates?.[0]?.content?.parts?.map((p) => p.text).join("");
      if (!out) {
        console.log(`\n✗ ${model}: Google answered but returned no text — finish reason: ${j.candidates?.[0]?.finishReason ?? j.promptFeedback?.blockReason ?? "none"}`);
        console.log("→ RECITATION means Google won't repeat the broadcast word-for-word (the app now retries with paraphrases).");
        process.exit(1);
      }
      console.log(`\n✓ ${model} watched the video in ${secs}s:\n`);
      console.log(j.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? text.slice(0, 500));
      console.log(`\nTokens used: ${j.usageMetadata?.promptTokenCount ?? "?"}`);
      process.exit(0);
    }
    console.log(`\n✗ ${model}: HTTP ${r.status} after ${secs}s\n${text.slice(0, 700)}`);
    if (r.status === 404) continue; // model name not available → try next
    if (r.status === 429) { console.log("→ Free-tier limit reached. Wait a minute (or until tomorrow for the daily limit), or try a shorter video."); continue; }
    if (r.status >= 500) { console.log("→ Google's service was busy/erroring. Try again in a minute."); continue; }
    if (r.status === 400) console.log("→ Google could not open this video. It must be PUBLIC (not private/unlisted/age-restricted/members-only).");
    if (r.status === 403) console.log("→ Key rejected or the Gemini API isn't enabled for it. Create a new key at aistudio.google.com/apikey.");
    process.exit(1);
  } catch (e) {
    console.log(`\n✗ ${model}: ${e.message}`);
  }
}
process.exit(1);
