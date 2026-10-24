import type { Metadata } from "next";
import { Suspense } from "react";
import { Flame, Tag } from "lucide-react";
import DealsGrid from "@/components/deals/DealsGrid";
import DealFilters from "@/components/deals/DealFilters";
import Footer from "@/components/Footer";
import { getDealFacets, getLiveDealsPage, parseDealParams } from "@/lib/publicDeals";

export const metadata: Metadata = {
  title: "Deals on cars and bikes",
  description: "Limited-time offers from dealers and showrooms across Pakistan, with real photos and prices.",
  alternates: { canonical: "/deals" },
};

type Props = { searchParams: Promise<{ make?: string; city?: string; sort?: string; type?: string }> };

export default async function DealsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const filters = parseDealParams(k => sp[k as keyof typeof sp]);
  const [{ deals, total }, facets] = await Promise.all([getLiveDealsPage(filters, 1), getDealFacets()]);
  const now = new Date().getTime();
  const filtered = !!(filters.make || filters.city || filters.type);
  // The same filters for /api/deals when the grid loads more; also the grid's key, so a filter change starts over
  const query = new URLSearchParams(Object.entries(filters).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="relative overflow-hidden bg-slate-950 px-4 pb-12 pt-10 text-white sm:pt-14">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-rose-600/30 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-28 left-10 h-56 w-56 rounded-full bg-amber-500/20 blur-3xl" />
        <div className="relative mx-auto max-w-[1200px]">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-rose-200 ring-1 ring-inset ring-white/10">
            <Flame size={13} /> Limited-time offers
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">Hot deals</h1>
          <p className="mt-2 max-w-[560px] text-sm leading-relaxed text-slate-400">
            Special prices from dealers, showrooms and rental companies across Pakistan: cars for sale, and rental packages you can book for weddings, trips and events.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1200px] px-4 py-6 sm:py-8">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            {total} {total === 1 ? "deal" : "deals"} {filtered ? "match" : "running now"}
          </p>
          <Suspense fallback={<div className="h-10" />}>
            <DealFilters makes={facets.makes} cities={facets.cities} />
          </Suspense>
        </div>

        {deals.length === 0 ? (
          <div className="rounded-2xl bg-white px-6 py-16 text-center ring-1 ring-slate-200/80">
            <span className="mx-auto flex items-center justify-center text-rose-500"><Tag size={22} /></span>
            <p className="mt-3 font-semibold text-slate-900">{filtered ? "No deals match these filters" : "No deals right now"}</p>
            <p className="mt-1 text-sm text-slate-500">{filtered ? "Try another make or city." : "Check back soon. Businesses add new offers all the time."}</p>
          </div>
        ) : (
          <DealsGrid key={query} initial={deals} total={total} query={query} now={now} />
        )}
      </div>

      <Footer />
    </div>
  );
}
