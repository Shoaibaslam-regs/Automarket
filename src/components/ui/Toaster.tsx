"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, HeartOff, Info } from "lucide-react";
import { TOAST_EVENT, type ToastItem } from "@/lib/toast";

const SHOW_MS = 2600;
const LEAVE_MS = 220;

/**
 * Shows toast() messages at the bottom centre, one at a time (a new one replaces the last), sliding up and
 * fading out. Sits above the listing page's contact bar on phones (--am-bottom-bar).
 */
export default function Toaster() {
  const [item, setItem] = useState<ToastItem | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const show = (e: Event) => {
      setLeaving(false);
      setItem((e as CustomEvent<ToastItem>).detail);
    };
    window.addEventListener(TOAST_EVENT, show);
    return () => window.removeEventListener(TOAST_EVENT, show);
  }, []);

  useEffect(() => {
    if (!item) return;
    const out = setTimeout(() => setLeaving(true), SHOW_MS);
    const gone = setTimeout(() => setItem(null), SHOW_MS + LEAVE_MS);
    return () => { clearTimeout(out); clearTimeout(gone); };
  }, [item]);

  if (!item) return null;
  const Icon = item.tone === "saved" ? Heart : item.tone === "removed" ? HeartOff : Info;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(1.25rem+var(--am-bottom-bar,0px))] z-[1200] flex justify-center px-4">
      <style>{`
        @keyframes amToastIn { from { opacity: 0; transform: translateY(14px) scale(0.96); } to { opacity: 1; transform: none; } }
        @keyframes amToastOut { to { opacity: 0; transform: translateY(10px) scale(0.97); } }
        @keyframes amToastHeart { 0% { transform: scale(0.4); } 55% { transform: scale(1.3); } 100% { transform: scale(1); } }
      `}</style>
      <div
        key={item.id}
        role="status"
        aria-live="polite"
        className="theme-static pointer-events-auto flex items-center gap-2.5 rounded-full bg-slate-900 py-2.5 pl-4 pr-2.5 text-sm font-medium text-white shadow-[0_12px_32px_-8px_rgba(15,23,42,0.55)]"
        style={{ animation: leaving ? `amToastOut ${LEAVE_MS}ms ease-in forwards` : "amToastIn 260ms cubic-bezier(0.2, 0.9, 0.3, 1.2)" }}
      >
        <Icon
          size={16}
          className={item.tone === "saved" ? "text-rose-400" : "text-slate-400"}
          fill={item.tone === "saved" ? "currentColor" : "none"}
          style={item.tone === "saved" ? { animation: "amToastHeart 420ms ease-out" } : undefined}
        />
        <span className="pr-1.5">{item.message}</span>
        {item.action && (
          <Link href={item.action.href} className="rounded-full px-2.5 py-1 text-xs font-semibold text-amber-300 transition hover:bg-white/10">
            {item.action.label}
          </Link>
        )}
      </div>
    </div>
  );
}
