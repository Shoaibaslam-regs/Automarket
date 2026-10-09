import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  MapPin,
  MessageCircle,
  ScanSearch,
  Search,
  Sparkles,
} from "lucide-react";
import { connectDB } from "@/lib/mongodb";
import { Listing, IListing } from "@/models/Listing";
import ListingCard from "@/components/listings/ListingCard";
import BrandLogos from "@/components/BrandLogos";
import Footer from "@/components/Footer";

type ListingWithId = IListing & { _id: string };

// Re-read listings and counts at most once a minute instead of freezing them at build time
export const revalidate = 60;

const CITIES = ["Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar", "Quetta"];
const POPULAR = ["Corolla", "Civic", "Alto", "Cultus", "Yamaha"];

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
  { n: "01", title: "Post your ad", desc: "Add details, upload photos and set your price in about 3 minutes." },
  { n: "02", title: "Get contacted", desc: "Buyers and renters reach you directly via chat, call or WhatsApp." },
  { n: "03", title: "Close the deal", desc: "Meet, inspect with AI and complete the transaction with confidence." },
];

async function getData() {
  await connectDB();
  const active = { status: "ACTIVE" };
  const sale = { ...active, type: { $in: ["SALE", "BOTH"] } };
  const rent = { ...active, type: { $in: ["RENT", "BOTH"] } };

  const [forSale, forRent, total, totalSale, totalRent] = await Promise.all([
    Listing.find(sale).sort({ featured: -1, createdAt: -1 }).limit(6).lean(),
    Listing.find(rent).sort({ featured: -1, createdAt: -1 }).limit(4).lean(),
    Listing.countDocuments(active),
    Listing.countDocuments(sale),
    Listing.countDocuments(rent),
  ]);

  return {
    forSale: forSale as unknown as ListingWithId[],
    forRent: forRent as unknown as ListingWithId[],
    stats: { total, totalSale, totalRent },
  };
}

function SectionHeader({ eyebrow, title, href }: { eyebrow: string; title: string; href?: string }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-600">{eyebrow}</p>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h2>
      </div>
      {href && (
        <Link
          href={href}
          className="group inline-flex flex-shrink-0 items-center gap-1 text-sm font-semibold text-slate-600 transition hover:text-slate-900"
        >
          View all
          <ArrowRight size={15} className="transition group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
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
  const { forSale, forRent, stats } = await getData();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-slate-950">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.4),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(16,185,129,0.2),transparent_50%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />

        <div className="relative mx-auto max-w-[1180px] px-4 pb-12 pt-12 text-center sm:pb-16 sm:pt-20">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-medium text-slate-200 ring-1 ring-inset ring-white/15 backdrop-blur">
            <BadgeCheck size={14} className="text-emerald-400" />
            Pakistan&apos;s trusted automobile marketplace
          </span>

          <h1 className="mx-auto mt-5 max-w-3xl text-[2rem] font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
            Buy, sell &amp; rent{" "}
            <span className="bg-gradient-to-r from-indigo-300 via-sky-300 to-emerald-300 bg-clip-text text-transparent">
              vehicles you&apos;ll love
            </span>
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
            <div className="flex items-center gap-2 rounded-2xl rounded-tl-none bg-white p-2 pl-4 shadow-2xl shadow-indigo-950/40">
              <Search size={19} className="flex-shrink-0 text-slate-400" />
              <input
                name="search"
                type="text"
                aria-label="Search vehicles"
                placeholder="Try “Civic 2020” or “Karachi”"
                className="min-w-0 flex-1 bg-transparent py-2.5 text-[15px] text-slate-900 outline-none placeholder:text-slate-400 sm:text-base"
              />
              <button
                type="submit"
                aria-label="Search"
                className="inline-flex flex-shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-500 px-3.5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 transition hover:brightness-110 sm:px-6"
              >
                <span className="hidden sm:inline">Search</span>
                <ArrowRight size={17} />
              </button>
            </div>
          </form>

          {/* Popular searches */}
          <div className="mx-auto mt-4 flex max-w-2xl flex-wrap items-center justify-center gap-2 text-xs">
            <span className="text-slate-500">Popular:</span>
            {POPULAR.map(term => (
              <Link
                key={term}
                href={`/listings?search=${encodeURIComponent(term)}`}
                className="rounded-full bg-white/5 px-3 py-1 text-slate-300 ring-1 ring-inset ring-white/10 transition hover:bg-white/10 hover:text-white"
              >
                {term}
              </Link>
            ))}
          </div>

          {/* Stats */}
          <div className="mx-auto mt-10 grid max-w-2xl grid-cols-3 gap-2 sm:gap-4">
            {[
              { label: "Active listings", value: stats.total },
              { label: "For sale", value: stats.totalSale },
              { label: "For rent", value: stats.totalRent },
            ].map(s => (
              <div key={s.label} className="rounded-2xl bg-white/5 px-2 py-4 ring-1 ring-inset ring-white/10 backdrop-blur sm:py-5">
                <p className="text-xl font-bold tracking-tight text-white sm:text-3xl">{s.value.toLocaleString()}</p>
                <p className="mt-1 text-[11px] text-slate-400 sm:text-xs">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1180px] space-y-14 px-4 py-10 sm:space-y-20 sm:py-14">
        {/* ── Browse by make ── */}
        <section>
          <SectionHeader eyebrow="Brands" title="Browse by make" href="/listings" />
          <BrandLogos />
        </section>

        {/* ── Latest for sale ── */}
        <section>
          <SectionHeader eyebrow="Fresh arrivals" title="Latest for sale" href="/listings?type=SALE" />
          {forSale.length === 0 ? (
            <EmptyState text="No listings for sale yet" />
          ) : (
            <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 sm:gap-5 lg:grid-cols-3">
              {forSale.map(listing => (
                <ListingCard key={String(listing._id)} listing={listing} />
              ))}
            </div>
          )}
        </section>

        {/* ── For rent ── */}
        <section>
          <SectionHeader eyebrow="Rentals" title="Available for rent" href="/listings?type=RENT" />
          {forRent.length === 0 ? (
            <EmptyState text="No rentals yet" />
          ) : (
            // Swipeable row on mobile, grid on larger screens
            <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden">
              {forRent.map(listing => (
                <div key={String(listing._id)} className="w-[72%] flex-shrink-0 snap-start min-[480px]:w-[45%] sm:w-auto">
                  <ListingCard listing={listing} />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Why AutoMarket ── */}
        <section>
          <SectionHeader eyebrow="Why AutoMarket" title="Everything you need, in one place" />
          <div className="grid gap-3 sm:grid-cols-3 sm:gap-5">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="group rounded-2xl border border-slate-200/80 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-20px_rgba(15,23,42,0.3)] sm:p-6"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow-lg shadow-indigo-500/25">
                  <Icon size={20} strokeWidth={1.9} />
                </div>
                <p className="mt-4 text-[15px] font-semibold text-slate-900">{title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── How it works ── */}
        <section>
          <SectionHeader eyebrow="Selling made simple" title="How it works" />
          <ol className="relative grid gap-3 sm:grid-cols-3 sm:gap-5">
            <div className="pointer-events-none absolute left-[16%] right-[16%] top-[42px] hidden h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent sm:block" />
            {STEPS.map(step => (
              <li key={step.n} className="relative flex gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 sm:flex-col sm:items-center sm:p-6 sm:text-center">
                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white ring-4 ring-slate-50">
                  {step.n}
                </span>
                <div>
                  <p className="text-[15px] font-semibold text-slate-900">{step.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-500">{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ── Browse by city ── */}
        <section>
          <SectionHeader eyebrow="Near you" title="Browse by city" />
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
            {CITIES.map(city => (
              <Link
                key={city}
                href={`/listings?location=${encodeURIComponent(city)}`}
                className="group flex items-center justify-between rounded-xl border border-slate-200/80 bg-white px-4 py-3.5 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <MapPin size={15} className="flex-shrink-0 text-slate-400 transition group-hover:text-indigo-500" />
                  <span className="truncate">{city}</span>
                </span>
                <ArrowRight size={14} className="flex-shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-900" />
              </Link>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-10 sm:px-12 sm:py-14">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(99,102,241,0.45),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(16,185,129,0.25),transparent_50%)]" />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-lg">
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">
                <Sparkles size={14} />
                Sell faster
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
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
