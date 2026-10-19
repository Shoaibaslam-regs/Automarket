import mongoose from "mongoose";
import { UTApi } from "uploadthing/server";
import { User } from "@/models/User";
import { Listing } from "@/models/Listing";
import { Rental } from "@/models/Rental";
import { Booking } from "@/models/Booking";
import { Inspection } from "@/models/Inspection";
import { Favorite } from "@/models/Favorite";
import { SavedSearch } from "@/models/SavedSearch";
import { VehicleImage } from "@/models/VehicleImage";
import { Message } from "@/models/Message";
import { BusinessReview } from "@/models/BusinessReview";
import { Customer } from "@/models/Customer";
import { Employee } from "@/models/Employee";
import { Organization } from "@/models/Organization";
import { Deal } from "@/models/Deal";
import { Purchase } from "@/models/Purchase";
import { invalidateBusinessPage, invalidateListingPage } from "@/lib/pageCache";
import { isUploadedImageUrl } from "@/lib/uploadUrls";
import { PushSubscription } from "@/models/PushSubscription";

type Oid = mongoose.Types.ObjectId;

/** Bookings that are under way: the vehicle is promised or out, so the account can't vanish mid-rental. */
const OPEN_BOOKINGS = ["CONFIRMED", "ACTIVE"];

export type DeletionCheck = {
  blockers: string[];
  summary: { listings: number; bookings: number; messages: number; savedSearches: number; reviews: number };
  /** Staff member of a business they don't own; they leave it when the account is deleted */
  businessMember: string | null;
};

/** Why an account can't be deleted yet (empty when it can), plus what will be removed. */
export async function checkAccountDeletion(userId: string, opts: { byAdmin?: boolean } = {}): Promise<DeletionCheck> {
  const id = new mongoose.Types.ObjectId(userId);
  const user = await User.findById(id).select("role organizationId").lean<{ role: string; organizationId?: Oid }>();
  const blockers: string[] = [];
  if (!user) return { blockers: ["Account not found"], summary: { listings: 0, bookings: 0, messages: 0, savedSearches: 0, reviews: 0 }, businessMember: null };

  if (!opts.byAdmin && user.role === "ADMIN") {
    blockers.push("Admin accounts can't be deleted here. Ask another admin to remove your admin access first.");
  }

  const owned = await Organization.findOne({ ownerId: id }).select("name").lean<{ name: string }>();
  if (owned) blockers.push(`${opts.byAdmin ? "This user owns" : "You own"} the business "${owned.name}". Delete the business first in Business settings.`);

  const rentalIds = await Rental.find({ ownerId: id }).distinct("_id");
  const open = await Booking.countDocuments({
    status: { $in: OPEN_BOOKINGS },
    $or: [{ renterId: id }, { rentalId: { $in: rentalIds } }],
  });
  if (open && !opts.byAdmin) {
    blockers.push(`You have ${open} confirmed or ongoing booking${open === 1 ? "" : "s"}. Complete or cancel ${open === 1 ? "it" : "them"} first.`);
  }

  let businessMember: string | null = null;
  if (!owned && user.organizationId) {
    const org = await Organization.findById(user.organizationId).select("name").lean<{ name: string }>();
    businessMember = org?.name ?? null;
  }

  const [listings, bookings, messages, savedSearches, reviews] = await Promise.all([
    Listing.countDocuments({ sellerId: id }),
    Booking.countDocuments({ $or: [{ renterId: id }, { rentalId: { $in: rentalIds } }] }),
    Message.countDocuments({ $or: [{ senderId: id }, { receiverId: id }] }),
    SavedSearch.countDocuments({ userId: id }),
    BusinessReview.countDocuments({ reviewerId: id }),
  ]);
  return { blockers, summary: { listings, bookings, messages, savedSearches, reviews }, businessMember };
}

/** UploadThing file key from a ufs URL (https://<app>.ufs.sh/f/<key>). */
const keyFromUrl = (url: string) => url.split("/f/")[1]?.split("?")[0] || null;

/**
 * Permanently deletes an account and everything that belongs only to it. Call checkAccountDeletion first.
 * - Their listings, rental offers, inspections, favourites, saved searches, messages and reviews are deleted.
 * - Pending bookings on either side are cancelled. Past bookings stay for the other party: on their own vehicles
 *   they show as "vehicle deleted", and as a renter the booking keeps their name and phone as plain details.
 * - Business CRM records keep the customer but lose the account link; staff membership is removed.
 * - Their uploaded photos and profile picture are deleted from UploadThing, except photos a business deal still uses.
 */
export async function deleteAccount(userId: string): Promise<void> {
  const id = new mongoose.Types.ObjectId(userId);
  const user = await User.findById(id).select("name email phone image organizationId").lean<{ name?: string; email: string; phone?: string; image?: string; organizationId?: Oid }>();
  if (!user) return;
  const now = new Date();

  // Listings and their rental offers
  const listingIds = await Listing.find({ sellerId: id }).distinct("_id");
  const rentalIds = await Rental.find({ $or: [{ ownerId: id }, { listingId: { $in: listingIds } }] }).distinct("_id");

  // Bookings: cancel anything still pending, on both sides
  await Booking.updateMany(
    { status: "PENDING", $or: [{ renterId: id }, { rentalId: { $in: rentalIds } }] },
    { $set: { status: "CANCELLED", cancelledAt: now } }
  );
  // Bookings they made with others keep the renter's details for the owner's records, without the account link
  await Booking.updateMany(
    { renterId: id },
    { $set: { walkIn: { name: user.name || "Deleted user", phone: user.phone || "Not provided", email: user.email } }, $unset: { renterId: "" } }
  );

  // Purchase requests: open ones are withdrawn; businesses keep their sale records with the buyer's details, unlinked
  await Purchase.updateMany({ buyerId: id, status: { $in: ["REQUESTED", "ACCEPTED"] } }, { $set: { status: "CANCELLED", cancelledAt: now } });
  await Purchase.updateMany({ buyerId: id }, { $unset: { buyerId: "" } });

  await Promise.all([
    Inspection.deleteMany({ listingId: { $in: listingIds } }),
    Favorite.deleteMany({ $or: [{ userId: id }, { listingId: { $in: listingIds } }] }),
    Rental.deleteMany({ _id: { $in: rentalIds } }),
    SavedSearch.deleteMany({ userId: id }),
    PushSubscription.deleteMany({ userId: id }),
    Message.deleteMany({ $or: [{ senderId: id }, { receiverId: id }] }),
    Customer.updateMany({ userId: id }, { $unset: { userId: "" } }),
    Customer.updateMany({ assignedTo: id }, { $unset: { assignedTo: "" } }),
    Employee.deleteMany({ userId: id }),
  ]);
  await Listing.deleteMany({ _id: { $in: listingIds } });

  // Reviews they wrote, and the business pages that showed them
  const reviewedOrgs = await BusinessReview.find({ reviewerId: id }).distinct("organizationId");
  await BusinessReview.deleteMany({ reviewerId: id });

  // Uploaded files: keep any photo a business deal still shows
  const images = await VehicleImage.find({ userId: id }).select("url key").lean<Array<{ url: string; key: string }>>();
  const inDeals = new Set((await Deal.find({ images: { $in: images.map(i => i.url) } }).distinct("images")).map(String));
  const removable = images.filter(i => !inDeals.has(i.url));
  const keys = removable.map(i => i.key);
  const profileKey = user.image && isUploadedImageUrl(user.image) ? keyFromUrl(user.image) : null;
  if (profileKey) keys.push(profileKey);
  if (keys.length) {
    try {
      await new UTApi().deleteFiles(keys);
    } catch (e) {
      // The account still goes; leftover files are only storage, nothing links to them any more
      console.error("UploadThing cleanup failed:", e);
    }
  }
  await VehicleImage.deleteMany({ userId: id, url: { $in: removable.map(i => i.url) } });

  await User.deleteOne({ _id: id });

  // Public pages that showed their listings or reviews
  listingIds.forEach(invalidateListingPage);
  for (const orgId of [...reviewedOrgs, user.organizationId].filter(Boolean)) await invalidateBusinessPage(orgId);
}
