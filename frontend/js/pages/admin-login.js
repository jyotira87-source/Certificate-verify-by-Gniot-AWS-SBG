import { showToast, showError, showSuccess } from "../js/toast.js";
import { login } from "../js/auth.js";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("login-form");
  const errorEl = document.getElementById("login-error");
  const btn = document.getElementById("login-btn");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("admin-username").value;
    const password = document.getElementById("admin-password").value;

    btn.disabled = true; btn.textContent = "Signing in..."; errorEl.style.display = "none";

    const result = await login(username, password, {
      onSuccess: () => { showSuccess("Login successful"); window.location.href = "admin-dashboard.html"; },
      onError: (msg) => { showError(msg); errorEl.textContent = msg; errorEl.style.display = "block"; },
    });

    btn.disabled = false; btn.textContent = "Sign In";
  });
});
