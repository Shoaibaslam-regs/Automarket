"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Car, Eye, ImageOff, LayoutGrid, List, MapPin, Plus, ScanSearch } from "lucide-react";
import DeleteListing from "./DeleteListing";
import { formatLakh } from "@/lib/format";

export type MyListing = {
  id: string;
  title: string;
  make: string;
  model: string;
  year: number;
  location: string;
  price: number;
  type: "SALE" | "RENT" | "BOTH";
  status: string;
  image: string | null;
};

type View = "grid" | "list";
const STORAGE_KEY = "myListingsView";

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  PENDING: "bg-amber-50 text-amber-700 ring-amber-200",
  SOLD: "bg-slate-100 text-slate-600 ring-slate-200",
  RENTED: "bg-sky-50 text-sky-700 ring-sky-200",
  INACTIVE: "bg-slate-100 text-slate-500 ring-slate-200",
};
const TYPE_LABEL = { SALE: "For sale", RENT: "For rent", BOTH: "Sale & rent" } as const;

function Price({ l, className }: { l: MyListing; className: string }) {
  return (
    <p className={className}>
      <span className="mr-1 text-[10px] font-semibold text-slate-400 sm:text-xs">PKR</span>
      {l.type === "RENT" ? <>{l.price.toLocaleString("en-PK")}<span className="text-xs font-medium text-slate-400">/day</span></> : formatLakh(l.price)}
    </p>
  );
}

function Actions({ l }: { l: MyListing }) {
  return (
    <div className="flex items-center gap-1.5">
      <Link href={`/listings/${l.id}`} aria-label="View listing" className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-100">
        <Eye size={13} /> <span className="hidden min-[400px]:inline">View</span>
      </Link>
      <Link href={`/listings/${l.id}/inspect`} aria-label="AI inspection" className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2 py-1.5 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200 hover:bg-indigo-100">
        <ScanSearch size={13} /> <span className="hidden sm:inline">Inspect</span>
      </Link>
      <span className="ml-auto"><DeleteListing id={l.id} /></span>
    </div>
  );
}

/** The signed-in user's own listings with the browse page's grid / list switch, remembered per browser. */
export default function MyListings({ listings }: { listings: MyListing[] }) {
  const [view, setView] = useState<View>("grid");
  // Apply the saved choice after mount so server and client markup match
  useEffect(() => {
    queueMicrotask(() => {
      try { if (localStorage.getItem(STORAGE_KEY) === "list") setView("list"); } catch { /* storage blocked */ }
    });
  }, []);

  function choose(v: View) {
    setView(v);
    try { localStorage.setItem(STORAGE_KEY, v); } catch { /* storage blocked: the choice just isn't remembered */ }
  }

  return (
    <section id="listings" className="min-w-0 scroll-mt-20">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-900">
          Your listings <span className="text-sm font-medium text-slate-400">{listings.length}</span>
        </h2>
        <div className="flex items-center gap-2">
          {listings.length > 0 && (
            <div className="flex h-9 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" role="group" aria-label="Layout">
              {(["grid", "list"] as const).map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => choose(v)}
                  aria-label={v === "grid" ? "Grid view" : "List view"}
                  aria-pressed={view === v}
                  className={`flex w-9 items-center justify-center transition ${view === v ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50"}`}
                >
                  {v === "grid" ? <LayoutGrid size={15} strokeWidth={1.75} /> : <List size={15} strokeWidth={1.75} />}
                </button>
              ))}
            </div>
          )}
          <Link href="/sell" className="inline-flex h-9 items-center gap-1 rounded-xl bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800">
            <Plus size={14} /> New
          </Link>
        </div>
      </div>

      {listings.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white px-6 py-14 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-900/20">
            <Car size={24} />
          </span>
          <p className="mt-4 font-semibold text-slate-900">Your garage is empty</p>
          <p className="mt-1 text-sm text-slate-500">List a car or bike for sale or rent. It takes a couple of minutes.</p>
          <Link href="/sell" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
            <Plus size={15} /> Post your first listing
          </Link>
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 gap-2.5 min-[400px]:gap-3 sm:gap-4">
          {listings.map(l => (
            <article key={l.id} className="flex min-w-0 flex-col overflow-hidden rounded-2xl bg-white shadow-[0_8px_30px_-22px_rgba(15,23,42,0.35)] ring-1 ring-slate-200/70 sm:rounded-3xl">
              <Link href={`/listings/${l.id}`} className="relative block aspect-[4/3] bg-slate-100 sm:aspect-[16/10]">
                {l.image ? (
                  <Image src={l.image} alt="" fill sizes="(max-width: 640px) 50vw, 340px" className="object-cover" />
                ) : (
                  <span className="flex h-full items-center justify-center text-slate-300"><ImageOff size={22} /></span>
                )}
                <span className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset sm:left-3 sm:top-3 sm:text-[11px] ${STATUS_STYLE[l.status] ?? STATUS_STYLE.INACTIVE}`}>
                  {l.status}
                </span>
                <span className="absolute right-2 top-2 hidden rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 sm:right-3 sm:top-3 sm:block">
                  {TYPE_LABEL[l.type]}
                </span>
              </Link>
              <div className="flex flex-1 flex-col p-2.5 sm:p-4">
                <p className="truncate text-[13px] font-semibold text-slate-900 sm:text-base">{l.title}</p>
                <p className="mt-0.5 truncate text-[11px] text-slate-500 sm:text-xs">{l.make} {l.model} · {l.year}</p>
                <Price l={l} className="mt-1.5 text-base font-extrabold text-slate-900 sm:text-lg" />
                <div className="mt-auto border-t border-slate-100 pt-2.5 sm:pt-3"><Actions l={l} /></div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {listings.map(l => (
            <article key={l.id} className="flex gap-3 overflow-hidden rounded-2xl bg-white p-2.5 shadow-[0_8px_30px_-24px_rgba(15,23,42,0.35)] ring-1 ring-slate-200/70 sm:gap-4 sm:p-3">
              <Link href={`/listings/${l.id}`} className="relative h-24 w-28 flex-shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-28 sm:w-44">
                {l.image ? (
                  <Image src={l.image} alt="" fill sizes="176px" className="object-cover" />
                ) : (
                  <span className="flex h-full items-center justify-center text-slate-300"><ImageOff size={20} /></span>
                )}
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate font-semibold text-slate-900">{l.title}</p>
                  <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ${STATUS_STYLE[l.status] ?? STATUS_STYLE.INACTIVE}`}>{l.status}</span>
                </div>
                <p className="mt-0.5 flex min-w-0 items-center gap-1 truncate text-xs text-slate-500">
                  {l.make} {l.model} · {l.year} · {TYPE_LABEL[l.type]}
                  <span className="hidden items-center gap-0.5 sm:inline-flex">· <MapPin size={11} />{l.location}</span>
                </p>
                <Price l={l} className="mt-1 text-lg font-extrabold text-slate-900" />
                <div className="mt-auto pt-2"><Actions l={l} /></div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
