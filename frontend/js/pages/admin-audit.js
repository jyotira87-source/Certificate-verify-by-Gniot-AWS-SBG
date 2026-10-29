import { showToast, showError } from "../js/toast.js";
import { get } from "../js/api-client.js";
import { isAuthenticated, logout } from "../js/auth.js";

let currentPage = 1;

document.addEventListener("DOMContentLoaded", async () => {
  if (!isAuthenticated()) {
    window.location.href = "admin-login.html";
    return;
  }

  document.getElementById("logout-btn").addEventListener("click", async () => {
    await logout(() => { window.location.href = "admin-login.html"; });
  });

  loadAudit();
});

async function loadAudit() {
  try {
    const res = await get(`/api/audit?page=${currentPage}&limit=50`);
    if (res.ok && res.data) {
      renderTable(res.data.items, res.data.pagination);
    }
  } catch (err) {
    showError("Failed to load audit logs");
  }
}

function renderTable(items, pagination) {
  const tbody = document.getElementById("audit-table-body");
  if (!tbody) return;

  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:var(--space-8);color:var(--text-muted);">No audit records found.</td></tr>`;
  } else {
    tbody.innerHTML = items.map((a) => `
      <tr>
        <td style="font-family:monospace;font-size:var(--text-xs);">${new Date(a.timestamp).toLocaleString()}</td>
        <td style="font-size:var(--text-sm);">${a.action.replace(/_/g, " ").toUpperCase()}</td>
        <td style="font-size:var(--text-sm);">${a.actor}</td>
        <td style="font-size:var(--text-xs);color:var(--text-muted);">${a.targetId || "—"}</td>
        <td style="font-size:var(--text-xs);color:var(--text-muted);">${JSON.stringify(a.details || {}).slice(0, 100)}${JSON.stringify(a.details || {}).length > 100 ? "..." : ""}</td>
      </tr>
    `).join("");
  }

  const el = document.getElementById("audit-pagination");
  if (el) {
    el.innerHTML = `<div style="color:var(--text-muted);font-size:var(--text-xs);">Page ${pagination.page} of ${pagination.totalPages}</div>`;
  }
}
