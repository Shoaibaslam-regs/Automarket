"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { THEME_STORAGE_KEY, type ThemeChoice } from "@/lib/theme";

type ThemeState = { theme: ThemeChoice; resolved: "light" | "dark"; setTheme: (t: ThemeChoice) => void };

const ThemeContext = createContext<ThemeState>({ theme: "system", resolved: "light", setTheme: () => {} });

const prefersDark = () => typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;

function apply(theme: ThemeChoice): "light" | "dark" {
  const resolved = theme === "dark" || (theme === "system" && prefersDark()) ? "dark" : "light";
  document.documentElement.classList.toggle("dark", resolved === "dark");
  return resolved;
}

/**
 * Light / Dark / System theme. The <head> script has already applied the saved choice before paint;
 * this keeps it in sync afterwards, including when the device setting changes while on System.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeChoice>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  useEffect(() => {
    queueMicrotask(() => {
      let saved: ThemeChoice = "system";
      try {
        const v = localStorage.getItem(THEME_STORAGE_KEY);
        if (v === "light" || v === "dark" || v === "system") saved = v;
      } catch { /* storage blocked: follow the device */ }
      setThemeState(saved);
      setResolved(apply(saved));
    });
  }, []);

  // Follow the device while on System
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setResolved(apply("system"));
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback((t: ThemeChoice) => {
    try { localStorage.setItem(THEME_STORAGE_KEY, t); } catch { /* not remembered */ }
    setThemeState(t);
    setResolved(apply(t));
  }, []);

  return <ThemeContext.Provider value={{ theme, resolved, setTheme }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
