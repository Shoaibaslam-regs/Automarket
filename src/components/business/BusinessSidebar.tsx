"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import BrandLogo from "@/components/BrandLogo";
import SignOutDialog from "@/components/SignOutDialog";
import UserIdBadge from "@/components/UserIdBadge";
import VerifiedBadge from "@/components/VerifiedBadge";
import MenuGroupTitle from "@/components/ui/MenuGroupTitle";
import {
  ArrowLeftRight, BadgeDollarSign, BarChart3, BookOpen, CalendarCheck, Car, ChevronDown, Crown, ExternalLink, Globe, Headset, House, LayoutDashboard, LogOut, Megaphone, Menu, MessageSquare, Newspaper, Rocket, Settings, Sparkles, Star, Tag, User, Users, Wallet, X, type LucideIcon,
} from "lucide-react";
import { CountBadge, NotificationDot } from "@/components/NotificationBadge";
import { useNotificationCounts } from "@/hooks/useNotificationCounts";
import { useSubscription, type SubscriptionInfo } from "@/components/subscription/useSubscription";
import { formatLimit, planInfo } from "@/lib/plans";
import ThemeToggle from "@/components/theme/ThemeToggle";
import Tip from "@/components/ui/Tip";
import NotificationBell from "@/components/NotificationBell";

/** Fired after the business picture changes so the sidebar reloads it. */
export const ORG_UPDATED_EVENT = "business-org-updated";

type Organization = {
  _id: string;
  name: string;
  type: string;
  plan: string;
  city: string;
  slug?: string;
  logo?: string;
  verified?: boolean;
};

type NavItem = { href: string; label: string; icon: LucideIcon };

/** Two groups: the shop's daily work first, then growing the business, updates and help. */
const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Manage",
    items: [
      { href: "/business/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/business/inventory", label: "Inventory", icon: Car },
      { href: "/business/customers", label: "Customers", icon: Users },
      { href: "/business/bookings", label: "Bookings", icon: CalendarCheck },
      { href: "/business/sales", label: "Sales", icon: BadgeDollarSign },
      { href: "/business/deals", label: "Deals", icon: Tag },
      { href: "/business/money", label: "Money", icon: Wallet },
      { href: "/business/staff", label: "Staff", icon: User },
    ],
  },
  {
    title: "Grow & help",
    items: [
      { href: "/business/promote", label: "Promote", icon: Rocket },
      { href: "/business/reviews", label: "Reviews", icon: Star },
      { href: "/business/reports", label: "Reports", icon: BarChart3 },
      { href: "/business/updates", label: "Updates", icon: Megaphone },
      { href: "/business/announcements", label: "Announcements", icon: Newspaper },
      { href: "/business/guide", label: "Guide · رہنمائی", icon: BookOpen },
      { href: "/business/settings", label: "Settings", icon: Settings },
      { href: "/business/support", label: "Help & support", icon: Headset },
    ],
  },
];

/** The phone bottom bar's shortcuts, with the badge each one shows. */
const BOTTOM_ITEMS: { href: string; label: string; icon: LucideIcon; badge?: (c: ReturnType<typeof useNotificationCounts>) => number }[] = [
  { href: "/business/dashboard", label: "Today", icon: LayoutDashboard },
  { href: "/business/bookings", label: "Bookings", icon: CalendarCheck, badge: c => c.ownerBookings },
  { href: "/business/sales", label: "Sales", icon: BadgeDollarSign, badge: c => c.sales },
  { href: "/business/customers", label: "Customers", icon: Users },
];

const TYPE_LABELS: Record<string, string> = { DEALER: "Dealer", RENTAL: "Rental", BOTH: "Dealer + Rental" };

type Counts = ReturnType<typeof useNotificationCounts>;

/** Org switcher card with an account menu; dark glass to match the sidebar. */
function OrgCard({ org, counts, onSignOut }: { org: Organization | null; counts: Counts; onSignOut: () => void }) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const plan = planInfo(org?.plan);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-2xl bg-white/[0.06] p-2.5 text-left ring-1 ring-inset ring-white/10 transition hover:bg-white/10"
      >
        <span className="relative flex-shrink-0 rounded-xl bg-gradient-to-br from-indigo-400 via-fuchsia-400 to-amber-300 p-[1.5px]">
          <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-[10px] bg-slate-900 text-sm font-extrabold text-white">
            {org?.logo ? <Image src={org.logo} alt="" fill sizes="36px" className="object-cover" /> : org?.name?.[0]?.toUpperCase() || "B"}
          </span>
          <NotificationDot show={counts.messages > 0} className="-right-1 -top-1 ring-slate-950" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-1">
            <span className="truncate text-[13px] font-semibold text-white">{org?.name || "My Business"}</span>
            {org?.verified && <VerifiedBadge variant="icon" size={14} />}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className="truncate">{TYPE_LABELS[org?.type ?? ""] ?? "Business"}</span>
            <span className="inline-flex flex-shrink-0 items-center gap-0.5 rounded-full bg-amber-300/10 px-1.5 py-px text-[10px] font-semibold text-amber-200 ring-1 ring-inset ring-amber-200/20">
              <Crown size={9} /> {plan.name}
            </span>
          </span>
        </span>
        <ChevronDown size={14} className={`flex-shrink-0 text-slate-500 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute inset-x-0 top-[calc(100%+6px)] z-[200] animate-[bsFade_0.15s_ease] rounded-2xl bg-slate-900 p-1.5 shadow-2xl shadow-black/50 ring-1 ring-white/10">
          {/* Who is signed in, then the business and both IDs on their own rows, like the marketplace menus */}
          <div className="mb-1 border-b border-white/10 px-2.5 pb-3 pt-2">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 text-sm font-bold text-white ring-1 ring-inset ring-white/15">
                {session?.user?.image
                  ? <Image src={session.user.image} alt="" fill sizes="36px" className="object-cover" />
                  : session?.user?.name?.[0]?.toUpperCase() || "?"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold leading-tight text-white">{session?.user?.name}</p>
                <p className="mt-0.5 truncate text-[11px] text-slate-400">{session?.user?.email}</p>
              </div>
            </div>
            <div className="mt-3 space-y-1.5 border-t border-white/10 pt-2.5">
              {org?.name && (
                <p className="flex min-w-0 items-center gap-1 text-[12px] font-semibold text-slate-200">
                  <span className="truncate">{org.name}</span>
                  {org.verified && <VerifiedBadge variant="icon" size={13} />}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px]">
                <UserIdBadge id={org?._id} kind="business" className="!bg-transparent !px-0 !py-0 !text-[11px] !text-slate-300 !ring-0 hover:!text-white" />
                <span aria-hidden className="text-slate-600">·</span>
                <UserIdBadge id={session?.user?.id} kind="me" className="!bg-transparent !px-0 !py-0 !text-[11px] !text-slate-400 !ring-0 hover:!text-white" />
              </div>
            </div>
          </div>
          {[
            ...(org?.slug ? [{ label: "Public business page", href: `/dealers/${org.slug}`, icon: Globe }] : []),
            { label: "Business settings", href: "/business/settings", icon: Settings },
            { label: "Messages", href: "/messages", icon: MessageSquare },
            { label: "My dashboard", href: "/dashboard", icon: User },
            { label: "Marketplace", href: "/", icon: House },
          ].map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <item.icon size={15} strokeWidth={1.8} />
              {item.label}
              {item.href === "/messages" && <CountBadge count={counts.messages} className="ml-auto" />}
            </Link>
          ))}
          <div className="my-1 h-px bg-white/10" />
          <button
            onClick={() => { setOpen(false); onSignOut(); }}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-rose-300 transition hover:bg-rose-500/10"
          >
            <LogOut size={15} strokeWidth={1.8} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Plan name with the days it has left, this month's listings meter and an upgrade link, so the plan is always
 * visible in the console. The meter is this calendar month's listings and deals. A business never falls back to Free (src/lib/businessPlan.ts), so its free
 * month reads "Free month" and an ended plan reads "Plan ended" instead of a Free meter.
 */
function PlanCard({ sub }: { sub: SubscriptionInfo }) {
  const plan = planInfo(sub.planId);
  const b = sub.business;
  const lapsed = b?.state === "LAPSED";
  const daysLeft = b ? b.daysLeft : sub.planId !== "FREE" ? sub.planDaysLeft : null;
  const limit = sub.limits.listings;
  const used = sub.usage.listings;
  const pct = limit === null ? 100 : Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));
  const full = limit !== null && used >= limit;
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-3.5 ring-1 ring-inset ring-white/10">
      <div aria-hidden className={`pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full blur-2xl ${lapsed ? "bg-rose-400/20" : "bg-amber-400/20"}`} />
      <div className="relative flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-white">
          <Crown size={13} className={lapsed ? "text-rose-300" : "text-amber-300"} />
          {lapsed ? "Plan ended" : b?.state === "FREE_START" ? "Free month" : `${plan.name} plan`}
          {!lapsed && daysLeft != null && (
            <span className={`ml-0.5 rounded-full px-1.5 py-px text-[9px] font-bold ${daysLeft <= 7 ? "bg-rose-400/20 text-rose-200" : "bg-white/10 text-slate-300"}`}>
              {daysLeft <= 1 ? "ends today" : `${daysLeft}d left`}
            </span>
          )}
        </p>
        {!lapsed && (
          <span className={`text-[11px] tabular-nums ${full ? "font-semibold text-rose-300" : "text-slate-400"}`}>
            {used}/{formatLimit(limit)}
          </span>
        )}
      </div>
      {lapsed ? (
        <p className="relative mt-1.5 text-[11px] leading-snug text-slate-400">Subscribe to add new listings, deals, staff and customers. Everything else keeps working.</p>
      ) : (
        <>
          <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full ${limit === null ? "bg-gradient-to-r from-amber-300 to-amber-500" : full ? "bg-rose-400" : pct >= 75 ? "bg-amber-400" : "bg-emerald-400"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="relative mt-1.5 flex flex-wrap items-center gap-1 text-[10px] text-slate-500">
            <Tip id="listingQuota" size={11} />Listings & deals this month
          </p>
        </>
      )}
      {(lapsed || sub.planId !== "UNLIMITED") && (
        <Link
          href="/pricing"
          className="relative mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-300 to-amber-500 py-2 text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:opacity-90"
        >
          <Sparkles size={13} /> {lapsed ? "Subscribe" : b?.state === "FREE_START" ? "Choose a plan" : "Upgrade plan"}
        </Link>
      )}
    </div>
  );
}

function SidebarContent({
  org, counts, sub, onSignOut, onClose,
}: {
  org: Organization | null;
  counts: Counts;
  sub: SubscriptionInfo | null;
  onSignOut: () => void;
  /** Only passed for the mobile drawer, which shows a close button */
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  // Bookings is where the business handles incoming rental requests
  const navBadge = (href: string) => (href === "/business/bookings" ? counts.ownerBookings : href === "/business/sales" ? counts.sales : href === "/business/updates" ? counts.updates : 0);

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-slate-950 text-white">
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-indigo-600/25 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-amber-500/10 blur-3xl" />

      {/* The business card on top (no logo); the phone drawer adds its close button above it */}
      <div className="relative space-y-3 px-4 pb-4 pt-5">
        {onClose && (
          <div className="flex justify-end">
            <button onClick={onClose} aria-label="Close menu" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-slate-200 ring-1 ring-inset ring-white/15 transition hover:bg-white/20">
              <X size={16} />
            </button>
          </div>
        )}
        <OrgCard org={org} counts={counts} onSignOut={onSignOut} />
      </div>

      {/* Nav */}
      <nav className="relative flex-1 space-y-0.5 overflow-y-auto overscroll-contain px-3 pb-3">
        {NAV_GROUPS.map((group, i) => (
          <div key={group.title} className={`space-y-0.5 ${i > 0 ? "pt-4" : ""}`}>
            <MenuGroupTitle tone="dark" className="pl-5 pr-2.5">{group.title}</MenuGroupTitle>
            {group.items.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              const badge = navBadge(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onClose}
                  aria-current={active ? "page" : undefined}
                  // The current page: a dot on the left and a faint background; hover is only a light tint
                  className={`group relative flex items-center gap-3 rounded-xl py-2.5 pl-5 pr-2.5 text-[13.5px] font-medium transition ${
                    active ? "bg-white/[0.07] text-white" : "text-slate-400 hover:bg-white/[0.025] hover:text-slate-200"
                  }`}
                >
                  {active && <span aria-hidden className="absolute left-2 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-400 shadow-[0_0_8px_rgba(167,139,250,0.8)]" />}
                  <Icon size={17} strokeWidth={active ? 2.1 : 1.8} className={`flex-shrink-0 transition ${active ? "text-white" : "text-slate-500 group-hover:text-slate-300"}`} />
                  <span className="flex-1 truncate">{label}</span>
                  {badge > 0 && <CountBadge count={badge} />}
                </Link>
              );
            })}
          </div>
        ))}

        {org?.slug && (
          <>
            <MenuGroupTitle tone="dark" className="pl-5 pr-2.5 pt-4">Your shop</MenuGroupTitle>
            <a
              href={`/dealers/${org.slug}`}
              target="_blank"
              rel="noreferrer"
              onClick={onClose}
              className="group flex items-center gap-3 rounded-xl bg-gradient-to-r from-indigo-500/15 to-fuchsia-500/10 px-2.5 py-2 text-[13.5px] font-medium text-indigo-100 ring-1 ring-inset ring-indigo-400/25 transition hover:from-indigo-500/25 hover:to-fuchsia-500/20"
            >
              <span className="flex flex-shrink-0 items-center justify-center text-indigo-200">
                <Globe size={16} strokeWidth={1.9} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate">View public page</span>
                <span className="block truncate text-[10px] text-indigo-300/70">How customers see you</span>
              </span>
              <ExternalLink size={13} className="flex-shrink-0 text-indigo-300/70 transition group-hover:text-indigo-100" />
            </a>
          </>
        )}
      </nav>

      {/* Plan + account */}
      <div className="relative space-y-3 border-t border-white/10 px-3 pb-4 pt-3">
        {sub && <PlanCard sub={sub} />}
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="text-[11px] font-medium text-slate-500">Theme</span>
          <ThemeToggle tone="dark" compact />
        </div>
        <div className="flex items-center gap-2.5 px-1">
          <span className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 text-xs font-bold ring-1 ring-inset ring-white/15">
            {session?.user?.image ? <Image src={session.user.image} alt="" fill sizes="32px" className="object-cover" /> : session?.user?.name?.[0]?.toUpperCase() || "?"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-200">{session?.user?.name}</p>
            <UserIdBadge id={session?.user?.id} kind="me" className="mt-0.5 !bg-white/5 !px-1.5 !text-[10px] !text-slate-400 !ring-white/10" />
          </div>
          <Link
            href="/"
            title="Back to marketplace"
            aria-label="Back to marketplace"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-slate-400 ring-1 ring-inset ring-white/10 transition hover:bg-white/10 hover:text-white"
          >
            <ArrowLeftRight size={14} />
          </Link>
          <button
            onClick={onSignOut}
            title="Sign out"
            aria-label="Sign out"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-rose-300 ring-1 ring-inset ring-white/10 transition hover:bg-rose-500/15"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BusinessSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [org, setOrg] = useState<Organization | null>(null);
  // The drawer remembers the route it was opened on, so navigating closes it without an effect
  const [mobileOpenOn, setMobileOpenOn] = useState<string | null>(null);
  const mobileOpen = mobileOpenOn === pathname;
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const counts = useNotificationCounts();
  const { data: sub } = useSubscription();
  const hasUnread = counts.messages + counts.ownerBookings + counts.sales + counts.updates > 0;

  useEffect(() => {
    const load = () =>
      fetch("/api/business/organizations")
        .then(r => r.json())
        .then(d => setOrg(d.organization))
        .catch(() => {});
    load();
    // Settings fires this after the business picture changes
    window.addEventListener(ORG_UPDATED_EVENT, load);
    return () => window.removeEventListener(ORG_UPDATED_EVENT, load);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileOpenOn(null); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);

  const openSignOut = () => { setMobileOpenOn(null); setConfirmSignOut(true); };
  const content = (onClose?: () => void) => (
    <SidebarContent org={org} counts={counts} sub={sub} onSignOut={openSignOut} onClose={onClose} />
  );

  return (
    <>
      <style>{`
        @keyframes bsFade { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bsSlide { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        @keyframes bsBackdrop { from { opacity: 0; } to { opacity: 1; } }
        @media (max-width: 768px) {
          .biz-desktop-sidebar { display: none !important; }
          .biz-mobile-topbar { display: flex !important; }
          .biz-mobile-bottombar { display: grid !important; }
        }
        @media print { .biz-mobile-bottombar { display: none !important; } }
      `}</style>

      {/* Desktop sidebar */}
      <aside className="biz-desktop-sidebar sticky top-0 h-screen w-[248px] flex-shrink-0 border-r border-white/5">
        {content()}
      </aside>

      {/* Mobile top bar: the dark counterpart of the marketplace navbar */}
      <div className="biz-mobile-topbar fixed inset-x-0 top-0 z-50 hidden h-12 items-center justify-between gap-2 border-b border-white/10 bg-slate-950/90 px-3 backdrop-blur-xl">
        <Link href="/" className="flex flex-shrink-0 items-center gap-2">
          <BrandLogo tone="dark" height={13} />
        </Link>
        <div className="flex min-w-0 items-center gap-2">
          <NotificationBell tone="dark" className="!h-9 !w-9" />
          <button
            onClick={() => setMobileOpenOn(pathname)}
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.06] ring-1 ring-inset ring-white/15 transition active:scale-95"
          >
            <NotificationDot show={hasUnread} className="right-1.5 top-1.5 ring-slate-950" />
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-[11px] font-bold text-slate-950">
              {session?.user?.name?.[0]?.toUpperCase() || "?"}
            </span>
          </button>
        </div>
      </div>

      {/* Phone bottom bar: the pages used every day, one tap away; More opens the full menu */}
      <nav aria-label="Business shortcuts" className="biz-mobile-bottombar fixed inset-x-0 bottom-0 z-[800] hidden grid-cols-5 border-t border-white/10 bg-slate-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
        {BOTTOM_ITEMS.map(({ href, label, icon: Icon, badge }) => {
          const active = pathname === href || (href !== "/business/dashboard" && pathname.startsWith(href));
          const count = badge ? badge(counts) : 0;
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined}
              className={`relative flex h-14 flex-col items-center justify-center gap-0.5 text-[10.5px] font-semibold transition ${active ? "text-white" : "text-slate-400"}`}>
              {active && <span className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-amber-300" />}
              <span className="relative">
                <Icon size={19} strokeWidth={active ? 2.3 : 1.9} />
                <CountBadge count={count} hidden max={9} className="absolute -right-2.5 -top-1.5 h-4 min-w-4 px-1 text-[9px] ring-2 ring-slate-950" />
              </span>
              {label}
            </Link>
          );
        })}
        <button onClick={() => setMobileOpenOn(pathname)} aria-label="More: open the full menu" aria-expanded={mobileOpen}
          className="relative flex h-14 flex-col items-center justify-center gap-0.5 text-[10.5px] font-semibold text-slate-400">
          <span className="relative">
            <Menu size={19} />
            <NotificationDot show={counts.messages + counts.updates > 0} className="-right-1 -top-1 ring-slate-950" />
          </span>
          More
        </button>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[950]" role="dialog" aria-modal="true" aria-label="Business menu">
          <div onClick={() => setMobileOpenOn(null)} className="absolute inset-0 animate-[bsBackdrop_0.2s_ease] bg-slate-950/60 backdrop-blur-sm" />
          <div className="absolute inset-y-0 left-0 w-[min(86vw,300px)] animate-[bsSlide_0.28s_cubic-bezier(0.22,1,0.36,1)] shadow-2xl shadow-black/60">
            {content(() => setMobileOpenOn(null))}
          </div>
        </div>
      )}

      <SignOutDialog open={confirmSignOut} onOpenChange={setConfirmSignOut} />
    </>
  );
}
