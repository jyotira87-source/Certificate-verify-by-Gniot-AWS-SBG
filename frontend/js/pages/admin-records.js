import { showToast, showError, showSuccess } from "../js/toast.js";
import { get, del } from "../js/api-client.js";
import { isAuthenticated, logout } from "../js/auth.js";

let currentPage = 1;
let currentQuery = "";
let currentStatus = "";

document.addEventListener("DOMContentLoaded", async () => {
  if (!isAuthenticated()) {
    window.location.href = "admin-login.html";
    return;
  }

  document.getElementById("logout-btn").addEventListener("click", async () => {
    await logout(() => { window.location.href = "admin-login.html"; });
  });

  const searchBtn = document.getElementById("search-btn");
  const clearBtn = document.getElementById("clear-btn");
  const queryInput = document.getElementById("search-query");
  const statusSelect = document.getElementById("filter-status");

  searchBtn.addEventListener("click", () => {
    currentPage = 1;
    currentQuery = queryInput.value.trim();
    currentStatus = statusSelect.value;
    loadRecords();
  });

  clearBtn.addEventListener("click", () => {
    queryInput.value = ""; statusSelect.value = "";
    currentQuery = ""; currentStatus = ""; currentPage = 1;
    loadRecords();
  });

  loadRecords();
});

async function loadRecords() {
  const params = new URLSearchParams({ page: currentPage, limit: 20 });
  if (currentQuery) params.set("query", currentQuery);
  if (currentStatus) params.set("status", currentStatus);

  try {
    const res = await get(`/api/certs/search?${params}`);
    if (res.ok && res.data) {
      renderTable(res.data.items, res.data.pagination);
    }
  } catch (err) {
    showError("Failed to load records");
  }
}

function renderTable(items, pagination) {
  const tbody = document.getElementById("records-table-body");
  if (!tbody) return;

  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:var(--space-8);color:var(--text-muted);">No certificates found.</td></tr>`;
  } else {
    tbody.innerHTML = items.map((c) => `
      <tr>
        <td style="font-family:monospace;font-size:var(--text-xs);">${c.certificateCode}</td>
        <td>${c.holderName}</td>
        <td>${c.title}</td>
        <td>${c.issuingOrganization}</td>
        <td>${new Date(c.issueDate).toLocaleDateString()}</td>
        <td><span class="badge badge-${c.computedStatus || c.status}">${(c.computedStatus || c.status).replace(/_/g," ").toUpperCase()}</span></td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="viewCertificate('${c.id}')" title="View">&#128065;</button>
          <button class="btn btn-outline btn-sm" onclick="revokeCertificate('${c.id}', '${c.certificateCode}')" title="Revoke">&#10006;</button>
        </td>
      </tr>
    `).join("");
  }

  renderPagination(pagination);
}

function renderPagination(p) {
  const el = document.getElementById("records-pagination");
  if (!el) return;
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;color:var(--text-muted);font-size:var(--text-xs);">
      <span>Page ${p.page} of ${p.totalPages} (${p.total} total)</span>
      <div style="display:flex;gap:var(--space-2);">
        <button class="btn btn-outline btn-sm" ${!p.hasPrev ? "disabled" : ""} onclick="changePage(${p.page - 1})">Prev</button>
        <button class="btn btn-outline btn-sm" ${!p.hasNext ? "disabled" : ""} onclick="changePage(${p.page + 1})">Next</button>
      </div>
    </div>`;
}

window.changePage = (page) => { currentPage = page; loadRecords(); };

window.viewCertificate = (id) => {
  showToast("Certificate details view coming soon", "info");
};

window.revokeCertificate = async (id, code) => {
  if (!confirm(`Revoke certificate ${code}? This cannot be undone through the UI.`)) return;
  try {
    await del(`/api/certs/${id}`, { body: JSON.stringify({ reason: "Revoked via admin dashboard" }) });
    showSuccess("Certificate revoked");
    loadRecords();
  } catch (err) {
    showError(err.error || "Revoke failed");
  }
};
