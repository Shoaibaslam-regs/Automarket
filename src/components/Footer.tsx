import Link from "next/link";
import { PRIVACY_PATH, TERMS_PATH } from "@/lib/terms";
import { FeedbackLink } from "@/components/FeedbackDialog";

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
                  className="mb-2 block text-[13px] text-gray-600 transition hover:text-black sm:text-sm"
                >
                  {label}
                </Link>
              ))}
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-2 border-t border-gray-200 pt-4 text-center sm:flex-row sm:justify-between">
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} AutoGO Pakistan.
            All rights reserved.
          </p>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
            <Link href="/help" className="text-gray-500 transition hover:text-black">Help &amp; safety</Link>
            <Link href={TERMS_PATH} className="text-gray-500 transition hover:text-black">Terms &amp; Conditions</Link>
            <Link href={PRIVACY_PATH} className="text-gray-500 transition hover:text-black">Privacy</Link>
            <Link href="/pricing" className="text-gray-500 transition hover:text-black">Pricing</Link>
            <FeedbackLink className="text-gray-500 transition hover:text-black" />
          </div>
        </div>

      </div>
    </footer>
  );
}