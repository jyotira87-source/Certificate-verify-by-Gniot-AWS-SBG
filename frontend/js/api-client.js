import { API_BASE, API_TIMEOUT } from "./config.js";
import { getAuthHeaders } from "./auth.js";

const apiRequest = async (path, options = {}) => {
  const url = `${API_BASE}${path}`;
  const headers = { "Content-Type": "application/json", ...getAuthHeaders(), ...options.headers };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);
  try {
    const res = await fetch(url, { ...options, headers, signal: controller.signal });
    clearTimeout(timeout);
    const ct = res.headers.get("content-type") || "";
    let data = null;
    if (ct.includes("application/json")) data = await res.json();
    else data = await res.text();
    if (!res.ok) throw { status: res.status, error: (data && data.error) || `Request failed with status ${res.status}`, data };
    return { ok: true, status: res.status, data };
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === "AbortError") throw { status: 408, error: "Request timeout" };
    throw err;
  }
};
export const get = (path, options = {}) => apiRequest(path, { ...options, method: "GET" });
export const post = (path, body, options = {}) => apiRequest(path, { ...options, method: "POST", body: JSON.stringify(body) });
export const put = (path, body, options = {}) => apiRequest(path, { ...options, method: "PUT", body: JSON.stringify(body) });
export const del = (path, options = {}) => apiRequest(path, { ...options, method: "DELETE" });
