import type { Metadata } from "next";
import { Suspense } from "react";
import { Flame, Tag } from "lucide-react";
import DealCard from "@/components/deals/DealCard";
import DealFilters from "@/components/deals/DealFilters";
import Footer from "@/components/Footer";
import { getDealFacets, getLiveDeals, type DealFilters as Filters } from "@/lib/publicDeals";

export const metadata: Metadata = {
  title: "Deals on cars and bikes",
  description: "Limited-time offers from dealers and showrooms across Pakistan, with real photos and prices.",
  alternates: { canonical: "/deals" },
};

type Props = { searchParams: Promise<{ make?: string; city?: string; sort?: string; type?: string }> };

const SORTS = ["ending", "newest", "discount"] as const;

export default async function DealsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const sort = (SORTS as readonly string[]).includes(sp.sort ?? "") ? (sp.sort as Filters["sort"]) : "ending";
  const [deals, facets] = await Promise.all([
    getLiveDeals({ make: sp.make, city: sp.city, sort, type: sp.type === "RENT" || sp.type === "SALE" ? sp.type : "" }),
    getDealFacets(),
  ]);
  const now = new Date().getTime();
  const filtered = !!(sp.make || sp.city || sp.type);

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
            {deals.length} {deals.length === 1 ? "deal" : "deals"} {filtered ? "match" : "running now"}
          </p>
          <Suspense fallback={<div className="h-10" />}>
            <DealFilters makes={facets.makes} cities={facets.cities} />
          </Suspense>
        </div>

        {deals.length === 0 ? (
          <div className="rounded-2xl bg-white px-6 py-16 text-center ring-1 ring-slate-200/80">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500"><Tag size={22} /></span>
            <p className="mt-3 font-semibold text-slate-900">{filtered ? "No deals match these filters" : "No deals right now"}</p>
            <p className="mt-1 text-sm text-slate-500">{filtered ? "Try another make or city." : "Check back soon. Businesses add new offers all the time."}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {deals.map(d => <DealCard key={d._id} deal={d} now={now} />)}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
