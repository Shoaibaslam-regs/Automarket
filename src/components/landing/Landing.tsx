"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  Camera,
  Car,
  Check,
  MapPin,
  MessageCircle,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { CountUp, Reveal, trackPointer } from "./effects";

export type ShowcaseListing = {
  _id: string;
  title: string;
  make: string;
  model: string;
  year: number;
  price: number;
  type: "SALE" | "RENT" | "BOTH";
  location: string;
  image: string;
};

export type LandingStats = { listings: number; users: number; cities: number; rentals: number };

const BRANDS = ["Toyota", "Honda", "Suzuki", "Hyundai", "Kia", "BMW", "Mercedes", "Yamaha", "Kawasaki", "Ford", "Audi", "Changan"];
const CITIES = ["Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar", "Quetta"];

function SectionTitle({ eyebrow, title, desc }: { eyebrow: string; title: React.ReactNode; desc?: string }) {
  return (
    <Reveal className="mx-auto mb-12 max-w-2xl text-center sm:mb-16">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-300">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-5xl">{title}</h2>
      {desc && <p className="mt-4 text-base leading-relaxed text-slate-400 sm:text-lg">{desc}</p>}
    </Reveal>
  );
}

/** Card with a cursor-following glow. */
function GlowCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      onPointerMove={trackPointer}
      className={`group relative h-full overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6 transition duration-300 hover:border-white/20 sm:p-7 ${className}`}
    >
      <div className="lp-spotlight pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative h-full">{children}</div>
    </div>
  );
}

function FeatureIcon({ icon: Icon }: { icon: typeof Car }) {
  return (
    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-sky-500/20 text-indigo-200 ring-1 ring-inset ring-white/10">
      <Icon size={20} strokeWidth={1.8} />
    </span>
  );
}

function ShowcaseCard({ listing, className = "" }: { listing?: ShowcaseListing; className?: string }) {
  return (
    <div className={`w-[230px] overflow-hidden rounded-2xl border border-white/15 bg-slate-900/80 shadow-2xl shadow-black/50 backdrop-blur-xl sm:w-[260px] ${className}`}>
      <div className="relative aspect-[4/3] bg-gradient-to-br from-slate-800 to-slate-900">
        {listing ? (
          <Image src={listing.image} alt={listing.title} fill sizes="260px" className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-600">
            <Car size={40} strokeWidth={1.2} />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
        {listing && (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-slate-900">
            {listing.type === "RENT" ? "For Rent" : listing.type === "BOTH" ? "Sale & Rent" : "For Sale"}
          </span>
        )}
      </div>
      <div className="p-3.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          {listing ? `${listing.make} · ${listing.year}` : "Your vehicle"}
        </p>
        <p className="mt-0.5 truncate text-sm font-semibold text-white">{listing?.title ?? "List it in minutes"}</p>
        <div className="mt-2 flex items-center justify-between">
          <p className="text-sm font-bold text-white">
            {listing ? (
              <>
                <span className="mr-1 text-[10px] font-semibold text-slate-400">PKR</span>
                {listing.price.toLocaleString()}
                {listing.type === "RENT" && <span className="text-[10px] font-medium text-slate-400">/day</span>}
              </>
            ) : (
              "Free to post"
            )}
          </p>
          {listing && (
            <span className="flex items-center gap-1 text-[10px] text-slate-400">
              <MapPin size={10} />
              {listing.location}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Landing({ listings, stats }: { listings: ShowcaseListing[]; stats: LandingStats }) {
  const [front, middle, back] = [listings[0], listings[1], listings[2]];
  const heroWords = ["Buy,", "sell", "&", "rent"];

  return (
    <div className="relative min-h-screen overflow-x-clip bg-slate-950 text-white selection:bg-indigo-500/40">
      {/* ── HERO ── */}
      <section onPointerMove={trackPointer} className="relative isolate">
        {/* Aurora + grid + cursor spotlight */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="lp-aurora absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-indigo-600/30 blur-[120px]" />
          <div className="lp-aurora absolute -right-32 top-20 h-[460px] w-[460px] rounded-full bg-sky-500/20 blur-[120px] [animation-delay:-6s]" />
          <div className="lp-aurora absolute bottom-0 left-1/3 h-[380px] w-[380px] rounded-full bg-emerald-500/15 blur-[120px] [animation-delay:-12s]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_40%,black,transparent)]" />
          <div className="lp-spotlight absolute inset-0" />
        </div>

        <div className="mx-auto grid max-w-[1200px] items-center gap-14 px-4 pb-20 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-[1.1fr_1fr] lg:gap-8 lg:pb-28 lg:pt-24">
          {/* Copy */}
          <div className="text-center lg:text-left">
            <div className="lp-rise inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1.5 pl-2 pr-3.5 text-xs text-slate-300 backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="lp-pulse-ring absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Pakistan&apos;s smart automobile marketplace
            </div>

            <h1 className="mt-6 text-[2.75rem] font-extrabold leading-[1.02] tracking-[-0.035em] sm:text-6xl lg:text-7xl">
              <span className="block">
                {heroWords.map((w, i) => (
                  <span key={w} className="lp-rise mr-[0.25em] inline-block" style={{ animationDelay: `${120 + i * 90}ms` }}>
                    {w}
                  </span>
                ))}
              </span>
              <span
                className="lp-rise lp-gradient-text mt-1 inline-block bg-gradient-to-r from-indigo-300 via-sky-300 to-emerald-300 bg-clip-text pb-2 text-transparent"
                style={{ animationDelay: "520ms" }}
              >
                vehicles, beautifully.
              </span>
            </h1>

            <p
              className="lp-rise mx-auto mt-6 max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg lg:mx-0"
              style={{ animationDelay: "680ms" }}
            >
              Discover cars and bikes across Pakistan with AI-powered inspections, secure rental bookings and direct
              chat with sellers. No middlemen.
            </p>

            <div className="lp-rise mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start" style={{ animationDelay: "820ms" }}>
              <Link
                href="/home"
                className="lp-shine group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-sky-600 px-7 py-4 text-[15px] font-semibold shadow-[0_0_40px_-8px_rgba(99,102,241,0.8)] transition hover:shadow-[0_0_60px_-6px_rgba(99,102,241,0.9)] sm:w-auto"
              >
                Explore vehicles
                <ArrowRight size={18} className="transition group-hover:translate-x-1" />
              </Link>
              <Link
                href="/sell"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-7 py-4 text-[15px] font-semibold text-white backdrop-blur transition hover:border-white/30 hover:bg-white/10 sm:w-auto"
              >
                Sell your vehicle
              </Link>
            </div>

            <ul className="lp-rise mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-400 lg:justify-start" style={{ animationDelay: "960ms" }}>
              {["Free to list", "AI inspection", "Direct seller chat"].map(t => (
                <li key={t} className="flex items-center gap-1.5">
                  <Check size={15} className="text-emerald-400" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Showcase: tilts with the cursor, cards float */}
          <div className="lp-rise relative mx-auto h-[400px] w-full max-w-[520px] sm:h-[460px]" style={{ animationDelay: "400ms" }}>
            <div
              className="relative h-full w-full transition-transform duration-300 ease-out [transform-style:preserve-3d]"
              style={{
                transform:
                  "perspective(1400px) rotateY(calc(var(--px, 0) * 10deg)) rotateX(calc(var(--py, 0) * -8deg))",
              }}
            >
              <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/30 blur-[90px]" />

              {/* Outer div positions/rotates, inner div floats (both use `transform`, so they can't share an element) */}
              <div className="absolute left-[2%] top-[4%] -rotate-[8deg] opacity-70 sm:left-[4%]">
                <div className="lp-float [animation-delay:-2s]">
                  <ShowcaseCard listing={back} />
                </div>
              </div>
              <div className="absolute right-[0%] top-[10%] rotate-[7deg] opacity-80 sm:right-[2%]">
                <div className="lp-float [animation-delay:-4s]">
                  <ShowcaseCard listing={middle} />
                </div>
              </div>
              <div className="absolute bottom-[2%] left-1/2 -translate-x-1/2">
                <div className="lp-float">
                  <ShowcaseCard listing={front} className="ring-1 ring-indigo-400/40" />
                </div>
              </div>

              {/* Floating chips */}
              <div className="lp-float absolute left-0 top-[52%] flex items-center gap-2.5 rounded-2xl border border-white/10 bg-slate-900/80 px-3.5 py-2.5 shadow-2xl backdrop-blur-xl [animation-delay:-1s] sm:-left-6">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
                  <ScanSearch size={16} />
                </span>
                <div>
                  <p className="text-[10px] text-slate-400">AI inspection</p>
                  <p className="text-xs font-semibold text-white">Report ready</p>
                </div>
              </div>
              <div className="lp-float absolute right-0 top-[64%] flex items-center gap-2.5 rounded-2xl border border-white/10 bg-slate-900/80 px-3.5 py-2.5 shadow-2xl backdrop-blur-xl [animation-delay:-3s] sm:-right-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
                  <CalendarCheck size={16} />
                </span>
                <div>
                  <p className="text-[10px] text-slate-400">Rental</p>
                  <p className="text-xs font-semibold text-white">Booking confirmed</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── BRAND MARQUEE ── */}
      <section className="border-y border-white/5 bg-white/[0.015] py-8">
        <p className="mb-5 text-center text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Every major make, one marketplace</p>
        <div className="relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
          <div className="lp-marquee flex w-max gap-12 pr-12 sm:gap-16 sm:pr-16">
            {[...BRANDS, ...BRANDS].map((b, i) => (
              <Link
                key={`${b}-${i}`}
                href={`/listings?make=${encodeURIComponent(b)}`}
                aria-hidden={i >= BRANDS.length}
                tabIndex={i >= BRANDS.length ? -1 : undefined}
                className="text-xl font-bold tracking-tight text-slate-600 transition hover:text-white sm:text-2xl"
              >
                {b}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6 sm:py-24">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 lg:grid-cols-4">
          {[
            { label: "Active listings", value: stats.listings },
            { label: "Registered users", value: stats.users },
            { label: "Cities with listings", value: stats.cities },
            { label: "Vehicles for rent", value: stats.rentals },
          ].map((s, i) => (
            <Reveal key={s.label} delay={i * 90} className="bg-slate-950 px-4 py-8 text-center sm:py-10">
              <p className="bg-gradient-to-b from-white to-slate-400 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl">
                <CountUp value={s.value} />
              </p>
              <p className="mt-2 text-xs text-slate-400 sm:text-sm">{s.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── FEATURES (bento) ── */}
      <section id="features" className="mx-auto max-w-[1200px] scroll-mt-20 px-4 pb-24 sm:px-6 sm:pb-32">
        <SectionTitle
          eyebrow="Features"
          title={
            <>
              Built for <span className="bg-gradient-to-r from-indigo-300 to-sky-300 bg-clip-text text-transparent">confident</span> deals
            </>
          }
          desc="Everything you need to buy, sell or rent a vehicle without the guesswork."
        />

        <div className="grid auto-rows-[minmax(240px,auto)] gap-4 md:grid-cols-3">
          {/* AI inspection — large */}
          <Reveal className="md:col-span-2">
            <GlowCard>
              <div className="grid h-full gap-6 sm:grid-cols-2 sm:items-center">
                <div>
                  <FeatureIcon icon={ScanSearch} />
                  <h3 className="mt-5 text-xl font-semibold">AI vehicle inspection</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    Upload a few photos and get an instant report on paint, body and tyres, plus a fair value estimate.
                  </p>
                </div>
                <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
                  {front ? (
                    <Image src={front.image} alt="" fill sizes="(max-width: 768px) 90vw, 380px" className="object-cover opacity-80" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-700">
                      <Car size={64} strokeWidth={1} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(129,140,248,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(129,140,248,0.12)_1px,transparent_1px)] bg-[size:24px_24px]" />
                  <div className="lp-scan absolute inset-x-0 h-12 bg-gradient-to-b from-transparent via-sky-400/30 to-transparent">
                    <div className="absolute inset-x-0 top-1/2 h-px bg-sky-300 shadow-[0_0_12px_2px_rgba(56,189,248,0.8)]" />
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-1.5">
                    {[
                      { t: "Paint", ok: true },
                      { t: "Tyres", ok: true },
                      { t: "Minor dent", ok: false },
                    ].map((tag, i) => (
                      <span
                        key={tag.t}
                        className={`lp-pop inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold backdrop-blur ${
                          tag.ok ? "bg-emerald-500/25 text-emerald-200" : "bg-amber-500/25 text-amber-200"
                        }`}
                        style={{ animationDelay: `${500 + i * 250}ms` }}
                      >
                        {tag.ok ? <Check size={10} /> : <Zap size={10} />}
                        {tag.t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </GlowCard>
          </Reveal>

          {/* Direct chat */}
          <Reveal delay={100}>
            <GlowCard>
              <FeatureIcon icon={MessageCircle} />
              <h3 className="mt-5 text-lg font-semibold">Direct chat</h3>
              <p className="mt-2 text-sm text-slate-400">Talk to owners instantly. No agents in between.</p>
              <div className="mt-5 space-y-2 text-xs">
                <p className="lp-pop w-fit max-w-[85%] rounded-2xl rounded-bl-md bg-white/10 px-3 py-2 text-slate-200" style={{ animationDelay: "300ms" }}>
                  Is the Corolla still available?
                </p>
                <p className="lp-pop ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-indigo-600 px-3 py-2" style={{ animationDelay: "800ms" }}>
                  Yes! Come see it today 🚗
                </p>
              </div>
            </GlowCard>
          </Reveal>

          {/* Secure bookings */}
          <Reveal delay={0}>
            <GlowCard>
              <FeatureIcon icon={CalendarCheck} />
              <h3 className="mt-5 text-lg font-semibold">Secure bookings</h3>
              <p className="mt-2 text-sm text-slate-400">Pick dates, get confirmed and download your booking slip.</p>
              <div className="mt-5 grid grid-cols-7 gap-1 text-center text-[10px]">
                {Array.from({ length: 14 }).map((_, i) => {
                  const inRange = i >= 3 && i <= 6;
                  const edge = i === 3 || i === 6;
                  return (
                    <span
                      key={i}
                      className={`rounded-md py-1.5 ${
                        edge ? "bg-indigo-500 font-bold text-white" : inRange ? "bg-indigo-500/25 text-indigo-100" : "bg-white/5 text-slate-500"
                      }`}
                    >
                      {i + 8}
                    </span>
                  );
                })}
              </div>
            </GlowCard>
          </Reveal>

          {/* Pakistan-wide */}
          <Reveal delay={100}>
            <GlowCard>
              <FeatureIcon icon={MapPin} />
              <h3 className="mt-5 text-lg font-semibold">Pakistan-wide</h3>
              <p className="mt-2 text-sm text-slate-400">Browse listings from every major city.</p>
              <div className="mt-5 flex flex-wrap gap-1.5">
                {CITIES.map((c, i) => (
                  <Link
                    key={c}
                    href={`/listings?location=${encodeURIComponent(c)}`}
                    className="lp-pop rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-300 transition hover:border-white/30 hover:text-white"
                    style={{ animationDelay: `${200 + i * 70}ms` }}
                  >
                    {c}
                  </Link>
                ))}
              </div>
            </GlowCard>
          </Reveal>

          {/* Sell in minutes */}
          <Reveal delay={200}>
            <GlowCard>
              <FeatureIcon icon={Camera} />
              <h3 className="mt-5 text-lg font-semibold">Sell in minutes</h3>
              <p className="mt-2 text-sm text-slate-400">Photos, details, price. Your ad is live.</p>
              <div className="mt-5 space-y-2.5">
                {["Upload photos", "Add details", "Publish ad"].map((s, i) => (
                  <div key={s} className="lp-pop flex items-center gap-2.5 text-xs text-slate-300" style={{ animationDelay: `${300 + i * 300}ms` }}>
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
                      <Check size={11} />
                    </span>
                    {s}
                  </div>
                ))}
              </div>
            </GlowCard>
          </Reveal>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="relative border-t border-white/5 py-24 sm:py-32">
        <div className="pointer-events-none absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent" />
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <SectionTitle eyebrow="How it works" title="From search to keys in three steps" />
          <ol className="relative grid gap-6 md:grid-cols-3 md:gap-8">
            <div className="pointer-events-none absolute left-[16%] right-[16%] top-8 hidden h-px bg-gradient-to-r from-indigo-500/0 via-indigo-400/60 to-indigo-500/0 md:block" />
            {[
              { icon: Sparkles, title: "Discover", desc: "Explore cars and bikes for sale or rent, filtered exactly how you like." },
              { icon: ShieldCheck, title: "Inspect", desc: "Review details and AI inspection insights before you commit." },
              { icon: BadgeCheck, title: "Connect", desc: "Chat with the owner, book or buy, and drive away with confidence." },
            ].map((step, i) => (
              <Reveal key={step.title} as="li" delay={i * 150} className="relative text-center">
                <span className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-slate-900 text-indigo-200 shadow-[0_0_40px_-10px_rgba(99,102,241,0.7)]">
                  <step.icon size={24} strokeWidth={1.7} />
                  <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 text-[11px] font-bold">
                    {i + 1}
                  </span>
                </span>
                <h3 className="mt-6 text-lg font-semibold">{step.title}</h3>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-slate-400">{step.desc}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ── LIVE LISTINGS STRIP ── */}
      {listings.length > 0 && (
        <section className="mx-auto max-w-[1200px] px-4 pb-24 sm:px-6">
          <Reveal className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-300">Live now</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Fresh on the marketplace</h2>
            </div>
            <Link href="/listings" className="group hidden items-center gap-1 text-sm font-semibold text-slate-300 transition hover:text-white sm:inline-flex">
              View all <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
            </Link>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((l, i) => (
              <Reveal key={l._id} delay={i * 120}>
                <Link href={`/listings/${l._id}`} className="group block overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] transition hover:-translate-y-1 hover:border-white/20">
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <Image src={l.image} alt={l.title} fill sizes="(max-width: 640px) 100vw, 380px" className="object-cover transition duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/10 to-transparent" />
                    <div className="absolute inset-x-4 bottom-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                        {l.make} · {l.model} · {l.year}
                      </p>
                      <p className="mt-0.5 truncate text-lg font-semibold">{l.title}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3.5">
                    <p className="font-bold">
                      <span className="mr-1 text-xs font-semibold text-slate-400">PKR</span>
                      {l.price.toLocaleString()}
                      {l.type === "RENT" && <span className="text-xs font-medium text-slate-400">/day</span>}
                    </p>
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <MapPin size={12} />
                      {l.location}
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* ── FINAL CTA (rotating gradient border) ── */}
      <section className="mx-auto max-w-[1200px] px-4 pb-24 sm:px-6 sm:pb-32">
        <Reveal>
          <div className="lp-border-spin rounded-[2rem] p-px">
            <div className="relative overflow-hidden rounded-[calc(2rem-1px)] bg-slate-950 px-6 py-16 text-center sm:px-12 sm:py-20">
              <div className="lp-aurora pointer-events-none absolute -left-20 -top-24 h-80 w-80 rounded-full bg-indigo-600/30 blur-[100px]" />
              <div className="lp-aurora pointer-events-none absolute -bottom-24 -right-20 h-80 w-80 rounded-full bg-sky-500/20 blur-[100px] [animation-delay:-8s]" />
              <div className="relative">
                <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight sm:text-5xl">
                  Your next vehicle is <span className="lp-gradient-text bg-gradient-to-r from-indigo-300 via-sky-300 to-emerald-300 bg-clip-text text-transparent">one search away</span>
                </h2>
                <p className="mx-auto mt-4 max-w-lg text-slate-400">Join AutoMarket today. It&apos;s free to browse, free to list.</p>
                <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Link
                    href="/register"
                    className="lp-shine group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-white px-7 py-4 text-[15px] font-semibold text-slate-950 transition hover:bg-slate-100 sm:w-auto"
                  >
                    Create free account
                    <ArrowRight size={18} className="transition group-hover:translate-x-1" />
                  </Link>
                  <Link
                    href="/home"
                    className="inline-flex w-full items-center justify-center rounded-2xl border border-white/15 px-7 py-4 text-[15px] font-semibold transition hover:border-white/30 hover:bg-white/5 sm:w-auto"
                  >
                    Browse first
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/5">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} AutoMarket Pakistan. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/listings" className="transition hover:text-white">Browse</Link>
            <Link href="/sell" className="transition hover:text-white">Sell</Link>
            <Link href="/login" className="transition hover:text-white">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
