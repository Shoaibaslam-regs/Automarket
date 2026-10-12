// Client-safe theme constants shared by the <head> script, the provider and the switch.

export type ThemeChoice = "light" | "dark" | "system";
export const THEME_STORAGE_KEY = "theme";

/**
 * Runs in <head> before the page paints: applies the saved choice (default: follow the device)
 * so there's no flash of the wrong theme. Kept tiny and dependency-free on purpose.
 */
export const themeInitScript = `(function(){try{var c=localStorage.getItem("${THEME_STORAGE_KEY}");var d=c==="dark"||((c!=="light")&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;
