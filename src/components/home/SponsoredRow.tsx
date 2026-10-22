import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Building2, Store } from "lucide-react";
import VerifiedBadge from "@/components/VerifiedBadge";
import { formatLakh } from "@/lib/format";
import type { SponsoredItem } from "@/lib/sponsored";

/** The gold "Sponsored" ribbon across the photo's top-left corner. */
function Ribbon() {
  return (
    <span className="theme-static pointer-events-none absolute -left-8 top-5 w-32 -rotate-45 bg-gradient-to-r from-amber-300 to-amber-500 py-0.5 text-center text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-950 shadow-md">
      Sponsored
    </span>
  );
}

/** A compact sponsored card: photo with the ribbon, title and price, and a link to the business's shop page. */
function SponsoredCard({ item }: { item: SponsoredItem }) {
  const shop = `/dealers/${item.business.slug}`;
  return (
    <div className="group overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/80 transition hover:shadow-[0_18px_40px_-20px_rgba(15,23,42,0.35)] hover:ring-slate-300">
      <Link href={item.href} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
          {item.kind === "SHOP" ? (
            <span className="flex h-full items-center justify-center bg-slate-50">
              {item.image
                ? <Image src={item.image} alt={item.title} width={88} height={88} className="h-[72px] w-[72px] rounded-full object-cover ring-1 ring-slate-200 sm:h-[88px] sm:w-[88px]" />
                : <Building2 size={36} strokeWidth={1.5} className="text-slate-300" />}
            </span>
          ) : item.image ? (
            <Image src={item.image} alt={item.title} fill sizes="(max-width: 640px) 50vw, 280px" className="object-cover transition duration-500 group-hover:scale-105" />
          ) : null}
          <Ribbon />
        </div>
        <div className="px-3 pt-2.5">
          <p className="truncate text-[13px] font-semibold text-slate-900 sm:text-sm">{item.title}</p>
          {item.price != null && (
            <p className="mt-0.5 text-sm font-bold text-slate-900">
              <span className="mr-1 text-[10px] font-semibold text-slate-400">PKR</span>
              {item.perDay ? item.price.toLocaleString("en-PK") : formatLakh(item.price)}
              {item.perDay && <span className="ml-0.5 text-[11px] font-medium text-slate-400">/day</span>}
            </p>
          )}
        </div>
      </Link>
      <Link href={shop} className="mx-3 mb-2.5 mt-2 flex items-center gap-1.5 border-t border-slate-100 pt-2 text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 sm:text-xs">
        {item.kind === "SHOP" ? (
          <><Store size={13} className="flex-shrink-0" /> <span className="truncate">Visit shop</span></>
        ) : (
          <>
            {item.business.verified ? <VerifiedBadge variant="icon" size={13} /> : <Store size={13} className="flex-shrink-0" />}
            <span className="truncate">{item.business.name}</span>
          </>
        )}
        <ArrowRight size={12} className="ml-auto flex-shrink-0" />
      </Link>
    </div>
  );
}

/** The home page's Sponsored row: paid ads (Business → Promote) as compact cards. */
export default function SponsoredRow({ items }: { items: SponsoredItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {items.map(item => <SponsoredCard key={item.adId} item={item} />)}
    </div>
  );
}
