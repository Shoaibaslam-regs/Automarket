"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { Session } from "next-auth";
import {
  Briefcase, Calendar, Car, ChevronRight, Crown, Heart, KeyRound, LayoutDashboard, LogOut, MessageSquare,
  Search, Settings, ShieldCheck, Sparkles, X, type LucideIcon,
} from "lucide-react";
import { CountBadge } from "@/components/NotificationBadge";
import UserIdBadge from "@/components/UserIdBadge";
import { useSubscription } from "@/components/subscription/useSubscription";
import { planInfo } from "@/lib/plans";

type Item = { href: string; label: string; icon: LucideIcon; count?: number; hint?: string };

/**
 * Full-height slide-in menu for small screens. Locks page scroll while open and closes on Escape.
 * Navigation closes it automatically because the Navbar ties `open` to the route it was opened on.
 */
export default function MobileNavDrawer({
  open,
  onClose,
  onSignOut,
  session,
  counts,
}: {
  open: boolean;
  onClose: () => void;
  onSignOut: () => void;
  session: Session | null;
  counts: { messages: number; bookings: number };
}) {
  const pathname = usePathname();
  const user = session?.user;
  // Only ask for the plan once the drawer is actually opened by a signed-in user
  const { data: sub } = useSubscription(open && !!user);
  const plan = sub ? planInfo(sub.planId) : null;

  // The parent passes a new onClose every render; a ref keeps the effect below tied to `open` only,
  // so the saved overflow value is captured once per opening and restored correctly
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCloseRef.current(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!open) return null;

  const isActive = (href: string) => {
    const [path, query] = href.split("?");
    if (query) return false;
    return path === "/listings" ? pathname === "/listings" : pathname === path || pathname.startsWith(`${path}/`);
  };

  const quick: Item[] = [
    { href: "/sell", label: "Sell", icon: Car },
    { href: "/messages", label: "Messages", icon: MessageSquare, count: counts.messages },
    { href: "/bookings", label: "Bookings", icon: Calendar, count: counts.bookings },
    { href: "/saved", label: "Saved", icon: Heart },
  ];
  const browse: Item[] = [
    { href: "/listings", label: "Browse vehicles", icon: Search },
    { href: "/listings?type=RENT", label: "Rentals", icon: KeyRound },
    { href: "/pricing", label: "Plans & pricing", icon: Crown, hint: plan && plan.id === "FREE" ? "Upgrade" : undefined },
  ];
  const account: Item[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/profile", label: "Profile & settings", icon: Settings },
    { href: pathname.startsWith("/business") ? "/home" : "/business", label: pathname.startsWith("/business") ? "Back to marketplace" : "Business console", icon: Briefcase },
  ];

  const row = (item: Item) => {
    const active = isActive(item.href);
    const Icon = item.icon;
    return (
      <Link
        key={item.href + item.label}
        href={item.href}
        onClick={onClose}
        aria-current={active ? "page" : undefined}
        className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition ${
          active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100 active:bg-slate-100"
        }`}
      >
        <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${active ? "bg-white/10 text-white" : "bg-slate-100 text-slate-600 group-hover:bg-white"}`}>
          <Icon size={17} strokeWidth={1.9} />
        </span>
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {item.hint && (
          <span className="rounded-full bg-gradient-to-r from-amber-300 to-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-950">{item.hint}</span>
        )}
        <CountBadge count={item.count ?? 0} />
        <ChevronRight size={15} className={active ? "text-white/60" : "text-slate-300"} />
      </Link>
    );
  };

  const section = (title: string, items: Item[]) => (
    <div>
      <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{title}</p>
      <div className="space-y-0.5">{items.map(row)}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[150] md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <div onClick={onClose} className="absolute inset-0 animate-[mnFade_0.2s_ease] bg-slate-950/50 backdrop-blur-sm" />
      <style>{`
        @keyframes mnFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes mnSlide { from { transform: translateX(100%) } to { transform: translateX(0) } }
      `}</style>

      <aside className="absolute inset-y-0 right-0 flex w-[min(88vw,380px)] animate-[mnSlide_0.28s_cubic-bezier(0.22,1,0.36,1)] flex-col bg-white shadow-2xl shadow-slate-950/40">
        {/* Header */}
        <div className="relative overflow-hidden bg-slate-950 px-5 pb-5 pt-4 text-white">
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-500/30 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-amber-400/15 blur-3xl" />

          <div className="relative flex items-center justify-between">
            <Image src="/logo-1771205663069.png" alt="AutoMarket" width={120} height={32} className="h-7 w-auto" style={{ filter: "brightness(0.5) invert(1)" }} />
            <button onClick={onClose} aria-label="Close menu" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-slate-200 ring-1 ring-inset ring-white/15 transition hover:bg-white/20">
              <X size={18} />
            </button>
          </div>

          {user ? (
            <div className="relative mt-5 flex items-center gap-3">
              <span className="rounded-full bg-gradient-to-br from-indigo-400 via-fuchsia-400 to-amber-300 p-[2px]">
                <span className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-slate-900 text-lg font-bold">
                  {user.image ? <Image src={user.image} alt="" fill sizes="48px" className="object-cover" /> : user.name?.[0]?.toUpperCase() || "?"}
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold">{user.name}</p>
                <p className="truncate text-xs text-slate-400">{user.email}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {plan && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-amber-200 ring-1 ring-inset ring-white/15">
                      <Crown size={11} /> {plan.name}
                    </span>
                  )}
                  <UserIdBadge id={user.id} className="!bg-white/10 !text-slate-300 !ring-white/15" />
                </div>
              </div>
            </div>
          ) : (
            <div className="relative mt-5">
              <p className="text-lg font-semibold">Welcome to AutoMarket</p>
              <p className="mt-1 text-sm text-slate-400">Buy, sell and rent cars and bikes across Pakistan.</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link href="/login" onClick={onClose} className="rounded-xl bg-white/10 py-2.5 text-center text-sm font-semibold ring-1 ring-inset ring-white/15 transition hover:bg-white/15">
                  Sign in
                </Link>
                <Link href="/register" onClick={onClose} className="rounded-xl bg-white py-2.5 text-center text-sm font-semibold text-slate-950 transition hover:bg-slate-200">
                  Create account
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto overscroll-contain px-3 py-4">
          {user && (
            <div className="grid grid-cols-4 gap-2 px-1">
              {quick.map(({ href, label, icon: Icon, count }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={onClose}
                  className={`relative flex flex-col items-center gap-1.5 rounded-2xl py-3 text-[11px] font-semibold ring-1 ring-inset transition active:scale-95 ${
                    isActive(href) ? "bg-slate-900 text-white ring-slate-900" : "bg-slate-50 text-slate-700 ring-slate-200/80 hover:bg-slate-100"
                  }`}
                >
                  <Icon size={19} strokeWidth={1.9} />
                  {label}
                  <CountBadge count={count ?? 0} className="absolute right-1.5 top-1.5" />
                </Link>
              ))}
            </div>
          )}

          {section("Explore", browse)}
          {user && section("Account", account)}

          {user?.role === "ADMIN" && (
            <Link
              href="/admin"
              onClick={onClose}
              className="mx-1 flex items-center gap-3 rounded-2xl bg-amber-50 px-3 py-3 text-[15px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-200 transition hover:bg-amber-100"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100"><ShieldCheck size={17} /></span>
              <span className="flex-1">Admin panel</span>
              <ChevronRight size={15} className="text-amber-400" />
            </Link>
          )}

          {plan?.id === "FREE" && (
            <Link
              href="/pricing"
              onClick={onClose}
              className="relative mx-1 block overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 p-4 text-white"
            >
              <div aria-hidden className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-amber-400/30 blur-2xl" />
              <p className="relative flex items-center gap-1.5 text-sm font-bold"><Sparkles size={15} className="text-amber-300" /> Go Premium</p>
              <p className="relative mt-1 text-xs leading-relaxed text-slate-300">More listings, a bigger team and full showroom tools from PKR 500/month.</p>
              <span className="relative mt-3 inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-amber-300 to-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950">
                See plans <ChevronRight size={13} />
              </span>
            </Link>
          )}
        </div>

        {/* Footer */}
        {user && (
          <div className="border-t border-slate-100 p-3">
            <button
              onClick={() => { onClose(); onSignOut(); }}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-rose-600 ring-1 ring-inset ring-rose-100 transition hover:bg-rose-50"
            >
              <LogOut size={16} /> Sign out
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
