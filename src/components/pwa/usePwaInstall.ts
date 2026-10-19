"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";

/** Chrome's install prompt event (not in the DOM typings). */
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const useStore = create<{ prompt: InstallPromptEvent | null; installed: boolean }>(() => ({ prompt: null, installed: false }));

let listening = false;
/** Catches the browser's install prompt once for the whole page; called by PwaRegister. */
export function listenForInstallPrompt() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    useStore.setState({ prompt: e as InstallPromptEvent });
  });
  window.addEventListener("appinstalled", () => useStore.setState({ prompt: null, installed: true }));
}

/**
 * What the install UI can offer on this device:
 * - `canPrompt`: Android/desktop Chrome or Edge can show the real install dialog (`install()`).
 * - `iosHint`: iPhone/iPad Safari, which has no prompt; show "Share → Add to Home Screen" instead.
 * Both are false once the app runs installed (standalone), so nothing shows inside the app itself.
 */
export function usePwaInstall() {
  const { prompt, installed } = useStore();
  const [env, setEnv] = useState({ standalone: true, ios: false });
  useEffect(() => {
    queueMicrotask(() => {
      const nav = navigator as Navigator & { standalone?: boolean };
      const standalone = window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios|edgios/i.test(navigator.userAgent);
      setEnv({ standalone, ios });
    });
  }, []);

  async function install() {
    if (!prompt) return false;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    useStore.setState({ prompt: null, installed: outcome === "accepted" });
    return outcome === "accepted";
  }

  const show = !env.standalone && !installed;
  return { canPrompt: show && !!prompt, iosHint: show && !prompt && env.ios, install };
}
