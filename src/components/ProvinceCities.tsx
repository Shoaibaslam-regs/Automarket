"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, Flame, Landmark, MapPin } from "lucide-react";
import { FEDERAL_CAPITAL, PROVINCES } from "@/lib/provinces";

const cityHref = (city: string) => `/listings?location=${encodeURIComponent(city)}`;

/**
 * Browse by location: one tile per province; clicking a tile drops down its cities,
 * with the provincial capital pinned to the top and highlighted.
 */
export default function ProvinceCities() {
  const [openId, setOpenId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const open = PROVINCES.find(p => p.id === openId) ?? null;

  useEffect(() => {
    if (!openId) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpenId(null);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenId(null); };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [openId]);

  return (
    <div ref={rootRef}>
      <style>{`
        @keyframes pcDrop { from { opacity: 0; transform: translateY(-8px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes pcGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.45), 0 10px 30px -12px rgba(244, 63, 94, 0.45) }
          50% { box-shadow: 0 0 0 6px rgba(245, 158, 11, 0), 0 14px 36px -10px rgba(244, 63, 94, 0.6) }
        }
        @keyframes pcFlame { 0%, 100% { transform: scale(1) rotate(-4deg) } 50% { transform: scale(1.18) rotate(5deg) } }
        @keyframes pcShine { from { transform: translateX(-120%) skewX(-20deg) } to { transform: translateX(320%) skewX(-20deg) } }
        @media (prefers-reduced-motion: reduce) { .pc-anim, .pc-anim * { animation: none !important } }
      `}</style>

      {/* Province tiles */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
        {PROVINCES.map(p => {
          const active = p.id === openId;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setOpenId(active ? null : p.id)}
              aria-expanded={active}
              aria-controls="province-cities"
              className={`group flex items-center gap-2 rounded-xl border px-2.5 py-2.5 sm:gap-3 text-left transition sm:px-4 sm:py-3.5 ${
                active
                  ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/20"
                  : "border-slate-200/80 bg-white text-slate-700 hover:border-slate-900 hover:text-slate-900"
              }`}
            >
              <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-[10px] sm:h-9 sm:w-9 sm:text-[11px] font-bold tracking-wide transition ${
                active ? "bg-white/10 text-white" : "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100"
              }`}>
                {p.short}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold sm:text-sm">
                  {p.mobileName ? <><span className="sm:hidden">{p.mobileName}</span><span className="hidden sm:inline">{p.name}</span></> : p.name}
                </span>
                <span className="block text-[11px] text-slate-400">{p.cities.length + 1} cities</span>
              </span>
              <ChevronDown size={15} className={`flex-shrink-0 transition-transform duration-200 ${active ? "rotate-180 text-white/70" : "text-slate-300 group-hover:text-slate-900"}`} />
            </button>
          );
        })}
      </div>

      {/* Dropdown */}
      {open && (
        <div
          id="province-cities"
          key={open.id}
          className="pc-anim mt-3 animate-[pcDrop_0.22s_ease-out] rounded-2xl border border-slate-200/80 bg-white p-3 shadow-[0_24px_50px_-28px_rgba(15,23,42,0.35)] sm:p-4"
        >
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Cities in {open.name}</p>
            <button type="button" onClick={() => setOpenId(null)} className="text-xs font-semibold text-slate-500 transition hover:text-slate-900">
              Close
            </button>
          </div>

          {/* Capital, pinned on top */}
          <Link
            href={cityHref(open.capital)}
            className="group relative mb-2.5 flex items-center gap-3 overflow-hidden rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 p-[1.5px] animate-[pcGlow_2.2s_ease-in-out_infinite]"
          >
            <span className="relative flex w-full items-center gap-3 overflow-hidden rounded-[10.5px] bg-white px-3.5 py-3 sm:px-4">
              <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-amber-200/50 to-transparent animate-[pcShine_2.8s_ease-in-out_infinite]" />
              <span className="relative flex flex-shrink-0 items-center justify-center text-rose-500">
                <Flame size={17} className="animate-[pcFlame_1.1s_ease-in-out_infinite]" />
              </span>
              <span className="relative min-w-0 flex-1">
                <span className="block truncate text-[15px] font-bold text-slate-900">{open.capital}</span>
                <span className="block text-[11px] text-slate-500">Provincial capital of {open.name}</span>
              </span>
              <ArrowRight size={16} className="relative flex-shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-900" />
            </span>
          </Link>

          {/* Other cities */}
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
            {open.cities.map(city => (
              <Link
                key={city}
                href={cityHref(city)}
                className="group flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <MapPin size={14} className="flex-shrink-0 text-slate-400 transition group-hover:text-indigo-500" />
                <span className="truncate">{city}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Federal capital sits outside the provinces */}
      <Link
        href={cityHref(FEDERAL_CAPITAL)}
        className="group mt-3 flex items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-600 transition hover:border-slate-900 hover:text-slate-900"
      >
        <Landmark size={16} className="flex-shrink-0 text-indigo-500" />
        <span className="flex-1">
          <span className="font-semibold text-slate-900">{FEDERAL_CAPITAL}</span>
          <span className="text-slate-400"> · Federal capital</span>
        </span>
        <ArrowRight size={14} className="flex-shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-900" />
      </Link>
    </div>
  );
}
