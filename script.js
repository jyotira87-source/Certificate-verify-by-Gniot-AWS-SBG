(function (global) {
  const STORAGE_KEY = "certificate_records_v1";
  const HISTORY_KEY = "acv_history_v1";
  // Password is no longer hardcoded; backend reads from ADD_PASSWORD env var
  // If you host a backend, set window.API_BASE to its origin (e.g. http://localhost:4000)
  const API_BASE = (typeof window !== 'undefined' && window.API_BASE) ? window.API_BASE : '';

  function normalizeCode(value) {
    return String(value || "")
      .trim()
      .toUpperCase();
  }

  function formatDate(value) {
    if (!value) {
      return "N/A";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function validateCertificateInput(input) {
    const data = {
      studentName: String(input.studentName || "").trim(),
      certificateTitle: String(input.certificateTitle || "").trim(),
      issuer: String(input.issuer || "").trim(),
      issueDate: String(input.issueDate || "").trim(),
      certificateCode: normalizeCode(input.certificateCode),
      addPassword: String(input.addPassword || "").trim(),
      expiryDate: String(input.expiryDate || "").trim() || null,
    };

    if (!data.studentName || !data.certificateTitle || !data.issuer || !data.issueDate || !data.certificateCode) {
      return { ok: false, error: "Please fill all fields before saving." };
    }

    if (!data.addPassword) {
      return { ok: false, error: "Add-certificate password is required." };
    }

    return { ok: true, value: data };
  }

  function addCertificateRecord(records, newRecord) {
    const normalizedCode = normalizeCode(newRecord.certificateCode);
    const exists = records.some((record) => normalizeCode(record.certificateCode) === normalizedCode);
    if (exists) {
      return { ok: false, error: "Certificate code already exists. Use a unique printed code." };
    }

    const createdRecord = {
      id: String(Date.now()),
      studentName: newRecord.studentName,
      certificateTitle: newRecord.certificateTitle,
      issuer: newRecord.issuer,
      issueDate: newRecord.issueDate,
      expiryDate: newRecord.expiryDate || null,
      status: "verified",
      certificateCode: normalizedCode,
      createdAt: new Date().toISOString(),
    };

    return { ok: true, records: [createdRecord, ...records], record: createdRecord };
  }

  async function postToApiAdd(payload) {
    const url = `${API_BASE}/api/certs`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error || `Server returned ${res.status}`);
    }
    return res.json();
  }

  function findByCode(records, code) {
    const normalized = normalizeCode(code);
    if (!normalized) {
      return null;
    }

    return records.find((record) => normalizeCode(record.certificateCode) === normalized) || null;
  }

  function readRecords() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writeRecords(records) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }

  function computeStatus(record) {
    if (!record) return 'not_found';
    if (record.status === 'revoked') return 'revoked';
    if (record.expiryDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expiry = new Date(record.expiryDate);
      expiry.setHours(0, 0, 0, 0);
      if (expiry < today) return 'expired';
    }
    return record.status || 'verified';
  }

  // ========== HISTORY ==========
  function readHistory() {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }

  function writeHistory(history) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }

  function addHistoryEntry(entry) {
    const history = readHistory();
    history.unshift({
      id: String(Date.now()),
      code: normalizeCode(entry.code),
      holderName: entry.holderName || '',
      title: entry.title || '',
      issuer: entry.issuer || '',
      result: entry.result || 'unknown',
      source: entry.source || 'local',
      timestamp: new Date().toISOString(),
    });
    // Keep last 100 entries
    if (history.length > 100) history.splice(100);
    writeHistory(history);
    return history;
  }

  function searchHistory(query, filter) {
    let history = readHistory();
    if (query) {
      const q = query.toLowerCase();
      history = history.filter(h =>
        h.code.toLowerCase().includes(q) ||
        h.holderName.toLowerCase().includes(q) ||
        h.title.toLowerCase().includes(q) ||
        h.issuer.toLowerCase().includes(q)
      );
    }
    if (filter && filter !== 'all') {
      history = history.filter(h => h.result === filter);
    }
    // Sort newest first
    history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return history;
  }

  // ========== CSV EXPORT ==========
  function escapeCsv(value) {
    const str = String(value || '');
    // Prevent formula injection
    if (/^[=+\-@]/.test(str)) {
      return "'" + str;
    }
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  function generateCsv(records) {
    const headers = ['Certificate Code', 'Holder Name', 'Title', 'Issuer', 'Issue Date', 'Expiry Date', 'Status', 'Created At'];
    const lines = [headers.map(escapeCsv).join(',')];
    for (const r of records) {
      lines.push([
        r.certificateCode,
        r.studentName || r.holderName,
        r.certificateTitle || r.title,
        r.issuer || r.issuingOrganization,
        r.issueDate,
        r.expiryDate || '',
        r.status || 'verified',
        r.createdAt,
      ].map(escapeCsv).join(','));
    }
    return lines.join('\n');
  }

  function downloadCsv(records, filename) {
    const csv = generateCsv(records);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'certificates.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ========== VERIFICATION REPORT ==========
  function generateReport(result, code) {
    const reportRef = 'RPT-' + Date.now();
    const timestamp = new Date().toLocaleString();
    const cert = result && result.certificate ? result.certificate : (result || {});
    const status = (result && result.verificationStatus) || (result && result.status) || 'unknown';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Verification Report — Advanced Certificate Verification</title>
<style>
  body { font-family: Inter, system-ui, sans-serif; margin: 2rem; color: #1a1a1a; }
  h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
  .meta { color: #666; font-size: 0.85rem; margin-bottom: 1.5rem; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; }
  th, td { padding: 0.5rem 0.75rem; border: 1px solid #ddd; text-align: left; }
  th { background: #f5f5f5; font-weight: 600; }
  .disclaimer { font-size: 0.8rem; color: #888; border-top: 1px solid #ddd; padding-top: 1rem; margin-top: 1.5rem; }
  .status-verified { color: #16a34a; font-weight: 600; }
  .status-expired { color: #ca8a04; font-weight: 600; }
  .status-revoked { color: #dc2626; font-weight: 600; }
  .status-not_found { color: #6b7280; font-weight: 600; }
  @media print { body { margin: 1rem; } }
</style>
</head>
<body>
  <h1>Advanced Certificate Verification</h1>
  <p class="meta">Verification Report — Reference: ${reportRef}</p>
  <table>
    <tr><th>Field</th><th>Value</th></tr>
    <tr><td>Certificate Code</td><td>${cert.certificateCode || code || 'N/A'}</td></tr>
    <tr><td>Holder Name</td><td>${cert.studentName || cert.holderName || 'N/A'}</td></tr>
    <tr><td>Certificate Title</td><td>${cert.certificateTitle || cert.title || 'N/A'}</td></tr>
    <tr><td>Issuer</td><td>${cert.issuer || cert.issuingOrganization || 'N/A'}</td></tr>
    <tr><td>Issue Date</td><td>${formatDate(cert.issueDate)}</td></tr>
    <tr><td>Expiry Date</td><td>${formatDate(cert.expiryDate)}</td></tr>
    <tr><td>Verification Status</td><td class="status-${status}">${status.toUpperCase()}</td></tr>
    <tr><td>Verification Timestamp</td><td>${timestamp}</td></tr>
    <tr><td>Verification Source</td><td>${result && result.verificationSource || 'local'}</td></tr>
  </table>
  <div class="disclaimer">
    <p>This report is a record of the application's lookup result. It is not an independent guarantee of authenticity. Verification is based on the available trusted registry at the time of the lookup.</p>
  </div>
</body>
</html>`;
    return { html, reportRef };
  }

  function printReport(result, code) {
    const { html } = generateReport(result, code);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.print();
    }
  }

  // ========== QR CODE PARSING ==========
  function parseQrContent(content) {
    if (!content || typeof content !== 'string') return null;
    const trimmed = content.trim();
    // Check if it's a verification URL
    const urlMatch = trimmed.match(/verify.*[?&]code=([^&]+)/i);
    if (urlMatch) return normalizeCode(decodeURIComponent(urlMatch[1]));
    // Check if it's a raw certificate code
    if (/^[A-Z0-9\-]+$/i.test(trimmed)) return normalizeCode(trimmed);
    return null;
  }

  // ========== OCR TEXT EXTRACTION ==========
  function extractFieldsFromText(text) {
    const fields = {
      studentName: '',
      certificateTitle: '',
      issuer: '',
      certificateCode: '',
      issueDate: '',
      expiryDate: '',
    };
    if (!text) return fields;

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (!fields.certificateCode && /[A-Z0-9\-]{5,}/i.test(line) && (lower.includes('code') || lower.includes('id') || lower.includes('no'))) {
        const matches = line.match(/[A-Z0-9][A-Z0-9\-]{4,}/gi);
        if (matches) {
          const codeMatch = matches.find(m => /[-0-9]/.test(m)) || matches[matches.length - 1];
          if (codeMatch) fields.certificateCode = normalizeCode(codeMatch);
        }
      } else if (!fields.studentName && (lower.includes('name') || lower.includes('holder') || lower.includes('awarded'))) {
        fields.studentName = line.replace(/.*name[:\s]*/i, '').trim() || line;
      } else if (!fields.certificateTitle && (lower.includes('certificate') || lower.includes('title') || lower.includes('course'))) {
        fields.certificateTitle = line;
      } else if (!fields.issuer && (lower.includes('issued by') || lower.includes('organization') || lower.includes('university') || lower.includes('institute'))) {
        fields.issuer = line.replace(/.*by[:\s]*/i, '').trim() || line;
      } else if (!fields.issueDate && /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(line) && (lower.includes('issue') || lower.includes('date'))) {
        fields.issueDate = line.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/)?.[0] || '';
      } else if (!fields.expiryDate && /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(line) && (lower.includes('expiry') || lower.includes('expir') || lower.includes('valid until'))) {
        fields.expiryDate = line.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/)?.[0] || '';
      }
    }
    return fields;
  }

  // ========== TOAST NOTIFICATIONS ==========
  function showToast(message, type) {
    type = type || 'info';
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.style.cssText = 'position:fixed;top:1rem;right:1rem;z-index:9999;display:flex;flex-direction:column;gap:0.5rem;';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'glass-card';
    toast.style.cssText = 'padding:0.75rem 1rem;border-radius:0.75rem;font-size:0.85rem;max-width:320px;animation:fadeIn 0.3s ease;';
    const colors = { success: '#22c55e', error: '#e11d48', info: '#3b82f6', warning: '#f59e0b' };
    toast.style.borderLeft = '3px solid ' + (colors[type] || colors.info);
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 300); }, 3000);
  }

  // ========== RENDER HELPERS ==========
  function renderList(records, certList) {
    if (!certList) return;
    if (!records.length) {
      certList.innerHTML = '<p class="empty-note">No certificates added yet.</p>';
      return;
    }

    certList.innerHTML = records
      .map(
        (record) => `
      <article class="list-item">
        <h3>${record.studentName}</h3>
        <p>${record.certificateTitle} • ${record.issuer}</p>
        <p>Issue: ${formatDate(record.issueDate)}${record.expiryDate ? ' • Expires: ' + formatDate(record.expiryDate) : ''}</p>
        <span class="code-badge">${record.certificateCode}</span>
        ${record.status === 'revoked' ? '<span class="code-badge" style="border-color:rgba(225,29,72,0.4);color:#fda4af;background:rgba(76,5,25,0.25);">REVOKED</span>' : ''}
        ${record.status === 'verified' && record.expiryDate && new Date(record.expiryDate) < new Date() ? '<span class="code-badge" style="border-color:rgba(245,158,11,0.4);color:#fcd34d;background:rgba(76,5,25,0.15);">EXPIRED</span>' : ''}
      </article>
    `,
      )
      .join("");
  }

  function renderCount(records, certCount) {
    if (certCount) {
      certCount.textContent = records.length;
    }
  }

  function showVerificationResult(verifyResult, record, enteredCode) {
    if (!verifyResult) return;

    if (!record) {
      verifyResult.className = "verify-result result-invalid";
      verifyResult.innerHTML = `
        <p class="result-title">Certificate not found</p>
        <p class="result-meta">No record matched code <strong>${enteredCode}</strong>.</p>
      `;
      return;
    }

    const status = record.verificationStatus || (record.status === 'revoked' ? 'revoked' : (record.expiryDate && new Date(record.expiryDate) < new Date() ? 'expired' : 'verified'));
    const statusClass = status === 'verified' ? 'result-valid' : 'result-invalid';
    const statusLabel = status === 'verified' ? 'Verified' : status === 'expired' ? 'Expired' : status === 'revoked' ? 'Revoked' : 'Unknown';

    verifyResult.className = `verify-result ${statusClass}`;
    verifyResult.innerHTML = `
      <p class="result-title">${statusLabel}</p>
      <p class="result-meta"><strong>Student:</strong> ${record.studentName}</p>
      <p class="result-meta"><strong>Title:</strong> ${record.certificateTitle}</p>
      <p class="result-meta"><strong>Issuer:</strong> ${record.issuer}</p>
      <p class="result-meta"><strong>Code:</strong> ${record.certificateCode}</p>
      <p class="result-meta"><strong>Issue Date:</strong> ${formatDate(record.issueDate)}</p>
      ${record.expiryDate ? `<p class="result-meta"><strong>Expiry Date:</strong> ${formatDate(record.expiryDate)}</p>` : ''}
      ${record.verificationTimestamp ? `<p class="result-meta"><strong>Verified At:</strong> ${new Date(record.verificationTimestamp).toLocaleString()}</p>` : ''}
      <div style="margin-top:0.5rem;display:flex;gap:0.5rem;flex-wrap:wrap;">
        <button class="code-badge" onclick="window.print()" style="cursor:pointer;border:none;">Print Report</button>
      </div>
    `;

    // Add to history
    addHistoryEntry({
      code: record.certificateCode,
      holderName: record.studentName,
      title: record.certificateTitle,
      issuer: record.issuer,
      result: status,
      source: record.verificationSource || 'local',
    });
  }

  function attachApp() {
    const addForm = document.getElementById("add-form");
    const verifyForm = document.getElementById("verify-form");
    const certList = document.getElementById("certificate-list");
    const certCount = document.getElementById("cert-count");
    const addFeedback = document.getElementById("add-feedback");
    const verifyResult = document.getElementById("verify-result");
    const clearAllButton = document.getElementById("clear-all");

    let records = readRecords();
    renderList(records, certList);
    renderCount(records, certCount);

    if (addForm) {
      addForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const formData = new FormData(addForm);
        const result = validateCertificateInput({
          studentName: formData.get("studentName"),
          certificateTitle: formData.get("certificateTitle"),
          issuer: formData.get("issuer"),
          issueDate: formData.get("issueDate"),
          certificateCode: formData.get("certificateCode"),
          addPassword: formData.get("addPassword"),
          expiryDate: formData.get("expiryDate"),
        });

        if (!result.ok) {
          if (addFeedback) {
            addFeedback.textContent = result.error;
          }
          return;
        }

        // Try backend first
        (async () => {
          try {
            const serverRecord = await postToApiAdd(result.value);
            records = [serverRecord, ...records];
            writeRecords(records);
            renderList(records, certList);
            renderCount(records, certCount);
            addForm.reset();
            if (addFeedback) addFeedback.textContent = `Saved (server): ${serverRecord.studentName} • Code ${serverRecord.certificateCode}`;
            showToast('Certificate added successfully', 'success');
          } catch (err) {
            // fallback to local only
            const insertResult = addCertificateRecord(records, result.value);
            if (!insertResult.ok) {
              if (addFeedback) addFeedback.textContent = insertResult.error;
              showToast(insertResult.error, 'error');
              return;
            }
            records = insertResult.records;
            writeRecords(records);
            renderList(records, certList);
            renderCount(records, certCount);
            addForm.reset();
            if (addFeedback) addFeedback.textContent = `Saved (local): ${insertResult.record.studentName} • Code ${insertResult.record.certificateCode}`;
            showToast('Certificate saved locally', 'info');
          }
        })();
      });
    }

    if (verifyForm) {
      verifyForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const formData = new FormData(verifyForm);
        const enteredCode = String(formData.get("verifyCode") || "");
        (async () => {
          try {
            const url = `${API_BASE}/api/certs/verify?code=${encodeURIComponent(enteredCode)}`;
            const res = await fetch(url);
            if (res.ok) {
              const srv = await res.json();
              showVerificationResult(verifyResult, srv, enteredCode);
              return;
            }
          } catch (e) {
            // ignore and fallback
          }

          const record = findByCode(records, enteredCode);
          showVerificationResult(verifyResult, record, enteredCode);
        })();
      });
    }

    if (clearAllButton) {
      clearAllButton.addEventListener("click", () => {
        if (!confirm('Clear all local certificate records?')) return;
        records = [];
        writeRecords(records);
        renderList(records, certList);
        renderCount(records, certCount);
        if (addFeedback) {
          addFeedback.textContent = "All certificate records cleared from this browser.";
        }
        if (verifyResult) {
          verifyResult.className = "verify-result";
          verifyResult.innerHTML = '<p class="result-meta">Enter a certificate code to start verification.</p>';
        }
        showToast('All local records cleared', 'info');
      });
    }
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", attachApp);
  }

  const exported = {
    normalizeCode,
    validateCertificateInput,
    addCertificateRecord,
    findByCode,
    formatDate,
    computeStatus,
    extractFieldsFromText,
    parseQrContent,
    generateCsv,
    escapeCsv,
    generateReport,
    printReport,
    addHistoryEntry,
    searchHistory,
    readHistory,
    downloadCsv,
    showToast,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = exported;
  } else {
    global.CertificateApp = exported;
    global.showToast = showToast;
    global.normalizeCode = normalizeCode;
    global.extractFieldsFromText = extractFieldsFromText;
    global.parseQrContent = parseQrContent;
    global.downloadCsv = downloadCsv;
    global.searchHistory = searchHistory;
    global.readHistory = readHistory;
    global.addHistoryEntry = addHistoryEntry;
    global.generateReport = generateReport;
    global.printReport = printReport;
  }
})(typeof window !== "undefined" ? window : globalThis);