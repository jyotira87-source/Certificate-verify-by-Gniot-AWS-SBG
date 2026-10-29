import { showToast, showError, showSuccess } from "../js/toast.js";
import { post } from "../js/api-client.js";
import { validateCertificate } from "../js/validation.js";
import { isAuthenticated } from "../js/auth.js";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("register-form");
  const authRequired = document.getElementById("auth-required");
  const errorEl = document.getElementById("register-error");
  const successEl = document.getElementById("register-success");
  const successDetail = document.getElementById("register-success-detail");
  const btn = document.getElementById("register-btn");

  if (!form) return;

  // Check auth
  if (!isAuthenticated()) {
    authRequired.style.display = "block";
    form.style.display = "none";
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const metadataEl = document.getElementById("metadata");
    const data = {
      holderName: document.getElementById("holder-name").value,
      title: document.getElementById("certificate-title").value,
      issuingOrganization: document.getElementById("issuing-org").value,
      issueDate: document.getElementById("issue-date").value,
      expiryDate: document.getElementById("expiry-date").value || undefined,
      certificateCode: document.getElementById("certificate-code").value || undefined,
      metadata: metadataEl.value || undefined,
    };

    const validation = validateCertificate(data);
    if (!validation.valid) {
      showError(Object.values(validation.errors).join(" "));
      return;
    }

    btn.disabled = true; btn.textContent = "Registering..."; errorEl.style.display = "none";

    try {
      const res = await post("/api/certs", data);
      if (res.ok && res.data) {
        form.reset();
        successDetail.textContent = `${res.data.holderName} - ${res.data.certificateCode}`;
        successEl.style.display = "block";
        showSuccess("Certificate registered successfully");
      }
    } catch (err) {
      showError(err.error || "Registration failed");
    } finally {
      btn.disabled = false; btn.textContent = "Register Certificate";
    }
  });
});
