"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import SignOutDialog from "@/components/SignOutDialog";
import UserIdBadge from "@/components/UserIdBadge";
import {
  ArrowLeftRight, BarChart3, Car, ChevronDown, Crown, House, KeyRound, LayoutDashboard, LogOut, MessageSquare,
  Settings, Sparkles, User, Users, X, type LucideIcon,
} from "lucide-react";
import { CountBadge, NotificationDot } from "@/components/NotificationBadge";
import { useNotificationCounts } from "@/hooks/useNotificationCounts";
import { useSubscription, type SubscriptionInfo } from "@/components/subscription/useSubscription";
import { formatLimit, planInfo } from "@/lib/plans";

type Organization = {
  name: string;
  type: string;
  plan: string;
  city: string;
};

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/business/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/business/inventory", label: "Inventory", icon: Car },
  { href: "/business/customers", label: "Customers", icon: Users },
  { href: "/business/rentals", label: "Rentals", icon: KeyRound },
  { href: "/business/staff", label: "Staff", icon: User },
  { href: "/business/reports", label: "Reports", icon: BarChart3 },
  { href: "/business/settings", label: "Settings", icon: Settings },
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
          <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-slate-900 text-sm font-extrabold text-white">
            {org?.name?.[0]?.toUpperCase() || "B"}
          </span>
          <NotificationDot show={counts.messages > 0} className="-right-1 -top-1 ring-slate-950" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-white">{org?.name || "My Business"}</span>
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
          <div className="mb-1 border-b border-white/10 px-2.5 pb-2.5 pt-1.5">
            <p className="truncate text-[13px] font-semibold text-white">{session?.user?.name}</p>
            <p className="truncate text-[11px] text-slate-400">{session?.user?.email}</p>
          </div>
          {[
            { label: "Business settings", href: "/business/settings", icon: Settings },
            { label: "Messages", href: "/messages", icon: MessageSquare },
            { label: "My dashboard", href: "/dashboard", icon: User },
            { label: "Marketplace", href: "/home", icon: House },
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

/** Plan name, listings meter and an upgrade link, so the plan is always visible in the console. */
function PlanCard({ sub }: { sub: SubscriptionInfo }) {
  const plan = planInfo(sub.planId);
  const limit = sub.limits.listings;
  const used = sub.usage.listings;
  const pct = limit === null ? 100 : Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));
  const full = limit !== null && used >= limit;
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-3.5 ring-1 ring-inset ring-white/10">
      <div aria-hidden className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-amber-400/20 blur-2xl" />
      <div className="relative flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-white">
          <Crown size={13} className="text-amber-300" /> {plan.name} plan
        </p>
        <span className={`text-[11px] tabular-nums ${full ? "font-semibold text-rose-300" : "text-slate-400"}`}>
          {used}/{formatLimit(limit)}
        </span>
      </div>
      <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full ${limit === null ? "bg-gradient-to-r from-amber-300 to-amber-500" : full ? "bg-rose-400" : pct >= 75 ? "bg-amber-400" : "bg-emerald-400"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="relative mt-1.5 text-[10px] text-slate-500">Active listings</p>
      {sub.planId !== "UNLIMITED" && (
        <Link
          href="/pricing"
          className="relative mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-300 to-amber-500 py-2 text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:opacity-90"
        >
          <Sparkles size={13} /> Upgrade plan
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
  // Rentals is where business owners handle incoming booking requests
  const navBadge = (href: string) => (href === "/business/rentals" ? counts.ownerBookings : 0);

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-slate-950 text-white">
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-indigo-600/25 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-amber-500/10 blur-3xl" />

      {/* Logo + org */}
      <div className="relative space-y-4 px-4 pb-4 pt-5">
        <div className="flex items-center justify-between">
          <Link href="/home" className="flex items-center gap-2">
            <Image src="/logo-1771205663069.png" alt="AutoMarket" width={110} height={28} className="h-6 w-auto" style={{ filter: "brightness(0.5) invert(1)" }} />
            <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-300 ring-1 ring-inset ring-white/10">
              Business
            </span>
          </Link>
          {onClose && (
            <button onClick={onClose} aria-label="Close menu" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-slate-200 ring-1 ring-inset ring-white/15 transition hover:bg-white/20">
              <X size={16} />
            </button>
          )}
        </div>
        <OrgCard org={org} counts={counts} onSignOut={onSignOut} />
      </div>

      {/* Nav */}
      <nav className="relative flex-1 space-y-0.5 overflow-y-auto overscroll-contain px-3 pb-3">
        <p className="px-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Manage</p>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          const badge = navBadge(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              aria-current={active ? "page" : undefined}
              className={`group flex items-center gap-3 rounded-xl px-2.5 py-2 text-[13.5px] font-medium transition ${
                active ? "bg-white text-slate-950 shadow-lg shadow-black/30" : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition ${
                active ? "bg-slate-950 text-white" : "bg-white/[0.06] text-slate-400 ring-1 ring-inset ring-white/5 group-hover:text-white"
              }`}>
                <Icon size={16} strokeWidth={1.9} />
              </span>
              <span className="flex-1 truncate">{label}</span>
              {badge > 0 ? <CountBadge count={badge} /> : active && <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500" />}
            </Link>
          );
        })}
      </nav>

      {/* Plan + account */}
      <div className="relative space-y-3 border-t border-white/10 px-3 pb-4 pt-3">
        {sub && <PlanCard sub={sub} />}
        <div className="flex items-center gap-2.5 px-1">
          <span className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 text-xs font-bold ring-1 ring-inset ring-white/15">
            {session?.user?.image ? <Image src={session.user.image} alt="" fill sizes="32px" className="object-cover" /> : session?.user?.name?.[0]?.toUpperCase() || "?"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-200">{session?.user?.name}</p>
            <UserIdBadge id={session?.user?.id} className="mt-0.5 !bg-white/5 !px-1.5 !text-[10px] !text-slate-400 !ring-white/10" />
          </div>
          <Link
            href="/home"
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
  const hasUnread = counts.messages + counts.ownerBookings > 0;

  useEffect(() => {
    fetch("/api/business/organizations")
      .then(r => r.json())
      .then(d => setOrg(d.organization))
      .catch(() => {});
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
        }
      `}</style>

      {/* Desktop sidebar */}
      <aside className="biz-desktop-sidebar sticky top-0 h-screen w-[248px] flex-shrink-0 border-r border-white/5">
        {content()}
      </aside>

      {/* Mobile top bar: the dark counterpart of the marketplace navbar */}
      <div className="biz-mobile-topbar fixed inset-x-0 top-0 z-50 hidden h-14 items-center justify-between gap-3 border-b border-white/10 bg-slate-950/90 px-4 backdrop-blur-xl">
        <Link href="/home" className="flex flex-shrink-0 items-center gap-2">
          <Image src="/logo-1771205663069.png" alt="AutoMarket" width={100} height={26} className="h-[22px] w-auto" style={{ filter: "brightness(0.5) invert(1)" }} />
          <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-300">Business</span>
        </Link>
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-xs font-medium text-slate-400">{org?.name}</span>
          <button
            onClick={() => setMobileOpenOn(pathname)}
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/[0.06] ring-1 ring-inset ring-white/15 transition active:scale-95"
          >
            <NotificationDot show={hasUnread} className="right-1.5 top-1.5 ring-slate-950" />
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-xs font-bold text-slate-950">
              {session?.user?.name?.[0]?.toUpperCase() || "?"}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[150]" role="dialog" aria-modal="true" aria-label="Business menu">
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
