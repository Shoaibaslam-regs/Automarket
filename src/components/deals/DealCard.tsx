import Link from "next/link";
import Image from "next/image";
import { Building2, CarFront, Clock3, Flame, Gauge, ImageOff, KeyRound, MapPin, Tag } from "lucide-react";
import VerifiedBadge from "@/components/VerifiedBadge";
import { formatLakh } from "@/lib/format";
import { daysLeft, dealLabel, dealPrice, isRentDeal } from "@/lib/deals";
import type { PublicDeal } from "@/lib/publicDeals";

/** "Ends in 5 hours", "3 days left", "Ended" */
export function endsText(endsAt: string, now: number): string {
  const ms = new Date(endsAt).getTime() - now;
  if (ms <= 0) return "Ended";
  if (ms < 86_400_000) return `Ends in ${Math.max(1, Math.round(ms / 3_600_000))} hours`;
  const d = daysLeft(endsAt, now);
  return `${d} day${d === 1 ? "" : "s"} left`;
}

/** Small label over the photo: tiny and light on phones, the bolder pill from `sm` up. */
const PHOTO_TAG = "theme-static absolute inline-flex items-center gap-0.5 rounded-full px-1.5 py-px text-[9px] font-medium text-white backdrop-blur sm:gap-1 sm:px-2 sm:py-0.5 sm:text-[10px] sm:font-bold";

/**
 * A deal in a grid: photo with the discount, a tilted "Deal" ribbon, deal price over the normal price, and who is offering it.
 * Phones get a short card (one-line title, price, city); make, type, mileage and the business
 * show from `sm` up, and the deal page has everything.
 */
export default function DealCard({ deal, now, showBusiness = true }: { deal: PublicDeal; now: number; showBusiness?: boolean }) {
  const final = dealPrice(deal.price, deal);
  const urgent = daysLeft(deal.endsAt, now) <= 3;
  const rent = isRentDeal(deal);
  const cars = deal.vehicleCount ?? 1;
  return (
    <Link
      href={`/deals/${deal._id}`}
      className="group flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/80 transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-20px_rgba(15,23,42,0.35)] hover:ring-slate-300"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100 sm:aspect-[4/3]">
        {deal.images[0] ? (
          <Image src={deal.images[0]} alt={deal.title} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px" className="object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <span className="flex h-full items-center justify-center text-slate-300"><ImageOff size={24} /></span>
        )}
        <span className="theme-static absolute left-1.5 top-1.5 rounded-full bg-gradient-to-r from-rose-600 to-orange-500 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-white shadow-md shadow-rose-600/30 sm:left-2 sm:top-2 sm:px-2.5 sm:py-1 sm:text-[11px] sm:font-extrabold">
          {dealLabel(deal)}
        </span>
        <span className={`${PHOTO_TAG} bottom-1.5 right-1.5 sm:bottom-2 sm:right-2 ${urgent ? "bg-rose-600/90" : "bg-black/55"}`}>
          <Clock3 className="h-2 w-2 sm:h-2.5 sm:w-2.5" /> {endsText(deal.endsAt, now)}
        </span>
        {cars > 1 && (
          <span className={`${PHOTO_TAG} bottom-1.5 left-1.5 bg-black/55 sm:bottom-2 sm:left-2`}>
            <CarFront className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> {cars} cars
          </span>
        )}
        {/* A tiny tilted "Deal" ribbon across the top-right corner, like Sponsored, in the hot-deal colours */}
        <span className="theme-static pointer-events-none absolute -right-7 top-3.5 z-[2] flex w-24 rotate-45 items-center justify-center gap-0.5 bg-gradient-to-r from-rose-600 to-orange-500 py-px text-[8px] font-extrabold uppercase tracking-[0.14em] text-white shadow-md shadow-rose-600/30 sm:-right-8 sm:top-4 sm:w-28 sm:text-[9px]">
          <Flame className="h-2 w-2 sm:h-2.5 sm:w-2.5" /> Deal
        </span>
      </div>
      <div className="flex flex-1 flex-col px-2.5 pb-2.5 pt-2 sm:p-4">
        <div className="hidden items-center justify-between gap-2 sm:flex">
          <p className="min-w-0 truncate text-[11px] font-semibold uppercase tracking-wide text-slate-400">{deal.make} · {deal.year}</p>
          <span className={`inline-flex flex-shrink-0 items-center gap-1 text-[11px] font-semibold ${rent ? "text-sky-700" : "text-indigo-700"}`}>
            {rent ? <><KeyRound size={10} /> Rent</> : <><Tag size={10} /> Sale</>}
          </span>
        </div>
        <p className="truncate text-[13px] font-semibold leading-snug text-slate-900 sm:mt-0.5 sm:line-clamp-2 sm:whitespace-normal sm:text-[15px]">{deal.title}</p>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5 sm:mt-2 sm:gap-x-2">
          <span className="text-[15px] font-bold text-rose-600 sm:text-lg sm:font-extrabold">PKR {formatLakh(final)}{rent && <span className="text-[11px] font-semibold text-rose-500 sm:text-xs">/day</span>}</span>
          <span className="text-[11px] text-slate-400 line-through sm:text-xs">{formatLakh(deal.price)}</span>
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1.5 text-[11px] text-slate-500 sm:border-t sm:border-slate-100 sm:pt-2.5 sm:text-xs">
          <span className="flex min-w-0 items-center gap-1"><MapPin size={11} className="flex-shrink-0" /> <span className="truncate">{deal.location}</span></span>
          {deal.mileage != null && <span className="hidden flex-shrink-0 items-center gap-1 sm:flex"><Gauge size={12} /> {deal.mileage.toLocaleString()} km</span>}
        </div>
        {showBusiness && (
          <p className="mt-1.5 hidden min-w-0 items-center gap-1 text-xs font-medium text-indigo-700 sm:flex">
            {deal.business.verified ? <VerifiedBadge variant="icon" size={13} /> : <Building2 size={12} className="flex-shrink-0" />}
            <span className="truncate">{deal.business.name}</span>
          </p>
        )}
      </div>
    </Link>
  );
}
