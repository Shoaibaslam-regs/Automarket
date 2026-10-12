"use client";

import { useEffect, useState } from "react";
import { LayoutGrid, List } from "lucide-react";
import ListingCard from "./ListingCard";
import type { IListing } from "@/models/Listing";

type View = "grid" | "list";
const STORAGE_KEY = "dealerVehiclesView";

function savedView(): View {
  try {
    return localStorage.getItem(STORAGE_KEY) === "list" ? "list" : "grid";
  } catch {
    return "grid";
  }
}

/**
 * A business's vehicles on its public page, with the same grid / horizontal list switch
 * as the main browse page. The chosen view is remembered per browser.
 */
export default function DealerVehicles({ listings, businessName }: { listings: Array<IListing & { _id: string }>; businessName: string }) {
  // Start on the grid so server and client markup match, then apply the saved choice after mount
  const [view, setView] = useState<View>("grid");
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
        <div className={view === "list" ? "flex flex-col gap-3 sm:gap-4" : "grid grid-cols-2 gap-2.5 min-[400px]:gap-3 sm:gap-5"}>
          {listings.map((l, i) => (
            <ListingCard key={l._id} listing={l} layout={view} eager={i < 2} />
          ))}
        </div>
      )}
    </section>
  );
}
