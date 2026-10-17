import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { can, getInventorySellerIds, getMembership } from "@/lib/business";
import { businessBookingQuery } from "@/lib/dealBookings";
import { Organization } from "@/models/Organization";
import { Employee } from "@/models/Employee";
import { Customer } from "@/models/Customer";
import { Listing } from "@/models/Listing";
import { Booking } from "@/models/Booking";
import { Purchase } from "@/models/Purchase";

/** The new-business setup checklist: which first steps are done. Only the owner and managers see it. */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const member = await getMembership(session.user.id);
    if (!member) return NextResponse.json({ error: "No organization" }, { status: 404 });
    if (!can(member.role, "manageTeam")) return NextResponse.json({ show: false });

    const orgId = member.organizationId;
    const [org, sellerIds, { query }] = await Promise.all([
      Organization.findById(orgId).select("logo phone address followsOfficial").lean<{ logo?: string; phone?: string; address?: string; followsOfficial?: boolean }>(),
      getInventorySellerIds(session.user.id),
      businessBookingQuery(session.user.id, orgId),
    ]);
    const [vehicles, team, customers, bookings, sales] = await Promise.all([
      Listing.exists({ sellerId: { $in: sellerIds } }),
      Employee.countDocuments({ organizationId: orgId }),
      Customer.exists({ organizationId: orgId }),
      Booking.exists(query),
      Purchase.exists({ organizationId: orgId }),
    ]);
    const steps = {
      logo: !!org?.logo,
      contact: !!org?.phone?.trim() && !!org?.address?.trim(),
      vehicle: !!vehicles,
      team: team > 1,
      customer: !!customers,
      firstDeal: !!bookings || !!sales,
      official: !!org?.followsOfficial,
    };
    return NextResponse.json({ show: true, orgId: String(orgId), steps });
  } catch (error) {
    console.error("Business checklist GET error:", error);
    return NextResponse.json({ error: "Failed to load the checklist" }, { status: 500 });
  }
}
