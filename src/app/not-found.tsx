import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import CrashScene from "@/components/CrashScene";

export const metadata: Metadata = {
  title: { absolute: "Page Not Found — AutoMarket" },
};

const SHORTCUTS = [
  { href: "/listings", label: "Browse vehicles" },
  { href: "/listings?type=RENT", label: "Rent a ride" },
  { href: "/deals", label: "Hot deals" },
  { href: "/sell", label: "Sell your vehicle" },
];

// Rendered for any URL that doesn't match a route, and whenever a page calls notFound(). A plain page that follows
// the theme: the big 404, the car crashing into a rock under it (CrashScene), a line of text and text-only links.
export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-16">
      <div className="w-full max-w-xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Error 404 · Wrong turn</p>

        {/* The 404 shudders when the car hits the rock (crash-shudder) */}
        <div className="crash-shudder mt-6">
          <p aria-hidden className="select-none bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500 bg-clip-text text-[110px] font-black leading-none tracking-tighter text-transparent sm:text-[160px]">
            404
          </p>
        </div>
        <CrashScene />

        <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">This road doesn&apos;t lead anywhere</h1>
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-slate-500">
          The page you&apos;re looking for may have been moved, or the listing has already found a new owner.
        </p>

        {/* Text-only links, no button backgrounds */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-[15px] font-semibold">
          <Link href="/" className="group inline-flex items-center gap-1.5 text-slate-900 hover:underline">
            <ArrowLeft size={17} className="transition group-hover:-translate-x-0.5" /> Back to home
          </Link>
          <Link href="/listings" className="group inline-flex items-center gap-1.5 text-indigo-600 hover:underline">
            Explore listings <ArrowRight size={17} className="transition group-hover:translate-x-0.5" />
          </Link>
        </div>

        <nav aria-label="Popular pages" className="mt-10 flex flex-wrap justify-center gap-x-5 gap-y-2 border-t border-slate-100 pt-6 text-sm">
          {SHORTCUTS.map(s => (
            <Link key={s.href} href={s.href} className="text-slate-500 transition hover:text-slate-900 hover:underline">{s.label}</Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
