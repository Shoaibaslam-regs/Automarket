import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Purchase } from "@/models/Purchase";
import { User } from "@/models/User";
import { Organization } from "@/models/Organization";
import { getMembership } from "@/lib/business";
import { normalizeCnic } from "@/lib/plates";
import { purchaseNumber } from "@/lib/purchases";
import { ensurePurchaseCustomer, resolveSaleItem } from "@/lib/saleItems";
import { sendChatMessage, triggerPusher } from "@/lib/support";
import { rateLimitResponse } from "@/lib/rateLimit";

/** Most purchase requests one buyer may have open at once. */
const MAX_OPEN_REQUESTS = 10;

/** The signed-in buyer's purchase requests and purchases, newest first. */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const purchases = await Purchase.find({ buyerId: session.user.id }).sort({ createdAt: -1 }).limit(200).lean<Array<{ organizationId: unknown }>>();
    const orgs = await Organization.find({ _id: { $in: purchases.map(p => p.organizationId) } }).select("name slug phone address city").lean<Array<{ _id: unknown }>>();
    const byId = new Map(orgs.map(o => [String(o._id), o]));
    // Opening the list counts as seeing the updates; the response still flags them so the page can highlight them
    await Purchase.updateMany({ buyerId: session.user.id, seenByBuyer: false }, { $set: { seenByBuyer: true } });
    return NextResponse.json({ purchases: purchases.map(p => ({ ...p, business: byId.get(String(p.organizationId)) ?? null })) });
  } catch (error) {
    console.error("Purchases GET error:", error);
    return NextResponse.json({ error: "Failed to load purchases" }, { status: 500 });
  }
}

/**
 * Asks a business to sell a vehicle. Body: { listingId | dealId, phone, cnic?, offerPrice?, message? }.
 * Only vehicles a business is selling qualify, and members can't buy from their own business.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Sign in to send a purchase request" }, { status: 401 });
    const limited = await rateLimitResponse("purchases", session.user.id, "purchase requests");
    if (limited) return limited;
    await connectDB();
    const body = await req.json().catch(() => ({}));

    const found = await resolveSaleItem({ listingId: body.listingId, dealId: body.dealId });
    if ("error" in found) return NextResponse.json({ error: found.error }, { status: 400 });
    const { item } = found;

    const member = await getMembership(session.user.id);
    if (member?.organizationId.equals(item.organizationId)) {
      return NextResponse.json({ error: "You can't buy from your own business. Record walk-in sales from the Sales page." }, { status: 400 });
    }

    const user = await User.findById(session.user.id).select("name email phone").lean<{ name?: string; email: string; phone?: string }>();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const phone = String(body.phone || user.phone || "").trim();
    if (phone.replace(/\D/g, "").length < 10) return NextResponse.json({ error: "Enter a phone number the business can call you on" }, { status: 400 });
    const cnic = body.cnic ? normalizeCnic(body.cnic) : null;
    if (body.cnic && !cnic) return NextResponse.json({ error: "Enter a 13-digit CNIC, e.g. 35202-1234567-1, or leave it empty" }, { status: 400 });
    let offerPrice: number | undefined;
    if (body.offerPrice !== undefined && body.offerPrice !== "" && body.offerPrice !== null) {
      offerPrice = Math.round(Number(body.offerPrice));
      if (!Number.isFinite(offerPrice) || offerPrice < 1) return NextResponse.json({ error: "Enter a valid offer in PKR" }, { status: 400 });
      if (offerPrice >= item.price) offerPrice = undefined; // Offering the asking price is just a request at that price
    }
    const message = typeof body.message === "string" ? body.message.trim().slice(0, 1000) : "";

    const ref = item.listingId ? { listingId: item.listingId } : { dealId: item.dealId };
    const open = { buyerId: session.user.id, status: { $in: ["REQUESTED", "ACCEPTED"] } };
    if (await Purchase.exists({ ...open, ...ref })) {
      return NextResponse.json({ error: "You already have a request for this vehicle. See My purchases." }, { status: 409 });
    }
    if ((await Purchase.countDocuments(open)) >= MAX_OPEN_REQUESTS) {
      return NextResponse.json({ error: `You can have ${MAX_OPEN_REQUESTS} open purchase requests at a time. Cancel one first.` }, { status: 429 });
    }

    const purchase = await Purchase.create({
      organizationId: item.organizationId,
      ...ref,
      vehicle: item.vehicle,
      buyerId: session.user.id,
      buyer: { name: user.name || user.email, phone, email: user.email, cnic: cnic ?? undefined },
      source: "ONLINE",
      askingPrice: item.price,
      offerPrice,
      message: message || undefined,
      status: "REQUESTED",
    });

    try { await ensurePurchaseCustomer(purchase); } catch (e) { console.error("Purchase customer sync failed:", e); }

    // The team member who listed it hears about it in Messages; the owner gets a badge refresh
    try {
      const offer = offerPrice ? ` They offer PKR ${offerPrice.toLocaleString()} (asking PKR ${item.price.toLocaleString()}).` : "";
      await sendChatMessage(
        session.user.id,
        String(item.contactId),
        `Purchase request ${purchaseNumber(String(purchase._id))}: I'd like to buy "${item.vehicle.title}".${offer} Phone: ${phone}.${message ? ` Note: ${message}` : ""} Handle it in Business console → Sales.`,
        user.name
      );
      if (!item.ownerId.equals(item.contactId)) await triggerPusher(`user-${item.ownerId}`, "new-notification", { type: "sale" });
    } catch (e) {
      console.error("Purchase notification failed:", e);
    }

    return NextResponse.json({ purchase }, { status: 201 });
  } catch (error) {
    console.error("Purchases POST error:", error);
    return NextResponse.json({ error: "Failed to send the purchase request" }, { status: 500 });
  }
}
