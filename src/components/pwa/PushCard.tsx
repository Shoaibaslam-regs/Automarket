"use client";

import { BellOff, BellRing, Smartphone } from "lucide-react";
import { usePushNotifications } from "./usePushNotifications";

/**
 * "Phone notifications" card: turns Web Push on or off for this device and explains why when it can't
 * (iPhone needs the app on the home screen first; a blocked permission has to be allowed in settings).
 * `compact` is the one-line version for menus.
 */
export default function PushCard({ compact = false }: { compact?: boolean }) {
  const { status, busy, error, enable, disable } = usePushNotifications();
  if (status === "loading" || status === "unsupported") return null;

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
        <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${on ? "bg-emerald-100 text-emerald-700" : "bg-slate-900 text-white"}`}>
          {status === "needs-install" ? <Smartphone size={18} /> : on ? <BellRing size={18} /> : <BellOff size={18} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900">{on ? "Phone notifications are on" : "Get notifications on this phone"}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
            {status === "needs-install" && <>On iPhone, first add AutoMarket to your home screen: tap <strong>Share</strong> then <strong>Add to Home Screen</strong>. Open it from there and turn notifications on.</>}
            {status === "denied" && <>Notifications are blocked for AutoMarket. Allow them in your phone&apos;s settings (Settings → Notifications, or the lock icon next to the address), then come back.</>}
            {status === "off" && <>Messages, booking requests, sale updates and offers pop up on your phone, even when AutoMarket is closed.</>}
            {on && <>You&apos;ll get alerts for messages, bookings, sales and updates on this device.</>}
          </p>
          {error && <p role="alert" className="mt-2 text-xs text-rose-600">{error}</p>}
        </div>
      </div>
      {(status === "off" || on) && (
        <div className="mt-3 flex justify-end">
          {on ? (
            <button onClick={disable} disabled={busy} className="rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-white disabled:opacity-60">{busy ? "Turning off…" : "Turn off"}</button>
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
