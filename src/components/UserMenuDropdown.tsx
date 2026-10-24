"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { Session } from "next-auth";
import {
  Briefcase, Calendar, ChevronRight, Crown, Heart, LayoutDashboard, LifeBuoy, LogOut, MessageSquare, MessageSquareHeart, Settings, ShieldCheck, ShoppingBag, Sparkles, type LucideIcon,
} from "lucide-react";
import { CountBadge } from "@/components/NotificationBadge";
import { BUSINESS_ROLE_NAME, useMyBusiness } from "@/hooks/useMyBusiness";
import UserIdBadge from "@/components/UserIdBadge";
import MenuGroupTitle from "@/components/ui/MenuGroupTitle";
import { useSubscription } from "@/components/subscription/useSubscription";
import { planInfo } from "@/lib/plans";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { openFeedback } from "@/components/FeedbackDialog";

/** `action` makes the row a button (e.g. opening a dialog) instead of a link */
type Item = { href: string; label: string; icon: LucideIcon; count?: number; action?: () => void };

/** Avatar with the gradient ring shared by the account menu, mobile drawer and business sidebar. */
export function RingAvatar({ name, image, size = 30 }: { name?: string | null; image?: string | null; size?: number }) {
  return (
    <span className="inline-flex flex-shrink-0 rounded-full bg-gradient-to-br from-indigo-400 via-fuchsia-400 to-amber-300 p-[2px]">
      <span
        className="relative flex items-center justify-center overflow-hidden rounded-full bg-slate-900 font-bold text-white ring-2 ring-white"
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {image ? <Image src={image} alt="" fill sizes={`${size}px`} className="object-cover" /> : name?.[0]?.toUpperCase() || "?"}
      </span>
    </span>
  );
}

/**
 * Desktop account menu: the light counterpart of the dark business sidebar.
 * Only fetches the plan once it's opened.
 */
export default function UserMenuDropdown({
  session,
  counts,
  onClose,
  onSignOut,
}: {
  session: Session;
  counts: { messages: number; bookings: number; purchases: number };
  onClose: () => void;
  onSignOut: () => void;
}) {
  const pathname = usePathname();
  const user = session.user;
  const { data: sub } = useSubscription(true);
  const plan = sub ? planInfo(sub.planId) : null;
  const inBusiness = pathname.startsWith("/business");
  // Business accounts see their business here instead of a plain "Business console" link
  const hasBusiness = !!sub?.hasBusiness;
  const biz = useMyBusiness(hasBusiness);

  const activity: Item[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/messages", label: "Messages", icon: MessageSquare, count: counts.messages },
    { href: "/bookings", label: "Bookings", icon: Calendar, count: counts.bookings },
    { href: "/purchases", label: "Purchases", icon: ShoppingBag, count: counts.purchases },
    { href: "/saved", label: "Saved", icon: Heart },
  ];
  const account: Item[] = [
    { href: "/profile", label: "Profile & settings", icon: Settings },
    { href: "/help", label: "Help & safety", icon: LifeBuoy },
    { href: "#feedback", label: "Send feedback", icon: MessageSquareHeart, action: () => { onClose(); openFeedback(); } },
  ];

  const row = ({ href, label, icon: Icon, count, action }: Item, extra = "") => {
    if (action) {
      return (
        <button key={href} type="button" onClick={action} role="menuitem"
          className={`group relative flex w-full items-center gap-3 rounded-xl py-2 pl-5 pr-2 text-left text-[13px] font-medium text-slate-700 transition hover:bg-slate-50 ${extra}`}>
          <Icon size={15} strokeWidth={1.9} className="flex-shrink-0 text-slate-500 transition group-hover:text-slate-700" />
          <span className="flex-1 truncate">{label}</span>
        </button>
      );
    }
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return (
      <Link
        key={href}
        href={href}
        onClick={onClose}
        role="menuitem"
        aria-current={active ? "page" : undefined}
        // The current page: a dot on the left and a faint background; hover is only a light tint
        className={`group relative flex items-center gap-3 rounded-xl py-2 pl-5 pr-2 text-[13px] font-medium transition ${
          active ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-50"
        } ${extra}`}
      >
        {active && <span aria-hidden className="absolute left-1.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 shadow-[0_0_6px_rgba(139,92,246,0.6)]" />}
        <Icon size={15} strokeWidth={active ? 2.2 : 1.9} className={`flex-shrink-0 transition ${active ? "text-slate-900" : "text-slate-500 group-hover:text-slate-700"}`} />
        <span className="flex-1 truncate">{label}</span>
        <CountBadge count={count ?? 0} />
      </Link>
    );
  };

  return (
    <div
      role="menu"
      className="absolute right-0 top-[calc(100%+10px)] z-[200] max-h-[calc(100vh-80px)] w-[300px] origin-top-right animate-[umIn_0.16s_ease-out] overflow-y-auto overscroll-contain rounded-[22px] bg-white shadow-[0_24px_60px_-12px_rgba(15,23,42,0.35)] ring-1 ring-slate-200/80"
    >
      <style>{`@keyframes umIn { from { opacity: 0; transform: translateY(-6px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }`}</style>

      {/* Header */}
      <div className="relative overflow-hidden bg-slate-950 px-4 pb-4 pt-4 text-white">
        <div aria-hidden className="pointer-events-none absolute -right-12 -top-14 h-40 w-40 rounded-full bg-indigo-500/35 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-16 -left-8 h-32 w-32 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <RingAvatar name={user.name} image={user.image} size={42} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-slate-400">{user.email}</p>
          </div>
        </div>
        <div className="relative mt-3 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-amber-200 ring-1 ring-inset ring-white/15">
            <Crown size={11} /> {plan ? plan.name : "…"}
          </span>
          {user.role === "ADMIN" && user.adminPortal && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300 ring-1 ring-inset ring-amber-300/25">
              <ShieldCheck size={11} /> Admin
            </span>
          )}
          {hasBusiness && (
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/25 px-2 py-0.5 text-[11px] font-semibold text-indigo-100 ring-1 ring-inset ring-indigo-300/30">
              <Briefcase size={11} /> Business
            </span>
          )}
          <UserIdBadge id={user.id} className="!bg-white/10 !text-slate-300 !ring-white/15" />
        </div>
      </div>

      {/* Links */}
      <div className="space-y-3 px-2 pb-2 pt-3">
        <div className="space-y-0.5">
          <MenuGroupTitle className="pl-5 pr-2">Activity</MenuGroupTitle>
          {activity.map(item => row(item))}
        </div>
        <div className="space-y-0.5">
          <MenuGroupTitle className="pl-5 pr-2">Account & help</MenuGroupTitle>
          {account.map(item => row(item))}
        </div>
      </div>

      <div className="mx-3 h-px bg-slate-100" />

      <div className="space-y-0.5 p-2">
        {hasBusiness && !inBusiness ? (
          <Link href="/business" onClick={onClose} role="menuitem" className="block rounded-xl bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-amber-400 p-[1.5px]">
            <span className="flex items-center gap-3 rounded-[10.5px] bg-white px-2 py-1.5">
              <span className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-sm font-bold text-white">
                {biz?.logo ? <Image src={biz.logo} alt="" fill sizes="32px" className="object-cover" /> : (biz?.name?.[0]?.toUpperCase() ?? <Briefcase size={14} />)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-bold text-slate-900">{biz?.name ?? "Your business"}</span>
                <span className="block truncate text-[11px] text-slate-500">{biz?.role ? `${BUSINESS_ROLE_NAME[biz.role] ?? biz.role} · ` : ""}Open business console</span>
              </span>
              <ChevronRight size={14} className="text-indigo-400" />
            </span>
          </Link>
        ) : (
          row({ href: inBusiness ? "/" : "/business", label: inBusiness ? "Back to marketplace" : sub && !hasBusiness ? "Start a business" : "Business console", icon: Briefcase })
        )}
        {user.role === "ADMIN" && user.adminPortal && (
          <Link
            href="/admin"
            onClick={onClose}
            role="menuitem"
            className="group flex items-center gap-3 rounded-xl py-2 pl-5 pr-2 text-[13px] font-semibold text-amber-800 transition hover:bg-amber-50"
          >
            <span className="flex items-center justify-center text-amber-700"><ShieldCheck size={15} /></span>
            <span className="flex-1">Admin panel</span>
            <ChevronRight size={14} className="text-amber-400" />
          </Link>
        )}
      </div>

      {plan?.id === "FREE" && (
        <Link
          href="/pricing"
          onClick={onClose}
          className="relative mx-2 mb-2 flex items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 p-3 text-white"
        >
          <div aria-hidden className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-amber-400/30 blur-2xl" />
          <span className="relative flex flex-shrink-0 items-center justify-center text-amber-500">
            <Sparkles size={15} />
          </span>
          <span className="relative min-w-0 flex-1">
            <span className="block text-[13px] font-bold">Go Premium</span>
            <span className="block truncate text-[11px] text-slate-300">More listings from PKR 500 / 30 days</span>
          </span>
          <ChevronRight size={15} className="relative text-slate-400" />
        </Link>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-2.5">
        <span className="text-[13px] font-medium text-slate-600">Theme</span>
        <ThemeToggle compact />
      </div>

      <div className="border-t border-slate-100 p-2">
        <button
          onClick={() => { onClose(); onSignOut(); }}
          role="menuitem"
          className="flex w-full items-center gap-3 rounded-xl py-2 pl-5 pr-2 text-[13px] font-medium text-rose-600 transition hover:bg-rose-50"
        >
          <span className="flex items-center justify-center text-rose-500"><LogOut size={15} /></span>
          Sign out
        </button>
      </div>
    </div>
  );
}
