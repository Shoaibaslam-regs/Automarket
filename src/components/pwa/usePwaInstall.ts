"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";

/** Chrome's install prompt event (not in the DOM typings). */
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

/**
 * Which browser an iPhone or iPad visitor is in, since each puts Share (and so "Add to Home Screen") somewhere
 * else. Chrome, Edge and Firefox can add to the home screen since iOS 16.4; app browsers (Instagram, Facebook)
 * can't, so they're told to open the page in Safari.
 */
export type IosBrowser = "safari" | "chrome" | "edge" | "firefox" | "inapp" | "other";

function iosBrowser(): IosBrowser | null {
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac, so a "Mac" with a touch screen is an iPad
  const ios = /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  if (!ios) return null;
  if (/FBAN|FBAV|FB_IAB|Instagram|Line\/|Snapchat|TikTok|musical_ly|LinkedInApp/i.test(ua)) return "inapp";
  if (/CriOS/i.test(ua)) return "chrome";
  if (/EdgiOS/i.test(ua)) return "edge";
  if (/FxiOS/i.test(ua)) return "firefox";
  if (/Safari/i.test(ua) && /Version\//i.test(ua)) return "safari";
  return "other";
}

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
 * - `iosHint`: iPhone/iPad, which never have a prompt; show "Share → Add to Home Screen" instead, worded for
 *   `iosBrowser` (Safari, Chrome, Edge, Firefox, or an app's own browser that can't install).
 * Both are false once the app runs installed (standalone), so nothing shows inside the app itself.
 */
export function usePwaInstall() {
  const { prompt, installed } = useStore();
  const [env, setEnv] = useState<{ standalone: boolean; ios: IosBrowser | null }>({ standalone: true, ios: null });
  useEffect(() => {
    queueMicrotask(() => {
      const nav = navigator as Navigator & { standalone?: boolean };
      const standalone = window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
      setEnv({ standalone, ios: iosBrowser() });
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
  return { canPrompt: show && !!prompt, iosHint: show && !prompt && !!env.ios, iosBrowser: env.ios, install };
}
