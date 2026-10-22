"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Download, Share, SquarePlus, X } from "lucide-react";
import { usePwaInstall } from "./usePwaInstall";

const KEY = "pwa-install-dismissed";
const QUIET_DAYS = 14;

/**
 * A small card on phones offering to install AutoMarket: the real install button on Android, or the
 * "Share → Add to Home Screen" steps on iPhone. It appears a few seconds after the page opens, and "Not now"
 * hides it for two weeks (kept per browser).
 */
export default function InstallBanner() {
  const { canPrompt, iosHint, install } = usePwaInstall();
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    let quiet = false;
    try { quiet = Date.now() - Number(localStorage.getItem(KEY) || 0) < QUIET_DAYS * 86400000; } catch {}
    queueMicrotask(() => setDismissed(quiet));
    const t = setTimeout(() => setReady(true), 6000);
    return () => clearTimeout(t);
  }, []);

  if (!ready || dismissed || (!canPrompt && !iosHint)) return null;

  function close() {
    try { localStorage.setItem(KEY, String(Date.now())); } catch {}
    setDismissed(true);
  }

  return (
    <div role="dialog" aria-label="Install the AutoMarket app"
      className="fixed inset-x-3 bottom-[calc(0.75rem+var(--am-bottom-bar,0px))] z-[60] mx-auto max-w-md rounded-2xl bg-white p-3.5 shadow-2xl ring-1 ring-slate-200 sm:hidden">
      <div className="flex items-start gap-3">
        <Image src="/icons/icon-192.png" alt="" width={44} height={44} className="rounded-xl ring-1 ring-slate-200" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900">Get the AutoMarket app</p>
          {canPrompt ? (
            <p className="mt-0.5 text-xs text-slate-500">Opens full screen from your home screen. Free, no Play Store, takes a second.</p>
          ) : (
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              Tap <Share size={12} className="inline align-[-2px]" /> <strong>Share</strong> below, then <SquarePlus size={12} className="inline align-[-2px]" /> <strong>Add to Home Screen</strong>.
            </p>
          )}
        </div>
        <button onClick={close} aria-label="Not now" className="rounded-full p-1 text-slate-400 hover:bg-slate-100"><X size={16} /></button>
      </div>
      {canPrompt && (
        <div className="mt-3 flex gap-2">
          <button onClick={close} className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">Not now</button>
          <button onClick={async () => { await install(); close(); }} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white">
            <Download size={15} /> Install
          </button>
        </div>
      )}
    </div>
  );
}

/** "Install app" row for menus; shows the iPhone steps inline when there's no install prompt. */
export function InstallAppRow({ onDone }: { onDone?: () => void }) {
  const { canPrompt, iosHint, install } = usePwaInstall();
  const [showSteps, setShowSteps] = useState(false);
  if (!canPrompt && !iosHint) return null;
  return (
    <div>
      <button onClick={async () => { if (canPrompt) { if (await install()) onDone?.(); } else setShowSteps(s => !s); }}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 py-2 text-[13px] font-semibold text-white">
        <Download size={14} /> Install AutoMarket app
      </button>
      {showSteps && (
        <p className="mt-1.5 px-1 text-[11px] leading-relaxed text-slate-500">
          Tap <Share size={11} className="inline align-[-1px]" /> <strong>Share</strong> in Safari, then <strong>Add to Home Screen</strong>.
        </p>
      )}
    </div>
  );
}
