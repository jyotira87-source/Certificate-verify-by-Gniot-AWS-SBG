const STORAGE_KEY = "acv_theme_v1";
const THEME_ATTR = "data-theme";

const getStoredTheme = () => {
  try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
};
const setStoredTheme = (theme) => {
  try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) {}
};
const getSystemTheme = () => {
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  return "dark";
};
const applyTheme = (theme) => {
  const root = document.documentElement;
  if (theme === "light") root.setAttribute(THEME_ATTR, "light");
  else root.removeAttribute(THEME_ATTR);
  setStoredTheme(theme);
};
export const toggleTheme = () => {
  const root = document.documentElement;
  const isLight = root.hasAttribute(THEME_ATTR);
  const newTheme = isLight ? "dark" : "light";
  applyTheme(newTheme);
  return newTheme;
};
export const initTheme = () => {
  const stored = getStoredTheme();
  const theme = stored || getSystemTheme();
  applyTheme(theme);
};
if (typeof window !== "undefined" && window.matchMedia) {
  window.matchMedia("(prefers-color-scheme: light)").addEventListener((e) => {
    if (!getStoredTheme()) applyTheme(e.matches ? "light" : "dark");
  });
}
