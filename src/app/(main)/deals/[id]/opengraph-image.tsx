import { ImageResponse } from "next/og";
import { getDealPage } from "@/lib/publicDeals";
import { dealLabel, dealPrice, isRentDeal } from "@/lib/deals";
import { formatLakh } from "@/lib/format";
import { OG_CONTENT_TYPE, OG_SIZE, ShareCard, brandMark, photoDataUrl } from "@/lib/ogCard";

// The link preview for a deal: its photo with the discount, the deal price and the business
export const alt = "Hot deal on AutoGO";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const page = await getDealPage((await params).id);
  const mark = await brandMark();
  if (!page) {
    return new ImageResponse(<ShareCard mark={mark} photo={null} eyebrow="Hot deals" title="Special prices on cars and bikes" />, size);
  }
  const { deal } = page;
  const photo = await photoDataUrl(deal.images[0]);
  return new ImageResponse(
    <ShareCard
      mark={mark}
      photo={photo}
      badge={dealLabel(deal)}
      eyebrow={isRentDeal(deal) ? "Rental deal" : "Hot deal"}
      title={deal.title}
      price={`PKR ${formatLakh(dealPrice(deal.price, deal))}${isRentDeal(deal) ? " /day" : ""}`}
      detail={`${page.business.name} · ${deal.location}`}
    />,
    size,
  );
}
