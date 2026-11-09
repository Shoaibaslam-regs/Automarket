// Client-safe theme constants shared by the <head> script, the provider and the switch.

export type ThemeChoice = "light" | "dark" | "system";
export const THEME_STORAGE_KEY = "theme";

/**
 * The phone's status bar and the installed app's title bar (<meta name="theme-color">): the navbar's own colour,
 * white in light mode and the dark theme's card grey in dark mode (it used to be the old navy #0f172a in both).
 */
export const THEME_BAR = { light: "#ffffff", dark: "#242526" } as const;

/**
 * Runs in <head> before the page paints: applies the saved choice (default: follow the device)
 * so there's no flash of the wrong theme, and gives the status bar the same theme (the theme-color metas carry
 * media queries for the device setting, which a Light or Dark choice in the app overrides). Kept tiny and
 * dependency-free on purpose.
 */
export const themeInitScript = `(function(){try{var c=localStorage.getItem("${THEME_STORAGE_KEY}");var d=c==="dark"||((c!=="light")&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){m.setAttribute("content",d?"${THEME_BAR.dark}":"${THEME_BAR.light}")});}catch(e){}})();`;

/** Points every theme-color meta at the resolved theme (ThemeProvider calls it on every change). */
export function setThemeBar(resolved: "light" | "dark") {
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.setAttribute("content", THEME_BAR[resolved]));
}
