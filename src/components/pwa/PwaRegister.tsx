"use client";

import { useEffect } from "react";
import { listenForInstallPrompt } from "./usePwaInstall";

/**
 * Registers the service worker (public/sw.js) in production builds and starts listening for the browser's
 * install prompt. In development no worker is registered, so the dev server's files are never cached.
 */
export default function PwaRegister() {
  useEffect(() => {
    listenForInstallPrompt();
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const register = () => navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(err => console.warn("Service worker:", err));
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);
  return null;
}
