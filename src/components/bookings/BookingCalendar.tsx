"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type CalendarBooking = {
  _id: string;
  startDate: string;
  endDate: string;
  status: string;
  plateNumber?: string;
  walkIn?: { name: string } | null;
  renterId?: { name?: string } | null;
  offListVehicle?: { title: string } | null;
  dealId?: { _id: string; title: string } | null;
  rentalId?: { _id?: string; listingId?: { title: string } | null } | null;
};

const DAY = 24 * 60 * 60 * 1000;
const COL = 34;

const BAR: Record<string, string> = {
  PENDING: "bg-amber-400 text-amber-950",
  CONFIRMED: "bg-sky-500 text-white",
  ACTIVE: "bg-emerald-500 text-white",
  COMPLETED: "bg-slate-300 text-slate-700",
};

/** "YYYY-MM-DD" of a stored booking date (dates are saved as UTC midnight of the chosen day). */
const isoDay = (d: string) => new Date(d).toISOString().slice(0, 10);
const dayMs = (iso: string) => new Date(`${iso}T00:00:00Z`).getTime();

/** Which row a booking belongs on: its listed vehicle, its deal, or the typed-in off-list vehicle. */
function rowOf(b: CalendarBooking): { key: string; label: string } {
  if (b.dealId) return { key: `deal:${b.dealId._id}`, label: `Deal: ${b.dealId.title}` };
  if (b.rentalId?._id) return { key: `rental:${b.rentalId._id}`, label: b.rentalId.listingId?.title ?? "Vehicle" };
  const t = b.offListVehicle?.title ?? "Vehicle";
  return { key: `off:${t.toLowerCase()}|${b.plateNumber ?? ""}`, label: `${t}${b.plateNumber ? ` · ${b.plateNumber}` : ""}` };
}

/**
 * Month view of the fleet: one row per vehicle (listed rentals, rent deals and off-list vehicles), with a bar for
 * each booking over the days it holds the vehicle (pickup up to, not including, the return day). Gaps are free days.
 */
export default function BookingCalendar({ bookings, vehicles, onOpen }: {
  bookings: CalendarBooking[];
  /** Listed rental vehicles and rent deals, so ones with no bookings still get an (empty) row */
  vehicles: { rentalId: string; title: string }[];
  onOpen: (b: CalendarBooking) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [y, m] = month.split("-").map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const start = Date.UTC(y, m - 1, 1);
  const end = start + days * DAY;
  const shift = (by: number) => setMonth(new Date(Date.UTC(y, m - 1 + by, 1)).toISOString().slice(0, 7));

  const rows = useMemo(() => {
    const map = new Map<string, { label: string; bars: { b: CalendarBooking; from: number; span: number }[] }>();
    // Deal ids already come prefixed with "deal:"
    vehicles.forEach(v => map.set(v.rentalId.startsWith("deal:") ? v.rentalId : `rental:${v.rentalId}`, { label: v.title, bars: [] }));
    for (const b of bookings) {
      if (b.status === "CANCELLED") continue;
      const s = dayMs(isoDay(b.startDate));
      const e = Math.max(dayMs(isoDay(b.endDate)), s + DAY);
      if (e <= start || s >= end) continue;
      const { key, label } = rowOf(b);
      if (!map.has(key)) map.set(key, { label, bars: [] });
      const from = Math.max(0, Math.round((s - start) / DAY));
      const to = Math.min(days, Math.round((e - start) / DAY));
      map.get(key)!.bars.push({ b, from, span: Math.max(1, to - from) });
    }
    return [...map.values()].sort((a, z) => z.bars.length - a.bars.length || a.label.localeCompare(z.label));
  }, [bookings, vehicles, start, end, days]);

  const todayIdx = today.slice(0, 7) === month ? Number(today.slice(8, 10)) - 1 : -1;
  const label = new Date(start + 15 * DAY).toLocaleDateString("en-PK", { month: "long", year: "numeric", timeZone: "UTC" });
  const navBtn = "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--gh-e1e4e8)] bg-white text-[var(--gh-0d1117)]";

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--gh-e1e4e8)] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--gh-e1e4e8)] px-4 py-3">
        <div className="flex items-center gap-2">
          <button onClick={() => shift(-1)} aria-label="Previous month" className={navBtn}><ChevronLeft size={16} /></button>
          <p className="min-w-[130px] text-center text-sm font-bold text-[var(--gh-0d1117)]">{label}</p>
          <button onClick={() => shift(1)} aria-label="Next month" className={navBtn}><ChevronRight size={16} /></button>
          {month !== today.slice(0, 7) && <button onClick={() => setMonth(today.slice(0, 7))} className="text-xs font-semibold text-[var(--gh-0550ae)]">Today</button>}
        </div>
        <div className="flex flex-wrap gap-3 text-[11px] text-[var(--gh-57606a)]">
          {[["Pending", "bg-amber-400"], ["Confirmed", "bg-sky-500"], ["Out now", "bg-emerald-500"], ["Completed", "bg-slate-300"]].map(([l, c]) => (
            <span key={l} className="inline-flex items-center gap-1"><span className={`theme-static h-2.5 w-2.5 rounded-sm ${c}`} /> {l}</span>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="px-6 py-12 text-center text-sm text-[var(--gh-57606a)]">No bookings this month.</p>
      ) : (
        <div className="overflow-x-auto">
          <div style={{ width: 160 + days * COL }} className="text-[11px]">
            {/* Day header */}
            <div className="flex border-b border-[var(--gh-e1e4e8)] bg-[var(--gh-f6f8fa)]">
              <div className="sticky left-0 z-10 w-[160px] flex-shrink-0 border-r border-[var(--gh-e1e4e8)] bg-[var(--gh-f6f8fa)] px-3 py-2 font-semibold text-[var(--gh-57606a)]">Vehicle</div>
              {Array.from({ length: days }, (_, i) => {
                const wd = new Date(start + i * DAY).getUTCDay();
                return (
                  <div key={i} style={{ width: COL }} className={`flex-shrink-0 py-1.5 text-center ${i === todayIdx ? "bg-indigo-600 font-bold text-white" : wd === 0 ? "text-[var(--gh-cf222e)]" : "text-[var(--gh-57606a)]"}`}>
                    <div className="text-[9px] uppercase">{"SMTWTFS"[wd]}</div>
                    <div className="font-semibold">{i + 1}</div>
                  </div>
                );
              })}
            </div>
            {rows.map((r, ri) => (
              <div key={ri} className="flex border-b border-[var(--gh-f6f8fa)] last:border-0">
                <div className="sticky left-0 z-10 w-[160px] flex-shrink-0 truncate border-r border-[var(--gh-e1e4e8)] bg-white px-3 py-2.5 font-semibold text-[var(--gh-0d1117)]" title={r.label}>{r.label}</div>
                <div className="relative flex-shrink-0" style={{ width: days * COL, height: 40 }}>
                  {todayIdx >= 0 && <div className="absolute inset-y-0 bg-indigo-50" style={{ left: todayIdx * COL, width: COL }} />}
                  {r.bars.map(({ b, from, span }) => {
                    const who = b.walkIn?.name ?? b.renterId?.name ?? "";
                    return (
                      <button key={b._id} type="button" onClick={() => onOpen(b)} title={`${who} · ${isoDay(b.startDate)} → ${isoDay(b.endDate)}`}
                        style={{ left: from * COL + 2, width: span * COL - 4 }}
                        className={`theme-static absolute top-1.5 h-7 truncate rounded-md px-1.5 text-left text-[10px] font-bold shadow-sm transition hover:brightness-95 ${BAR[b.status] ?? BAR.COMPLETED}`}>
                        {who}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <p className="border-t border-[var(--gh-e1e4e8)] px-4 py-2 text-[11px] text-[var(--gh-8c959f)]">A booking holds the vehicle from pickup until its return day, so the return day is free for the next pickup. Tap a booking to open it.</p>
    </div>
  );
}
