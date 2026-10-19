"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, BadgeDollarSign, BellRing, CalendarClock, CalendarPlus, CheckCircle2, KeyRound, ShieldCheck, Undo2, type LucideIcon } from "lucide-react";
import type { TodayItem, TodayKind } from "@/lib/today";

const ICON: Record<TodayKind, LucideIcon> = {
  bookingRequest: CalendarPlus, pickup: KeyRound, return: Undo2, deposit: ShieldCheck,
  saleRequest: BadgeDollarSign, installment: CalendarClock, followUp: BellRing,
};
const SHOWN = 6;

/** Kinds with a real time of day; the rest (pickups, requests, installments) are whole days. */
const TIMED: TodayKind[] = ["return", "followUp", "deposit", "saleRequest"];

const when = (iso: string, kind: TodayKind) => {
  // Date-only values are stored at midnight UTC, so read their day in UTC
  if (!TIMED.includes(kind)) {
    const day = iso.slice(0, 10);
    const today = new Date();
    const local = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    return day === local ? "Today" : new Date(`${day}T12:00:00Z`).toLocaleDateString("en-PK", { day: "numeric", month: "short" });
  }
  const d = new Date(iso);
  const today = new Date();
  const time = d.toLocaleTimeString("en-PK", { hour: "numeric", minute: "2-digit" });
  if (d.toDateString() === today.toDateString()) return time ? `Today ${time}` : "Today";
  return d.toLocaleDateString("en-PK", { day: "numeric", month: "short" });
};

/**
 * Dashboard "Today": every pickup, return, request, deposit, installment and follow-up that needs doing now,
 * overdue first, each with a button to the page that handles it.
 */
export default function TodayCard() {
  const [items, setItems] = useState<TodayItem[] | null>(null);
  const [all, setAll] = useState(false);
  useEffect(() => {
    fetch("/api/business/today").then(r => (r.ok ? r.json() : { items: [] })).then(d => setItems(d.items ?? [])).catch(() => setItems([]));
  }, []);

  const overdue = items?.filter(i => i.overdue).length ?? 0;
  const shown = items ? (all ? items : items.slice(0, SHOWN)) : [];
  const dateLabel = new Date().toLocaleDateString("en-PK", { weekday: "long", day: "numeric", month: "long" });

  return (
    <section className="mb-5 overflow-hidden rounded-xl border border-[var(--gh-e1e4e8)] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--gh-f6f8fa)] px-4 py-3">
        <div>
          <h2 className="text-[15px] font-bold text-[var(--gh-0d1117)]">Today</h2>
          <p className="text-[11px] text-[var(--gh-8c959f)]">{dateLabel}</p>
        </div>
        {items && items.length > 0 && (
          <div className="flex gap-1.5">
            {overdue > 0 && <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--gh-cf222e)]"><AlertTriangle size={11} /> {overdue} overdue</span>}
            <span className="text-[12px] font-semibold text-[var(--gh-57606a)]">{items.length} to do</span>
          </div>
        )}
      </div>

      {items === null ? (
        <div className="space-y-px p-2">{[1, 2, 3].map(i => <div key={i} className="h-12 animate-pulse rounded-lg bg-[var(--gh-f6f8fa)]" />)}</div>
      ) : items.length === 0 ? (
        <p className="flex items-center gap-2 px-4 py-5 text-[13px] text-[var(--gh-57606a)]">
          <CheckCircle2 size={18} className="text-[var(--gh-1a7f37)]" /> All caught up. Nothing needs doing right now.
        </p>
      ) : (
        <>
          <ul className="divide-y divide-[var(--gh-f6f8fa)]">
            {shown.map(i => {
              const Icon = ICON[i.kind];
              return (
                <li key={`${i.kind}-${i.id}`} className="flex items-center gap-3 px-4 py-2.5">
                  <span className={`flex flex-shrink-0 items-center justify-center ${i.overdue ? "text-[var(--gh-cf222e)]" : "text-[var(--gh-57606a)]"}`}><Icon size={15} /></span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-[13px] font-semibold ${i.overdue ? "text-[var(--gh-cf222e)]" : "text-[var(--gh-0d1117)]"}`}>
                      {i.title} <span className="font-normal text-[var(--gh-8c959f)]">· {when(i.at, i.kind)}</span>
                    </p>
                    <p className="truncate text-xs text-[var(--gh-57606a)]">{i.subtitle}</p>
                  </div>
                  <Link href={i.href} className="flex-shrink-0 rounded-lg bg-[var(--gh-0d1117)] px-3 py-1.5 text-xs font-semibold text-white">{i.action}</Link>
                </li>
              );
            })}
          </ul>
          {items.length > SHOWN && (
            <button onClick={() => setAll(v => !v)} className="w-full border-t border-[var(--gh-f6f8fa)] py-2.5 text-xs font-semibold text-[var(--gh-0550ae)]">
              {all ? "Show less" : `Show all ${items.length}`}
            </button>
          )}
        </>
      )}
    </section>
  );
}
