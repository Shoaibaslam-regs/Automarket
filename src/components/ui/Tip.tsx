"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";
import { TIPS, type TipId } from "@/lib/tips";

/**
 * A small ⓘ next to a word that needs explaining. Hover (desktop) or tap (phone) shows a short tip.
 * Pass a key from src/lib/tips.ts as `id`, or your own `text`. The bubble is rendered on <body> (a portal), so
 * dialogs (which use CSS transforms), scrolling containers and cards with overflow hidden can't clip or shift it.
 */
export default function Tip({ id, text, className = "", size = 13 }: { id?: TipId; text?: string; className?: string; size?: number }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; above: boolean } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const body = text ?? (id ? TIPS[id] : "");

  function place() {
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    const width = Math.min(260, window.innerWidth - 24);
    const left = Math.min(Math.max(12, r.left + r.width / 2 - width / 2), window.innerWidth - width - 12);
    const above = r.top > 140;
    setPos({ left, top: above ? r.top - 8 : r.bottom + 8, above });
  }

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => { if (e.type !== "pointerdown" || !btn.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("keydown", esc);
    return () => { window.removeEventListener("pointerdown", close); window.removeEventListener("scroll", close, true); window.removeEventListener("keydown", esc); };
  }, [open]);

  if (!body) return null;
  return (
    <>
      <button
        ref={btn}
        type="button"
        aria-label="What does this mean?"
        aria-expanded={open}
        onClick={e => { e.preventDefault(); e.stopPropagation(); place(); setOpen(o => !o); }}
        onMouseEnter={() => { place(); setOpen(true); }}
        onMouseLeave={() => setOpen(false)}
        className={`inline-flex flex-shrink-0 items-center justify-center rounded-full align-middle text-[var(--gh-8c959f)] transition hover:text-[var(--gh-0550ae)] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${className}`}
      >
        <Info size={size} />
      </button>
      {open && pos && createPortal(
        <span role="tooltip"
          style={{ left: pos.left, top: pos.top, width: Math.min(260, typeof window !== "undefined" ? window.innerWidth - 24 : 260), transform: pos.above ? "translateY(-100%)" : undefined }}
          className="theme-static pointer-events-none fixed z-[2000] rounded-lg bg-slate-900 px-3 py-2 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-white shadow-xl">
          {body}
        </span>,
        document.body
      )}
    </>
  );
}
