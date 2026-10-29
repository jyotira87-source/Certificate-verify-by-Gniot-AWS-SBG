import { showToast, showError } from "../js/toast.js";
import { generateQR } from "../js/qr.js";

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const status = params.get("status") || "unknown";
  const code = params.get("code") || "";

  const container = document.getElementById("result-container");
  if (!container) return;

  let statusClass = "badge-not-found";
  let statusTitle = "Verification Result";
  let statusMessage = "Unable to verify certificate.";
  if (status === "verified") { statusClass = "badge-verified"; statusTitle = "Certificate Verified"; statusMessage = "This certificate is authentic and active in the registry."; }
  else if (status === "expired") { statusClass = "badge-expired"; statusTitle = "Certificate Expired"; statusMessage = "This certificate is authentic but has expired."; }
  else if (status === "revoked") { statusClass = "badge-revoked"; statusTitle = "Certificate Revoked"; statusMessage = "This certificate has been revoked by the issuing organization."; }
  else if (status === "not_found") { statusClass = "badge-not-found"; statusTitle = "Certificate Not Found"; statusMessage = "This certificate ID is not in the registry. This does not mean the certificate is fraudulent."; }

  let html = `<div class="card" style="text-align:center;max-width:560px;margin:0 auto;"><div style="margin-bottom:var(--space-6);"><span class="badge ${statusClass}" style="font-size:var(--text-lg);padding:0.5rem 1rem;">${statusTitle}</span><h2 style="font-size:var(--text-3xl);font-weight:700;color:var(--text-primary);margin:var(--space-4) 0 var(--space-2);">${statusTitle}</h2><p style="font-size:var(--text-lg);color:var(--text-secondary);">${statusMessage}</p>${code ? `<p style="font-size:var(--text-sm);color:var(--text-muted);margin-top:var(--space-3);font-family:monospace;">${code}</p>` : ""}</div>`;

  if (code && status !== "not_found") {
    try {
      const qrUrl = await generateQR(`${window.location.origin}/verify.html?code=${encodeURIComponent(code)}`, 200);
      html += `<div style="margin:var(--space-6) 0;"><img src="${qrUrl}" alt="QR Code" style="width:160px;height:160px;"><p style="font-size:var(--text-xs);color:var(--text-muted);margin-top:var(--space-3);">Scan to verify</p></div>`;
    } catch (e) { /* QR generation failed, skip */ }
  }

  html += `<div style="margin-top:var(--space-8);display:flex;gap:var(--space-3);justify-content:center;flex-wrap:wrap;"><button class="btn btn-primary" onclick="window.location.href='verify.html'">Verify Another</button><button class="btn btn-outline" onclick="window.print()">Print Result</button></div></div>`;

  container.innerHTML = html;
});
