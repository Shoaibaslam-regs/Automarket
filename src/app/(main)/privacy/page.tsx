import WhatsAppIcon from "@/components/ui/WhatsAppIcon";
import Link from "next/link";
import type { Metadata } from "next";
import { Lock } from "lucide-react";
import Footer from "@/components/Footer";
import { PRIVACY_UPDATED, TERMS_PATH } from "@/lib/terms";
import { whatsappLink } from "@/lib/supportContact";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What personal information AutoGO collects, who can see it, how long it is kept and how to delete it.",
  alternates: { canonical: "/privacy" },
};

type Section = { id: string; title: string; body: React.ReactNode };

const SECTIONS: Section[] = [
  {
    id: "about",
    title: "About this policy",
    body: (
      <p>
        This policy explains what personal information AutoGO collects when you use the website or the installed app, why we
        need it, who can see it and how you can delete it. It works together with our <Link href={TERMS_PATH}>Terms &amp; Conditions</Link>.
        AutoGO is for people aged 18 and over.
      </p>
    ),
  },
  {
    id: "collect",
    title: "What we collect",
    body: (
      <ul>
        <li><strong>Your account:</strong> name, email address and, if you sign in with Google, your Google profile picture. Passwords are stored only as a secure hash, never as text.</li>
        <li><strong>Phone number:</strong> the number on your profile and, if you verify it, the verified number and when it was verified.</li>
        <li><strong>Listings and deals:</strong> vehicle details, photos, price, city and the address where the vehicle can be seen.</li>
        <li><strong>Bookings and purchases:</strong> dates, prices, payments recorded by the owner or business, and the details needed at handover: your CNIC number, the vehicle&apos;s number plate, odometer and condition photos. A CNIC number is optional when you ask to buy from a business.</li>
        <li><strong>Messages, reviews and reports</strong> that you send through AutoGO.</li>
        <li><strong>Business information</strong> if you run a business account: business name, logo, address, staff, customers, sales and cash book entries.</li>
        <li><strong>Technical information:</strong> your IP address (used to stop abuse such as repeated sign-in attempts) and, if you turn on phone notifications, a device address used to deliver them.</li>
        <li><strong>Stored in your browser:</strong> your sign-in cookie and small preferences such as the light or dark theme, a draft listing, recently viewed vehicles and the grid or list view. These stay on your device.</li>
      </ul>
    ),
  },
  {
    id: "use",
    title: "How we use it",
    body: (
      <ul>
        <li>To run the marketplace: show listings, deliver messages, handle bookings, sales and business tools, and send the notifications and emails you expect (booking requests, password resets, saved-search alerts).</li>
        <li>To keep AutoGO safe: check that vehicle photos are real, limit repeated attempts, and investigate reports.</li>
        <li>To answer you when you contact our team.</li>
      </ul>
    ),
  },
  {
    id: "who-sees",
    title: "Who can see your information",
    body: (
      <ul>
        <li><strong>Everyone:</strong> your listings and deals, your name and picture as the seller, business pages, and reviews.</li>
        <li><strong>People you deal with:</strong> when you book, buy or message, the seller, owner or business sees your name and phone number. Your CNIC is seen only by the owner or business you rent or buy from.</li>
        <li><strong>A business&apos;s team:</strong> staff of a business you deal with can see the bookings, sales and customer records they need for their work.</li>
        <li><strong>AutoGO admins:</strong> a small team who handle support, reports and plan requests.</li>
      </ul>
    ),
  },
  {
    id: "providers",
    title: "Services we use",
    body: (
      <>
        <p>
          We use trusted services to run AutoGO. They process data only to provide their service to us: MongoDB Atlas (database),
          Vercel (hosting), UploadThing (photo storage), Pusher (live updates), Google (sign-in, and the Gemini AI that checks photos
          and creates inspection reports), our email provider, Twilio (phone verification codes) and the browser push services of
          Google, Apple and Mozilla (phone notifications). Some of these services store data outside Pakistan.
        </p>
        <p><strong>We don&apos;t sell your personal information</strong> and we don&apos;t show third-party advertising.</p>
      </>
    ),
  },
  {
    id: "keep",
    title: "How long we keep it",
    body: (
      <ul>
        <li>We keep your information while your account is open.</li>
        <li>When you delete your account, we delete your listings, photos, saved items, messages, reviews and profile.</li>
        <li>Some records stay because other people rely on them: a business keeps its own records of bookings and sales with you (your name and phone), and we keep the phone number that used the free trial so it can&apos;t be claimed twice.</li>
        <li>Security records, such as sign-in attempt counters, expire automatically.</li>
      </ul>
    ),
  },
  {
    id: "choices",
    title: "Your choices",
    body: (
      <ul>
        <li>Change your name, phone and picture in <Link href="/profile">Profile &amp; settings</Link>.</li>
        <li>Turn off saved-search emails in <Link href="/saved">Saved</Link>, and phone notifications on <Link href="/notifications">Notifications</Link> or in your phone&apos;s settings.</li>
        <li>Delete your account at any time from <Link href="/profile">Profile &amp; settings</Link>.</li>
        <li>Clear the preferences stored in your browser through your browser settings.</li>
      </ul>
    ),
  },
  {
    id: "security",
    title: "How we protect it",
    body: (
      <p>
        Connections to AutoGO are encrypted (HTTPS). Passwords, password-reset links and phone codes are stored only as
        secure hashes, admin access goes through a separate protected sign-in, and access to personal data is limited to the people who need it. No
        system is perfectly secure, so use a strong password and tell us straight away if you notice anything unusual.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes and contact",
    body: (
      <p>
        We may update this policy. The date at the top shows the latest version, and we&apos;ll tell users about important
        changes. For any privacy question or request, contact the AutoGO team through the <Link href="/help">Help &amp; safety</Link> page.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  const wa = whatsappLink("Hi AutoGO team, I have a privacy question.");
  return (
    <div className="min-h-screen bg-slate-50">
      <section className="relative overflow-hidden bg-slate-950 px-4 pb-14 pt-12 text-white sm:pt-16">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-indigo-600/30 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-28 left-10 h-56 w-56 rounded-full bg-amber-500/15 blur-3xl" />
        <div className="relative mx-auto max-w-[1080px]">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-indigo-200 ring-1 ring-inset ring-white/10">
            <Lock size={13} /> Legal
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">Privacy Policy</h1>
          <p className="mt-2 max-w-[620px] text-sm leading-relaxed text-slate-400">
            What we collect, who can see it, and how to delete it.
          </p>
          <p className="mt-4 text-xs text-slate-500">Last updated {PRIVACY_UPDATED}</p>
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
          {wa && (
            <section className="rounded-2xl bg-white p-6 ring-1 ring-slate-200/80 sm:p-7">
              <h2 className="text-lg font-bold tracking-tight text-slate-900">Questions about your data?</h2>
              <a href={wa} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
                <WhatsAppIcon size={15} /> WhatsApp us
              </a>
            </section>
          )}
        </article>
      </div>

      <Footer />
    </div>
  );
}
