"use client";

import { useEffect, useRef, useState } from "react";
import { BadgeDollarSign, Building2, Car, KeyRound, MapPin, Tag, Users, type LucideIcon } from "lucide-react";
import type { PublicStats } from "@/lib/publicStats";
import { compactCount } from "@/lib/format";

const TILES: { key: keyof Omit<PublicStats, "at">; label: string; icon: LucideIcon }[] = [
  { key: "listings", label: "Active listings", icon: Car },
  { key: "forSale", label: "For sale", icon: BadgeDollarSign },
  { key: "forRent", label: "For rent", icon: KeyRound },
  { key: "businesses", label: "Businesses", icon: Building2 },
  { key: "users", label: "Registered users", icon: Users },
  { key: "deals", label: "Live deals", icon: Tag },
  { key: "cities", label: "Cities", icon: MapPin },
];
const POLL_MS = 60_000;

/** A number that counts up to its new value when it changes, shown short from a thousand (1.2K, 2.5M; compactCount). */
function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = from.current;
    if (start === value) return;
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / 700);
      setShown(Math.round(start + (value - start) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
      else from.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  // The exact number stays available on hover and to screen readers
  const exact = value.toLocaleString("en-PK");
  return (
    <span title={exact} aria-label={exact}>
      {compactCount(shown)}
    </span>
  );
}

/**
 * "AutoGO today" (shown once an admin switches it on, src/lib/siteFlags.ts): real counts from the database, refreshed every minute while the page is open
 * (and whenever the tab comes back into view), counting up when a number changes.
 */
export default function LiveStats({ initial }: { initial: PublicStats }) {
  const [stats, setStats] = useState(initial);
  useEffect(() => {
    const load = () => {
      if (document.visibilityState !== "visible") return;
      fetch("/api/stats").then(r => (r.ok ? r.json() : null)).then(d => d && setStats(d)).catch(() => {});
    };
    const t = setInterval(load, POLL_MS);
    document.addEventListener("visibilitychange", load);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", load); };
  }, []);

  return (
    // A plain dark panel like the closing call to action (bg-slate-950 keeps it dark in both themes)
    <section aria-label="AutoGO today" className="relative overflow-hidden rounded-3xl bg-slate-950 px-5 py-7 sm:px-10 sm:py-10">
      <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-white/10" />

      <div className="relative flex flex-col items-center text-center">
        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">AutoGO today</h2>
        <p className="mt-1.5 text-xs text-slate-400"><span className="sm:hidden"></span>Daily updates</p>
      </div>

      {/* Phones: one swipeable row; bigger screens: centred rows (4, then 7 a row). Short dividers between numbers:
          none before the first of each row (items 1 and 5 on tablets, only the first on wide screens). */}
      <div className="relative -mx-5 mt-8 flex snap-x scroll-px-5 overflow-x-auto px-5 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:justify-center sm:gap-y-8 sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
        {TILES.map(({ key, label, icon: Icon }) => (
          <div key={key} className="relative flex w-[118px] flex-shrink-0 snap-start flex-col items-center text-center before:absolute before:left-0 before:top-1/2 before:h-10 before:w-px before:-translate-y-1/2 before:bg-white/15 first:before:hidden sm:w-1/4 sm:[&:nth-child(5)]:before:hidden lg:w-[14.2857%] lg:[&:nth-child(5)]:before:block">
            <Icon size={16} strokeWidth={1.75} className="text-indigo-300" />
            <p className="mt-3 text-white text-3xl font-extrabold tabular-nums tracking-tight text-transparent sm:text-[34px]">
              <CountUp value={stats[key]} />
            </p>
            <p className="mt-1 text-xs font-medium text-slate-400">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
