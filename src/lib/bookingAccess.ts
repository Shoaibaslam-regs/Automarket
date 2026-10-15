import mongoose from "mongoose";
import { Booking, type IBooking } from "@/models/Booking";
import { Rental } from "@/models/Rental";
import { Deal } from "@/models/Deal";
import { can, getBusinessRentals, getMembership } from "@/lib/business";

type Found =
  | { booking: IBooking; rentalId: mongoose.Types.ObjectId | null; error?: undefined; status?: undefined }
  | { error: string; status: number; booking?: undefined; rentalId?: undefined };

/**
 * Loads a booking the caller manages as the vehicle's side: the owner of a listed rental, or a business member
 * with `manageBookings` for the business's rentals, rent deals and off-list walk-ins.
 * Used by the handover and payment routes.
 */
export async function loadOwnedBooking(userId: string, id: string): Promise<Found> {
  if (!mongoose.Types.ObjectId.isValid(id)) return { error: "Booking not found", status: 404 };
  const booking = await Booking.findById(id);
  if (!booking) return { error: "Booking not found", status: 404 };

  let allowed = false;
  let rentalId: mongoose.Types.ObjectId | null = null;
  if (booking.organizationId && !booking.rentalId && !booking.dealId) {
    // Walk-in for a vehicle the business hasn't listed
    const member = await getMembership(userId);
    allowed = !!member && can(member.role, "manageBookings") && member.organizationId.equals(booking.organizationId);
  } else if (booking.dealId) {
    // Deal bookings belong to the deal's business; its booking managers handle them
    const deal = await Deal.findById(booking.dealId).select("organizationId").lean<{ organizationId: mongoose.Types.ObjectId }>();
    if (!deal) return { error: "This deal no longer exists", status: 404 };
    const member = await getMembership(userId);
    allowed = !!member && can(member.role, "manageBookings") && member.organizationId.equals(deal.organizationId);
  } else {
    const rental = await Rental.findById(booking.rentalId).select("ownerId");
    if (!rental) return { error: "This vehicle no longer exists", status: 404 };
    rentalId = rental._id;
    allowed = String(rental.ownerId) === userId;
    if (!allowed) {
      const member = await getMembership(userId);
      allowed = !!member && can(member.role, "manageBookings") &&
        (await getBusinessRentals(userId)).some(r => r._id.equals(rental._id));
    }
  }
  if (!allowed) return { error: "Forbidden", status: 403 };
  return { booking, rentalId };
}
