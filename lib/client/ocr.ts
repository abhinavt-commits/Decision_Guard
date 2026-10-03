"use client";

/** Shrink a photo before upload (saves data on slow networks). */
export async function compressImage(file: Blob, maxSide = 1400, quality = 0.8): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Read text from a screenshot.
 * 1) Server AI (Gemini) if configured — best for Hindi and messy screenshots.
 * 2) Otherwise on-device OCR with Tesseract (English + Hindi), downloaded only when needed.
 */
export async function readScreenshot(file: Blob, onStage?: (s: string) => void): Promise<string> {
  const dataUrl = await compressImage(file);
  try {
    onStage?.("ai");
    const r = await fetch("/api/ocr", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: dataUrl }) });
    if (r.ok) {
      const j = await r.json();
      if (j.text) return j.text as string;
    }
  } catch {
    /* fall back */
  }
  onStage?.("device");
  const Tesseract = await import("tesseract.js");
  const worker = await Tesseract.createWorker(["eng", "hin"]);
  try {
    const { data } = await worker.recognize(dataUrl);
    return data.text.trim();
  } finally {
    await worker.terminate();
  }
}
