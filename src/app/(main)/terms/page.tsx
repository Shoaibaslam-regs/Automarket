import Link from "next/link";
import type { Metadata } from "next";
import { FileText, MessageSquare } from "lucide-react";
import Footer from "@/components/Footer";
import { PLANS, TRIAL_MONTHS, VERIFIED_BADGE } from "@/lib/plans";
import { TERMS_UPDATED } from "@/lib/terms";


export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "The rules for using AutoMarket to buy, sell and rent cars and bikes in Pakistan.",
  alternates: { canonical: "/terms" },
};

type Section = { id: string; title: string; body: React.ReactNode };

const paidPlans = [PLANS.STARTER, PLANS.PRO, PLANS.UNLIMITED].map(p => `${p.name} (PKR ${p.price.toLocaleString()})`).join(", ");

const SECTIONS: Section[] = [
  {
    id: "about",
    title: "About these terms",
    body: (
      <>
        <p>
          AutoMarket is an online marketplace where people and businesses in Pakistan list cars and bikes for sale or rent, and
          buyers and renters contact them. By creating an account or using the site, you agree to these terms. If you don&apos;t
          agree, please don&apos;t use AutoMarket.
        </p>
        <p>
          AutoMarket is <strong>not a party</strong> to any sale or rental. Deals are made directly between the buyer or renter
          and the seller or owner. We provide the platform, not the vehicles.
        </p>
      </>
    ),
  },
  {
    id: "accounts",
    title: "Your account",
    body: (
      <ul>
        <li>You must be at least 18 years old and able to enter a binding agreement under Pakistani law.</li>
        <li>Give your real name and a phone number and email you control. One person, one personal account.</li>
        <li>Keep your password private. You are responsible for everything done from your account.</li>
        <li>Tell us straight away through Messages or Help &amp; support if you think someone else is using your account.</li>
      </ul>
    ),
  },
  {
    id: "listings",
    title: "Listing a vehicle",
    body: (
      <ul>
        <li>Only list vehicles you own or are authorised to sell or rent, with valid registration and documents.</li>
        <li>Describe the vehicle honestly: make, model, year, mileage, condition, accident history and any defects you know of. Prices are in Pakistani Rupees.</li>
        <li>Photos must be real photos of the vehicle being listed. Uploads are checked automatically and photos that are not of a vehicle are rejected.</li>
        <li>Mark a vehicle as sold or inactive once it is no longer available.</li>
        <li>Your plan sets how many listings and deals you can post each calendar month, together. Every one posted counts towards it, including ones you later delete.</li>
        <li>We may edit, hide or remove any listing that breaks these terms, without notice.</li>
      </ul>
    ),
  },
  {
    id: "buying",
    title: "Buying and renting",
    body: (
      <>
        <ul>
          <li>Inspect the vehicle in person and check the registration book, chassis and engine numbers and the seller&apos;s CNIC before paying anything.</li>
          <li>Do the transfer through the Excise &amp; Taxation department. Don&apos;t pay large amounts in cash without a written receipt.</li>
          <li>Never send an advance payment for a vehicle you haven&apos;t seen. AutoMarket will never ask you to pay a seller through us.</li>
        </ul>
        <p>
          <strong>Rentals.</strong> A booking request becomes a booking only when the owner confirms it. Rates, the security deposit,
          fuel, mileage limits, damage and late-return charges are agreed between you and the owner, and the owner&apos;s own
          rental terms apply. A booking can be cancelled before the vehicle is handed over. Bring your original CNIC and driving
          licence to collect the vehicle.
        </p>
      </>
    ),
  },
  {
    id: "business",
    title: "Business accounts",
    body: (
      <ul>
        <li>The owner of a business account is responsible for its team and for every listing, deal, booking and message from its members.</li>
        <li>Business details on your public page (name, picture, phone, address) must be accurate and must not copy another business.</li>
        <li>Customer records you keep in AutoMarket may only be used to serve those customers. Don&apos;t share or sell them.</li>
        <li>Deals you publish must be honoured for the vehicles and dates you set.</li>
      </ul>
    ),
  },
  {
    id: "plans",
    title: "Plans, Verified badge and payments",
    body: (
      <>
        <p>
          The Free plan costs nothing. Paid plans run for 30 days per payment: {paidPlans}. The Verified badge is a separate add-on for
          businesses at PKR {VERIFIED_BADGE.price.toLocaleString()} per month. Current prices and limits are always shown on the{" "}
          <Link href="/pricing">pricing page</Link>.
        </p>
        <ul>
          <li>Online payment isn&apos;t available yet. You request a plan or the badge, our team sends payment details, and an admin activates it once payment is received.</li>
          <li>Each account can have one free trial of {TRIAL_MONTHS} month{TRIAL_MONTHS === 1 ? "" : "s"}. Plans given for free or as a trial can be withdrawn by us.</li>
          <li>When the 30 days are up (or a gift or trial ends), your account moves back to Free automatically until you buy a plan again. Existing listings stay, but you can&apos;t add more than the Free limits allow.</li>
          <li>Fees already paid are not refundable, except where Pakistani law requires a refund.</li>
          <li>
            The Verified badge means our team checked the business&apos;s details when it was approved. It is not a guarantee of any
            vehicle or deal, and we may remove it if the details stop being accurate or these terms are broken.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "ai",
    title: "AI inspection and estimates",
    body: (
      <p>
        AI inspection reports, damage scores and value estimates are generated automatically from photos. They are a rough guide
        only, can be wrong, and are not a replacement for a mechanic&apos;s inspection or a professional valuation.
      </p>
    ),
  },
  {
    id: "prohibited",
    title: "What isn't allowed",
    body: (
      <ul>
        <li>Stolen vehicles, vehicles with tampered numbers, or non-custom-paid or smuggled vehicles presented as legal.</li>
        <li>Fake, duplicate or misleading listings, bait prices, or photos of a different vehicle.</li>
        <li>Asking for advance payments, scams, phishing, or collecting other users&apos; personal details for other purposes.</li>
        <li>Harassment, abuse, hate speech, or threatening messages.</li>
        <li>Fake reviews, reviewing your own business, or offering rewards for reviews.</li>
        <li>Copying the site&apos;s content with bots, or trying to break or overload the service.</li>
      </ul>
    ),
  },
  {
    id: "reviews",
    title: "Reviews and your content",
    body: (
      <>
        <p>
          Only people who have dealt with a business can review it, and a business can publicly reply. Reviews must be honest and
          about your own experience.
        </p>
        <p>
          You keep ownership of what you post (listings, photos, reviews). You allow AutoMarket to show, store and resize it on the
          site and in search results and promotion of your listing while it is live.
        </p>
      </>
    ),
  },
  {
    id: "enforcement",
    title: "Warnings, suspension and closing accounts",
    body: (
      <>
        <p>
          If an account or business breaks these terms we may send a warning, hide listings, remove the Verified badge, suspend the
          business, or close the account. Serious cases, such as fraud or stolen vehicles, may be suspended without warning and
          reported to the authorities.
        </p>
        <p>
          You can appeal by replying to our message or through Help &amp; support. You can delete your business or stop using
          AutoMarket at any time.
        </p>
      </>
    ),
  },
  {
    id: "liability",
    title: "Our responsibility",
    body: (
      <>
        <p>
          We work to keep AutoMarket safe and available, but the site is provided as it is. We don&apos;t check every listing or
          user, and we don&apos;t guarantee the condition, ownership or legality of any vehicle, or that a buyer, seller or owner
          will complete a deal.
        </p>
        <p>
          As far as the law allows, AutoMarket is not responsible for losses that come from deals between users, from content
          posted by users, or from the site being temporarily unavailable. Our total responsibility to you is limited to the fees
          you paid us in the three months before the claim.
        </p>
      </>
    ),
  },
  {
    id: "privacy",
    title: "Privacy",
    body: (
      <p>
        We store the details you give us (name, email, phone, listings, messages, bookings) to run the marketplace. Your phone
        number and name are shown to people you deal with through your listings and bookings. We don&apos;t sell your personal
        data. Messages with our team are used only to help you. The <Link href="/privacy">Privacy Policy</Link> explains this in full.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes and governing law",
    body: (
      <p>
        We may update these terms. The date at the top shows the latest version, and we&apos;ll tell users about important
        changes. Using AutoMarket after a change means you accept the new terms. These terms are governed by the laws of the
        Islamic Republic of Pakistan, and disputes go to the courts of Pakistan.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <section className="relative overflow-hidden bg-slate-950 px-4 pb-14 pt-12 text-white sm:pt-16">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-indigo-600/30 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-28 left-10 h-56 w-56 rounded-full bg-amber-500/15 blur-3xl" />
        <div className="relative mx-auto max-w-[1080px]">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-indigo-200 ring-1 ring-inset ring-white/10">
            <FileText size={13} /> Legal
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">Terms &amp; Conditions</h1>
          <p className="mt-2 max-w-[620px] text-sm leading-relaxed text-slate-400">
            The rules for buying, selling and renting on AutoMarket. Please read them before you post a listing or make a deal.
          </p>
          <p className="mt-4 text-xs text-slate-500">Last updated {TERMS_UPDATED}</p>
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

          <section className="flex flex-col gap-4 rounded-2xl bg-slate-900 p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-7">
            <div>
              <h2 className="text-lg font-bold">Questions about these terms?</h2>
              <p className="mt-1 text-sm text-slate-400">Message our team and we&apos;ll get back to you.</p>
            </div>
            <Link href="/messages" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100">
              <MessageSquare size={16} /> Contact us
            </Link>
          </section>
        </article>
      </div>

      <Footer />
    </div>
  );
}
