import Link from "next/link";
import { PRIVACY_PATH, TERMS_PATH } from "@/lib/terms";
import { FeedbackLink } from "@/components/FeedbackHost";
import { ChevronDown } from "lucide-react";
import { seoHeading, seoPath, type SeoPage } from "@/lib/seoPages";
import { POPULAR_CARS, popularCarHref } from "@/lib/popularCars";

// Search-landing pages (src/lib/seoPages.ts) for the biggest cities, so visitors and search engines find them
const POPULAR: SeoPage[] = [
  ...["Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Multan"].map(city => ({ kind: "sale" as const, city, make: null })),
  ...["Karachi", "Lahore", "Islamabad"].map(city => ({ kind: "rent" as const, city, make: null })),
];

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-10 px-4 py-8 sm:px-6">
      <div className="max-w-6xl mx-auto">

        {/* Phones: brand on top, then the three link columns side by side, all centred */}
        <div className="mb-6 grid grid-cols-3 gap-x-3 gap-y-6 text-center md:grid-cols-4 md:gap-6 md:text-left">

          {/* Brand */}
          <div className="col-span-3 md:col-span-1">
            <p className="text-sm font-bold text-gray-900 mb-2">
              AutoGO
            </p>

            <p className="mx-auto max-w-xs text-xs text-gray-600 leading-6 md:mx-0">
              Pakistan&apos;s trusted platform to buy,
              sell and rent cars & bikes.
            </p>
          </div>

          {[
            {
              title: "Buy",
              links: [
                ["Cars for sale", "/listings?type=SALE"],
                ["Hot deals", "/deals"],
                ["Bikes", "/listings?search=bike"],
                ["All listings", "/listings"],
              ],
            },
            {
              title: "Rent",
              links: [
                ["Rent a car", "/listings?type=RENT"],
                ["Rent a bike", "/listings?type=RENT&search=bike"],
              ],
            },
            {
              title: "Sell",
              links: [
                ["Post a listing", "/sell"],
                ["Dashboard", "/dashboard"],
                ["Register", "/register"],
              ],
            },
          ].map((col) => (
            <div key={col.title} className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-900 mb-3">
                {col.title}
              </p>

              {col.links.map(([label, href]) => (
                <Link
                  key={label}
                  href={href}
                  className="mb-2 block text-[13px] text-gray-600 transition hover:text-gray-900 sm:text-sm"
                >
                  {label}
                </Link>
              ))}
            </div>
          ))}
        </div>

        {/* Popular cars and bikes by origin: one dropdown per group (plain <details>, no script) */}
        <div className="mb-5 border-t border-gray-200 pt-4">
          <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-900 md:text-left">Popular cars &amp; bikes</p>
          <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2 lg:grid-cols-5">
            {POPULAR_CARS.map(group => (
              <details key={group.title} className="group border-b border-gray-100 lg:border-0">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 py-2.5 text-[13px] font-semibold text-gray-700 transition hover:text-gray-900 [&::-webkit-details-marker]:hidden">
                  <span>{group.title} <span className="font-normal text-gray-400">({group.cars.length})</span></span>
                  <ChevronDown size={15} className="flex-shrink-0 text-gray-400 transition group-open:rotate-180" aria-hidden />
                </summary>
                <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 pb-3 pt-0.5 text-xs lg:grid-cols-1">
                  {group.cars.map(([make, model]) => (
                    <li key={`${make} ${model}`}>
                      <Link href={popularCarHref(make, model)} className="text-gray-500 transition hover:text-gray-900">{make} {model}</Link>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        </div>

        <div className="mb-5 border-t border-gray-200 pt-4 text-center md:text-left">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-900">Popular searches</p>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs md:justify-start">
            {POPULAR.map(p => (
              <Link key={seoPath(p)} href={seoPath(p)} className="text-gray-500 transition hover:text-gray-900">{seoHeading(p)}</Link>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 border-t border-gray-200 pt-4 text-center sm:flex-row sm:justify-between">
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} AutoGO Pakistan.
            All rights reserved.
          </p>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
            <Link href="/about" className="text-gray-500 transition hover:text-gray-900">About</Link>
            <Link href="/blog" className="text-gray-500 transition hover:text-gray-900">Blog</Link>
            <Link href="/help" className="text-gray-500 transition hover:text-gray-900">Help &amp; safety</Link>
            <Link href={TERMS_PATH} className="text-gray-500 transition hover:text-gray-900">Terms &amp; Conditions</Link>
            <Link href={PRIVACY_PATH} className="text-gray-500 transition hover:text-gray-900">Privacy</Link>
            <Link href="/pricing" className="text-gray-500 transition hover:text-gray-900">Pricing</Link>
            <FeedbackLink className="text-gray-500 transition hover:text-gray-900" />
          </div>
        </div>

      </div>
    </footer>
  );
}