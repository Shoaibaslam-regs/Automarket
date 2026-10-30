"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, Info, Phone, UserRound } from "lucide-react";
import { normalizePkMobile } from "@/lib/phone";
import { MAX_BOOKING_DAYS, LATE_RULE_TEXT, needsTakenDay, rentalDays, validBookingDates } from "@/lib/bookings";
import AvailabilityCalendar, { useTakenDays } from "@/components/rentals/AvailabilityCalendar";
import { useRateLock } from "@/hooks/useRateLock";
import RequestSent from "@/components/launch/RequestSent";
import { bookingSteps } from "@/lib/requestSteps";

interface Props {
  /** Book a rental listing... */
  rentalId?: string;
  /** ...or a rent deal, whose pickup must fall before the deal ends (`availableTo`) */
  dealId?: string;
  listingId?: string;
  dailyRate: number;
  deposit: number;
  availableFrom: string;
  availableTo?: string;
  /** A pick-up day already chosen (tapped on the listing's or deal's calendar, `?start=`) */
  initialStart?: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Formats a YYYY-MM-DD (or ISO) string without going through the local timezone,
// so server and client render the same text
function fmtDay(value: string) {
  const [y, m, d] = value.split("T")[0].split("-").map(Number);
  if (!y || !m || !d) return value;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** "YYYY-MM-DD" `n` days after another, without time-zone drift. */
function addDays(day: string, n: number) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const QUICK_DAYS = [1, 2, 3, 7];

const dateInputClass =
  "block h-12 w-full min-w-0 appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-base text-slate-900 outline-none transition hover:border-slate-300 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 sm:text-sm";

export default function BookingForm({ rentalId, dealId, dailyRate, deposit, availableFrom, availableTo, initialStart }: Props) {
  const router = useRouter();
  // A day tapped on the calendar arrives picked, with a one-day return to adjust
  const firstDay = initialStart && initialStart >= new Date().toISOString().slice(0, 10) ? initialStart : "";
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(firstDay ? addDays(firstDay, 1) : "");
  const bookLock = useRateLock("bookings");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Set once the request is accepted: the card turns into the "Request sent" panel
  const [sent, setSent] = useState(false);
  // The renter's name and phone come from their profile, so the owner can call them; a missing phone is asked for here
  const [me, setMe] = useState<{ name?: string; phone?: string } | null>(null);
  const [phone, setPhone] = useState("");
  useEffect(() => {
    fetch("/api/profile").then(r => (r.ok ? r.json() : null)).then(d => d?.user && setMe({ name: d.user.name, phone: d.user.phone })).catch(() => {});
  }, []);
  const needsPhone = !!me && !me.phone?.trim();
  // Days already confirmed for someone else (requests don't count); the calendar shows them and they can't be picked
  const { taken, loading: takenLoading } = useTakenDays(dealId ? { dealId } : { rentalId: rentalId ?? "" });
  // Tapping the calendar: first the pick-up day, then the return day
  const [picking, setPicking] = useState<"start" | "end">(firstDay ? "end" : "start");

  function pickStart(v: string) {
    setStartDate(v);
    // Fill in a one-day return, or move it if it's now before the pickup
    if (v && (!endDate || endDate < v)) setEndDate(addDays(v, 1));
  }
  function pickDays(n: number) {
    const start = startDate || minDate;
    setStartDate(start);
    setEndDate(addDays(start, n));
  }

  const today = new Date().toISOString().split("T")[0];
  const minDate = availableFrom > today ? availableFrom.split("T")[0] : today;
  // A rent deal must be picked up by the day it ends; the return can be later
  const lastPickup = dealId && availableTo ? availableTo.split("T")[0] : undefined;

  function pickDay(day: string) {
    setError("");
    if (picking === "start" || !startDate || day < startDate) {
      if (taken.has(day)) { setError("That day is already booked. Choose a free day."); return; }
      if (day < minDate || (lastPickup && day > lastPickup)) return;
      setStartDate(day);
      setEndDate(addDays(day, 1));
      setPicking("end");
      return;
    }
    if (rentalDays(startDate, day) > MAX_BOOKING_DAYS) { setError(`A booking can be at most ${MAX_BOOKING_DAYS} days.`); return; }
    // The return day itself may be booked by someone else: it's free for their pickup
    if (needsTakenDay(startDate, day, taken)) { setError("Your dates run into a booked day. Choose a return day before it."); return; }
    setEndDate(day);
    setPicking("start");
  }
  const clashes = !!startDate && !!endDate && validBookingDates(startDate, endDate) && needsTakenDay(startDate, endDate, taken);

  // A same-day return counts as one day; the return day is free for the next customer
  const days = startDate && endDate && validBookingDates(startDate, endDate) ? rentalDays(startDate, endDate) : 0;

  const totalRent = days > 0 ? days * dailyRate : 0;
  const totalPayable = totalRent + deposit;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate || !endDate) { setError("Please select both dates"); return; }
    if (days <= 0) { setError("The return date can't be before the pickup date"); return; }
    if (clashes) { setError("Some of your dates are already booked. Pick free days on the calendar."); return; }
    if (needsPhone && !normalizePkMobile(phone)) { setError("Enter your mobile number so the owner can call you, e.g. 0300 1234567"); return; }

    setLoading(true);
    setError("");
    if (needsPhone) {
      const saved = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: phone.trim() }) });
      if (!saved.ok) { setLoading(false); setError("Couldn't save your phone number. Please try again."); return; }
      setMe(m => ({ ...m, phone: phone.trim() }));
    }

    const res = await fetch(dealId ? `/api/deals/${dealId}/book` : "/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dealId ? { startDate, endDate } : { rentalId, startDate, endDate }),
    });

    const data = await res.json();
    setLoading(false);
    bookLock.check(res, data);

    if (!res.ok) { setError(data.error); return; }
    router.prefetch("/bookings");
    setSent(true);
  }

  const disabled = loading || sent || days <= 0 || clashes || bookLock.locked;

  if (sent) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white px-4 py-8 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:px-6 sm:py-10">
        <RequestSent
          title="Booking request sent"
          subtitle={`${days} day${days === 1 ? "" : "s"} from ${fmtDay(startDate)}. The owner will confirm your dates soon. Follow each step in My bookings.`}
          track={bookingSteps("PENDING")!}
        >
          <Link href="/bookings" className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
            View my bookings <ArrowRight size={15} />
          </Link>
        </RequestSent>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="border-b border-slate-100 px-4 py-4 sm:px-6 sm:py-5">
        <h2 className="text-base font-semibold text-slate-900">Select your dates</h2>
        <p className="mt-0.5 text-[13px] text-slate-500">
          {dealId ? <>Pick up between {fmtDay(minDate)}{availableTo && <> and {fmtDay(availableTo)}</>}, when the deal ends</> : <>Available from {fmtDay(minDate)}
          {availableTo && <> until {fmtDay(availableTo)}</>}</>}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 px-4 py-5 sm:px-6 sm:py-6">
        {error && (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-[13px] text-rose-700">
            {error}
          </div>
        )}

        {/* Tap the pick-up day, then the return day; booked days are crossed out */}
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {picking === "end" && startDate ? "Now tap your return day" : "Tap your pick-up day"}
          </p>
          <AvailabilityCalendar
            taken={taken}
            loading={takenLoading}
            start={startDate || undefined}
            end={endDate || undefined}
            onPick={pickDay}
            // Before the first bookable day nothing can be picked; after a deal ends only a return day can
            isDisabled={d => d < minDate || (picking === "start" && !!lastPickup && d > lastPickup)}
          />
        </div>

        {clashes && (
          <p role="alert" className="-mt-2 text-xs font-medium text-rose-600">Some of these dates are already booked. Pick free days on the calendar.</p>
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
                onChange={(e) => { pickStart(e.target.value); setPicking("end"); }}
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
                // Online requests are at most MAX_BOOKING_DAYS long (checked again on the server)
                max={startDate ? addDays(startDate, MAX_BOOKING_DAYS) : undefined}
                onChange={(e) => { setEndDate(e.target.value); setPicking("start"); }}
                required
                className={dateInputClass}
              />
            </div>
          </div>
        </div>

        {/* One tap for the usual lengths */}
        <div className="-mt-1 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-500">Quick pick:</span>
          {QUICK_DAYS.map(n => {
            const active = !!startDate && endDate === addDays(startDate, n);
            return (
              <button key={n} type="button" onClick={() => pickDays(n)} aria-pressed={active}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${active ? "bg-slate-900 text-white" : "bg-white text-slate-700 ring-1 ring-inset ring-slate-200 hover:ring-slate-300"}`}>
                {n === 7 ? "1 week" : `${n} day${n > 1 ? "s" : ""}`}
              </button>
            );
          })}
        </div>

        <p className="-mt-2 text-xs text-slate-500">Returning the same day? Choose the same date for both. One day is charged either way, and the vehicle is free again for others from your return date.</p>

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

        {/* Who's booking: from the profile, so there's nothing to type */}
        {me && (
          <div className="rounded-xl border border-slate-200/80 px-3.5 py-3 text-[13px]">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Your details</p>
              <Link href="/profile" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">Edit</Link>
            </div>
            <p className="mt-1.5 flex items-center gap-1.5 text-slate-900"><UserRound size={14} className="text-slate-400" /> {me.name || "Your name"}</p>
            {needsPhone ? (
              <div className="mt-2">
                <label htmlFor="booking-phone" className="mb-1 block text-xs font-semibold text-slate-700">Mobile number (so the owner can call you)</label>
                <input id="booking-phone" type="tel" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0300 1234567"
                  className="block h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-base text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 sm:text-sm" />
                <p className="mt-1 text-[11px] text-slate-400">Saved to your profile for next time.</p>
              </div>
            ) : (
              <p className="mt-1 flex items-center gap-1.5 text-slate-900"><Phone size={14} className="text-slate-400" /> {me.phone}</p>
            )}
          </div>
        )}

        <div className="flex gap-2.5 rounded-xl border border-amber-200/80 bg-amber-50 px-3.5 py-3 text-xs leading-relaxed text-amber-900">
          <Info size={15} strokeWidth={1.75} className="mt-px flex-shrink-0 text-amber-600" />
          <span>
            Your booking request will be sent to the owner for confirmation. Payment is made in person upon pickup.
            <span className="mt-1 block font-semibold">At pickup you&apos;ll be given an exact return time. {LATE_RULE_TEXT}</span>
          </span>
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
          ) : bookLock.locked ? (
            bookLock.text
          ) : (
            days > 0 ? `Request booking · PKR ${totalPayable.toLocaleString()}` : "Request booking"
          )}
        </button>

      </form>
    </div>
  );
}
