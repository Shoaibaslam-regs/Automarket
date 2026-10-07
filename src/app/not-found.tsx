import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarCheck, Car, Search, Tag } from "lucide-react";

export const metadata: Metadata = {
  title: { absolute: "Page Not Found — AutoMarket" },
};

const SHORTCUTS = [
  { href: "/listings", icon: Search, title: "Browse vehicles", desc: "Cars, bikes & more for sale" },
  { href: "/listings?type=RENT", icon: CalendarCheck, title: "Rent a ride", desc: "Daily rentals near you" },
  { href: "/sell", icon: Tag, title: "Sell your vehicle", desc: "List it free in minutes" },
];

// Rendered for any URL that doesn't match a route, and whenever a page calls notFound().
// Reuses the landing page's lp-* animations from globals.css.
export default function NotFound() {
  return (
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-16 text-white selection:bg-indigo-500/40">
      {/* Aurora + grid backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="lp-aurora absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-indigo-600/30 blur-[120px]" />
        <div className="lp-aurora absolute -right-32 top-1/4 h-[460px] w-[460px] rounded-full bg-sky-500/20 blur-[120px] [animation-delay:-6s]" />
        <div className="lp-aurora absolute -bottom-20 left-1/3 h-[380px] w-[380px] rounded-full bg-emerald-500/15 blur-[120px] [animation-delay:-12s]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_45%,black,transparent)]" />
      </div>

      <div className="w-full max-w-3xl text-center">
        <div className="lp-rise inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1.5 pl-2 pr-3.5 text-xs text-slate-300 backdrop-blur">
          <span className="relative flex h-2 w-2">
            <span className="lp-pulse-ring absolute inline-flex h-full w-full rounded-full bg-amber-400" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
          </span>
          Error 404 · Wrong turn
        </div>

        {/* Big 404 with a car cruising on a road beneath it */}
        <div className="lp-rise relative mx-auto mt-8 [animation-delay:120ms]">
          <p
            aria-hidden
            className="lp-gradient-text select-none bg-gradient-to-r from-indigo-300 via-sky-300 to-emerald-300 bg-clip-text text-[120px] font-black leading-none tracking-tighter text-transparent drop-shadow-[0_0_60px_rgba(99,102,241,0.35)] sm:text-[180px]"
          >
            404
          </p>
          <div className="relative mx-auto mt-2 h-14 max-w-md">
            <div className="absolute inset-x-0 bottom-3 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            <div className="absolute inset-x-8 bottom-[11px] h-[2px] bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.35)_0_14px,transparent_14px_28px)] [mask-image:linear-gradient(90deg,transparent,black_20%,black_80%,transparent)]" />
            {/* Outer div centers; inner span floats (both use transform, so they can't share an element) */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
              <span className="lp-float flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/30 to-sky-500/30 text-indigo-100 shadow-[0_0_30px_-4px_rgba(99,102,241,0.8)] ring-1 ring-inset ring-white/15 backdrop-blur">
                <Car size={22} strokeWidth={1.8} />
              </span>
            </div>
          </div>
        </div>

        <h1 className="lp-rise mt-4 text-3xl font-bold tracking-tight sm:text-5xl [animation-delay:240ms]">
          This road doesn&apos;t lead anywhere
        </h1>
        <p className="lp-rise mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg [animation-delay:360ms]">
          The page you&apos;re looking for may have been moved, or the listing has already found a new owner.
        </p>

        <div className="lp-rise mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row [animation-delay:480ms]">
          <Link
            href="/"
            className="lp-shine group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-sky-600 px-7 py-4 text-[15px] font-semibold shadow-[0_0_40px_-8px_rgba(99,102,241,0.8)] transition hover:shadow-[0_0_60px_-6px_rgba(99,102,241,0.9)] sm:w-auto"
          >
            <ArrowLeft size={18} className="transition group-hover:-translate-x-0.5" />
            Back to home
          </Link>
          <Link
            href="/listings"
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-7 py-4 text-[15px] font-semibold text-white backdrop-blur transition hover:border-white/25 hover:bg-white/10 sm:w-auto"
          >
            Explore listings
          </Link>
        </div>

        <div className="lp-rise mt-14 grid gap-3 text-left sm:grid-cols-3 [animation-delay:600ms]">
          {SHORTCUTS.map(({ href, icon: Icon, title, desc }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.06]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-sky-500/20 text-indigo-200 ring-1 ring-inset ring-white/10">
                <Icon size={18} strokeWidth={1.8} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{title}</span>
                <span className="block truncate text-xs text-slate-400">{desc}</span>
              </span>
              <ArrowRight size={16} className="shrink-0 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-white" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
