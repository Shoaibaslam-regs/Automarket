import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Message } from "@/models/Message";
import { Booking } from "@/models/Booking";
import { Rental } from "@/models/Rental";
import { Purchase } from "@/models/Purchase";
import { User } from "@/models/User";
import { Organization } from "@/models/Organization";
import { Announcement } from "@/models/Announcement";
import { can, getMembership } from "@/lib/business";
import { getOrgDealIds } from "@/lib/dealBookings";
import { bookingNumber } from "@/lib/bookings";
import { purchaseNumber, PURCHASE_LABEL, type PurchaseStatus } from "@/lib/purchases";
import { OFFICIAL_NAME } from "@/lib/announcements";
import type { NotificationItem } from "@/lib/notifications";

export const dynamic = "force-dynamic";
type Oid = mongoose.Types.ObjectId;

/**
 * Everything waiting for the signed-in user, newest first: unread messages (one per person), booking requests
 * on their vehicles, updates on bookings and purchases they made, new purchase requests for their business, and
 * unread AutoMarket Official posts. These are the same things the menu badges count, so the bell matches them.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const me = new mongoose.Types.ObjectId(session.user.id);
    const member = await getMembership(session.user.id);
    const items: NotificationItem[] = [];

    // Unread messages, newest per sender
    const unread = await Message.aggregate<{ _id: Oid; content: string; createdAt: Date; n: number }>([
      { $match: { receiverId: me, read: false, deletedFor: { $ne: me } } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: "$senderId", content: { $first: "$content" }, createdAt: { $first: "$createdAt" }, n: { $sum: 1 } } },
      { $sort: { createdAt: -1 } },
      { $limit: 10 },
    ]);
    const senders = new Map((await User.find({ _id: { $in: unread.map(u => u._id) } }).select("name").lean<Array<{ _id: Oid; name?: string }>>()).map(u => [String(u._id), u.name]));
    for (const u of unread) {
      items.push({
        kind: "message", id: String(u._id), title: `${senders.get(String(u._id)) ?? "Someone"} sent you ${u.n > 1 ? `${u.n} messages` : "a message"}`,
        body: u.content.slice(0, 120), at: u.createdAt.toISOString(), href: `/messages?with=${u._id}`,
      });
    }

    // Booking requests on my own rentals, and on the business's deals and walk-ins for booking managers
    const myRentals = await Rental.find({ ownerId: me }).select("_id").lean<Array<{ _id: Oid }>>();
    const ors: Record<string, unknown>[] = [{ rentalId: { $in: myRentals.map(r => r._id) } }];
    const manages = !!member && can(member.role, "manageBookings");
    if (manages) ors.push({ dealId: { $in: await getOrgDealIds(member!.organizationId) } }, { organizationId: member!.organizationId });
    const requests = await Booking.find({ status: "PENDING", $or: ors }).sort({ createdAt: -1 }).limit(15)
      .select("startDate endDate createdAt walkIn renterId offListVehicle dealId rentalId")
      .populate("renterId", "name").populate("dealId", "title")
      .populate({ path: "rentalId", select: "listingId", populate: { path: "listingId", select: "title" } })
      .lean<Array<{ _id: Oid; startDate: Date; createdAt: Date; walkIn?: { name: string }; renterId?: { name?: string } | null; offListVehicle?: { title: string } | null; dealId?: { title: string } | null; rentalId?: { listingId?: { title: string } | null } | null }>>();
    for (const b of requests) {
      const vehicle = b.dealId?.title ?? b.rentalId?.listingId?.title ?? b.offListVehicle?.title ?? "your vehicle";
      items.push({
        kind: "bookingRequest", id: String(b._id), title: `${b.renterId?.name ?? b.walkIn?.name ?? "Someone"} wants to book ${vehicle}`,
        body: `${bookingNumber(String(b._id))} · pickup ${b.startDate.toISOString().slice(0, 10)}`, at: b.createdAt.toISOString(),
        href: member ? `/business/bookings?q=${bookingNumber(String(b._id))}` : "/bookings",
      });
    }

    // My bookings that were confirmed or cancelled since I last looked
    const updates = await Booking.find({ renterId: me, status: { $in: ["CONFIRMED", "CANCELLED"] }, seenByRenter: { $ne: true } })
      .sort({ updatedAt: -1 }).limit(10).select("status updatedAt dealId rentalId")
      .populate("dealId", "title").populate({ path: "rentalId", select: "listingId", populate: { path: "listingId", select: "title" } })
      .lean<Array<{ _id: Oid; status: string; updatedAt: Date; dealId?: { title: string } | null; rentalId?: { listingId?: { title: string } | null } | null }>>();
    for (const b of updates) {
      const vehicle = b.dealId?.title ?? b.rentalId?.listingId?.title ?? "your vehicle";
      items.push({
        kind: "bookingUpdate", id: String(b._id), title: `Your booking for ${vehicle} was ${b.status === "CONFIRMED" ? "confirmed" : "cancelled"}`,
        body: bookingNumber(String(b._id)), at: b.updatedAt.toISOString(), href: "/bookings",
      });
    }

    // Updates on my purchase requests
    const purchases = await Purchase.find({ buyerId: me, seenByBuyer: false }).sort({ updatedAt: -1 }).limit(10).select("status vehicle updatedAt")
      .lean<Array<{ _id: Oid; status: PurchaseStatus; vehicle: { title: string }; updatedAt: Date }>>();
    for (const p of purchases) {
      items.push({
        kind: "purchaseUpdate", id: String(p._id), title: `${p.vehicle.title}: ${PURCHASE_LABEL[p.status].toLowerCase()}`,
        body: purchaseNumber(String(p._id)), at: p.updatedAt.toISOString(), href: "/purchases",
      });
    }

    if (member) {
      // New purchase requests for the business
      if (can(member.role, "manageSales")) {
        const sales = await Purchase.find({ organizationId: member.organizationId, status: "REQUESTED" }).sort({ createdAt: -1 }).limit(10)
          .select("vehicle buyer createdAt").lean<Array<{ _id: Oid; vehicle: { title: string }; buyer: { name: string }; createdAt: Date }>>();
        for (const s of sales) {
          items.push({
            kind: "saleRequest", id: String(s._id), title: `${s.buyer.name} wants to buy ${s.vehicle.title}`,
            body: purchaseNumber(String(s._id)), at: s.createdAt.toISOString(), href: `/business/sales?q=${purchaseNumber(String(s._id))}`,
          });
        }
      }
      // Unread AutoMarket Official posts
      const [org, user] = await Promise.all([
        Organization.findById(member.organizationId).select("followsOfficial followedOfficialAt").lean<{ followsOfficial?: boolean; followedOfficialAt?: Date }>(),
        User.findById(me).select("officialSeenAt").lean<{ officialSeenAt?: Date }>(),
      ]);
      if (org?.followsOfficial) {
        const since = new Date(Math.max(user?.officialSeenAt?.getTime() ?? 0, org.followedOfficialAt?.getTime() ?? 0));
        const posts = await Announcement.find({ createdAt: { $gt: since } }).sort({ createdAt: -1 }).limit(5).select("title body createdAt")
          .lean<Array<{ _id: Oid; title: string; body: string; createdAt: Date }>>();
        for (const a of posts) {
          items.push({ kind: "official", id: String(a._id), title: `${OFFICIAL_NAME}: ${a.title}`, body: a.body.slice(0, 120), at: a.createdAt.toISOString(), href: "/business/updates" });
        }
      }
    }

    items.sort((a, b) => b.at.localeCompare(a.at));
    return NextResponse.json({ items });
  } catch (error) {
    console.error("Notifications GET error:", error);
    return NextResponse.json({ error: "Failed to load notifications" }, { status: 500 });
  }
}
