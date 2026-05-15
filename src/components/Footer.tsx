import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-10 px-6 py-8">
      <div className="max-w-6xl mx-auto">

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-6">

          {/* Brand */}
          <div>
            <p className="text-sm font-bold text-gray-900 mb-2">
              AutoMarket
            </p>

            <p className="text-xs text-gray-600 leading-6">
              Pakistan&apos;s trusted platform to buy,
              sell and rent cars & bikes.
            </p>
          </div>

          {[
            {
              title: "Buy",
              links: [
                ["Cars for sale", "/listings?type=SALE"],
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
            <div key={col.title}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-900 mb-3">
                {col.title}
              </p>

              {col.links.map(([label, href]) => (
                <Link
                  key={label}
                  href={href}
                  className="block text-sm text-gray-600 hover:text-black transition mb-2"
                >
                  {label}
                </Link>
              ))}
            </div>
          ))}
        </div>

        <div className="border-t border-gray-200 pt-4 text-center">
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} AutoMarket Pakistan.
            All rights reserved.
          </p>
        </div>

      </div>
    </footer>
  );
}