import type { Metadata } from "next";

// The browse page is a client component, so its metadata lives here.
// Listing detail pages override it with generateMetadata.
export const metadata: Metadata = {
  // A plain string here would drop the root "— AutoMarket" suffix for the detail pages below
  title: { default: "Browse cars & bikes for sale and rent", template: "%s — AutoMarket" },
  description: "Search verified cars and bikes for sale and rent across Pakistan. Filter by make, price, year, city and more.",
  alternates: { canonical: "/listings" },
};

export default function ListingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
