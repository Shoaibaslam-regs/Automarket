import SeoListingPage, { seoMetadata, seoPageFrom } from "@/components/seo/SeoListingPage";

// The same for every visitor, so the CDN serves it; rebuilt at most every 5 minutes (src/lib/seoData.ts)
export const revalidate = 300;
// Built on the first visit, then cached (without this a [param] route renders on every request)
export function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ city: string }> };

export async function generateMetadata({ params }: Props) {
  const { city } = await params;
  return seoMetadata(seoPageFrom("rent", city));
}

/** "Rent a car in Lahore": a search-landing page (src/lib/seoPages.ts). */
export default async function Page({ params }: Props) {
  const { city } = await params;
  return <SeoListingPage page={seoPageFrom("rent", city)} />;
}
