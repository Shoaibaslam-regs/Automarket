import mongoose from "mongoose";
import { Listing } from "@/models/Listing";
import { Deal } from "@/models/Deal";
import { Organization } from "@/models/Organization";
import { User } from "@/models/User";
import { Customer } from "@/models/Customer";
import { Purchase, type IPurchase } from "@/models/Purchase";
import { dealPrice, dealState } from "@/lib/deals";
import { normalizePhone } from "@/lib/customerSync";
import { checkPlanLimit } from "@/lib/subscription";
import { invalidateDeal, invalidateListingAndSeller } from "@/lib/pageCache";
import { purchaseNumber } from "@/lib/purchases";

type Oid = mongoose.Types.ObjectId;

export type SaleItem = {
  organizationId: Oid;
  /** Business owner, whose plan limits apply */
  ownerId: Oid;
  /** Team member who listed it (the listing's seller, or the deal's creator), told about requests */
  contactId: Oid;
  listingId?: Oid;
  dealId?: Oid;
  vehicle: { title: string; make?: string; model?: string; year?: number; image?: string };
  price: number;
};

/**
 * Finds a vehicle a business is selling right now: an ACTIVE for-sale listing by a business member,
 * or a live SALE deal. Returns an error message when it can't be bought.
 */
export async function resolveSaleItem(ref: { listingId?: unknown; dealId?: unknown }): Promise<{ item: SaleItem } | { error: string }> {
  if (ref.listingId) {
    if (!mongoose.Types.ObjectId.isValid(String(ref.listingId))) return { error: "Vehicle not found" };
    const l = await Listing.findById(ref.listingId)
      .select("title make model year images price type status sellerId")
      .lean<{ _id: Oid; title: string; make: string; model: string; year: number; images?: string[]; price: number; type: string; status: string; sellerId: Oid }>();
    if (!l) return { error: "Vehicle not found" };
    if (l.type === "RENT") return { error: "This vehicle is for rent only. Book it instead." };
    if (l.status !== "ACTIVE") return { error: "This vehicle is no longer available" };
    const seller = await User.findById(l.sellerId).select("organizationId").lean<{ organizationId?: Oid }>();
    if (!seller?.organizationId) return { error: "Only vehicles sold by a business can be bought here. Contact the seller directly." };
    const org = await Organization.findOne({ _id: seller.organizationId, isActive: { $ne: false } }).select("ownerId").lean<{ _id: Oid; ownerId: Oid }>();
    if (!org) return { error: "This business isn't taking orders right now" };
    return {
      item: {
        organizationId: org._id, ownerId: org.ownerId, contactId: l.sellerId, listingId: l._id,
        vehicle: { title: l.title, make: l.make, model: l.model, year: l.year, image: l.images?.[0] },
        price: l.price,
      },
    };
  }
  if (ref.dealId) {
    if (!mongoose.Types.ObjectId.isValid(String(ref.dealId))) return { error: "Deal not found" };
    const d = await Deal.findById(ref.dealId)
      .select("title make model year images price discountType discountValue dealType startsAt endsAt paused disabledByAdmin organizationId createdBy")
      .lean<{ _id: Oid; title: string; make: string; model: string; year: number; images?: string[]; price: number; discountType: "PERCENT" | "AMOUNT"; discountValue: number; dealType?: string; startsAt: Date; endsAt: Date; paused: boolean; disabledByAdmin: boolean; organizationId: Oid; createdBy?: Oid }>();
    if (!d) return { error: "Deal not found" };
    if (d.dealType === "RENT") return { error: "This is a rental deal. Book it instead." };
    if (dealState(d) !== "LIVE") return { error: "This deal isn't running right now" };
    const org = await Organization.findOne({ _id: d.organizationId, isActive: { $ne: false } }).select("ownerId").lean<{ _id: Oid; ownerId: Oid }>();
    if (!org) return { error: "This business isn't taking orders right now" };
    return {
      item: {
        organizationId: org._id, ownerId: org.ownerId, contactId: d.createdBy ?? org.ownerId, dealId: d._id,
        vehicle: { title: d.title, make: d.make, model: d.model, year: d.year, image: d.images?.[0] },
        price: dealPrice(d.price, d),
      },
    };
  }
  return { error: "Choose a vehicle" };
}

/**
 * Puts the buyer in the selling business's customer list (matched by account, phone, then email)
 * and links the purchase. Sold purchases move the customer to SOLD. Respects the plan's customer limit.
 */
export async function ensurePurchaseCustomer(p: Pick<IPurchase, "_id" | "organizationId" | "buyerId" | "buyer" | "source" | "listingId" | "vehicle" | "status" | "customerId">) {
  const org = await Organization.findById(p.organizationId).select("ownerId").lean<{ ownerId: Oid }>();
  if (!org) return null;
  const status = p.status === "COMPLETED" ? "SOLD" : "NEGOTIATING";

  let customerId: Oid | undefined = p.customerId ?? undefined;
  if (!customerId && p.buyerId) {
    customerId = (await Customer.findOne({ organizationId: p.organizationId, userId: p.buyerId }).select("_id").lean<{ _id: Oid }>())?._id;
  }
  const phone = normalizePhone(p.buyer.phone);
  if (!customerId && phone) {
    const candidates = await Customer.find({ organizationId: p.organizationId, phone: { $exists: true } }).select("phone").lean<Array<{ _id: Oid; phone: string }>>();
    customerId = candidates.find(c => normalizePhone(c.phone) === phone)?._id;
  }
  if (!customerId && p.buyer.email) {
    customerId = (await Customer.findOne({ organizationId: p.organizationId, email: p.buyer.email }).select("_id").lean<{ _id: Oid }>())?._id;
  }

  const note = `Purchase ${purchaseNumber(String(p._id))}: ${p.vehicle.title}`;
  if (customerId) {
    await Customer.updateOne({ _id: customerId }, { $set: { status, ...(p.buyerId ? { userId: p.buyerId } : {}) } });
    // Customers added from online bookings may have no phone yet; the buyer just gave one
    await Customer.updateOne({ _id: customerId, phone: "Not provided" }, { $set: { phone: p.buyer.phone } });
  } else {
    if (await checkPlanLimit(String(org.ownerId), "customers")) return null;
    const created = await Customer.create({
      organizationId: p.organizationId,
      name: p.buyer.name,
      phone: p.buyer.phone,
      email: p.buyer.email,
      userId: p.buyerId,
      source: p.source === "WALK_IN" ? "WALK_IN" : "ONLINE",
      status,
      interestedIn: p.listingId,
      notes: note,
    });
    customerId = created._id as Oid;
  }
  if (!p.customerId || !p.customerId.equals(customerId)) await Purchase.updateOne({ _id: p._id }, { $set: { customerId } });
  return customerId;
}

/**
 * After a sale is completed: tags the listing Sold (or pauses the sale deal), declines the other open
 * requests for the same vehicle, and refreshes the public pages.
 */
export async function finishSale(p: Pick<IPurchase, "_id" | "listingId" | "dealId" | "organizationId">) {
  const others: Record<string, unknown> = { _id: { $ne: p._id }, status: { $in: ["REQUESTED", "ACCEPTED"] } };
  if (p.listingId) {
    const l = await Listing.findById(p.listingId).select("sellerId status").lean<{ sellerId: Oid; status: string }>();
    if (l && l.status !== "SOLD") {
      await Listing.updateOne({ _id: p.listingId }, { $set: { status: "SOLD", statusChangedAt: new Date() } });
      await invalidateListingAndSeller(p.listingId, l.sellerId);
    }
    others.listingId = p.listingId;
  } else if (p.dealId) {
    await Deal.updateOne({ _id: p.dealId }, { $set: { paused: true } });
    await invalidateDeal(p.dealId, p.organizationId);
    others.dealId = p.dealId;
  } else {
    return;
  }
  await Purchase.updateMany(others, {
    $set: { status: "DECLINED", declinedAt: new Date(), declineReason: "The vehicle was sold to another buyer", seenByBuyer: false },
  });
}
