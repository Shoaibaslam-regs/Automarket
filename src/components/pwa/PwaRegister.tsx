"use client";

import { useEffect } from "react";
import { listenForInstallPrompt } from "./usePwaInstall";
import { playChime } from "@/lib/notifySound";

/**
 * Registers the service worker (public/sw.js) in production builds and starts listening for the browser's
 * install prompt. In development no worker is registered, so the dev server's files are never cached.
 */
export default function PwaRegister() {
  useEffect(() => {
    listenForInstallPrompt();
    // The service worker tells open pages when a push arrives, so they can play the chime
    const onMessage = (e: MessageEvent) => { if (e.data?.type === "push") playChime(); };
    navigator.serviceWorker?.addEventListener("message", onMessage);
    const cleanup = () => navigator.serviceWorker?.removeEventListener("message", onMessage);
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return cleanup;
    const register = () => navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(err => console.warn("Service worker:", err));
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
    return cleanup;
  }, []);
  return null;
}
