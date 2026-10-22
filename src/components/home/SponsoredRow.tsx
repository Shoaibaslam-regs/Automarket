import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Building2, MapPin, Star } from "lucide-react";
import ListingCard from "@/components/listings/ListingCard";
import DealCard from "@/components/deals/DealCard";
import VerifiedBadge from "@/components/VerifiedBadge";
import type { SponsoredItem, SponsoredShop } from "@/lib/sponsored";

const TYPE_LABEL: Record<string, string> = { DEALER: "Car dealer", RENTAL: "Rental company", BOTH: "Dealer & rentals" };

/** A sponsored business page: the same card frame as deals and listings, with the logo in place of a photo. */
function ShopCard({ shop }: { shop: SponsoredShop }) {
  return (
    <Link
      href={`/dealers/${shop.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/80 transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-20px_rgba(15,23,42,0.35)] hover:ring-slate-300"
    >
      <div className="flex aspect-[4/3] items-center justify-center bg-slate-50">
        {shop.logo ? (
          <Image src={shop.logo} alt={shop.name} width={96} height={96} className="h-20 w-20 rounded-full object-cover ring-1 ring-slate-200 sm:h-24 sm:w-24" />
        ) : (
          <Building2 size={40} strokeWidth={1.5} className="text-slate-300" />
        )}
      </div>
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{TYPE_LABEL[shop.type] ?? "Business"}</p>
        <p className="mt-0.5 flex min-w-0 items-center gap-1 text-sm font-semibold text-slate-900 sm:text-[15px]">
          <span className="truncate">{shop.name}</span>
          {shop.verified && <VerifiedBadge variant="icon" size={15} />}
        </p>
        {shop.rating.count > 0 && (
          <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
            <Star size={12} className="fill-amber-400 text-amber-400" /> {shop.rating.average.toFixed(1)} ({shop.rating.count})
          </p>
        )}
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-[11px] text-slate-500 sm:text-xs">
          <span className="flex min-w-0 items-center gap-1">{shop.city && <><MapPin size={12} className="flex-shrink-0" /> <span className="truncate">{shop.city}</span></>}</span>
          <span className="inline-flex flex-shrink-0 items-center gap-0.5 font-semibold text-slate-700">Visit <ArrowRight size={12} className="transition group-hover:translate-x-0.5" /></span>
        </div>
      </div>
    </Link>
  );
}

/** The home page's Sponsored row: paid ads (Business → Promote) shown with the site's normal cards. */
export default function SponsoredRow({ items, now }: { items: SponsoredItem[]; now: number }) {
  return (
    <div className="grid grid-cols-2 items-start gap-3 sm:gap-4 lg:grid-cols-4">
      {items.map(item =>
        item.kind === "SHOP" ? <ShopCard key={item.adId} shop={item.shop} />
        : item.kind === "DEAL" ? <DealCard key={item.adId} deal={item.deal} now={now} />
        : <ListingCard key={item.adId} listing={item.listing} />
      )}
    </div>
  );
}
