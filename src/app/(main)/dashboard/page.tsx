import Image from "next/image";
import Link from "next/link";
import mongoose from "mongoose";
import {
  ArrowRight, Briefcase, CalendarDays, Car, CheckCircle2, Compass, Crown, Heart, MessageSquare,
  Plus, Settings, Sparkles, Store, type LucideIcon,
} from "lucide-react";
import { requireAuth } from "@/lib/session";
import { connectDB } from "@/lib/mongodb";
import { Listing } from "@/models/Listing";
import { Favorite } from "@/models/Favorite";
import { Message } from "@/models/Message";
import { Booking } from "@/models/Booking";
import { Organization } from "@/models/Organization";
import { User } from "@/models/User";
import "@/models/Rental";
import { getSubscription, getUsage } from "@/lib/subscription";
import { formatLimit, isFreeGrant, planSourceLabel } from "@/lib/plans";
import MyListings from "@/components/listings/MyListings";
import UserIdBadge from "@/components/UserIdBadge";
// Registers the model for the deal bookings populate below
import "@/models/Deal";
import StatusText, { textTone } from "@/components/ui/StatusText";

type Oid = mongoose.Types.ObjectId;
type MyListing = {
  _id: Oid; title: string; make: string; model: string; year: number; price: number; location: string;
  type: "SALE" | "RENT" | "BOTH"; status: string; images?: string[]; createdAt: Date;
};
type UpcomingBooking = {
  _id: Oid; startDate: Date; endDate: Date; status: string; totalAmount: number;
  rentalId?: { listingId?: { _id: Oid; title: string; images?: string[] } | null } | null;
  dealId?: { _id: Oid; title: string; images?: string[] } | null;
};

// Personal dashboard: the marketplace's light slate + indigo look; the business console is the dark mirror
const STATUS_STYLE: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  PENDING: "bg-amber-50 text-amber-700 ring-amber-200",
  SOLD: "bg-slate-100 text-slate-600 ring-slate-200",
  RENTED: "bg-sky-50 text-sky-700 ring-sky-200",
  INACTIVE: "bg-slate-100 text-slate-500 ring-slate-200",
  CONFIRMED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

function greeting() {
  const hour = Number(new Date().toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "Asia/Karachi" }));
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

const day = (d: Date) => new Date(d).toLocaleDateString("en-PK", { day: "numeric", month: "short" });

export default async function DashboardPage() {
  const session = await requireAuth();
  const userId = session.user.id;
  await connectDB();

  const me = new mongoose.Types.ObjectId(userId);
  const [listings, savedCount, unread, upcoming, user, sub] = await Promise.all([
    Listing.find({ sellerId: userId }).sort({ createdAt: -1 }).lean<MyListing[]>(),
    Favorite.countDocuments({ userId }),
    Message.countDocuments({ receiverId: me, read: false, deletedFor: { $ne: me } }),
    Booking.find({ renterId: userId, status: { $in: ["PENDING", "CONFIRMED", "ACTIVE"] }, deletedByRenter: { $ne: true } })
      .sort({ startDate: 1 })
      .limit(3)
      .populate({ path: "rentalId", select: "listingId", populate: { path: "listingId", select: "title images" } })
      .populate("dealId", "title images")
      .lean<UpcomingBooking[]>(),
    User.findById(userId).select("createdAt organizationId image").lean<{ createdAt: Date; organizationId?: Oid; image?: string }>(),
    getSubscription(userId),
  ]);
  const usage = await getUsage(userId, sub);
  const business = user?.organizationId
    ? await Organization.findById(user.organizationId).select("name slug").lean<{ name: string; slug: string }>()
    : null;

  const firstName = session.user.name?.split(" ")[0] || "there";
  const active = listings.filter(l => l.status === "ACTIVE").length;
  const closed = listings.filter(l => l.status === "SOLD" || l.status === "RENTED").length;
  const limit = sub.plan.limits.listings;
  const pct = limit === null ? 100 : Math.min(100, Math.round((usage.listings / Math.max(limit, 1)) * 100));
  const full = limit !== null && usage.listings >= limit;
  const since = user?.createdAt ? new Date(user.createdAt).getFullYear() : null;

  const stats: { label: string; value: number; icon: LucideIcon; tint: string; href: string }[] = [
    { label: "Active listings", value: active, icon: Car, tint: "text-indigo-600", href: "#listings" },
    { label: "Sold or rented", value: closed, icon: CheckCircle2, tint: "text-emerald-600", href: "#listings" },
    { label: "Saved vehicles", value: savedCount, icon: Heart, tint: "text-rose-600", href: "/saved" },
    { label: "Unread messages", value: unread, icon: MessageSquare, tint: "text-sky-600", href: "/messages" },
  ];

  const actions: { href: string; label: string; hint: string; icon: LucideIcon }[] = [
    { href: "/sell", label: "Sell a vehicle", hint: "Post in minutes", icon: Plus },
    { href: "/listings", label: "Browse", hint: "Find your next ride", icon: Compass },
    { href: "/bookings", label: "Bookings", hint: "Rentals & requests", icon: CalendarDays },
    { href: "/messages", label: "Messages", hint: unread ? `${unread} unread` : "Chat with sellers", icon: MessageSquare },
    { href: "/saved", label: "Saved", hint: `${savedCount} vehicle${savedCount !== 1 ? "s" : ""}`, icon: Heart },
    { href: "/profile", label: "Profile", hint: "Account settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-[28px] bg-white p-5 shadow-[0_20px_50px_-32px_rgba(79,70,229,0.35)] ring-1 ring-slate-200/80 sm:p-8">
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-gradient-to-br from-indigo-200/60 to-fuchsia-100/50 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-amber-100/60 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <span className="flex-shrink-0 rounded-full bg-gradient-to-br from-indigo-400 via-fuchsia-400 to-amber-300 p-[2.5px]">
                <span className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-slate-900 text-xl font-bold text-white ring-2 ring-white sm:h-16 sm:w-16">
                  {user?.image ? <Image src={user.image} alt="" fill sizes="64px" className="object-cover" /> : firstName[0]?.toUpperCase()}
                </span>
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-indigo-600">{greeting()},</p>
                <h1 className="truncate text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{session.user.name || firstName}</h1>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                    <Crown size={12} /> {sub.plan.name}
                    {isFreeGrant(sub.source) && <span className="font-normal text-amber-700">· {planSourceLabel(sub.source)}</span>}
                  </span>
                  <UserIdBadge id={userId} />
                  {since && <span className="text-xs text-slate-400">Member since {since}</span>}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
              <Link href="/sell" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:bg-slate-800">
                <Plus size={16} /> Post a listing
              </Link>
              <Link href="/listings" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50">
                <Compass size={16} /> Browse vehicles
              </Link>
            </div>
          </div>

          {/* Plan usage */}
          <div className="relative mt-6 rounded-2xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200/80">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-800">
                {usage.listings} of {formatLimit(limit)} listings & deals used this month
                {sub.expiresAt && <span className="ml-2 text-xs font-normal text-slate-500">· plan until {day(sub.expiresAt)}</span>}
              </p>
              {sub.planId !== "UNLIMITED" && (
                <Link href="/pricing" className={`inline-flex items-center gap-1 text-xs font-semibold ${full ? "text-rose-600" : "text-indigo-700"} hover:underline`}>
                  {full ? "Limit reached · Upgrade" : "Need more? Upgrade"} <ArrowRight size={12} />
                </Link>
              )}
            </div>
            <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-white ring-1 ring-inset ring-slate-200">
              <div
                className={`h-full rounded-full ${limit === null ? "bg-gradient-to-r from-amber-300 to-amber-500" : full ? "bg-rose-500" : "bg-gradient-to-r from-indigo-500 to-fuchsia-500"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </section>

        {/* Stats */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {stats.map(s => (
            <Link key={s.label} href={s.href} className="group rounded-3xl bg-white p-4 shadow-[0_8px_30px_-20px_rgba(15,23,42,0.25)] ring-1 ring-slate-200/70 transition hover:-translate-y-0.5 hover:ring-indigo-200 sm:p-5">
              <s.icon size={20} className={s.tint} />
              <p className="mt-3 text-2xl font-extrabold tabular-nums text-slate-900 sm:text-3xl">{s.value}</p>
              <p className="text-xs font-medium text-slate-500">{s.label}</p>
            </Link>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Listings: grid / list switch like the browse page */}
          <MyListings
            listings={listings.map(l => ({
              id: String(l._id),
              title: l.title,
              make: l.make,
              model: l.model,
              year: l.year,
              location: l.location,
              price: l.price,
              type: l.type,
              status: l.status,
              image: l.images?.[0] ?? null,
            }))}
          />

          {/* Side column */}
          <aside className="space-y-4">
            <section className="rounded-3xl bg-white p-4 ring-1 ring-slate-200/70 sm:p-5">
              <h2 className="text-sm font-bold text-slate-900">Quick actions</h2>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {actions.map(a => (
                  <Link key={a.href} href={a.href} className="group rounded-2xl bg-slate-50/80 p-3 ring-1 ring-inset ring-slate-100 transition hover:bg-indigo-50/60 hover:ring-indigo-200">
                    <a.icon size={17} className="text-indigo-600" />
                    <p className="mt-2 text-[13px] font-semibold text-slate-900">{a.label}</p>
                    <p className="truncate text-[11px] text-slate-500">{a.hint}</p>
                  </Link>
                ))}
              </div>
            </section>

            <section className="rounded-3xl bg-white p-4 ring-1 ring-slate-200/70 sm:p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">Upcoming rentals</h2>
                <Link href="/bookings" className="text-xs font-semibold text-indigo-700 hover:underline">All bookings</Link>
              </div>
              {upcoming.length === 0 ? (
                <p className="mt-3 rounded-2xl bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">
                  No upcoming rentals. <Link href="/listings?type=RENT" className="font-semibold text-indigo-700 hover:underline">Find a vehicle to rent</Link>
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {upcoming.map(b => {
                    const v = b.rentalId?.listingId ?? b.dealId;
                    return (
                      <li key={String(b._id)}>
                        <Link href="/bookings" className="flex items-center gap-3 rounded-2xl p-2 transition hover:bg-slate-50">
                          <span className="relative h-11 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-slate-100">
                            {v?.images?.[0] ? <Image src={v.images[0]} alt="" fill sizes="56px" className="object-cover" /> : <span className="flex h-full items-center justify-center text-slate-300"><Car size={16} /></span>}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-semibold text-slate-900">
                              {b.dealId && <span className="theme-static mr-1.5 rounded-full bg-gradient-to-r from-rose-600 to-orange-500 px-1.5 py-px align-middle text-[9px] font-extrabold text-white">DEAL</span>}
                              {v?.title ?? "Vehicle removed"}
                            </span>
                            <span className="block text-[11px] text-slate-500">{day(b.startDate)} → {day(b.endDate)}</span>
                          </span>
                          <StatusText className={textTone(STATUS_STYLE[b.status] ?? STATUS_STYLE.PENDING)}>{b.status.charAt(0) + b.status.slice(1).toLowerCase()}</StatusText>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {business ? (
              <section className="relative overflow-hidden rounded-3xl bg-slate-950 p-5 text-white shadow-lg shadow-slate-900/20">
                <div aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-indigo-500/30 blur-2xl" />
                <p className="relative flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-300"><Store size={13} /> Your business</p>
                <p className="relative mt-1 text-lg font-bold">{business.name}</p>
                <div className="relative mt-4 flex flex-wrap gap-2">
                  <Link href="/business/dashboard" className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-100">
                    <Briefcase size={13} /> Open console
                  </Link>
                  <Link href={`/dealers/${business.slug}`} className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3.5 py-2 text-xs font-semibold text-white ring-1 ring-inset ring-white/30 hover:bg-white/25">
                    Public page
                  </Link>
                </div>
              </section>
            ) : (
              <section className="relative overflow-hidden rounded-3xl bg-white p-5 ring-1 ring-slate-200/70">
                <div aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-indigo-100/80 blur-2xl" />
                <p className="relative flex items-center gap-1.5 text-sm font-bold text-slate-900"><Sparkles size={15} className="text-indigo-600" /> Sell professionally?</p>
                <p className="relative mt-1 text-xs leading-relaxed text-slate-500">
                  Open a free business account for a public shop page, customer reviews, deals, a team and booking slips.
                </p>
                <Link href="/business/onboarding" className="relative mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:underline">
                  Set up your business <ArrowRight size={12} />
                </Link>
              </section>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
