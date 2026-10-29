let container = null;
const ensureContainer = () => {
  if (container) return container;
  container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  return container;
};
const removeToast = (element) => {
  element.style.opacity = "0";
  element.style.transform = "translateX(100%)";
  setTimeout(() => { if (element.parentNode) element.parentNode.removeChild(element); }, 300);
};
export const showToast = (message, type = "info", duration = 4000) => {
  ensureContainer();
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.setAttribute("role", "alert");
  toast.setAttribute("aria-live", "polite");
  const icons = { success: "&#10004;", error: "&#10006;", warning: "&#9888;", info: "&#128206;" };
  toast.innerHTML = `
    <span style="font-size: var(--text-sm);">${icons[type] || icons.info}</span>
    <span style="font-size: var(--text-sm);">${message}</span>
    <button onclick="this.closest('.toast').remove()" style="background:none;border:none;color:inherit;opacity:0.7;margin-left:auto;">&#10006;</button>
  `;
  container.appendChild(toast);
  setTimeout(() => removeToast(toast), duration);
  return toast;
};
export const showSuccess = (msg, d) => showToast(msg, "success", d);
export const showError = (msg, d) => showToast(msg, "error", d);
export const showInfo = (msg, d) => showToast(msg, "info", d);
export const showWarning = (msg, d) => showToast(msg, "warning", d);
