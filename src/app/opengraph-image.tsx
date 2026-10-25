import { ImageResponse } from "next/og";
import { OG_CONTENT_TYPE, OG_SIZE, ShareCard, brandMark } from "@/lib/ogCard";

// The default link preview for every page that has no image of its own (home, Browse, Help, Pricing…)
export const alt = "AutoGO: buy, sell and rent cars and bikes in Pakistan";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  const mark = await brandMark();
  return new ImageResponse(
    <ShareCard mark={mark} photo={null} eyebrow="Pakistan's vehicle marketplace" title="Buy, sell & rent cars and bikes" detail="Verified dealers, rentals and hot deals across Pakistan" />,
    size,
  );
}
