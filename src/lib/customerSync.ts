import mongoose from "mongoose";
import { Booking } from "@/models/Booking";
import { Customer } from "@/models/Customer";
import { Listing } from "@/models/Listing";
import { Rental } from "@/models/Rental";
import { User } from "@/models/User";
import { bookingNumber } from "@/lib/bookings";
import { checkPlanLimit } from "@/lib/subscription";

type Oid = mongoose.Types.ObjectId;

/** Digits only, so "+92 300-1234567" and "923001234567" match. */
export const normalizePhone = (p?: string | null) => (p ?? "").replace(/\D/g, "");

/**
 * Makes sure the person behind a booking is in the renting business's customer list,
 * and links the booking to that customer. Matches an existing customer by AutoMarket
 * account first, then by phone; otherwise creates one (within the plan's customer limit).
 * Does nothing if the vehicle's owner isn't part of a business. Safe to call repeatedly.
 */
export async function ensureBookingCustomer(bookingId: Oid | string): Promise<Oid | null> {
  const booking = await Booking.findById(bookingId)
    .select("rentalId renterId walkIn customerId source startDate endDate")
    .lean<{
      _id: Oid; rentalId: Oid; renterId?: Oid; customerId?: Oid; source?: string;
      walkIn?: { name: string; phone: string; email?: string }; startDate: Date; endDate: Date;
    }>();
  if (!booking) return null;
  if (booking.customerId) return booking.customerId;

  const rental = await Rental.findById(booking.rentalId).select("ownerId listingId").lean<{ ownerId: Oid; listingId: Oid }>();
  if (!rental) return null;
  const owner = await User.findById(rental.ownerId).select("organizationId").lean<{ organizationId?: Oid }>();
  const organizationId = owner?.organizationId;
  if (!organizationId) return null;

  // Who booked: an AutoMarket account, or walk-in details
  let person: { name: string; phone: string; email?: string; userId?: Oid };
  if (booking.renterId) {
    const u = await User.findById(booking.renterId).select("name email phone").lean<{ _id: Oid; name?: string; email: string; phone?: string }>();
    if (!u) return null;
    person = { name: u.name || u.email, phone: u.phone || "", email: u.email, userId: u._id };
  } else if (booking.walkIn) {
    person = { name: booking.walkIn.name, phone: booking.walkIn.phone, email: booking.walkIn.email };
  } else {
    return null;
  }

  const phone = normalizePhone(person.phone);
  let customer = person.userId
    ? await Customer.findOne({ organizationId, userId: person.userId }).select("_id")
    : null;
  if (!customer && phone) {
    // Phones are stored as typed, so compare on digits
    const candidates = await Customer.find({ organizationId, phone: { $exists: true } }).select("phone userId").lean<Array<{ _id: Oid; phone: string; userId?: Oid }>>();
    const match = candidates.find(c => normalizePhone(c.phone) === phone);
    if (match) {
      customer = await Customer.findById(match._id).select("_id");
      if (person.userId && !match.userId) await Customer.updateOne({ _id: match._id }, { $set: { userId: person.userId } });
    }
  }
  if (!customer && person.email) {
    customer = await Customer.findOne({ organizationId, email: person.email }).select("_id");
  }

  if (!customer) {
    // Respect the business's plan: the booking still goes through, the lead just isn't added
    const ownerId = String(rental.ownerId);
    if (await checkPlanLimit(ownerId, "customers")) return null;
    const listing = await Listing.findById(rental.listingId).select("_id title").lean<{ _id: Oid; title: string }>();
    const range = `${booking.startDate.toLocaleDateString("en-PK")} – ${booking.endDate.toLocaleDateString("en-PK")}`;
    customer = await Customer.create({
      organizationId,
      name: person.name,
      // The CRM requires a phone; online users without one are flagged so staff can fill it in
      phone: person.phone || "Not provided",
      email: person.email,
      userId: person.userId,
      source: booking.source === "WALK_IN" ? "WALK_IN" : "ONLINE",
      status: "INTERESTED",
      interestedIn: listing?._id,
      notes: `Rental booking ${bookingNumber(String(booking._id))}${listing ? ` for ${listing.title}` : ""} (${range})`,
    });
  }

  await Booking.updateOne({ _id: booking._id }, { $set: { customerId: customer._id } });
  return customer._id as Oid;
}

/**
 * Links every booking on these rentals that has no customer yet. Used to bring older bookings
 * into the customer list; already-linked bookings are skipped, so repeat calls are cheap.
 */
export async function syncBookingCustomers(rentalIds: Oid[]) {
  const unlinked = await Booking.find({ rentalId: { $in: rentalIds }, customerId: { $exists: false }, status: { $ne: "CANCELLED" } })
    .select("_id")
    .sort({ createdAt: 1 })
    .limit(50)
    .lean<Array<{ _id: Oid }>>();
  for (const b of unlinked) {
    try { await ensureBookingCustomer(b._id); } catch (e) { console.error("Customer sync failed for booking", b._id, e); }
  }
}
