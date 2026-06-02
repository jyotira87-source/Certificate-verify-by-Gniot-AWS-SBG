(function (global) {
  const STORAGE_KEY = "certificate_records_v1";
  const ADD_CERT_PASSWORD = "AWSGOD11";
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
    };

    if (!data.studentName || !data.certificateTitle || !data.issuer || !data.issueDate || !data.certificateCode) {
      return { ok: false, error: "Please fill all fields before saving." };
    }

    if (data.addPassword !== ADD_CERT_PASSWORD) {
      return { ok: false, error: "Invalid add-certificate password." };
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

  function renderList(records, listElement) {
    if (!listElement) {
      return;
    }

    if (records.length === 0) {
      listElement.innerHTML = '<p class="empty-note">No certificates added yet.</p>';
      return;
    }

    listElement.innerHTML = records
      .map(
        (record) => `
        <article class="list-item">
          <h3>${escapeHtml(record.studentName)} • ${escapeHtml(record.certificateTitle)}</h3>
          <p>Issuer: ${escapeHtml(record.issuer)}</p>
          <p>Issue Date: ${escapeHtml(formatDate(record.issueDate))}</p>
          <span class="code-badge">Code: ${escapeHtml(record.certificateCode)}</span>
        </article>
      `,
      )
      .join("");
  }

  function renderCount(records, countElement) {
    if (countElement) {
      countElement.textContent = String(records.length);
    }
  }

  function showVerificationResult(target, record, code) {
    if (!target) {
      return;
    }

    if (!record) {
      target.className = "verify-result result-invalid";
      target.innerHTML = `
        <p class="result-title">❌ Certificate not found</p>
        <p class="result-meta">No record found for code: <strong>${escapeHtml(normalizeCode(code))}</strong></p>
      `;
      return;
    }

    target.className = "verify-result result-valid";
    target.innerHTML = `
      <p class="result-title">✅ Certificate Verified</p>
      <p class="result-meta">Name: <strong>${escapeHtml(record.studentName)}</strong></p>
      <p class="result-meta">Title: <strong>${escapeHtml(record.certificateTitle)}</strong></p>
      <p class="result-meta">Issuer: <strong>${escapeHtml(record.issuer)}</strong></p>
      <p class="result-meta">Issue Date: <strong>${escapeHtml(formatDate(record.issueDate))}</strong></p>
      <p class="result-meta">Code: <strong>${escapeHtml(record.certificateCode)}</strong></p>
    `;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function attachApp() {
    const addForm = document.getElementById("add-form");
    const verifyForm = document.getElementById("verify-form");
    const addFeedback = document.getElementById("add-feedback");
    const verifyResult = document.getElementById("verify-result");
    const certList = document.getElementById("certificate-list");
    const certCount = document.getElementById("cert-count");
    const clearAllButton = document.getElementById("clear-all");

    let records = readRecords();
    renderList(records, certList);
    renderCount(records, certCount);

    if (verifyResult) {
      verifyResult.innerHTML = '<p class="result-meta">Enter a certificate code to start verification.</p>';
    }

    addForm?.addEventListener("submit", (event) => {
      event.preventDefault();

      const formData = new FormData(addForm);
      const result = validateCertificateInput({
        studentName: formData.get("studentName"),
        certificateTitle: formData.get("certificateTitle"),
        issuer: formData.get("issuer"),
        issueDate: formData.get("issueDate"),
        certificateCode: formData.get("certificateCode"),
        addPassword: formData.get("addPassword"),
      });

      if (!result.ok) {
        if (addFeedback) {
          addFeedback.textContent = result.error;
        }
        return;
      }

      // Try backend first (if API_BASE is set or same-origin), otherwise fallback to localStorage
      (async () => {
        try {
          const serverRecord = await postToApiAdd(result.value);
          // If backend succeeded, refresh local view from server
          // Prepend server record locally for immediate feedback
          records = [serverRecord, ...records];
          writeRecords(records);
          renderList(records, certList);
          renderCount(records, certCount);
          addForm.reset();
          if (addFeedback) addFeedback.textContent = `Saved (server): ${serverRecord.studentName} • Code ${serverRecord.certificateCode}`;
        } catch (err) {
          // fallback to local only
          const insertResult = addCertificateRecord(records, result.value);
          if (!insertResult.ok) {
            if (addFeedback) addFeedback.textContent = insertResult.error;
            return;
          }
          records = insertResult.records;
          writeRecords(records);
          renderList(records, certList);
          renderCount(records, certCount);
          addForm.reset();
          if (addFeedback) addFeedback.textContent = `Saved (local): ${insertResult.record.studentName} • Code ${insertResult.record.certificateCode}`;
        }
      })();
    });

    verifyForm?.addEventListener("submit", (event) => {
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

    clearAllButton?.addEventListener("click", () => {
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
    });
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
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = exported;
  } else {
    global.CertificateApp = exported;
  }
})(typeof window !== "undefined" ? window : globalThis);