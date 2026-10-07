import mongoose from "mongoose";
import { SavedSearch } from "@/models/SavedSearch";
import { User } from "@/models/User";
import { listingMatches, type ListingFilters } from "@/lib/listingFilters";
import { formatPrice } from "@/lib/format";
import { sendSavedSearchAlertEmail } from "@/lib/email";

type NewListing = {
  _id: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;
  status: string;
  title: string; make: string; model: string; year: number; location: string;
  type: string; condition: string; price: number;
  mileage?: number; fuelType?: string; transmission?: string; images?: string[];
};

/** Emails every user with an alert-enabled saved search that matches a newly created listing (one email per user). */
export async function notifySavedSearches(listing: NewListing) {
  if (listing.status !== "ACTIVE") return;

  const searches = await SavedSearch.find({ emailAlerts: true, userId: { $ne: listing.sellerId } })
    .select("userId name filters")
    .lean<{ _id: mongoose.Types.ObjectId; userId: mongoose.Types.ObjectId; name: string; filters: ListingFilters }[]>();

  const byUser = new Map<string, { ids: mongoose.Types.ObjectId[]; names: string[] }>();
  for (const s of searches) {
    if (!listingMatches(listing, s.filters ?? {})) continue;
    const entry = byUser.get(String(s.userId)) ?? { ids: [], names: [] };
    entry.ids.push(s._id);
    entry.names.push(s.name);
    byUser.set(String(s.userId), entry);
  }
  if (byUser.size === 0) return;

  const users = await User.find({ _id: { $in: [...byUser.keys()] } })
    .select("name email")
    .lean<{ _id: mongoose.Types.ObjectId; name?: string; email: string }[]>();

  const details = [listing.make, listing.model, listing.year, listing.mileage != null && `${listing.mileage.toLocaleString("en-PK")} km`]
    .filter(Boolean)
    .join(" · ");

  const results = await Promise.allSettled(
    users.map(async u => {
      const match = byUser.get(String(u._id))!;
      await sendSavedSearchAlertEmail({
        to: u.email,
        name: u.name,
        searchNames: match.names,
        listing: {
          id: String(listing._id),
          title: listing.title,
          price: formatPrice(listing.price, listing.type),
          details,
          location: listing.location,
          image: listing.images?.[0],
        },
      });
      await SavedSearch.updateMany({ _id: { $in: match.ids } }, { lastNotifiedAt: new Date() });
    })
  );

  const failed = results.filter(r => r.status === "rejected");
  if (failed.length) console.error(`Saved search alerts: ${failed.length}/${results.length} emails failed`, failed[0]);
}
