"use client";

import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";

/** The car drives across the word in this long, then leaves; the screen hands over after HOLD_MS more. */
const DRIVE_S = 1.35;
const EXIT_S = 0.35;
const HOLD_MS = 650;
const DRIVE_EASE = [0.45, 0, 0.15, 1] as const;

/** A small side-view car facing right: slate body, rose stripe (the logo's red), wheels that spin. */
function Car({ spin }: { spin: boolean }) {
  // Each wheel spins around its own centre (fill-box), so it stays on the car while it turns
  const wheel = (cx: number) => (
    <g className={spin ? "am-wheel" : undefined} style={{ transformBox: "fill-box", transformOrigin: "center" }}>
      <circle cx={cx} cy={20} r={5} fill="#0f172a" />
      <circle cx={cx} cy={20} r={2.2} fill="#e2e8f0" />
      <path d={`M${cx - 3.6} 20h7.2M${cx} 16.4v7.2`} stroke="#0f172a" strokeWidth={1} />
    </g>
  );
  return (
    <svg width={64} height={28} viewBox="0 0 64 28" aria-hidden>
      <path d="M4 19v-4c0-1.3.8-2.2 2-2.5l10-1.5 8-5.5c1.2-.9 2.6-1.5 5-1.5h12c2 0 3.6.7 5 2l6 5 6 1.5c1.8.5 3 1.9 3 3.5v3c0 .6-.4 1-1 1H5c-.6 0-1-.4-1-1z" fill="#0f172a" />
      <path d="M25 7.2 30 5.6h10c1.2 0 2.3.5 3.2 1.2l4.6 4.2H21.3z" fill="#cbd5e1" />
      <path d="M36 5.6V11" stroke="#0f172a" strokeWidth={1.4} />
      <path d="M8 15.2h48" stroke="#e11d48" strokeWidth={1.6} strokeLinecap="round" />
      <rect x={58.5} y={13} width={2.5} height={1.6} rx={0.6} fill="#fbbf24" />
      {wheel(16)}
      {wheel(48)}
    </svg>
  );
}

/**
 * The moving part of the installed app's splash (loaded only while it shows): a car drives in from the left along
 * a road, "AutoMarket-Pak" appears behind it as it goes, then the car leaves and "Buy · Sell · Rent" fades in.
 * Calls onDone when it's time to hand over to the app. With reduced motion it shows the finished state briefly.
 */
export default function SplashAnimation({ onDone }: { onDone: () => void }) {
  const reduce = useReducedMotion();

  useEffect(() => {
    const ms = reduce ? 1400 : (DRIVE_S + EXIT_S) * 1000 + HOLD_MS;
    const t = setTimeout(onDone, ms);
    return () => clearTimeout(t);
  }, [reduce, onDone]);

  const total = DRIVE_S + EXIT_S;
  const driveShare = DRIVE_S / total;

  return (
    <div style={{ marginTop: 26, width: "min(300px, 78vw)", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ position: "relative", width: "100%", height: 74 }}>
        {/* The word, revealed up to the car's nose */}
        <motion.div
          initial={reduce ? false : { clipPath: "inset(0 100% 0 0)" }}
          animate={{ clipPath: "inset(0 0% 0 0)" }}
          transition={{ duration: DRIVE_S, ease: DRIVE_EASE }}
          style={{ position: "absolute", inset: "0 0 auto 0", textAlign: "center", font: "800 30px/1.15 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", letterSpacing: "-0.02em", color: "#0f172a", whiteSpace: "nowrap" }}
        >
          AutoMarket<span style={{ color: "#e11d48" }}>-Pak</span>
        </motion.div>

        {/* The road: a hairline with lane dashes that rush past while the car drives, then settle */}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 6, height: 2, borderRadius: 2, background: "#e2e8f0", overflow: "hidden" }}>
          {!reduce && (
            <motion.div
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ delay: DRIVE_S, duration: 0.4 }}
              className="am-road-dashes"
              style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(90deg, #94a3b8 0 14px, transparent 14px 28px)" }}
            />
          )}
        </div>

        {/* The car: its nose leads the reveal, then it drives off to the right and fades */}
        {!reduce && (
          <motion.div
            initial={{ left: "0%", opacity: 1 }}
            animate={{ left: ["0%", "100%", "122%"], opacity: [1, 1, 0] }}
            transition={{ duration: total, times: [0, driveShare, 1], ease: [DRIVE_EASE, "easeIn"] }}
            // The SVG has 3px below the wheels, so 5px puts the tyres on the road's top edge (bottom 6 + 2px tall)
            style={{ position: "absolute", bottom: 5, x: "-100%", display: "flex", alignItems: "center" }}
          >
            {/* Speed lines behind the car */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, marginRight: 4 }}>
              {[22, 14, 18].map((w, i) => (
                <motion.span
                  key={i}
                  animate={{ opacity: [0, 0.7, 0], x: [6, -4] }}
                  transition={{ duration: 0.45, repeat: Infinity, delay: i * 0.12, ease: "easeOut" }}
                  style={{ display: "block", width: w, height: 2, borderRadius: 2, background: "linear-gradient(90deg, transparent, #94a3b8)" }}
                />
              ))}
            </div>
            <Car spin />
          </motion.div>
        )}
      </div>

      <motion.p
        initial={reduce ? false : { opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: reduce ? 0 : DRIVE_S + 0.1, duration: 0.4 }}
        style={{ margin: "12px 0 0", font: "500 12px system-ui, sans-serif", letterSpacing: "0.18em", textTransform: "uppercase", color: "#94a3b8" }}
      >
        Buy · Sell · Rent
      </motion.p>
      <style>{`
        .am-road-dashes { animation: am-road 0.35s linear infinite; }
        .am-wheel { animation: am-spin 0.35s linear infinite; }
        @keyframes am-spin { to { transform: rotate(360deg); } }
        @keyframes am-road { to { background-position: -28px 0; } }
      `}</style>
    </div>
  );
}
