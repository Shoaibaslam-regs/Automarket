"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { Session } from "next-auth";
import {
  Briefcase, Calendar, ChevronRight, Crown, Heart, LayoutDashboard, LogOut, MessageSquare, Settings, ShieldCheck, Sparkles,
  type LucideIcon,
} from "lucide-react";
import { CountBadge } from "@/components/NotificationBadge";
import UserIdBadge from "@/components/UserIdBadge";
import { useSubscription } from "@/components/subscription/useSubscription";
import { planInfo } from "@/lib/plans";

type Item = { href: string; label: string; icon: LucideIcon; count?: number };

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
  counts: { messages: number; bookings: number };
  onClose: () => void;
  onSignOut: () => void;
}) {
  const pathname = usePathname();
  const user = session.user;
  const { data: sub } = useSubscription(true);
  const plan = sub ? planInfo(sub.planId) : null;
  const inBusiness = pathname.startsWith("/business");

  const items: Item[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/messages", label: "Messages", icon: MessageSquare, count: counts.messages },
    { href: "/bookings", label: "Bookings", icon: Calendar, count: counts.bookings },
    { href: "/saved", label: "Saved", icon: Heart },
    { href: "/profile", label: "Profile & settings", icon: Settings },
  ];

  const row = ({ href, label, icon: Icon, count }: Item, extra = "") => {
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return (
      <Link
        key={href}
        href={href}
        onClick={onClose}
        role="menuitem"
        aria-current={active ? "page" : undefined}
        className={`group flex items-center gap-3 rounded-xl px-2 py-1.5 text-[13px] font-medium transition ${
          active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
        } ${extra}`}
      >
        <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition ${
          active ? "bg-white/10 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-slate-900 group-hover:shadow-sm"
        }`}>
          <Icon size={15} strokeWidth={1.9} />
        </span>
        <span className="flex-1 truncate">{label}</span>
        <CountBadge count={count ?? 0} />
      </Link>
    );
  };

  return (
    <div
      role="menu"
      className="absolute right-0 top-[calc(100%+10px)] z-[200] w-[300px] origin-top-right animate-[umIn_0.16s_ease-out] overflow-hidden rounded-[22px] bg-white shadow-[0_24px_60px_-12px_rgba(15,23,42,0.35)] ring-1 ring-slate-200/80"
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
          {user.role === "ADMIN" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300 ring-1 ring-inset ring-amber-300/25">
              <ShieldCheck size={11} /> Admin
            </span>
          )}
          <UserIdBadge id={user.id} className="!bg-white/10 !text-slate-300 !ring-white/15" />
        </div>
      </div>

      {/* Links */}
      <div className="space-y-0.5 p-2">
        {items.map(item => row(item))}
      </div>

      <div className="mx-3 h-px bg-slate-100" />

      <div className="space-y-0.5 p-2">
        {row({ href: inBusiness ? "/home" : "/business", label: inBusiness ? "Back to marketplace" : "Business console", icon: Briefcase })}
        {user.role === "ADMIN" && (
          <Link
            href="/admin"
            onClick={onClose}
            role="menuitem"
            className="group flex items-center gap-3 rounded-xl px-2 py-1.5 text-[13px] font-semibold text-amber-800 transition hover:bg-amber-50"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700"><ShieldCheck size={15} /></span>
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
          <span className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-300 to-amber-500 text-slate-950">
            <Sparkles size={15} />
          </span>
          <span className="relative min-w-0 flex-1">
            <span className="block text-[13px] font-bold">Go Premium</span>
            <span className="block truncate text-[11px] text-slate-300">More listings from PKR 500/month</span>
          </span>
          <ChevronRight size={15} className="relative text-slate-400" />
        </Link>
      )}

      <div className="border-t border-slate-100 p-2">
        <button
          onClick={() => { onClose(); onSignOut(); }}
          role="menuitem"
          className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-[13px] font-medium text-rose-600 transition hover:bg-rose-50"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-500"><LogOut size={15} /></span>
          Sign out
        </button>
      </div>
    </div>
  );
}
