"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Lightbulb } from "lucide-react";
import { SponsoredCard } from "@/components/home/SponsoredRow";
import { SPONSORED_AD } from "@/lib/plans";
import type { AdPreviewTip } from "@/lib/ads";
import type { SponsoredItem } from "@/lib/sponsored";

type Place = "home" | "browse";

/** A listing card with no content, standing for the vehicles around the ad. Still: no pulsing, it isn't loading. */
function OtherCard({ row = false }: { row?: boolean }) {
  if (row) {
    return (
      <div aria-hidden className="flex gap-3 rounded-xl bg-white p-1.5 opacity-70 ring-1 ring-slate-200/80">
        <div className="aspect-[4/3] w-32 flex-shrink-0 rounded-lg bg-slate-100" />
        <div className="flex-1 space-y-2 py-2 pr-2">
          <div className="h-3 w-4/5 rounded bg-slate-100" />
          <div className="h-3 w-1/2 rounded bg-slate-100" />
          <div className="h-2.5 w-2/3 rounded bg-slate-100" />
        </div>
      </div>
    );
  }
  return (
    <div aria-hidden className="flex h-full flex-col overflow-hidden rounded-xl bg-white opacity-70 ring-1 ring-slate-200/80">
      <div className="aspect-[4/3] bg-slate-100" />
      <div className="space-y-2 p-3">
        <div className="h-3 w-4/5 rounded bg-slate-100" />
        <div className="h-3 w-1/2 rounded bg-slate-100" />
        <div className="h-2.5 w-2/3 rounded bg-slate-100" />
      </div>
    </div>
  );
}

/**
 * Business → Promote: the sponsored card the chosen business page, deal or vehicle would get, built by the server
 * like the live ads (GET /api/business/ads/preview) and shown where buyers see it: the home page's Featured row or
 * between Marketplace results (gold border). `phone` shows the phone version (Marketplace as list rows). The card
 * is `inert` and counts nothing. Under it, the tips from adPreviewTips.
 */
export default function AdPreview({ item, tips, loading, emptyText, city, phone = false }: {
  item: SponsoredItem | null;
  tips: AdPreviewTip[];
  loading: boolean;
  /** Shown instead of a card while nothing is chosen yet ("Choose a vehicle to see its card") */
  emptyText?: string;
  city: string;
  phone?: boolean;
}) {
  const [place, setPlace] = useState<Place>("home");
  const where = city || "all of Pakistan";

  const card = item ? (
    <div inert className="h-full">
      <SponsoredCard item={item} preview highlight={place === "browse"} layout={place === "browse" && phone ? "list" : "grid"} />
    </div>
  ) : (
    <div className="flex h-full min-h-40 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-4 text-center text-xs text-slate-500">
      {loading ? "Loading the preview…" : emptyText ?? "No preview for this one."}
    </div>
  );

  return (
    <section aria-label="Ad preview" className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Preview</p>
          <p className="mt-0.5 text-xs text-slate-500">How buyers will see your ad</p>
        </div>
        <div className="inline-flex rounded-lg bg-slate-100 p-0.5" role="group" aria-label="Where it shows">
          {([["home", "Home page"], ["browse", "Marketplace"]] as const).map(([key, text]) => (
            <button key={key} type="button" onClick={() => setPlace(key)} aria-pressed={place === key}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${place === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}>
              {text}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200/70">
        {place === "home" && <p aria-hidden className="mb-2.5 text-[13px] font-semibold text-slate-900">Featured businesses</p>}
        {place === "browse" && phone ? (
          <div className="space-y-2.5">
            <OtherCard row />
            {card}
            <OtherCard row />
          </div>
        ) : phone ? (
          // Two a row, as on phones
          <div className="grid grid-cols-2 gap-3">
            {card}
            <OtherCard />
          </div>
        ) : (
          // Desktop cards are about 260px wide: shown at that size with the next card peeking in, so the title is
          // cut where buyers would see it cut
          <div className="-m-0.5 flex gap-3 overflow-hidden p-0.5">
            <div className="w-[260px] flex-shrink-0">{card}</div>
            <div className="w-[260px] flex-shrink-0"><OtherCard /></div>
          </div>
        )}
      </div>
      <p className="mt-2.5 text-xs leading-relaxed text-slate-500">
        {place === "home"
          ? `The first row under the search on the home page, for visitors in ${where}.`
          : `Between search results with a thin gold border: after the 4th vehicle, then every ${SPONSORED_AD.browseEvery}th.`}
        {" "}Standard and Top ads look the same; Top ones are shown first.
      </p>

      {item && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          {tips.length === 0 ? (
            <p className="flex items-center gap-2 text-[13px] font-medium text-emerald-700">
              <CheckCircle2 size={15} className="flex-shrink-0" /> Your card is ready to go.
            </p>
          ) : (
            <>
              <p className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-900">
                <Lightbulb size={14} className="text-amber-500" /> Make it stand out
              </p>
              <ul className="mt-2 space-y-2.5">
                {tips.map(t => (
                  <li key={t.text} className="text-xs leading-relaxed text-slate-600">
                    {t.text}
                    {t.href && t.link && (
                      <Link href={t.href} className="ml-1 inline-flex items-center gap-0.5 font-semibold text-indigo-700 hover:text-indigo-900">
                        {t.link} <ArrowRight size={12} />
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </section>
  );
}
