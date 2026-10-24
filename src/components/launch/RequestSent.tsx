"use client";

import { useId } from "react";
import StepTrack from "@/components/ui/StepTrack";
import type { RequestSteps } from "@/lib/requestSteps";

/**
 * The quiet "sent" moment for requests (a booking or a purchase request), shown in place of the form that sent it:
 * a ring draws itself and a tick draws inside it in the home hero's indigo → sky → emerald, the text rises, and the
 * request's step line (StepTrack) fills its first step to show what happens next. A request still waits for an answer, so it is
 * calmer than the full-screen LaunchOverlay used for publishing. Plain CSS (no Framer Motion), theme-aware, and
 * still with reduced motion.
 */
export default function RequestSent({ title, subtitle, track, children }: {
  title: string;
  subtitle: string;
  /** The request's steps at "just requested" (bookingSteps / purchaseSteps) */
  track: RequestSteps;
  /** The action under it, e.g. a link to My bookings */
  children?: React.ReactNode;
}) {
  const gradient = `rs-${useId().replace(/:/g, "")}`;
  return (
    <div role="status" aria-live="polite" className="rs flex flex-col items-center text-center">
      <svg viewBox="0 0 64 64" className="h-16 w-16" aria-hidden>
        <defs>
          <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="50%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="29" fill="none" stroke={`url(#${gradient})`} strokeWidth="3" opacity="0.18" />
        <circle className="rs-ring" cx="32" cy="32" r="29" fill="none" stroke={`url(#${gradient})`} strokeWidth="3" strokeLinecap="round" transform="rotate(-90 32 32)" />
        <path className="rs-tick" d="M20 33l8 8 16-17" fill="none" stroke={`url(#${gradient})`} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      <p className="rs-rise mt-4 text-lg font-bold tracking-tight text-slate-900" style={{ animationDelay: "0.55s" }}>{title}</p>
      <p className="rs-rise mx-auto mt-1 max-w-[300px] text-sm leading-snug text-slate-500" style={{ animationDelay: "0.65s" }}>{subtitle}</p>

      {/* What happens next: the first step fills, the others wait (the same line then tracks it on My bookings / My purchases) */}
      <div className="rs-rise mt-5 w-full max-w-[340px]" style={{ animationDelay: "0.75s" }}>
        <StepTrack {...track} animate />
      </div>

      {children && <div className="rs-rise mt-5 w-full" style={{ animationDelay: "0.9s" }}>{children}</div>}

      <style>{`
        .rs .rs-ring { stroke-dasharray: 183; stroke-dashoffset: 183; animation: rs-draw 0.6s cubic-bezier(0.65, 0, 0.35, 1) forwards; }
        /* Hidden until it starts drawing: a zero-length dash with round caps still shows a dot */
        .rs .rs-tick { stroke-dasharray: 36; stroke-dashoffset: 36; opacity: 0; animation: rs-tick 0.35s cubic-bezier(0.65, 0, 0.35, 1) 0.45s forwards; }
        .rs .rs-rise { opacity: 0; animation: rs-rise 0.4s ease-out forwards; }
        @keyframes rs-draw { to { stroke-dashoffset: 0; } }
        @keyframes rs-tick { from { opacity: 1; stroke-dashoffset: 36; } to { opacity: 1; stroke-dashoffset: 0; } }
        @keyframes rs-rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) {
          .rs .rs-ring, .rs .rs-tick { animation: none; stroke-dashoffset: 0; opacity: 1; }
          .rs .rs-rise { animation: none; opacity: 1; }
        }
      `}</style>
    </div>
  );
}
