"use client";

import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import CarIllustration from "./CarIllustration";

/** The car arrives, the tick pops with confetti and the text rises, then the car drives off and it hands over. */
const ARRIVE_S = 0.8;
const LEAVE_AT_S = 2.0;
const DONE_MS = 2700;
const REDUCED_MS = 1500;

// Brand colours: indigo, fuchsia, amber (and the logo's red)
const CONFETTI = ["#6366f1", "#d946ef", "#f59e0b", "#e11d48", "#818cf8", "#f0abfc"];

/**
 * The launch moment after publishing a vehicle or a deal, or creating a business: the AutoMarket car (as in the
 * app splash) drives onto a road, a gradient tick pops with a burst of confetti, the title and subtitle rise, and
 * the car drives off. Tapping anywhere skips it. Loaded with next/dynamic by LaunchOverlay, so Framer Motion is
 * only downloaded when it plays. With reduced motion it shows the finished card briefly.
 */
export default function LaunchAnimation({ title, subtitle, onDone }: { title: string; subtitle: string; onDone: () => void }) {
  const reduce = useReducedMotion();

  useEffect(() => {
    const t = setTimeout(onDone, reduce ? REDUCED_MS : DONE_MS);
    return () => clearTimeout(t);
  }, [reduce, onDone]);

  const pop = { delay: reduce ? 0 : ARRIVE_S + 0.05, type: "spring" as const, stiffness: 420, damping: 16 };

  return (
    <motion.div
      role="status"
      aria-live="polite"
      onClick={onDone}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[1300] flex cursor-pointer items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 18, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.2, 0.9, 0.3, 1.1] }}
        // Fixed light look in both themes, like the splash (the car's colours are fixed)
        className="theme-static relative w-[min(340px,100%)] overflow-hidden rounded-3xl bg-white px-6 pb-5 pt-8 text-center shadow-[0_30px_80px_-20px_rgba(15,23,42,0.55)]"
      >
        {/* Soft brand glow behind the tick */}
        <div aria-hidden className="pointer-events-none absolute -top-16 left-1/2 h-40 w-56 -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-300/40 via-fuchsia-300/40 to-amber-200/40 blur-3xl" />

        {/* Tick with a confetti burst */}
        <div className="relative mx-auto h-16 w-16">
          {!reduce && CONFETTI.flatMap((color, c) => [0, 1, 2].map(k => {
            const i = c * 3 + k;
            const angle = (i / 18) * Math.PI * 2 + (k * 0.35);
            const dist = 58 + (i % 4) * 14;
            return (
              <motion.span
                key={i}
                aria-hidden
                initial={{ x: 0, y: 0, opacity: 0, scale: 0.4, rotate: 0 }}
                animate={{ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist + 10, opacity: [0, 1, 1, 0], scale: 1, rotate: 160 + i * 25 }}
                transition={{ delay: ARRIVE_S + 0.08, duration: 1.1, ease: "easeOut", times: [0, 0.15, 0.7, 1] }}
                className="absolute left-1/2 top-1/2 -ml-1 -mt-1 block"
                style={{ width: i % 2 ? 6 : 8, height: i % 2 ? 6 : 4, borderRadius: i % 3 === 0 ? 999 : 1.5, background: color }}
              />
            );
          }))}
          <motion.div
            initial={reduce ? false : { scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={pop}
            className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-amber-400 text-white shadow-[0_10px_30px_-6px_rgba(139,92,246,0.7)]"
          >
            <Check size={30} strokeWidth={3} />
          </motion.div>
          {/* One ring ripples out as it lands */}
          {!reduce && (
            <motion.span
              aria-hidden
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1.9, opacity: [0, 0.5, 0] }}
              transition={{ delay: ARRIVE_S + 0.05, duration: 0.8, ease: "easeOut" }}
              className="absolute inset-0 rounded-full ring-2 ring-fuchsia-400"
            />
          )}
        </div>

        <motion.p
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduce ? 0 : ARRIVE_S + 0.2, duration: 0.35 }}
          className="relative mt-5 text-xl font-bold tracking-tight text-slate-900"
        >
          {title}
        </motion.p>
        <motion.p
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduce ? 0 : ARRIVE_S + 0.32, duration: 0.35 }}
          className="relative mx-auto mt-1 max-w-[260px] text-sm leading-snug text-slate-500"
        >
          {subtitle}
        </motion.p>

        {/* The road: the car drives in, waits while the tick pops, then drives off */}
        <div className="relative mt-6 h-12">
          <div className="absolute inset-x-0 bottom-2 h-0.5 overflow-hidden rounded bg-slate-200">
            {!reduce && <div className="absolute inset-0" style={{ backgroundImage: "repeating-linear-gradient(90deg, #94a3b8 0 12px, transparent 12px 24px)", animation: "am-launch-road 0.35s linear infinite" }} />}
          </div>
          <motion.div
            className="absolute bottom-[7px]"
            style={{ x: "-50%" }}
            initial={reduce ? false : { left: "-25%" }}
            animate={reduce ? { left: "50%" } : { left: ["-25%", "50%", "50%", "130%"] }}
            transition={{ duration: LEAVE_AT_S + 0.55, times: [0, ARRIVE_S / (LEAVE_AT_S + 0.55), LEAVE_AT_S / (LEAVE_AT_S + 0.55), 1], ease: ["easeOut", "linear", "easeIn"] }}
          >
            <CarIllustration spin={!reduce} width={72} />
          </motion.div>
        </div>
        <p className="relative mt-1 text-[11px] text-slate-400">Tap to continue</p>
        <style>{`@keyframes am-launch-road { to { background-position: -24px 0; } }`}</style>
      </motion.div>
    </motion.div>
  );
}
