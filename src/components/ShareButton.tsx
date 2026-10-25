"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Link2, MessageCircle, Share2 } from "lucide-react";

/** The Facebook "f" (lucide no longer ships brand logos). */
function FacebookIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.6 1.6-1.6h1.7V4.4c-.3 0-1.3-.1-2.5-.1-2.5 0-4.1 1.5-4.1 4.2v2.3H7.4V14h2.8v8h3.3z" />
    </svg>
  );
}

type Variant = "pill" | "block" | "dark";

const STYLES: Record<Variant, string> = {
  // Beside Save and Compare on the listing page
  pill: "flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 active:scale-95",
  // A full-width action, like the deal page's buttons
  block: "inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50",
  // On a dark header (dealer page)
  dark: "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-200 ring-1 ring-inset ring-white/15 transition hover:bg-white/10",
};

// The listing button is the last in its row (open leftwards); the deal button sits at the bottom of a card that
// clips overflow (open upwards); the dealer button starts its row (open rightwards)
const MENU_POSITION: Record<Variant, string> = {
  pill: "right-0 top-full mt-2",
  block: "bottom-full left-1/2 mb-2 -translate-x-1/2",
  dark: "left-0 top-full mt-2",
};

/**
 * Shares a page. Phones open their own share sheet (WhatsApp, Messenger, SMS…); computers get a small menu with
 * WhatsApp, Facebook and Copy link. The link carries the page's preview card (opengraph-image), so it shows the
 * photo, title and price wherever it is pasted.
 */
export default function ShareButton({ path, title, label = "Share", variant = "pill", className = "" }: {
  /** The page to share, e.g. "/listings/123" */
  path: string;
  title: string;
  label?: string;
  variant?: Variant;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  // When the browser blocks copying, the link is shown in the menu to copy by hand
  const [manual, setManual] = useState(false);
  const wrap = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const url = () => `${window.location.origin}${path}`;
  const text = `${title} on AutoGO`;

  async function onClick() {
    // Touch devices: the phone's own share sheet; it rejects when the person cancels, which is fine
    if (typeof navigator.share === "function" && window.matchMedia("(pointer: coarse)").matches) {
      try { await navigator.share({ title: text, url: url() }); } catch { /* cancelled */ }
      return;
    }
    setManual(false);
    setOpen(o => !o);
  }

  async function copy() {
    let ok = false;
    try {
      await navigator.clipboard.writeText(url());
      ok = true;
    } catch {
      // Older browsers and some in-app browsers: the textarea copy still works there
      const area = document.createElement("textarea");
      area.value = url();
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      try { ok = document.execCommand("copy"); } catch { ok = false; }
      area.remove();
    }
    if (!ok) { setManual(true); return; }
    setCopied(true);
    setTimeout(() => { setCopied(false); setOpen(false); }, 1200);
  }

  const item = "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50";

  return (
    <span ref={wrap} className={`relative ${variant === "block" ? "block" : "inline-flex"}`}>
      <button type="button" onClick={onClick} aria-haspopup="menu" aria-expanded={open}
        {...(variant === "pill" && { "aria-label": label, title: label })} className={`${STYLES[variant]} ${className}`}>
        <Share2 size={variant === "dark" ? 14 : variant === "pill" ? 19 : 16} strokeWidth={2} />
        {variant !== "pill" && <> {label}</>}
      </button>
      {open && (
        <div role="menu" className={`absolute z-30 w-52 rounded-xl bg-white p-1.5 shadow-[0_16px_40px_-12px_rgba(15,23,42,0.35)] ring-1 ring-slate-200 ${MENU_POSITION[variant]}`}>
          <a role="menuitem" href={`https://wa.me/?text=${encodeURIComponent(`${text}: ${url()}`)}`} target="_blank" rel="noreferrer" onClick={() => setOpen(false)} className={item}>
            <MessageCircle size={16} className="text-emerald-600" /> WhatsApp
          </a>
          <a role="menuitem" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url())}`} target="_blank" rel="noreferrer" onClick={() => setOpen(false)} className={item}>
            <FacebookIcon size={16} className="text-blue-600" /> Facebook
          </a>
          <button role="menuitem" type="button" onClick={copy} className={item}>
            {copied ? <Check size={16} className="text-emerald-600" /> : <Link2 size={16} className="text-slate-500" />} {copied ? "Link copied" : "Copy link"}
          </button>
          {manual && (
            <input readOnly value={url()} aria-label="Link to copy" onFocus={e => e.currentTarget.select()} autoFocus
              className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 outline-none" />
          )}
        </div>
      )}
    </span>
  );
}
