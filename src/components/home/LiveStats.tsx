"use client";

import { useEffect, useRef, useState } from "react";
import { BadgeDollarSign, Building2, Car, KeyRound, MapPin, Tag, Users, type LucideIcon } from "lucide-react";
import type { PublicStats } from "@/lib/publicStats";

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

/** A number that counts up to its new value when it changes. */
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
  return <>{shown.toLocaleString()}</>;
}

/**
 * "Live on AutoMarket": real counts from the database, refreshed every minute while the page is open
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
    <section aria-label="Live on AutoMarket">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          Live on AutoMarket
        </h2>
        <p className="text-xs text-slate-400"><span className="sm:hidden">Swipe for more · </span>Updates every minute</p>
      </div>
      {/* Phones: one swipeable row so the cars below stay close; bigger screens: a grid */}
      <div className="-mx-4 flex snap-x scroll-px-4 gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-4 sm:gap-3 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-7 [&::-webkit-scrollbar]:hidden">
        {TILES.map(({ key, label, icon: Icon }) => (
          <div key={key} className="w-[132px] flex-shrink-0 snap-start rounded-2xl border border-slate-200/80 bg-white p-3 sm:w-auto sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-medium text-slate-500">{label}</p>
              <Icon size={15} className="flex-shrink-0 text-indigo-500" />
            </div>
            <p className="mt-1.5 text-xl font-extrabold tabular-nums tracking-tight text-slate-900 sm:text-2xl"><CountUp value={stats[key]} /></p>
          </div>
        ))}
      </div>
    </section>
  );
}
