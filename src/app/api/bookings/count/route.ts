import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Booking } from "@/models/Booking";
import { Rental } from "@/models/Rental";
import { auth } from "@/lib/auth";
import { can, getMembership } from "@/lib/business";
import { getOrgDealIds } from "@/lib/dealBookings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ ownerCount: 0, renterCount: 0, total: 0 });
    }

    await connectDB();

    // Owner: count pending booking requests received
    const myRentals = await Rental.find({ ownerId: session.user.id }).select("_id").lean();
    const rentalIds = myRentals.map((r) => r._id);
    let ownerCount = await Booking.countDocuments({
      rentalId: { $in: rentalIds },
      status: "PENDING",
    });
    // Pending requests on the business's rent deals, for the team members who handle bookings
    const member = await getMembership(session.user.id);
    if (member && can(member.role, "manageBookings")) {
      ownerCount += await Booking.countDocuments({
        $or: [{ dealId: { $in: await getOrgDealIds(member.organizationId) } }, { organizationId: member.organizationId }],
        status: "PENDING",
      });
    }

    // Renter: count bookings that were just confirmed or cancelled (new updates)
    const renterCount = await Booking.countDocuments({
      renterId: session.user.id,
      status: { $in: ["CONFIRMED", "CANCELLED"] },
      seenByRenter: { $ne: true },
    });

    return NextResponse.json({
      ownerCount,
      renterCount,
      total: ownerCount + renterCount,
    });
  } catch {
    return NextResponse.json({ ownerCount: 0, renterCount: 0, total: 0 });
  }
}
