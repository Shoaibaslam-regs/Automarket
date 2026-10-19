// Registers the Organization model for the nested populate below
import "@/models/Organization";

/**
 * What a ListingCard needs about the seller: name and picture, whether their phone is verified, and their
 * business (name, page and Verified badge). Use it on every query whose listings are shown as cards:
 *   Listing.find(q).populate(CARD_SELLER_POPULATE)
 */
export const CARD_SELLER_POPULATE = {
  path: "sellerId",
  select: "name image organizationId phoneVerifiedAt",
  populate: { path: "organizationId", select: "name slug verification.verifiedAt verification.expiresAt" },
};
