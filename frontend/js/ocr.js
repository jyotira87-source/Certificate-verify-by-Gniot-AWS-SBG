let worker = null; let loading = false; let loaded = false;
export const loadTesseract = async () => {
  if (loaded) return worker;
  if (loading) { while (loading) { await new Promise((r) => setTimeout(r, 100)); } return worker; }
  loading = true;
  try {
    if (typeof window === "undefined") throw new Error("OCR requires a browser environment");
    if (typeof window.Tesseract !== "undefined") { worker = await window.Tesseract.createWorker("eng"); loaded = true; return worker; }
    await new Promise((resolve, reject) => {
      const s = document.createElement("script"); s.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/min/tesseract.min.js"; s.onload = resolve; s.onerror = reject; document.head.appendChild(s);
    });
    if (typeof window.Tesseract === "undefined") throw new Error("Tesseract.js failed to load from CDN");
    worker = await window.Tesseract.createWorker("eng"); loaded = true; return worker;
  } finally { loading = false; }
};
export const extractText = async (imageSource) => {
  if (!loaded) await loadTesseract();
  if (!worker) return { available: false, error: "OCR engine not available", text: "", confidence: 0, fields: {} };
  try {
    const result = await worker.recognize(imageSource);
    return { available: true, text: result.data.text || "", confidence: result.data.confidence || 0, confidencePercent: Math.round(result.data.confidence || 0), fields: parseFields(result.data.text || "") };
  } catch (err) { return { available: true, error: err.message, text: "", confidence: 0, fields: {} }; }
};
const parseFields = (text) => {
  const fields = {};
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes("certificate") || lower.includes("cert no")) fields.certificateNumber = line;
    else if (lower.includes("name") || lower.includes("holder")) fields.holderName = line;
    else if (lower.includes("university") || lower.includes("institution")) fields.institution = line;
    else if (lower.includes("course") || lower.includes("title")) fields.qualification = line;
    else if (/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(line)) { if (!fields.issueDate) fields.issueDate = line; else if (!fields.expiryDate) fields.expiryDate = line; }
  }
  return fields;
};
export const terminate = async () => { if (worker) { try { await worker.terminate(); } catch (e) {} worker = null; loaded = false; } };
export const isOCRAvailable = () => typeof window !== "undefined" && typeof window.Tesseract !== "undefined";
