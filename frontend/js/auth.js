const TOKEN_KEY = "acv_auth_token_v1";
const getToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; } };
const setToken = (token) => { try { token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY); } catch (e) {} };
export const isAuthenticated = () => !!getToken();
export const getAuthHeaders = () => { const t = getToken(); return t ? { Authorization: `Bearer ${t}` } : {}; };
export const login = async (username, password, callbacks = {}) => {
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) { if (callbacks.onError) callbacks.onError(data.error || "Login failed"); return { ok: false, error: data.error || "Login failed" }; }
    setToken(data.token);
    if (callbacks.onSuccess) callbacks.onSuccess(data.admin);
    return { ok: true, admin: data.admin };
  } catch (err) { if (callbacks.onError) callbacks.onError(err.message || "Login failed"); return { ok: false, error: err.message || "Login failed" }; }
};
export const logout = async (callbacks = {}) => {
  try { await fetch("/api/auth/logout", { method: "POST", headers: getAuthHeaders() }); } catch (e) {}
  setToken(null);
  if (callbacks.onSuccess) callbacks.onSuccess();
};
export const verifySession = async () => {
  try { const res = await fetch("/api/auth/verify", { headers: getAuthHeaders() }); return res.ok; } catch (e) { return false; }
};
