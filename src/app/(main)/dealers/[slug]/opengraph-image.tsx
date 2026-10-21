import { ImageResponse } from "next/og";
import { connectDB } from "@/lib/mongodb";
import { Organization } from "@/models/Organization";
import { isVerified } from "@/lib/plans";
import { getBusinessRatings } from "@/lib/reviews";
import { OG_CONTENT_TYPE, OG_SIZE, ShareCard, brandMark } from "@/lib/ogCard";

// The link preview for a business page: its name, kind, city and rating (plain words: the image font has no ★ or ✓)
export const alt = "Business on AutoMarket";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

const TYPE_LABEL: Record<string, string> = { DEALER: "Car dealer", RENTAL: "Rental company", BOTH: "Dealer & rentals" };

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const mark = await brandMark();
  await connectDB();
  const org = await Organization.findOne({ slug, isActive: { $ne: false } })
    .select("name type city verification.verifiedAt verification.expiresAt")
    .lean<{ _id: unknown; name: string; type: string; city?: string; verification?: { verifiedAt?: Date; expiresAt?: Date } }>();
  if (!org) {
    return new ImageResponse(<ShareCard mark={mark} photo={null} eyebrow="AutoMarket" title="Dealers and rental companies in Pakistan" />, size);
  }
  const rating = (await getBusinessRatings([String(org._id)])).get(String(org._id));
  const stars = rating && rating.count > 0 ? `Rated ${rating.average.toFixed(1)} of 5 · ${rating.count} review${rating.count === 1 ? "" : "s"}` : "New on AutoMarket";
  return new ImageResponse(
    <ShareCard
      mark={mark}
      photo={null}
      eyebrow={`${TYPE_LABEL[org.type] ?? "Business"}${isVerified(org.verification) ? " · Verified" : ""}`}
      title={org.name}
      detail={[org.city, stars].filter(Boolean).join(" · ")}
    />,
    size,
  );
}
