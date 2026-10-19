import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Purchase } from "@/models/Purchase";
import { Listing } from "@/models/Listing";
import { Deal } from "@/models/Deal";
import { can, getMembership, getOrgUserIds } from "@/lib/business";
import { normalizeCnic, normalizePlate } from "@/lib/plates";
import { quotaMonthStart } from "@/lib/plans";
import { dealPrice } from "@/lib/deals";
import { purchaseNumber, salePrice } from "@/lib/purchases";
import { ensurePurchaseCustomer, finishSale, resolveSaleItem } from "@/lib/saleItems";
import { logBusinessAction } from "@/lib/businessLog";
import { recordPaymentChange } from "@/lib/ledger";

type Oid = mongoose.Types.ObjectId;

/** The business's sales records (requests and recorded sales), stats, and the vehicles it can sell. */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const member = await getMembership(session.user.id);
    if (!member) return NextResponse.json({ error: "No organization" }, { status: 404 });
    const orgId = member.organizationId;

    const [sales, memberIds] = await Promise.all([
      Purchase.find({ organizationId: orgId, deletedByBusiness: { $ne: true } }).sort({ createdAt: -1 }).limit(1000)
        .populate("createdBy", "name").populate("handledBy", "name")
        .lean<Array<{ status: string; completedAt?: Date; askingPrice: number; offerPrice?: number; agreedPrice?: number; amountPaid?: number }>>(),
      getOrgUserIds(orgId),
    ]);

    const monthStart = quotaMonthStart();
    const sold = sales.filter(s => s.status === "COMPLETED");
    const soldThisMonth = sold.filter(s => s.completedAt && s.completedAt >= monthStart);
    const stats = {
      requests: sales.filter(s => s.status === "REQUESTED").length,
      accepted: sales.filter(s => s.status === "ACCEPTED").length,
      soldThisMonth: soldThisMonth.length,
      revenueThisMonth: soldThisMonth.reduce((n, s) => n + salePrice(s), 0),
      revenueTotal: sold.reduce((n, s) => n + salePrice(s), 0),
      outstanding: sold.reduce((n, s) => n + Math.max(0, salePrice(s) - (s.amountPaid ?? 0)), 0),
    };

    // Vehicles the team can record a sale for: active for-sale listings and live sale deals
    const now = new Date();
    const [listings, deals] = await Promise.all([
      Listing.find({ sellerId: { $in: memberIds }, status: "ACTIVE", type: { $in: ["SALE", "BOTH"] } })
        .select("title price images make model year").sort({ createdAt: -1 }).limit(200)
        .lean<Array<{ _id: Oid; title: string; price: number; images?: string[] }>>(),
      Deal.find({ organizationId: orgId, dealType: { $ne: "RENT" }, paused: false, disabledByAdmin: false, startsAt: { $lte: now }, endsAt: { $gte: now } })
        .select("title price discountType discountValue images").limit(100)
        .lean<Array<{ _id: Oid; title: string; price: number; discountType: "PERCENT" | "AMOUNT"; discountValue: number; images?: string[] }>>(),
    ]);
    const vehicles = [
      ...listings.map(l => ({ value: `listing:${l._id}`, title: l.title, price: l.price })),
      ...deals.map(d => ({ value: `deal:${d._id}`, title: `${d.title} (deal)`, price: dealPrice(d.price, d) })),
    ];

    return NextResponse.json({ sales, stats, vehicles, canManage: can(member.role, "manageSales"), canManageMoney: can(member.role, "manageMoney") });
  } catch (error) {
    console.error("Business sales GET error:", error);
    return NextResponse.json({ error: "Failed to load sales" }, { status: 500 });
  }
}

/**
 * Records a walk-in sale. Body: { vehicle: "listing:<id>" | "deal:<id>" | "other", offList?: { title }, price,
 * buyer: { name, phone, email?, cnic? }, amountPaid?, sold?: boolean, plateNumber?, notes? }.
 * `sold: true` records it as completed straight away (and tags the listing Sold); otherwise it's an accepted deal in progress.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const member = await getMembership(session.user.id);
    if (!member) return NextResponse.json({ error: "No organization" }, { status: 404 });
    if (!can(member.role, "manageSales")) return NextResponse.json({ error: "Your role can't record sales" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

    const buyerName = text(body.buyer?.name, 80);
    const buyerPhone = text(body.buyer?.phone, 30);
    if (buyerName.length < 2) return NextResponse.json({ error: "Enter the buyer's name" }, { status: 400 });
    if (buyerPhone.replace(/\D/g, "").length < 10) return NextResponse.json({ error: "Enter the buyer's phone number" }, { status: 400 });
    const cnic = body.buyer?.cnic ? normalizeCnic(body.buyer.cnic) : null;
    if (body.buyer?.cnic && !cnic) return NextResponse.json({ error: "Enter a 13-digit CNIC, or leave it empty" }, { status: 400 });

    const price = Math.round(Number(body.price));
    if (!Number.isFinite(price) || price < 1) return NextResponse.json({ error: "Enter the sale price in PKR" }, { status: 400 });
    const amountPaid = body.amountPaid === undefined || body.amountPaid === "" ? 0 : Math.round(Number(body.amountPaid));
    if (!Number.isFinite(amountPaid) || amountPaid < 0 || amountPaid > price) return NextResponse.json({ error: "The amount paid must be between 0 and the sale price" }, { status: 400 });
    const plate = body.plateNumber ? normalizePlate(body.plateNumber) : null;
    if (body.plateNumber && !plate) return NextResponse.json({ error: "Enter a valid number plate, e.g. LEA-1234" }, { status: 400 });

    // The vehicle: one of the business's listings or sale deals, or one it never listed
    const choice = String(body.vehicle ?? "");
    let ref: { listingId?: Oid; dealId?: Oid } = {};
    let vehicle: { title: string; make?: string; model?: string; year?: number; image?: string };
    let askingPrice = price;
    if (choice === "other") {
      const title = text(body.offList?.title, 100);
      if (title.length < 3) return NextResponse.json({ error: "Describe the vehicle, e.g. Honda Civic 2021 white" }, { status: 400 });
      vehicle = { title };
    } else {
      const [kind, id] = choice.split(":");
      const found = await resolveSaleItem(kind === "listing" ? { listingId: id } : kind === "deal" ? { dealId: id } : {});
      if ("error" in found) return NextResponse.json({ error: found.error }, { status: 400 });
      if (!found.item.organizationId.equals(member.organizationId)) return NextResponse.json({ error: "That vehicle isn't your business's" }, { status: 403 });
      ref = found.item.listingId ? { listingId: found.item.listingId } : { dealId: found.item.dealId };
      vehicle = found.item.vehicle;
      askingPrice = found.item.price;
    }

    const sold = body.sold === true;
    const now = new Date();
    const purchase = await Purchase.create({
      organizationId: member.organizationId,
      ...ref,
      vehicle,
      buyer: { name: buyerName, phone: buyerPhone, email: text(body.buyer?.email, 120) || undefined, cnic: cnic ?? undefined },
      source: "WALK_IN",
      askingPrice,
      agreedPrice: price,
      amountPaid,
      plateNumber: plate ?? undefined,
      notes: text(body.notes, 1000) || undefined,
      status: sold ? "COMPLETED" : "ACCEPTED",
      acceptedAt: now,
      completedAt: sold ? now : undefined,
      createdBy: session.user.id,
      handledBy: session.user.id,
    });
    if (sold) await finishSale(purchase);
    try { await ensurePurchaseCustomer(purchase); } catch (e) { console.error("Sale customer sync failed:", e); }

    if (amountPaid > 0) await recordPaymentChange(session.user.id, amountPaid, "SALE_PAYMENT", { purchaseId: purchase._id, listingId: purchase.listingId, vehicleLabel: vehicle.title }, `${purchaseNumber(String(purchase._id))} · ${buyerName}`);
    await logBusinessAction({ userId: session.user.id, organizationId: member.organizationId }, sold ? "sale.complete" : "sale.create",
      { type: "SALE", id: purchase._id, label: vehicle.title }, { details: `Walk-in · ${buyerName}`, amount: price });
    return NextResponse.json({ sale: purchase }, { status: 201 });
  } catch (error) {
    console.error("Business sales POST error:", error);
    return NextResponse.json({ error: "Failed to record the sale" }, { status: 500 });
  }
}
