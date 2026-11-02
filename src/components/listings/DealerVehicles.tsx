"use client";

import { useEffect, useState } from "react";
import { ChevronDown, LayoutGrid, List } from "lucide-react";
import ListingCard from "./ListingCard";
import type { IListing } from "@/models/Listing";

type View = "grid" | "list";
const STORAGE_KEY = "dealerVehiclesView";
/** Vehicles shown at first and added by each "Show more", so a big inventory doesn't push the reviews far down */
const STEP = 12;

function savedView(): View {
  try {
    return localStorage.getItem(STORAGE_KEY) === "list" ? "list" : "grid";
  } catch {
    return "grid";
  }
}

/**
 * A business's vehicles on its public page, with the same grid / horizontal list switch
 * as the main browse page. The chosen view is remembered per browser. Standard-size cards (2 a row on phones, 3 from
 * lg) and the first STEP vehicles, with "Show more" for the rest.
 */
export default function DealerVehicles({ listings, businessName }: { listings: Array<IListing & { _id: string }>; businessName: string }) {
  // Start on the grid so server and client markup match, then apply the saved choice after mount
  const [view, setView] = useState<View>("grid");
  const [shown, setShown] = useState(STEP);
  useEffect(() => {
    queueMicrotask(() => { if (savedView() === "list") setView("list"); });
  }, []);

  function choose(v: View) {
    setView(v);
    try { localStorage.setItem(STORAGE_KEY, v); } catch { /* storage blocked: the choice just isn't remembered */ }
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="min-w-0 text-lg font-bold text-slate-900">
          Vehicles from {businessName}
          {listings.length > 0 && <span className="ml-2 text-sm font-medium text-slate-400">{listings.length}</span>}
        </h2>
        {listings.length > 0 && (
          <div className="flex h-9 flex-shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" role="group" aria-label="Layout">
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
      </div>

      {listings.length === 0 ? (
        <p className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500 ring-1 ring-slate-200/80">No vehicles listed right now.</p>
      ) : (
        <>
          <div className={view === "list" ? "flex flex-col gap-3 sm:gap-4" : "grid grid-cols-2 gap-2.5 min-[400px]:gap-3 sm:gap-4 lg:grid-cols-3"}>
            {listings.slice(0, shown).map((l, i) => (
              <ListingCard key={l._id} listing={l} layout={view} eager={i < 2} />
            ))}
          </div>
          {listings.length > shown && (
            <div className="mt-5 flex flex-col items-center gap-1.5">
              <button type="button" onClick={() => setShown(n => n + STEP)}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white px-5 text-sm font-semibold text-slate-800 shadow-sm ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50">
                Show more vehicles <ChevronDown size={15} />
              </button>
              <p className="text-xs text-slate-400">Showing {shown} of {listings.length}</p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
