"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Car, History, X } from "lucide-react";
import { formatLakh } from "@/lib/format";

/** A listing the visitor opened, kept in this browser only. */
export type ViewedListing = { id: string; title: string; price: number; type: string; image?: string; location?: string; year?: number; at: number };

const KEY = "recently-viewed";
const MAX = 12;

function read(): ViewedListing[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]") as ViewedListing[]; } catch { return []; }
}

/** Remembers the listing page being viewed (newest first, no repeats). Renders nothing. */
export function TrackListingView({ listing }: { listing: Omit<ViewedListing, "at"> }) {
  useEffect(() => {
    try {
      const list = [{ ...listing, at: Date.now() }, ...read().filter(v => v.id !== listing.id)].slice(0, MAX);
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch {}
  }, [listing]);
  return null;
}

/** A row of recently opened listings, scrolling sideways on phones. Hidden when there are none. */
export default function RecentlyViewed({ excludeId, className = "" }: { excludeId?: string; className?: string }) {
  const [items, setItems] = useState<ViewedListing[]>([]);
  useEffect(() => {
    queueMicrotask(() => setItems(read().filter(v => v.id !== excludeId)));
  }, [excludeId]);
  if (!items.length) return null;

  function clear() {
    try { localStorage.removeItem(KEY); } catch {}
    setItems([]);
  }

  return (
    <section className={className} aria-label="Recently viewed">
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-900"><History size={15} className="text-slate-400" /> Recently viewed</h2>
        <button onClick={clear} className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-700"><X size={12} /> Clear</button>
      </div>
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
        {items.map(v => (
          <Link key={v.id} href={`/listings/${v.id}`} className="w-[150px] flex-shrink-0 overflow-hidden rounded-xl border border-slate-200/80 bg-white transition hover:border-slate-300 sm:w-[170px]">
            <div className="relative aspect-[4/3] bg-slate-100">
              {v.image
                ? <Image src={v.image} alt="" fill sizes="170px" className="object-cover" />
                : <div className="flex h-full items-center justify-center text-slate-300"><Car size={22} /></div>}
            </div>
            <div className="p-2.5">
              <p className="truncate text-xs font-semibold text-slate-900">{v.title}</p>
              <p className="mt-0.5 text-[13px] font-bold text-slate-900">PKR {formatLakh(v.price)}{v.type === "RENT" && <span className="text-[11px] font-normal text-slate-400">/day</span>}</p>
              {v.location && <p className="truncate text-[11px] text-slate-400">{v.location}</p>}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
