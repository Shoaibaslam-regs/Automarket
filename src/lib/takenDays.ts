// The days a rental vehicle or rent deal is taken, for the public availability calendar: only bookings the
// owner confirmed or handed over (holdsDatesQuery), never requests, and only from today on. Dates only, so
// nothing about who booked is shown.

import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Booking } from "@/models/Booking";
import { dayKey, heldDays, holdsDatesQuery } from "@/lib/bookings";

/** How far ahead the calendar shows taken days. */
export const CALENDAR_DAYS_AHEAD = 180;

export async function takenDays(on: { rentalId: string } | { dealId: string }): Promise<string[]> {
  const id = "rentalId" in on ? on.rentalId : on.dealId;
  if (!mongoose.Types.ObjectId.isValid(id)) return [];
  await connectDB();
  const today = dayKey(new Date());
  const until = dayKey(new Date(Date.now() + CALENDAR_DAYS_AHEAD * 86_400_000));
  const bookings = await Booking.find({
    ...("rentalId" in on ? { rentalId: id } : { dealId: id }),
    ...holdsDatesQuery(),
    endDate: { $gte: new Date(`${today}T00:00:00Z`) },
    startDate: { $lte: new Date(`${until}T00:00:00Z`) },
  }).select("startDate endDate").limit(500).lean<{ startDate: Date; endDate: Date }[]>();
  const days = new Set<string>();
  for (const b of bookings) for (const d of heldDays(b.startDate, b.endDate)) if (d >= today && d <= until) days.add(d);
  return [...days].sort();
}
