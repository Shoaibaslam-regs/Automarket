import Link from "next/link";
import { BOOSTED_SHOWN, pickBoosted } from "@/lib/boosts";
import {
  ArrowRight,
  CalendarCheck,
  MessageCircle,
  ScanSearch,
  Search,
} from "lucide-react";
import { connectDB } from "@/lib/mongodb";
import { Listing, IListing } from "@/models/Listing";
import ListingCard from "@/components/listings/ListingCard";
import BrandLogos from "@/components/BrandLogos";
import StepCards from "@/components/ui/StepCards";
import SectionHeader from "@/components/home/SectionHeader";
import ProvinceCities from "@/components/ProvinceCities";
import DealCard from "@/components/deals/DealCard";
import { getLiveDeals } from "@/lib/publicDeals";
import Footer from "@/components/Footer";
import LiveStats from "@/components/home/LiveStats";
import { getShowHomeStats } from "@/lib/siteFlags";
import HomeSearchInput from "@/components/home/HomeSearchInput";
import RecentlyViewed from "@/components/listings/RecentlyViewed";
import { getPublicStats } from "@/lib/publicStats";
import SponsoredSection from "@/components/home/SponsoredSection";
import { getSponsored } from "@/lib/sponsored";
import { CARD_SELLER_POPULATE } from "@/lib/cardSeller";

type ListingWithId = IListing & { _id: string };

// The one home page (the old separate landing page was removed and /home redirects here).
// Re-read listings and counts at most once a minute instead of freezing them at build time
export const revalidate = 60;


const FEATURES = [
  {
    icon: ScanSearch,
    title: "AI vehicle inspection",
    desc: "Upload photos and get an instant damage report and value estimate.",
  },
  {
    icon: MessageCircle,
    title: "Talk to sellers directly",
    desc: "Chat, call or WhatsApp owners. No middlemen, no hidden fees.",
  },
  {
    icon: CalendarCheck,
    title: "Simple rental bookings",
    desc: "Request dates, get confirmed by the owner and download your slip.",
  },
];

const STEPS = [
  { title: "Post your ad", desc: "Add details, upload photos and set your price in about 3 minutes." },
  { title: "Get contacted", desc: "Buyers and renters reach you directly via chat, call or WhatsApp." },
  { title: "Close the deal", desc: "Meet, inspect with AI and complete the transaction with confidence." },
];

async function getData() {
  try {
    await connectDB();
    const active = { status: "ACTIVE" };
    // Boosted vehicles (src/lib/boosts.ts) lead each row, a few picked afresh each time the page is rebuilt (every
    // minute) so they take turns, like the first page of Marketplace; then the newest
    const row = async (types: string[], limit: number) => {
      const where = { ...active, type: { $in: types } };
      const pool = await Listing.find({ ...where, boostedUntil: { $gt: new Date() } }).select("_id").limit(200).lean<Array<{ _id: unknown }>>();
      const ids = pickBoosted(pool.map(p => p._id), Math.min(BOOSTED_SHOWN, limit));
      const [lead, rest] = await Promise.all([
        ids.length ? Listing.find({ _id: { $in: ids } }).populate(CARD_SELLER_POPULATE).lean() : Promise.resolve([]),
        Listing.find({ ...where, _id: { $nin: ids } }).sort({ createdAt: -1 }).limit(limit - ids.length).populate(CARD_SELLER_POPULATE).lean(),
      ]);
      return [...lead, ...rest];
    };
    const [forSale, forRent] = await Promise.all([row(["SALE", "BOTH"], 8), row(["RENT", "BOTH"], 4)]);
    return { forSale: forSale as unknown as ListingWithId[], forRent: forRent as unknown as ListingWithId[] };
  } catch (err) {
    // The home page should still render if the database is unreachable
    console.error("Home listings failed:", err);
    return { forSale: [] as ListingWithId[], forRent: [] as ListingWithId[] };
  }
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
      {text} —{" "}
      <Link href="/sell" className="font-semibold text-slate-900 underline-offset-2 hover:underline">
        be the first to post
      </Link>
    </div>
  );
}

export default async function HomePage() {
  const [{ forSale, forRent }, deals, stats, sponsored, showStats] = await Promise.all([
    getData(),
    getLiveDeals({ sort: "discount", limit: 4 }).catch(() => []),
    getPublicStats(),
    getSponsored().catch(err => { console.error("Sponsored ads failed:", err); return []; }),
    getShowHomeStats(),
  ]);
  const now = new Date().getTime();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Hero ── (not overflow-hidden, so the search suggestions can open below it; z-10 keeps them above the next sections) */}
      <section className="relative z-10 bg-slate-950">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.4),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(16,185,129,0.2),transparent_50%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />

        <div className="relative mx-auto max-w-[1180px] px-4 pb-10 pt-10 text-center sm:pb-14 sm:pt-16">
          <h1 className="mx-auto max-w-3xl text-[2rem] font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
            Buy, sell &amp; rent vehicles you want
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-slate-400 sm:text-lg">
            Find your perfect car or bike, list yours in minutes, and get AI-powered inspections built in.
          </p>

          {/* Search: folder-style tabs (plain radios, works without JS) joined to one wide field */}
          <form action="/listings" method="GET" className="mx-auto mt-9 max-w-2xl text-left">
            <div role="radiogroup" aria-label="Listing type" className="flex gap-1 pl-2">
              {[
                ["", "All vehicles"],
                ["SALE", "Buy"],
                ["RENT", "Rent"],
              ].map(([val, label]) => (
                <label key={val} className="cursor-pointer">
                  <input type="radio" name="type" value={val} defaultChecked={val === ""} className="peer sr-only" />
                  <span className="block rounded-t-xl px-4 py-2 text-[13px] font-semibold text-slate-300 transition hover:text-white peer-checked:bg-white/30 peer-checked:text-slate-900 peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-400">
                    {label}
                  </span>
                </label>
              ))}
            </div>
            <div className="flex items-center gap-2 rounded-xl rounded-tl-none bg-white p-2 pl-4 shadow-2xl">
              <Search size={19} className="flex-shrink-0 text-slate-400" />
              <HomeSearchInput />
              <button
                type="submit"
                aria-label="Search"
                className="inline-flex flex-shrink-0 items-center gap-2 rounded-xl bg-indigo-600 px-3.5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 sm:px-6"
              >
                <span className="hidden sm:inline">Search</span>
                <ArrowRight size={17} />
              </button>
            </div>
          </form>
        </div>
      </section>

      <div className="mx-auto max-w-[1180px] space-y-14 px-4 py-10 sm:space-y-20 sm:py-14">
        {/* ── Paid ads from businesses (Business → Promote), first under the hero: rotates, the visitor's city
            first (Top ads lead); hidden while none run ── */}
        <SponsoredSection initial={sponsored} />

        {/* ── Browse by make ── */}
        <section>
          <SectionHeader title="Explore" href="/listings" line={false} />
          <BrandLogos />
        </section>

        {/* ── Latest for sale ── */}
        <section>
          <SectionHeader title="Latest for sale" href="/listings?type=SALE" line={false} />
          {forSale.length === 0 ? (
            <EmptyState text="No listings for sale yet" />
          ) : (
            // One swipeable row on every screen: short cards, about 2 in view on phones; full cards, 4 in view on desktop
            <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:gap-5 sm:px-0 sm:pb-3 sm:[scrollbar-width:thin] [&::-webkit-scrollbar]:hidden sm:[&::-webkit-scrollbar]:block sm:[&::-webkit-scrollbar]:h-1.5 sm:[&::-webkit-scrollbar-thumb]:rounded-full sm:[&::-webkit-scrollbar-thumb]:bg-slate-300">
              {forSale.map(listing => (
                <div key={String(listing._id)} className="w-[44%] flex-shrink-0 snap-start min-[480px]:w-[36%] sm:w-[calc((100%-40px)/3)] lg:w-[calc((100%-60px)/4)]">
                  <ListingCard listing={listing} compact="phone" />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Hot deals (only while some are running) ── */}
        {deals.length > 0 && (
          <section>
            <SectionHeader title="Hot deals" href="/deals" line={false} />
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {deals.map(d => <DealCard key={d._id} deal={d} now={now} />)}
            </div>
          </section>
        )}

        {/* ── For rent ── */}
        <section>
          <SectionHeader title="Available for rent" href="/listings?type=RENT" line={false} />
          {forRent.length === 0 ? (
            <EmptyState text="No rentals yet" />
          ) : (
            // Swipeable row of short cards on phones (about 2 in view), a grid of full cards on larger screens
            <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden">
              {forRent.map(listing => (
                <div key={String(listing._id)} className="w-[44%] flex-shrink-0 snap-start min-[480px]:w-[36%] sm:w-auto">
                  <ListingCard listing={listing} compact="phone" />
                </div>
              ))}
            </div>
          )}
        </section>
          
                  {/* ── Where a returning visitor left off ── */}
                  <RecentlyViewed />

        {/* ── Live numbers, once an admin switches them on (Admin → Overview) ── */}
        {showStats && <LiveStats initial={stats} />}

        {/* ── Why AutoGO ── */}
        <section>
          <SectionHeader title="Everything you need, in one place" />
          <div className="grid gap-3 sm:grid-cols-3 sm:gap-5">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="group rounded-2xl border border-slate-200/80 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md sm:p-6"
              >
                {/* The icon sits on the heading's line, so the card reads as one block */}
                <p className="flex items-center gap-2.5 text-[15px] font-semibold text-slate-900">
                  <Icon size={19} strokeWidth={1.9} className="flex-shrink-0 text-indigo-600" aria-hidden />
                  {title}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 text-center">
            <Link href="/about" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-slate-900">
              More about AutoGO <ArrowRight size={14} />
            </Link>
          </div>
        </section>

        {/* ── How it works ── */}
        <section>
          <SectionHeader title="How it works" />
          <StepCards steps={STEPS} />
        </section>

        {/* ── Browse by province ── */}
        <section>
          <SectionHeader title="Browse by province" />
          <ProvinceCities />
        </section>

        {/* ── CTA ── */}
        <section className="relative overflow-hidden rounded-2xl bg-slate-950 px-6 py-10 sm:px-12 sm:py-14">
          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-lg">
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Ready to sell your vehicle?
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400 sm:text-base">
                Post a free ad, add an AI inspection report and reach thousands of buyers today.
              </p>
            </div>
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <Link
                href="/sell"
                className="rounded-xl bg-white px-6 py-3 text-center text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                Post free ad
              </Link>
              <Link
                href="/sell"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-6 py-3 text-sm font-semibold text-white ring-1 ring-inset ring-white/20 transition hover:bg-white/15"
              >
                <ScanSearch size={16} />
                Try AI inspection
              </Link>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}
