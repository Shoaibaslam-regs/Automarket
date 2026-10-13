import { revalidateTag } from "next/cache";
import mongoose from "mongoose";
import { Organization } from "@/models/Organization";
import { User } from "@/models/User";

/**
 * Public pages that look the same for every visitor (a listing, a business page) cache their database
 * reads for this long. Owners' own changes clear the cache straight away through the helpers below,
 * so only other people's changes (a new review, a rating) can take up to this long to show.
 */
export const PUBLIC_CACHE_SECONDS = 60;

export const listingTag = (id: string) => `listing:${id}`;
export const businessTag = (slug: string) => `business:${slug}`;

// expire: 0 drops the entry now, so the next visit (often the owner checking their change) gets fresh data
const NOW = { expire: 0 };

function expire(tag: string) {
  try {
    revalidateTag(tag, NOW);
  } catch (e) {
    console.error("Cache invalidation failed:", tag, e);
  }
}

export function invalidateListingPage(listingId: unknown) {
  if (listingId) expire(listingTag(String(listingId)));
}

export function invalidateBusinessSlug(slug: string) {
  expire(businessTag(slug));
}

export async function invalidateBusinessPage(orgId: unknown) {
  if (!orgId || !mongoose.Types.ObjectId.isValid(String(orgId))) return;
  const org = await Organization.findById(orgId).select("slug").lean<{ slug?: string }>();
  if (org?.slug) expire(businessTag(org.slug));
}

/** A listing changed: clear its page and, when the seller belongs to a business, that business's page. */
export async function invalidateListingAndSeller(listingId: unknown, sellerId: unknown) {
  invalidateListingPage(listingId);
  if (!sellerId) return;
  const seller = await User.findById(sellerId).select("organizationId").lean<{ organizationId?: mongoose.Types.ObjectId }>();
  if (seller?.organizationId) await invalidateBusinessPage(seller.organizationId);
}
