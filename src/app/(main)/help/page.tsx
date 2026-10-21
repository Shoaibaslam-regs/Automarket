import Link from "next/link";
import type { Metadata } from "next";
import { LifeBuoy, MessageCircle } from "lucide-react";
import Footer from "@/components/Footer";
import { PLANS, VERIFIED_BADGE } from "@/lib/plans";
import { LATE_RULE_TEXT } from "@/lib/bookings";
import { whatsappLink } from "@/lib/supportContact";
import { MAX_COMPARE } from "@/lib/compare";

export const metadata: Metadata = {
  title: "Help & safety",
  description: "How buying, renting and selling work on AutoMarket, and how to stay safe when you deal with sellers in Pakistan.",
  alternates: { canonical: "/help" },
};

type Section = { id: string; title: string; body: React.ReactNode };

const free = PLANS.FREE.limits;

const SECTIONS: Section[] = [
  {
    id: "buying",
    title: "Buying a vehicle",
    body: (
      <>
        <p>
          Find a car or bike on <Link href="/listings">Browse</Link> and open it to see the photos, details and where to see it.
          Save it with the heart, or add up to {MAX_COMPARE} vehicles to <Link href="/compare">Compare</Link>.
        </p>
        <ul>
          <li><strong>From a business:</strong> tap &quot;Buy this vehicle&quot; to send a purchase request with your offer. The business agrees the price with you, and you get a sale slip once it&apos;s sold. Follow it in <Link href="/purchases">My purchases</Link>.</li>
          <li><strong>From a private seller:</strong> call, WhatsApp or message them on AutoMarket and agree the deal directly.</li>
        </ul>
      </>
    ),
  },
  {
    id: "renting",
    title: "Renting a vehicle",
    body: (
      <>
        <p>
          Pick a vehicle marked For Rent, choose your dates and send a booking request. The owner confirms it, and you can follow it in{" "}
          <Link href="/bookings">Bookings</Link>. Rental packages for weddings, trips and events are on <Link href="/deals">Hot deals</Link>.
        </p>
        <ul>
          <li><strong>At pickup</strong> the owner records the number plate and your CNIC, and sets the return time.</li>
          <li><strong>Late return:</strong> {LATE_RULE_TEXT}</li>
          <li><strong>Security deposit:</strong> it is returned after the vehicle comes back. If the owner keeps part of it, they must write the reason.</li>
        </ul>
      </>
    ),
  },
  {
    id: "selling",
    title: "Selling or renting out",
    body: (
      <>
        <p>
          Tap <Link href="/sell">Sell</Link>, add the details and photos, and your listing goes live straight away. Every photo is checked
          automatically, so only real vehicle photos are shown.
        </p>
        <ul>
          <li>The free plan includes {free.listings} listings a month. Need more, a team or a customer list? See <Link href="/pricing">Plans &amp; pricing</Link>.</li>
          <li>When a vehicle is sold or rented, mark it from your <Link href="/dashboard">Dashboard</Link> so buyers know.</li>
          <li>Showrooms and rental companies can open a free business console for bookings, sales, customers and money.</li>
        </ul>
      </>
    ),
  },
  {
    id: "safety",
    title: "Stay safe",
    body: (
      <ul>
        <li><strong>Never pay in advance</strong> before you have seen the vehicle and its documents in person. AutoMarket never asks you to pay a seller.</li>
        <li>Meet in a busy public place or at the seller&apos;s shop, in daylight, and take someone with you.</li>
        <li>Check the registration book and the chassis and engine numbers, and verify the vehicle with your province&apos;s Excise &amp; Taxation department.</li>
        <li>Make sure the name on the documents matches the seller&apos;s CNIC, and take a test drive.</li>
        <li>Look for the <strong>Verified</strong> tick on businesses and the <strong>Phone verified</strong> tick on sellers.</li>
        <li>Something wrong? Use <strong>Report</strong> on the listing, deal or business page and our team will look into it.</li>
      </ul>
    ),
  },
  {
    id: "faq",
    title: "Common questions",
    body: (
      <dl className="space-y-3">
        <div>
          <dt className="font-semibold text-slate-800">Is AutoMarket free?</dt>
          <dd>Yes. Browsing, buying, renting and up to {free.listings} listings a month are free. Paid plans add more listings and business tools.</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-800">What does the Verified tick mean?</dt>
          <dd>The business was checked by the AutoMarket team. It is a paid add-on (PKR {VERIFIED_BADGE.price.toLocaleString()} a month), and it disappears if it isn&apos;t renewed.</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-800">Does AutoMarket take part in the deal?</dt>
          <dd>No. Deals are made directly between you and the seller or owner. Read the <Link href="/terms">Terms &amp; Conditions</Link> for the full rules.</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-800">How do I get notified on my phone?</dt>
          <dd>Install the AutoMarket app from the menu, then turn on phone notifications on the <Link href="/notifications">Notifications</Link> page.</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-800">Can I delete my account?</dt>
          <dd>Yes, from <Link href="/profile">Profile &amp; settings</Link>. Finish or cancel any confirmed bookings first.</dd>
        </div>
      </dl>
    ),
  },
];

export default function HelpPage() {
  const wa = whatsappLink("Hi AutoMarket team, I need some help.");
  return (
    <div className="min-h-screen bg-slate-50">
      <section className="relative overflow-hidden bg-slate-950 px-4 pb-14 pt-12 text-white sm:pt-16">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-indigo-600/30 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-28 left-10 h-56 w-56 rounded-full bg-amber-500/15 blur-3xl" />
        <div className="relative mx-auto max-w-[1080px]">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-indigo-200 ring-1 ring-inset ring-white/10">
            <LifeBuoy size={13} /> Help centre
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">Help &amp; safety</h1>
          <p className="mt-2 max-w-[620px] text-sm leading-relaxed text-slate-400">
            How buying, renting and selling work on AutoMarket, and how to make every deal a safe one.
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1080px] gap-8 px-4 py-10 lg:grid-cols-[220px_minmax(0,1fr)]">
        {/* Contents */}
        <nav aria-label="Contents" className="hidden lg:block">
          <div className="sticky top-24">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Contents</p>
            <ol className="space-y-1.5 text-[13px]">
              {SECTIONS.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="flex gap-2 text-slate-500 transition hover:text-slate-900">
                    <span className="w-4 flex-shrink-0 tabular-nums text-slate-400">{i + 1}.</span>
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </nav>

        <article className="space-y-4">
          {SECTIONS.map((s, i) => (
            <section key={s.id} id={s.id} className="scroll-mt-24 rounded-2xl bg-white p-6 ring-1 ring-slate-200/80 sm:p-7">
              <h2 className="flex items-baseline gap-2.5 text-lg font-bold tracking-tight text-slate-900">
                <span className="text-sm font-semibold tabular-nums text-indigo-500">{String(i + 1).padStart(2, "0")}</span>
                {s.title}
              </h2>
              <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-600 [&_a]:font-semibold [&_a]:text-indigo-600 [&_a:hover]:underline [&_li]:pl-1 [&_strong]:font-semibold [&_strong]:text-slate-800 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
                {s.body}
              </div>
            </section>
          ))}

          <section className="rounded-2xl bg-white p-6 ring-1 ring-slate-200/80 sm:p-7">
            <h2 className="text-lg font-bold tracking-tight text-slate-900">Still need help?</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Message the seller or business directly from their listing, or contact the AutoMarket team.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {wa && (
                <a href={wa} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
                  <MessageCircle size={15} /> WhatsApp us
                </a>
              )}
              <Link href="/terms" className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50">
                Terms &amp; Conditions
              </Link>
            </div>
          </section>
        </article>
      </div>

      <Footer />
    </div>
  );
}
