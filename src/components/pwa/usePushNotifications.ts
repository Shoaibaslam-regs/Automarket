"use client";

import { useCallback, useEffect, useState } from "react";

export type PushStatus = "loading" | "not-configured" | "unsupported" | "needs-install" | "denied" | "off" | "on";

const KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function keyBytes(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

/** The service worker registered by PwaRegister (production builds only). */
async function registration() {
  if (!("serviceWorker" in navigator)) return null;
  return (await navigator.serviceWorker.getRegistration("/")) ?? null;
}

/** Stops push on this device (browser and server). Used by the toggle and when signing out. Never throws. */
export async function unsubscribeThisDevice() {
  try {
    const reg = await registration();
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return;
    await fetch("/api/push/subscribe", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {});
    await sub.unsubscribe();
  } catch {}
}

/**
 * Phone notifications (Web Push) for the signed-in user on this device.
 * iPhone/iPad only allow it once AutoMarket is added to the home screen ("needs-install").
 */
export function usePushNotifications() {
  const [status, setStatus] = useState<PushStatus>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const check = useCallback(async () => {
    const supported = !!KEY && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    const nav = navigator as Navigator & { standalone?: boolean };
    const standalone = window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (ios && !standalone) return setStatus("needs-install");
    // The site was built without the public push key, so no phone can subscribe; say so instead of hiding
    if (!KEY) return setStatus("not-configured");
    if (!supported) return setStatus("unsupported");
    if (Notification.permission === "denied") return setStatus("denied");
    const reg = await registration();
    if (!reg) return setStatus("unsupported");
    const sub = await reg.pushManager.getSubscription();
    setStatus(sub && Notification.permission === "granted" ? "on" : "off");
  }, []);

  useEffect(() => { queueMicrotask(() => { check().catch(() => setStatus("unsupported")); }); }, [check]);

  async function enable() {
    setBusy(true);
    setError("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setStatus(permission === "denied" ? "denied" : "off"); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(KEY) }));
      const res = await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Couldn't turn on notifications");
      setStatus("on");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't turn on notifications");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    await unsubscribeThisDevice();
    setBusy(false);
    setStatus("off");
  }

  return { status, busy, error, enable, disable };
}
