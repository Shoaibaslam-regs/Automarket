import Link from "next/link";
import Image from "next/image";
import { Building2, CarFront, Clock3, Flame, ImageOff, KeyRound, MapPin, Tag } from "lucide-react";
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

/** The phone card's short form: "5h left", "3d left", "Ended" */
function endsShort(endsAt: string, now: number): string {
  const ms = new Date(endsAt).getTime() - now;
  if (ms <= 0) return "Ended";
  if (ms < 86_400_000) return `${Math.max(1, Math.round(ms / 3_600_000))}h left`;
  return `${daysLeft(endsAt, now)}d left`;
}

/** Small label over the photo: tiny and light on phones, a little bolder from `sm` up. */
const PHOTO_TAG = "theme-static absolute inline-flex items-center gap-0.5 rounded-full px-1.5 py-px text-[9px] font-medium text-white backdrop-blur sm:gap-1 sm:px-2 sm:py-0.5 sm:text-[10px] sm:font-semibold";

/** "20% off", or an amount kept short ("1.5 lakh off") so it fits beside the price */
function offText(deal: PublicDeal): string {
  return deal.discountType === "PERCENT" ? `${deal.discountValue}% off` : `${formatLakh(deal.discountValue)} off`;
}

/**
 * A deal in a grid. One accent per card: the photo carries only the tilted rose "Deal" ribbon (top left, like Sponsored) (and the car
 * count for convoys); the price is dark with the old price struck through and the discount in rose beside it;
 * the last row is the city and the time left, rose only when the deal ends within 3 days.
 * Phones get a short card; make, type and the business show from `sm` up, and the deal page has everything.
 */
export default function DealCard({ deal, now, showBusiness = true }: { deal: PublicDeal; now: number; showBusiness?: boolean }) {
  const final = dealPrice(deal.price, deal);
  const urgent = daysLeft(deal.endsAt, now) <= 3;
  const rent = isRentDeal(deal);
  const cars = deal.vehicleCount ?? 1;
  return (
    <Link
      href={`/deals/${deal._id}`}
      title={dealLabel(deal)}
      className="group flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/80 transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-20px_rgba(15,23,42,0.35)] hover:ring-slate-300"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100 sm:aspect-[4/3]">
        {deal.images[0] ? (
          <Image src={deal.images[0]} alt={deal.title} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px" className="object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <span className="flex h-full items-center justify-center text-slate-300"><ImageOff size={24} /></span>
        )}
        {/* A tiny tilted "Deal" ribbon across the top-left corner, the same place and angle as Sponsored, in the hot-deal colours */}
        <span className="theme-static pointer-events-none absolute -left-7 top-3.5 z-[2] flex w-24 -rotate-45 items-center justify-center gap-0.5 bg-gradient-to-r from-rose-600 to-orange-500 py-px text-[8px] font-extrabold uppercase tracking-[0.14em] text-white shadow-md shadow-rose-600/30 sm:-left-8 sm:top-4 sm:w-28 sm:text-[9px]">
          <Flame className="h-2 w-2 sm:h-2.5 sm:w-2.5" /> Deal
        </span>
        {cars > 1 && (
          <span className={`${PHOTO_TAG} bottom-1.5 right-1.5 bg-black/55 sm:bottom-2 sm:right-2`}>
            <CarFront className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> {cars} cars
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col px-2.5 pb-2.5 pt-2 sm:p-4">
        <div className="hidden items-center justify-between gap-2 sm:flex">
          <p className="min-w-0 truncate text-[11px] font-semibold uppercase tracking-wide text-slate-400">{deal.make} · {deal.year}</p>
          <span className={`inline-flex flex-shrink-0 items-center gap-1 text-[11px] font-semibold ${rent ? "text-sky-700" : "text-indigo-700"}`}>
            {rent ? <><KeyRound size={10} /> Rent</> : <><Tag size={10} /> Sale</>}
          </span>
        </div>
        <p className="truncate text-[13px] font-semibold leading-snug text-slate-900 sm:mt-0.5 sm:line-clamp-2 sm:whitespace-normal sm:text-[15px]">{deal.title}</p>
        <p className="mt-1 text-[15px] font-bold leading-tight text-slate-900 sm:mt-2 sm:text-lg sm:font-extrabold">
          PKR {formatLakh(final)}{rent && <span className="text-[11px] font-semibold text-slate-500 sm:text-xs">/day</span>}
        </p>
        <p className="mt-0.5 flex min-w-0 items-baseline gap-1.5 text-[11px] sm:text-xs">
          <span className="truncate text-slate-400 line-through">{formatLakh(deal.price)}</span>
          <span className="flex-shrink-0 font-semibold text-rose-600">{offText(deal)}</span>
        </p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1.5 text-[11px] text-slate-500 sm:mt-3 sm:border-t sm:border-slate-100 sm:pt-2.5 sm:text-xs">
          <span className="flex min-w-0 items-center gap-1"><MapPin size={11} className="flex-shrink-0" /> <span className="truncate">{deal.location}</span></span>
          <span className={`flex flex-shrink-0 items-center gap-1 ${urgent ? "font-semibold text-rose-600" : ""}`}><Clock3 size={11} /> <span className="sm:hidden">{endsShort(deal.endsAt, now)}</span><span className="hidden sm:inline">{endsText(deal.endsAt, now)}</span></span>
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
