"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Building2, Store } from "lucide-react";
import VerifiedBadge from "@/components/VerifiedBadge";
import { formatLakh } from "@/lib/format";
import { trackAds } from "@/lib/adTrack";
import type { SponsoredItem } from "@/lib/sponsored";

/** The gold "Sponsored" ribbon across the photo's top-left corner (smaller on the list layout's small photo). */
function Ribbon({ small = false }: { small?: boolean }) {
  return (
    <span className={`theme-static pointer-events-none absolute z-[2] -rotate-45 bg-gradient-to-r from-amber-300 to-amber-500 text-center font-extrabold uppercase text-slate-950 shadow-md ${
      small ? "-left-7 top-3.5 w-24 py-px text-[7px] tracking-[0.12em]" : "-left-8 top-5 w-32 py-0.5 text-[9px] tracking-[0.14em]"
    }`}>
      Sponsored
    </span>
  );
}

/** Counts a view once at least half the card has been on screen, at most once per ad per session (trackAds). */
function useViewTracking(adId: string) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { trackAds([adId], "view"); observer.disconnect(); }
    }, { threshold: 0.5 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [adId]);
  return ref;
}

/**
 * A compact sponsored card (with a thin gold border among listings, `highlight`): photo with the ribbon and a light gold shimmer (`lp-sponsor-shimmer`, staggered by
 * `index`), title and price, and a link to the business's shop page. Counts its views and taps. `layout="list"`
 * is the Browse list view's row: a small photo beside the details.
 */
export function SponsoredCard({ item, index = 0, layout = "grid", highlight = true }: { item: SponsoredItem; index?: number; layout?: "grid" | "list"; highlight?: boolean }) {
  // The gold border marks an ad among listings (Browse); the home row is all ads, so it keeps the plain border there
  const frame = highlight ? "ring-[1.5px] ring-amber-300/80 hover:ring-amber-400" : "ring-1 ring-slate-200/80 hover:ring-slate-300";
  const shop = `/dealers/${item.business.slug}`;
  const ref = useViewTracking(item.adId);
  const tap = () => trackAds([item.adId], "tap");
  const price = item.price != null && (
    <p className="mt-0.5 text-sm font-bold text-slate-900">
      <span className="mr-1 text-[10px] font-semibold text-slate-400">PKR</span>
      {item.perDay ? item.price.toLocaleString("en-PK") : formatLakh(item.price)}
      {item.perDay && <span className="ml-0.5 text-[11px] font-medium text-slate-400">/day</span>}
    </p>
  );

  if (layout === "list") {
    return (
      <div ref={ref} className={`flex overflow-hidden rounded-2xl bg-white transition ${frame}`}>
        <Link href={item.href} onClick={tap} className="relative w-32 flex-shrink-0 overflow-hidden bg-slate-100 sm:w-44">
          <span className="block aspect-[4/3] h-full">
            {item.image
              ? <Image src={item.image} alt={item.title} fill sizes="176px" className="object-cover" />
              : <Building2 size={28} strokeWidth={1.5} className="absolute inset-0 m-auto text-slate-300" />}
          </span>
          <Ribbon small />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col justify-center px-3 py-2.5">
          <Link href={item.href} onClick={tap} className="flex min-w-0 items-center gap-1 text-[13px] font-semibold text-slate-900 hover:underline sm:text-sm">
            <span className="truncate">{item.title}</span>
            {item.kind === "SHOP" && item.business.verified && <VerifiedBadge variant="icon" size={13} />}
          </Link>
          {price}
          {item.caption && <p className="truncate text-[11px] font-medium text-slate-400">{item.caption}</p>}
          {item.blurb && <p className="mt-0.5 line-clamp-1 text-xs text-slate-500 sm:line-clamp-2">{item.blurb}</p>}
          <Link href={shop} onClick={tap} className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-indigo-700 hover:text-indigo-900">
            {item.business.verified ? <VerifiedBadge variant="icon" size={12} /> : <Store size={12} className="flex-shrink-0" />}
            <span className="truncate">{item.kind === "SHOP" ? "Visit shop" : item.business.name}</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className={`group flex h-full flex-col overflow-hidden rounded-2xl bg-white transition hover:shadow-[0_18px_40px_-20px_rgba(15,23,42,0.35)] ${frame}`}>
      <Link href={item.href} onClick={tap} className="block">
        <div className="lp-sponsor-shimmer relative aspect-[4/3] overflow-hidden bg-slate-100" style={{ "--lp-shimmer-delay": `${index * 0.9}s` } as React.CSSProperties}>
          {item.kind === "SHOP" ? (
            item.image ? (
              <Image src={item.image} alt={item.title} fill sizes="(max-width: 640px) 50vw, 280px" className="object-cover transition duration-500 group-hover:scale-105" />
            ) : (
              <span className="flex h-full items-center justify-center bg-slate-50"><Building2 size={44} strokeWidth={1.5} className="text-slate-300" /></span>
            )
          ) : item.image ? (
            <Image src={item.image} alt={item.title} fill sizes="(max-width: 640px) 50vw, 280px" className="object-cover transition duration-500 group-hover:scale-105" />
          ) : null}
          <Ribbon />
        </div>
        <div className="px-3 pt-2.5">
          <p className="flex min-w-0 items-center gap-1 text-[13px] font-semibold text-slate-900 sm:text-sm">
            <span className="truncate">{item.title}</span>
            {item.kind === "SHOP" && item.business.verified && <VerifiedBadge variant="icon" size={14} />}
          </p>
          {price}
          {item.caption && <p className="mt-0.5 truncate text-[11px] font-medium text-slate-400">{item.caption}</p>}
          {item.blurb && <p className="mt-1 line-clamp-2 text-xs leading-snug text-slate-500">{item.blurb}</p>}
        </div>
        <div className="h-2" />
      </Link>
      <Link href={shop} onClick={tap} className="mx-3 mb-2.5 mt-auto flex items-center gap-1.5 border-t border-slate-100 pt-2 text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 sm:text-xs">
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
      {items.map((item, i) => <SponsoredCard key={item.adId} item={item} index={i} highlight={false} />)}
    </div>
  );
}
