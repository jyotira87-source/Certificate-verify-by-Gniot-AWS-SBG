import { showToast, showError, showSuccess, showInfo } from "../js/toast.js";
import { get } from "../js/api-client.js";
import { validateVerificationCode } from "../js/validation.js";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("verify-form");
  const input = document.getElementById("verify-code");
  const btn = document.getElementById("verify-btn");
  const errorEl = document.getElementById("verify-error");
  const loadingEl = document.getElementById("verify-loading");
  const resultEl = document.getElementById("verify-result");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const code = input.value.trim();
    const validation = validateVerificationCode(code);
    if (!validation.valid) { showError(validation.error); return; }

    btn.disabled = true; btn.textContent = "Verifying...";
    errorEl.style.display = "none"; loadingEl.style.display = "block"; resultEl.style.display = "none";

    try {
      const res = await get(`/api/certs/verify?code=${encodeURIComponent(code)}`);
      if (res.ok && res.data) { renderResult(res.data); showSuccess("Verification complete"); }
      else { showError("Verification failed"); }
    } catch (err) {
      if (err.status === 404) {
        renderResult({ status: "not_found", message: "Certificate not found in registry", code, timestamp: new Date().toISOString() });
        showInfo("Certificate not found");
      } else { showError(err.error || "Verification failed"); }
    } finally {
      btn.disabled = false; btn.textContent = "Verify"; loadingEl.style.display = "none";
    }
  });

  input.addEventListener("input", () => { errorEl.style.display = "none"; });
});

function renderResult(data) {
  const resultEl = document.getElementById("verify-result");
  const timestamp = new Date(data.timestamp).toLocaleString();
  let statusClass = "badge-not-found";
  if (data.status === "verified") statusClass = "badge-verified";
  else if (data.status === "expired") statusClass = "badge-expired";
  else if (data.status === "revoked") statusClass = "badge-revoked";

  let html = `<div class="card"><div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:var(--space-4);"><div><h3 style="font-size:var(--text-lg);font-weight:600;color:var(--text-primary);margin-bottom:var(--space-2);">Verification Result</h3><p style="font-size:var(--text-xs);color:var(--text-muted);">Verified at ${timestamp}</p></div><span class="badge ${statusClass}">${data.status.replace(/_/g," ").toUpperCase()}</span></div>`;

  if (data.status === "not_found") {
    html += `<p style="font-size:var(--text-sm);color:var(--text-secondary);">${data.message}</p><p style="font-size:var(--text-xs);color:var(--text-muted);margin-top:var(--space-2);">Code searched: ${data.code}</p><p style="font-size:var(--text-xs);color:var(--text-muted);margin-top:var(--space-2);">This certificate ID is not in the registry. This does not mean the certificate is fraudulent.</p>`;
  } else if (data.certificate) {
    const c = data.certificate;
    html += `<table class="table" style="margin-top:var(--space-4);"><tr><td style="width:40%;"><strong>Holder Name</strong></td><td>${c.holderName}</td></tr><tr><td><strong>Certificate Title</strong></td><td>${c.title}</td></tr><tr><td><strong>Issuing Organization</strong></td><td>${c.issuingOrganization}</td></tr><tr><td><strong>Certificate ID</strong></td><td style="font-family:monospace;">${c.certificateCode}</td></tr><tr><td><strong>Issue Date</strong></td><td>${new Date(c.issueDate).toLocaleDateString()}</td></tr>${c.expiryDate ? `<tr><td><strong>Expiry Date</strong></td><td>${new Date(c.expiryDate).toLocaleDateString()}</td></tr>` : ""}<tr><td><strong>Registry Status</strong></td><td>${c.status}</td></tr></table>`;
    if (data.verificationUrl) {
      html += `<div style="margin-top:var(--space-6);display:flex;gap:var(--space-3);"><button class="btn btn-outline btn-sm" onclick="copyToClipboard('${data.verificationUrl}')">Copy URL</button><a href="${data.verificationUrl}" class="btn btn-primary btn-sm" target="_blank" rel="noopener noreferrer">Open Verification Page</a></div>`;
    }
  }
  html += "</div>";
  resultEl.innerHTML = html;
  resultEl.style.display = "block";
}

window.copyToClipboard = (text) => {
  navigator.clipboard.writeText(text).then(() => showToast("Copied to clipboard", "success"));
};
