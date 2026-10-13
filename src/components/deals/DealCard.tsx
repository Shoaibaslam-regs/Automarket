import Link from "next/link";
import Image from "next/image";
import { Building2, Clock3, Gauge, ImageOff, MapPin } from "lucide-react";
import VerifiedBadge from "@/components/VerifiedBadge";
import { formatLakh } from "@/lib/format";
import { daysLeft, dealLabel, dealPrice } from "@/lib/deals";
import type { PublicDeal } from "@/lib/publicDeals";

/** "Ends in 5 hours", "3 days left", "Ended" */
export function endsText(endsAt: string, now: number): string {
  const ms = new Date(endsAt).getTime() - now;
  if (ms <= 0) return "Ended";
  if (ms < 86_400_000) return `Ends in ${Math.max(1, Math.round(ms / 3_600_000))} hours`;
  const d = daysLeft(endsAt, now);
  return `${d} day${d === 1 ? "" : "s"} left`;
}

/** A deal in a grid: photo with the discount, deal price over the normal price, and who is offering it. */
export default function DealCard({ deal, now, showBusiness = true }: { deal: PublicDeal; now: number; showBusiness?: boolean }) {
  const final = dealPrice(deal.price, deal);
  const urgent = daysLeft(deal.endsAt, now) <= 3;
  return (
    <Link
      href={`/deals/${deal._id}`}
      className="group flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/80 transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-20px_rgba(15,23,42,0.35)] hover:ring-slate-300"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {deal.images[0] ? (
          <Image src={deal.images[0]} alt={deal.title} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px" className="object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <span className="flex h-full items-center justify-center text-slate-300"><ImageOff size={28} /></span>
        )}
        <span className="theme-static absolute left-2 top-2 rounded-full bg-gradient-to-r from-rose-600 to-orange-500 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-white shadow-lg shadow-rose-600/30">
          {dealLabel(deal)}
        </span>
        <span className={`theme-static absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold backdrop-blur ${urgent ? "bg-rose-600/90 text-white" : "bg-black/55 text-white"}`}>
          <Clock3 size={10} /> {endsText(deal.endsAt, now)}
        </span>
        {deal.images.length > 1 && (
          <span className="theme-static absolute right-2 top-2 rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white">{deal.images.length} photos</span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-400">{deal.make} · {deal.year}</p>
        <p className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-slate-900 sm:text-[15px]">{deal.title}</p>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
          <span className="text-lg font-extrabold text-rose-600">PKR {formatLakh(final)}</span>
          <span className="text-xs text-slate-400 line-through">{formatLakh(deal.price)}</span>
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-[11px] text-slate-500 sm:text-xs">
          <span className="flex min-w-0 items-center gap-1"><MapPin size={12} className="flex-shrink-0" /> <span className="truncate">{deal.location}</span></span>
          {deal.mileage != null && <span className="hidden flex-shrink-0 items-center gap-1 sm:flex"><Gauge size={12} /> {deal.mileage.toLocaleString()} km</span>}
        </div>
        {showBusiness && (
          <p className="mt-1.5 flex min-w-0 items-center gap-1 text-[11px] font-medium text-indigo-700 sm:text-xs">
            {deal.business.verified ? <VerifiedBadge variant="icon" size={13} /> : <Building2 size={12} className="flex-shrink-0" />}
            <span className="truncate">{deal.business.name}</span>
          </p>
        )}
      </div>
    </Link>
  );
}
