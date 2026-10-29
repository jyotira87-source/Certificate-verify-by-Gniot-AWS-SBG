export const generateQR = async (text, size = 200) => {
  if (typeof window === "undefined") throw new Error("QR generation requires a browser environment");
  if (typeof window.QRCode !== "undefined") {
    return new Promise((resolve, reject) => {
      window.QRCode.toDataURL(text, { width: size, margin: 2, color: { dark: "#0a0e17", light: "#ffffff" } }, (err, url) => err ? reject(err) : resolve(url));
    });
  }
  await new Promise((resolve, reject) => {
    const s = document.createElement("script"); s.src = "https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"; s.onload = resolve; s.onerror = reject; document.head.appendChild(s);
  });
  if (typeof window.QRCode === "undefined") throw new Error("QRCode library failed to load");
  return new Promise((resolve, reject) => {
    window.QRCode.toDataURL(text, { width: size, margin: 2, color: { dark: "#0a0e17", light: "#ffffff" } }, (err, url) => err ? reject(err) : resolve(url));
  });
};
export const parseQRContent = (content) => {
  if (!content || typeof content !== "string") return { type: "unknown", content: null };
  const trimmed = content.trim();
  const urlMatch = trimmed.match(/^https?:\/\/[^/]+\/verify(?:\.html)?(?:\?code=([^&]+))?/);
  if (urlMatch) return { type: "verification_url", content: trimmed, code: urlMatch[1] || null, isTrusted: true };
  try { const url = new URL(trimmed); return { type: "url", content: trimmed, url, isTrusted: false }; } catch (e) { return { type: "certificate_id", content: trimmed, isTrusted: true }; }
};
export const isValidVerificationUrl = (url, appOrigin) => {
  try { const p = new URL(url); const a = new URL(appOrigin); return p.origin === a.origin; } catch (e) { return false; }
};
