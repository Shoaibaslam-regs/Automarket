import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Building2, CalendarDays, MapPin, MessageCircle, ShieldCheck, Wallet } from "lucide-react";
import Footer from "@/components/Footer";
import LiveStats from "@/components/home/LiveStats";
import { getPublicStats } from "@/lib/publicStats";
import { PLANS, formatPlanPrice } from "@/lib/plans";
import { whatsappLink } from "@/lib/supportContact";

export const metadata: Metadata = {
  title: "About AutoGO",
  description: "AutoGO is a Karachi-based marketplace for buying, selling and renting cars and bikes in Pakistan, with an affordable online console for rental businesses.",
  alternates: { canonical: "/about" },
};

export const revalidate = 60;

/** Linked only from the footer and the home page's "Why AutoGO" section, never from a menu */
export default async function AboutPage() {
  const stats = await getPublicStats();
  const wa = whatsappLink("Hi AutoGO team, I'd like to know more about AutoGO.");
  const cheapest = PLANS.STARTER.price;

  const facts = [
    { icon: CalendarDays, label: "Started", value: "2026" },
    { icon: MapPin, label: "Based in", value: "Karachi, Pakistan" },
    { icon: Building2, label: "Built for", value: "Rental businesses, dealers and everyone buying or selling" },
  ];

  const offers = [
    { title: "Buy", text: "Browse cars and bikes for sale across Pakistan, compare them and contact the seller directly.", href: "/listings?type=SALE", cta: "Cars for sale" },
    { title: "Rent", text: "Find a car or bike for a day, a week or an event, and book it online.", href: "/listings?type=RENT", cta: "Rent a vehicle" },
    { title: "Sell", text: "Post your vehicle with photos in a few minutes. Free plans are included.", href: "/sell", cta: "Post a listing" },
  ];

  const tools = [
    "Online bookings and walk-ins, with a calendar of every vehicle",
    "Handover and return details: plate, CNIC, odometer, fuel and late fees",
    "Printable booking and sale slips",
    "Customers, follow-ups and installments (qist)",
    "A cash book with expenses and profit per vehicle",
    "Staff accounts with their own roles",
  ];

  const trust = [
    "Every vehicle photo is checked automatically, so listings show real vehicles.",
    "Businesses can carry a Verified tick, and sellers a Phone verified tick.",
    "Only people who really dealt with a business can review it.",
    "Anyone can report a listing, deal or business, and the AutoGO team reviews it.",
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="relative overflow-hidden bg-slate-950 px-4 pb-14 pt-12 text-white sm:pt-16">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-indigo-600/30 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-28 left-10 h-56 w-56 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="relative mx-auto max-w-[1080px]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-200">About AutoGO</p>
          <h1 className="mt-4 max-w-[720px] text-3xl font-extrabold tracking-tight sm:text-4xl">
            Bringing Pakistan&apos;s vehicle rental businesses online
          </h1>
          <p className="mt-3 max-w-[640px] text-sm leading-relaxed text-slate-400">
            AutoGO is a marketplace to buy, sell and rent cars and bikes, and an affordable online console for the businesses that rent and sell them.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1080px] space-y-4 px-4 py-10">
        <section className="grid gap-4 sm:grid-cols-3">
          {facts.map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-2xl bg-white p-5 ring-1 ring-slate-200/80">
              <Icon size={18} className="text-indigo-600" />
              <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl bg-white p-6 ring-1 ring-slate-200/80 sm:p-7">
          <h2 className="text-lg font-bold tracking-tight text-slate-900">Why we started</h2>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-600">
            <p>
              AutoGO started in 2026. Almost everything is going digital, but people who run a car or bike rental business in Pakistan still had no
              platform of their own: bookings lived in registers, phone calls and WhatsApp chats.
            </p>
            <p>
              Custom software is more than most small rental businesses can afford. AutoGO gives them the same tools for a small monthly fee, with paid
              plans from {formatPlanPrice(cheapest)} a month and a free plan to start, so they can take bookings online and manage their vehicles,
              customers and money in one place.
            </p>
            <p>
              The same marketplace serves everyone else too: dealers, private sellers, buyers and renters.
            </p>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 ring-1 ring-slate-200/80 sm:p-7">
          <h2 className="text-lg font-bold tracking-tight text-slate-900">What you can do on AutoGO</h2>
          <div className="mt-4 grid gap-5 sm:grid-cols-3">
            {offers.map(o => (
              <div key={o.title}>
                <p className="text-[15px] font-semibold text-slate-900">{o.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{o.text}</p>
                <Link href={o.href} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:underline">
                  {o.cta} <ArrowRight size={14} />
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 ring-1 ring-slate-200/80 sm:p-7">
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900">
            <Wallet size={18} className="text-indigo-600" /> For rental businesses and dealers
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            The business console runs the daily work of a rental company or showroom, from any phone or computer:
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-600">
            {tools.map(item => <li key={item} className="pl-1">{item}</li>)}
          </ul>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/business/onboarding" className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
              Start a business <ArrowRight size={15} />
            </Link>
            <Link href="/pricing" className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50">
              Plans &amp; pricing
            </Link>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 ring-1 ring-slate-200/80 sm:p-7">
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900">
            <ShieldCheck size={18} className="text-emerald-600" /> Built on trust
          </h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-600">
            {trust.map(item => <li key={item} className="pl-1">{item}</li>)}
          </ul>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Deals are made directly between you and the seller or owner. Read our{" "}
            <Link href="/help#safety" className="font-semibold text-indigo-600 hover:underline">safety tips</Link> before you pay anyone.
          </p>
        </section>

        <LiveStats initial={stats} />

        <section className="rounded-2xl bg-white p-6 ring-1 ring-slate-200/80 sm:p-7">
          <h2 className="text-lg font-bold tracking-tight text-slate-900">Who we are</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            AutoGO is built and run by a small team at a Karachi-based company. Questions, ideas or a problem? Use Send feedback at the bottom of this page{wa ? ", or message us on WhatsApp" : ""}.
            Businesses can also reach us from Help &amp; support in their console.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {wa && (
              <a href={wa} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
                <MessageCircle size={15} /> WhatsApp us
              </a>
            )}
            <Link href="/help" className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50">
              Help &amp; safety
            </Link>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}
