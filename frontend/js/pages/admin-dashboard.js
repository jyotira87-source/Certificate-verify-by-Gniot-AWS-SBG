import { showToast, showError } from "../js/toast.js";
import { get } from "../js/api-client.js";
import { isAuthenticated, logout } from "../js/auth.js";

document.addEventListener("DOMContentLoaded", async () => {
  if (!isAuthenticated()) {
    window.location.href = "admin-login.html";
    return;
  }

  document.getElementById("logout-btn").addEventListener("click", async () => {
    await logout(() => { window.location.href = "admin-login.html"; });
  });

  try {
    const res = await get("/api/certs/stats");
    if (res.ok && res.data) {
      document.getElementById("stat-total").textContent = res.data.total;
      document.getElementById("stat-verified").textContent = res.data.verified;
      document.getElementById("stat-expired").textContent = res.data.expired;
      document.getElementById("stat-revoked").textContent = res.data.revoked;
    }
  } catch (err) {
    showError("Failed to load dashboard statistics");
  }

  try {
    const res = await get("/api/certs/search?limit=5");
    if (res.ok && res.data && res.data.items) {
      const tbody = document.getElementById("recent-list");
      if (res.data.items.length === 0) {
        tbody.innerHTML = '<p style="color:var(--text-muted);font-size:var(--text-sm);">No certificates found.</p>';
      } else {
        tbody.innerHTML = res.data.items.map((c) => `
          <div style="padding:var(--space-3);border-bottom:1px solid var(--border-color);font-size:var(--text-sm);">
            <div style="font-weight:600;color:var(--text-primary);">${c.holderName}</div>
            <div style="color:var(--text-secondary);">${c.certificateCode} - ${c.title}</div>
            <div style="color:var(--text-muted);font-size:var(--text-xs);">${c.computedStatus || c.status}</div>
          </div>
        `).join("");
      }
    }
  } catch (err) {
    showError("Failed to load recent registrations");
  }
});
