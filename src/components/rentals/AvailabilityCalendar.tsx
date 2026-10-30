"use client";

import { useEffect, useState } from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { dayKey } from "@/lib/bookings";

export type CalendarSource = { rentalId: string } | { dealId: string };

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
/** Months ahead the calendar can page to (the server sends taken days for about six months). */
const MONTHS_AHEAD = 5;

/**
 * The days a rental or rent deal is taken (GET /api/rentals/[id]/availability or /api/deals/[id]/availability):
 * confirmed and handed-over bookings only, since a request doesn't block anyone.
 */
export function useTakenDays(source: CalendarSource) {
  const url = "rentalId" in source ? `/api/rentals/${source.rentalId}/availability` : `/api/deals/${source.dealId}/availability`;
  const [state, setState] = useState<{ url: string; taken: Set<string> } | null>(null);
  useEffect(() => {
    const ctrl = new AbortController();
    fetch(url, { signal: ctrl.signal })
      .then(r => (r.ok ? r.json() : { taken: [] }))
      .then(d => setState({ url, taken: new Set<string>(Array.isArray(d.taken) ? d.taken : []) }))
      .catch(() => {});
    return () => ctrl.abort();
  }, [url]);
  const ready = state?.url === url;
  return { taken: ready ? state.taken : new Set<string>(), loading: !ready };
}

/** "YYYY-MM-DD" for day `d` of month `m` (0-based) in year `y`. */
const key = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/**
 * A month grid of free and booked days. Read-only by default; with `onPick` every day the form allows is a
 * button, and `start`/`end` mark the chosen dates (the return day itself is free for the next pickup, so a
 * range is drawn up to and including it).
 */
export default function AvailabilityCalendar({ taken, loading = false, start, end, onPick, isDisabled, footnote = true }: {
  taken: Set<string>;
  loading?: boolean;
  start?: string;
  end?: string;
  onPick?: (day: string) => void;
  /** Days the form won't accept (before the first bookable day, after a deal ends). */
  isDisabled?: (day: string) => boolean;
  footnote?: boolean;
}) {
  // Set after mount, so the server's date never decides which month (and which "today") the page shows
  const [today, setToday] = useState<string | null>(null);
  const [month, setMonth] = useState<{ y: number; m: number } | null>(null);
  useEffect(() => {
    queueMicrotask(() => {
      const t = dayKey(new Date());
      setToday(t);
      const from = start && start > t ? start : t;
      setMonth({ y: Number(from.slice(0, 4)), m: Number(from.slice(5, 7)) - 1 });
    });
    // Only on open: later the visitor pages through months themselves
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!today || !month) return <div className="h-[318px] animate-pulse rounded-xl bg-slate-100" aria-hidden />;

  const now = { y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 };
  const index = (v: { y: number; m: number }) => v.y * 12 + v.m;
  const canBack = index(month) > index(now);
  const canForward = index(month) < index(now) + MONTHS_AHEAD;
  const move = (n: number) => setMonth(v => {
    const i = index(v!) + n;
    return { y: Math.floor(i / 12), m: i % 12 };
  });

  const lead = (new Date(Date.UTC(month.y, month.m, 1)).getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(month.y, month.m + 1, 0)).getUTCDate();
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => key(month.y, month.m, i + 1))];
  const rangeEnd = end && start && end >= start ? end : start;
  const freeThisMonth = cells.filter(d => d && d >= today && !taken.has(d)).length;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={() => move(-1)} disabled={!canBack} aria-label="Previous month"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent">
          <ChevronLeft size={17} />
        </button>
        <p className="text-sm font-semibold text-slate-900" aria-live="polite">{MONTHS[month.m]} {month.y}</p>
        <button type="button" onClick={() => move(1)} disabled={!canForward} aria-label="Next month"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent">
          <ChevronRight size={17} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map(w => <span key={w} className="pb-1 text-[11px] font-semibold text-slate-400">{w}</span>)}
        {cells.map((d, i) => {
          if (!d) return <span key={`e${i}`} />;
          const past = d < today;
          const booked = !past && taken.has(d);
          const off = past || (isDisabled?.(d) ?? false);
          const isEdge = d === start || d === rangeEnd;
          const inRange = !!start && !!rangeEnd && d > start && d < rangeEnd;
          const label = `${Number(d.slice(8))} ${MONTHS[month.m]}${booked ? ", booked" : past ? "" : ", free"}`;
          const look = isEdge
            ? "bg-slate-900 font-semibold text-white"
            : booked
              ? "bg-rose-50 text-rose-400 line-through decoration-rose-300"
              : inRange
                ? "bg-indigo-50 font-medium text-indigo-900"
                : off
                  ? "text-slate-300"
                  : "font-medium text-slate-800";
          const base = `relative flex h-9 items-center justify-center rounded-lg text-[13px] transition sm:h-10 ${look}`;
          const todayDot = d === today && !isEdge && <span aria-hidden className="absolute bottom-1 h-1 w-1 rounded-full bg-indigo-500" />;
          return onPick ? (
            <button key={d} type="button" aria-label={label} aria-pressed={isEdge} disabled={off}
              onClick={() => onPick(d)}
              className={`${base} ${!off && !isEdge ? "hover:ring-1 hover:ring-inset hover:ring-slate-300" : ""} disabled:cursor-not-allowed`}>
              {Number(d.slice(8))}{todayDot}
            </button>
          ) : (
            <span key={d} aria-label={label} className={base}>{Number(d.slice(8))}{todayDot}</span>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm ring-1 ring-inset ring-slate-300" /> Free</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-rose-200" /> Booked</span>
        {onPick && <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-slate-900" /> Your dates</span>}
        {loading ? <span className="ml-auto">Checking dates…</span> : <span className="ml-auto">{freeThisMonth} free day{freeThisMonth !== 1 ? "s" : ""} this month</span>}
      </div>
      {footnote && (
        <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
          Requests don&apos;t block dates. A day shows as booked once the owner confirms a booking for it.
        </p>
      )}
    </div>
  );
}

/**
 * The calendar in its own card, read-only, for listing and deal pages. Closed by default (a Show/Hide row), so it
 * doesn't take up the page; the dates are only fetched once it is opened. `#availability` in the address opens it.
 */
export function AvailabilityCard({ source, title = "Availability" }: { source: CalendarSource; title?: string }) {
  const [open, setOpen] = useState(false);
  // A link ending in #availability (e.g. "See free dates" on a request closed because the dates were taken)
  // opens the calendar straight away
  useEffect(() => {
    if (window.location.hash !== "#availability") return;
    queueMicrotask(() => {
      setOpen(true);
      document.getElementById("availability")?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, []);
  return (
    <div id="availability" className="scroll-mt-24 rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
        className="flex w-full items-center gap-2.5 px-5 py-4 text-left">
        <CalendarDays size={17} className="flex-shrink-0 text-slate-400" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-slate-900">{title}</span>
          <span className="block text-xs text-slate-500">{open ? "Booked days are crossed out" : "See which days are free"}</span>
        </span>
        <span className="flex flex-shrink-0 items-center gap-1 text-xs font-semibold text-indigo-600">
          {open ? "Hide" : "Show"}
          <ChevronDown size={15} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open && (
        <div className="border-t border-slate-100 px-5 pb-5 pt-4">
          <OpenCalendar source={source} />
        </div>
      )}
    </div>
  );
}

/** Mounted only while the card is open, so closed cards make no request. */
function OpenCalendar({ source }: { source: CalendarSource }) {
  const { taken, loading } = useTakenDays(source);
  return <AvailabilityCalendar taken={taken} loading={loading} />;
}
