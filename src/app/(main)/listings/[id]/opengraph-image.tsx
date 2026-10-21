import { ImageResponse } from "next/og";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Listing } from "@/models/Listing";
import { formatLakh } from "@/lib/format";
import { OG_CONTENT_TYPE, OG_SIZE, ShareCard, brandMark, photoDataUrl } from "@/lib/ogCard";

// The link preview for a listing: its first photo with the title, price and city
export const alt = "Vehicle on AutoMarket";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

const TYPE_LABEL: Record<string, string> = { SALE: "For sale", RENT: "For rent", BOTH: "For sale & rent" };

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mark = await brandMark();
  let listing: { title: string; make: string; model: string; year: number; price: number; type: string; location: string; images?: string[] } | null = null;
  if (mongoose.Types.ObjectId.isValid(id)) {
    await connectDB();
    listing = await Listing.findById(id).select("title make model year price type location images").lean();
  }
  if (!listing) {
    return new ImageResponse(<ShareCard mark={mark} photo={null} eyebrow="AutoMarket" title="Buy, sell & rent cars and bikes" />, size);
  }
  const photo = await photoDataUrl(listing.images?.[0]);
  return new ImageResponse(
    <ShareCard
      mark={mark}
      photo={photo}
      eyebrow={TYPE_LABEL[listing.type] ?? "For sale"}
      title={`${listing.year} ${listing.make.trim()} ${listing.model.trim()}`}
      price={`PKR ${formatLakh(listing.price)}${listing.type === "RENT" ? " /day" : ""}`}
      detail={listing.location.trim()}
    />,
    size,
  );
}
