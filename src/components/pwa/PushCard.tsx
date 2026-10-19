"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { BellOff, BellRing, Smartphone, Volume2, VolumeX, X } from "lucide-react";
import { usePushNotifications } from "./usePushNotifications";
import { chimeEnabled, playChime, setChimeEnabled } from "@/lib/notifySound";

/**
 * "Phone notifications" card: turns Web Push on or off for this device, sends a test, and explains why when it
 * can't work (iPhone needs the app on the home screen; a blocked permission; the server has no push keys;
 * a browser without push). `compact` is the one-line version for menus.
 */
export default function PushCard({ compact = false }: { compact?: boolean }) {
  const { status, busy, error, enable, disable } = usePushNotifications();
  const [sound, setSound] = useState(true);
  useEffect(() => { queueMicrotask(() => setSound(chimeEnabled())); }, []);
  if (status === "loading") return null;

  if (compact) {
    if (status !== "off") return null;
    return (
      <button onClick={enable} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-[13px] font-semibold text-slate-900 ring-1 ring-inset ring-slate-200 disabled:opacity-60">
        <BellRing size={14} /> {busy ? "Turning on…" : "Turn on phone notifications"}
      </button>
    );
  }

  const on = status === "on";
  return (
    <div className={`rounded-2xl border p-4 ${on ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200/80 bg-white"}`}>
      <div className="flex items-start gap-3">
        <span className={`flex flex-shrink-0 items-center justify-center ${on ? "text-emerald-700" : "text-slate-900"}`}>
          {status === "needs-install" ? <Smartphone size={18} /> : on ? <BellRing size={18} /> : <BellOff size={18} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900">{on ? "Phone notifications are on" : "Get notifications on this phone"}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
            {status === "needs-install" && <>On iPhone, first add AutoMarket to your home screen: tap <strong>Share</strong> then <strong>Add to Home Screen</strong>. Open it from there and turn notifications on.</>}
            {status === "denied" && <>Notifications are blocked for AutoMarket. Allow them in your phone&apos;s settings (Settings → Apps → Chrome → Notifications, and the lock icon next to the address → Permissions), then come back.</>}
            {status === "not-configured" && <>Phone notifications aren&apos;t switched on for this website yet. The site owner needs to add the push keys (NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY) and redeploy.</>}
            {status === "unsupported" && <>This browser can&apos;t show notifications. Open AutoMarket in Chrome (Android) or install it to your home screen.</>}
            {status === "off" && <>Booking requests, buyers, messages and offers pop up on your phone, even when AutoMarket is closed and the screen is off.</>}
            {on && <>You&apos;ll get alerts for messages, bookings, sales and updates on this device, with the AutoMarket chime while the app is open.</>}
          </p>
          {on && (
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
              <strong>Android tip:</strong> if alerts are late or missing when the phone is idle, open Settings → Apps → Chrome → Battery and choose <strong>Unrestricted</strong> (on Xiaomi, Oppo, Vivo and Infinix also allow <strong>Autostart</strong>).
            </p>
          )}
          {error && <p role="alert" className="mt-2 text-xs text-rose-600">{error}</p>}
        </div>
      </div>
      {(status === "off" || on) && (
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          {on ? (
            <>
              {/* The chime plays while the app is open; tapping On also plays it so people hear what it sounds like */}
              <button onClick={() => { const next = !sound; setSound(next); setChimeEnabled(next); if (next) playChime(true); }}
                aria-pressed={sound} className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-white">
                {sound ? <Volume2 size={13} /> : <VolumeX size={13} />} Sound {sound ? "on" : "off"}
              </button>
              <button onClick={disable} disabled={busy} className="rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-white disabled:opacity-60">Turn off</button>
            </>
          ) : (
            <button onClick={enable} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
              <BellRing size={13} /> {busy ? "Turning on…" : "Turn on notifications"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const PROMPT_KEY = "push-prompt-dismissed";

/**
 * One-time card for signed-in people using the installed app (or Chrome on Android) who haven't turned phone
 * notifications on: one tap turns them on. "Later" hides it for 7 days. `className` places it per layout.
 */
export function PushPrompt({ className = "" }: { className?: string }) {
  const { status: auth } = useSession();
  const { status, busy, enable } = usePushNotifications();
  const [show, setShow] = useState(false);
  useEffect(() => {
    let quiet = false;
    try { quiet = Date.now() - Number(localStorage.getItem(PROMPT_KEY) || 0) < 7 * 86400000; } catch {}
    const installed = window.matchMedia("(display-mode: standalone)").matches;
    const android = /android/i.test(navigator.userAgent);
    const t = setTimeout(() => setShow(!quiet && (installed || android)), 4000);
    return () => clearTimeout(t);
  }, []);
  if (auth !== "authenticated" || !show || status !== "off") return null;
  const later = () => { try { localStorage.setItem(PROMPT_KEY, String(Date.now())); } catch {} setShow(false); };
  return (
    <div role="dialog" aria-label="Turn on notifications" className={`fixed inset-x-3 z-[70] mx-auto max-w-md rounded-2xl bg-white p-3.5 shadow-2xl ring-1 ring-slate-200 ${className}`}>
      <div className="flex items-start gap-3">
        <span className="flex flex-shrink-0 items-center justify-center text-slate-900"><BellRing size={18} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900">Don&apos;t miss a customer</p>
          <p className="mt-0.5 text-xs text-slate-500">Get a phone alert for booking requests, buyers and messages, even when AutoMarket is closed.</p>
        </div>
        <button onClick={later} aria-label="Later" className="rounded-full p-1 text-slate-400 hover:bg-slate-100"><X size={16} /></button>
      </div>
      <div className="mt-3 flex gap-2">
        <button onClick={later} className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">Later</button>
        <button onClick={async () => { await enable(); setShow(false); }} disabled={busy} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          <BellRing size={15} /> {busy ? "Turning on…" : "Turn on"}
        </button>
      </div>
    </div>
  );
}
