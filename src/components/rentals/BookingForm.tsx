"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, Info } from "lucide-react";

interface Props {
  rentalId: string;
  listingId: string;
  dailyRate: number;
  deposit: number;
  availableFrom: string;
  availableTo?: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Formats a YYYY-MM-DD (or ISO) string without going through the local timezone,
// so server and client render the same text
function fmtDay(value: string) {
  const [y, m, d] = value.split("T")[0].split("-").map(Number);
  if (!y || !m || !d) return value;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

const dateInputClass =
  "block h-12 w-full min-w-0 appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-base text-slate-900 outline-none transition hover:border-slate-300 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 sm:text-sm";

export default function BookingForm({ rentalId, dailyRate, deposit, availableFrom, availableTo }: Props) {
  const router = useRouter();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const today = new Date().toISOString().split("T")[0];
  const minDate = availableFrom > today ? availableFrom.split("T")[0] : today;

  const days = startDate && endDate
    ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const totalRent = days > 0 ? days * dailyRate : 0;
  const totalPayable = totalRent + deposit;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate || !endDate) { setError("Please select both dates"); return; }
    if (days <= 0) { setError("End date must be after start date"); return; }

    setLoading(true);
    setError("");

    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rentalId, startDate, endDate }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error); return; }
    router.push("/bookings?success=true");
  }

  const disabled = loading || days <= 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="border-b border-slate-100 px-4 py-4 sm:px-6 sm:py-5">
        <h2 className="text-base font-semibold text-slate-900">Select your dates</h2>
        <p className="mt-0.5 text-[13px] text-slate-500">
          Available from {fmtDay(minDate)}
          {availableTo && <> until {fmtDay(availableTo)}</>}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 px-4 py-5 sm:px-6 sm:py-6">
        {error && (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-[13px] text-rose-700">
            {error}
          </div>
        )}

        {/* Date fields */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <div className="min-w-0">
            <label htmlFor="booking-start" className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Pick-up date
            </label>
            <div className="relative">
              <CalendarDays size={17} strokeWidth={1.75} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="booking-start"
                type="date"
                value={startDate}
                min={minDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className={dateInputClass}
              />
            </div>
          </div>
          <div className="min-w-0">
            <label htmlFor="booking-end" className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Return date
            </label>
            <div className="relative">
              <CalendarDays size={17} strokeWidth={1.75} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="booking-end"
                type="date"
                value={endDate}
                min={startDate || minDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className={dateInputClass}
              />
            </div>
          </div>
        </div>

        {/* Price breakdown */}
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 sm:p-5">
          {days > 0 ? (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <p className="flex min-w-0 flex-wrap items-center gap-1.5 text-[13px] font-medium text-slate-700">
                  {fmtDay(startDate)}
                  <ArrowRight size={13} className="text-slate-400" />
                  {fmtDay(endDate)}
                </p>
                <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white">
                  {days} day{days !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="space-y-2.5 text-[13px]">
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">PKR {dailyRate.toLocaleString()} × {days} day{days !== 1 ? "s" : ""}</span>
                  <span className="font-medium text-slate-900">PKR {totalRent.toLocaleString()}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Security deposit (refundable)</span>
                  <span className="font-medium text-slate-900">PKR {deposit.toLocaleString()}</span>
                </div>
                <div className="flex items-baseline justify-between gap-3 border-t border-slate-200 pt-3">
                  <span className="text-sm font-semibold text-slate-900">Total payable</span>
                  <span className="text-lg font-bold tracking-tight text-slate-900">PKR {totalPayable.toLocaleString()}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p className="text-[13px] text-slate-500">Choose your pick-up and return dates to see the total.</p>
              <p className="flex-shrink-0 text-right text-sm font-semibold text-slate-900">
                PKR {dailyRate.toLocaleString()}
                <span className="font-normal text-slate-400">/day</span>
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2.5 rounded-xl border border-amber-200/80 bg-amber-50 px-3.5 py-3 text-xs leading-relaxed text-amber-900">
          <Info size={15} strokeWidth={1.75} className="mt-px flex-shrink-0 text-amber-600" />
          <span>Your booking request will be sent to the owner for confirmation. Payment is made in person upon pickup.</span>
        </div>

        <button
          type="submit"
          disabled={disabled}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {loading ? (
            <>
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Sending request...
            </>
          ) : (
            "Request booking"
          )}
        </button>

      </form>
    </div>
  );
}
