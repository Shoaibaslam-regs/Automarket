"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { Session } from "next-auth";
import {
  Briefcase, Calendar, Car, ChevronRight, Crown, Flame, Heart, LayoutDashboard, LifeBuoy, LogOut, MessageSquare, MessageSquareHeart,
  Search, Settings, ShieldCheck, ShoppingBag, Sparkles, X, type LucideIcon,
} from "lucide-react";
import { CountBadge } from "@/components/NotificationBadge";
import UserIdBadge from "@/components/UserIdBadge";
import MenuGroupTitle from "@/components/ui/MenuGroupTitle";
import { useSubscription } from "@/components/subscription/useSubscription";
import { planInfo } from "@/lib/plans";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { BUSINESS_ROLE_NAME, useMyBusiness } from "@/hooks/useMyBusiness";
import { InstallAppRow } from "@/components/pwa/InstallBanner";
import PushCard from "@/components/pwa/PushCard";
import { openFeedback } from "@/components/FeedbackDialog";

/** `action` makes the row a button (e.g. opening a dialog) instead of a link */
type Item = { href: string; label: string; icon: LucideIcon; count?: number; hint?: string; action?: () => void };


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
  counts: { messages: number; bookings: number; purchases: number };
}) {
  const pathname = usePathname();
  const user = session?.user;
  // Only ask for the plan once the drawer is actually opened by a signed-in user
  const { data: sub } = useSubscription(open && !!user);
  const plan = sub ? planInfo(sub.planId) : null;

  // Business accounts get their business shown in the menu
  const hasBusiness = !!sub?.hasBusiness;
  const biz = useMyBusiness(open && hasBusiness);

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
    { href: "/purchases", label: "Purchases", icon: ShoppingBag, count: counts.purchases },
    { href: "/saved", label: "Saved", icon: Heart },
  ];
  const browse: Item[] = [
    { href: "/listings", label: "Browse vehicles", icon: Search },
    { href: "/help", label: "Help & safety", icon: LifeBuoy },
    { href: "#feedback", label: "Send feedback", icon: MessageSquareHeart, action: () => { onClose(); openFeedback(); } },
    { href: "/pricing", label: "Plans & pricing", icon: Crown, hint: plan && plan.id === "FREE" ? "Upgrade" : undefined },
  ];
  const account: Item[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/profile", label: "Profile & settings", icon: Settings },
    // Business accounts get a business card instead (below); others can start one
    ...(hasBusiness && !pathname.startsWith("/business") ? [] : [{
      href: pathname.startsWith("/business") ? "/" : "/business",
      label: pathname.startsWith("/business") ? "Back to marketplace" : sub && !hasBusiness ? "Start a business" : "Business console",
      icon: Briefcase,
    }]),
  ];

  const row = (item: Item) => {
    const Icon = item.icon;
    if (item.action) {
      return (
        <button key={item.href} type="button" onClick={item.action}
          className="group relative flex w-full items-center gap-2.5 rounded-lg py-1.5 pl-5 pr-2 text-left text-[13px] font-medium text-slate-700 transition hover:bg-slate-50 active:bg-slate-50">
          <span className="flex flex-shrink-0 items-center justify-center text-slate-500"><Icon size={14} strokeWidth={1.9} /></span>
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          <ChevronRight size={13} className="text-slate-300" />
        </button>
      );
    }
    const active = isActive(item.href);
    return (
      <Link
        key={item.href + item.label}
        href={item.href}
        onClick={onClose}
        aria-current={active ? "page" : undefined}
        // The current page: a dot on the left and a faint background; hover is only a light tint
        className={`group relative flex items-center gap-2.5 rounded-lg py-1.5 pl-5 pr-2 text-[13px] font-medium transition ${
          active ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-50 active:bg-slate-50"
        }`}
      >
        {active && <span aria-hidden className="absolute left-1.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 shadow-[0_0_6px_rgba(139,92,246,0.6)]" />}
        <span className={`flex flex-shrink-0 items-center justify-center ${active ? "text-slate-900" : "text-slate-500"}`}>
          <Icon size={14} strokeWidth={active ? 2.2 : 1.9} />
        </span>
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {item.hint && (
          <span className="rounded-full bg-gradient-to-r from-amber-300 to-amber-500 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-slate-950">{item.hint}</span>
        )}
        <CountBadge count={item.count ?? 0} />
        <ChevronRight size={13} className={active ? "text-slate-400" : "text-slate-300"} />
      </Link>
    );
  };

  const section = (title: string, items: Item[]) => (
    <div>
      <MenuGroupTitle className="pl-5 pr-2">{title}</MenuGroupTitle>
      <div className="space-y-0.5">{items.map(row)}</div>
    </div>
  );

  return (
    // Hidden from 769px, the same width at which Navbar swaps its menu button for the desktop links
    // (md:hidden hid it from 768px, so on an upright iPad, exactly 768px wide, the button opened nothing)
    <div className="fixed inset-0 z-[150] min-[769px]:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <div onClick={onClose} className="absolute inset-0 animate-[mnFade_0.2s_ease] bg-slate-950/50 backdrop-blur-sm" />
      <style>{`
        @keyframes mnFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes mnSlide { from { transform: translateX(100%) } to { transform: translateX(0) } }
        @keyframes mnFlame { 0%, 100% { transform: scale(1) rotate(-4deg) } 50% { transform: scale(1.18) rotate(5deg) } }
        @keyframes mnShine { from { transform: translateX(-120%) skewX(-20deg) } to { transform: translateX(320%) skewX(-20deg) } }
        @media (prefers-reduced-motion: reduce) { .mn-hot, .mn-hot * { animation: none !important } }
      `}</style>

      <aside className="absolute inset-y-0 right-0 flex w-[min(80vw,300px)] animate-[mnSlide_0.28s_cubic-bezier(0.22,1,0.36,1)] flex-col bg-white shadow-2xl shadow-slate-950/40">
        {/* Header */}
        <div className="relative overflow-hidden bg-slate-950 px-4 pb-3.5 pt-3 text-white">
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-500/30 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-amber-400/15 blur-3xl" />

          <div className="relative flex items-center justify-between">
            <Image src="/logo-1771205663069.png" alt="AutoMarket" width={120} height={32} className="h-5 w-auto" style={{ filter: "brightness(0.5) invert(1)" }} />
            <button onClick={onClose} aria-label="Close menu" className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-slate-200 ring-1 ring-inset ring-white/15 transition hover:bg-white/20">
              <X size={14} />
            </button>
          </div>

          {user ? (
            <div className="relative mt-4">
              {/* Who: a larger avatar beside the name and email */}
              <div className="flex items-center gap-3">
                <span className={`flex-shrink-0 rounded-full p-[2px] ${hasBusiness ? "bg-gradient-to-br from-indigo-400 to-fuchsia-500" : "bg-gradient-to-br from-indigo-400 via-fuchsia-400 to-amber-300"}`}>
                  <span className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-slate-900 text-base font-bold">
                    {user.image ? <Image src={user.image} alt="" fill sizes="44px" className="object-cover" /> : user.name?.[0]?.toUpperCase() || "?"}
                  </span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold leading-tight">{user.name}</p>
                  <p className="mt-0.5 truncate text-[11px] text-slate-400">{user.email}</p>
                </div>
              </div>
              {/* Plan, business and ID on their own row with room between them (plain text, no chips) */}
              <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 border-t border-white/10 pt-2.5 text-[11px] font-semibold">
                {plan && (
                  <span className="inline-flex items-center gap-1 text-amber-200"><Crown size={12} /> {plan.name}</span>
                )}
                {hasBusiness && (
                  <>
                    <span aria-hidden className="text-slate-600">·</span>
                    <span className="inline-flex items-center gap-1 text-indigo-200"><Briefcase size={11} /> Business</span>
                  </>
                )}
                <span aria-hidden className="text-slate-600">·</span>
                <UserIdBadge id={user.id} className="!bg-transparent !px-0 !py-0 !text-[11px] !text-slate-300 !ring-0 hover:!text-white" />
              </div>
            </div>
          ) : (
            <div className="relative mt-3">
              <p className="text-sm font-semibold">Welcome to AutoMarket</p>
              <p className="mt-0.5 text-xs text-slate-400">Buy, sell and rent cars and bikes across Pakistan.</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link href="/login" onClick={onClose} className="rounded-lg bg-white/10 py-2 text-center text-xs font-semibold ring-1 ring-inset ring-white/15 transition hover:bg-white/15">
                  Sign in
                </Link>
                <Link href="/register" onClick={onClose} className="rounded-lg bg-white py-2 text-center text-xs font-semibold text-slate-950 transition hover:bg-slate-200">
                  Create account
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 space-y-3.5 overflow-y-auto overscroll-contain px-2.5 py-3">
          {user && (
            // One plain row of shortcuts: icon over label, no boxes; the current page gets a dot.
            // Items are only as wide as their label and justify-between spreads items and dividers,
            // so every gap between a label and a divider is the same.
            <div className="flex items-center justify-between border-b border-slate-100 px-1 pb-2.5">
              {quick.map(({ href, label, icon: Icon, count }, i) => {
                const active = isActive(href);
                return [
                  i > 0 && <span key={`${href}-divider`} aria-hidden className="h-5 w-px flex-shrink-0 bg-slate-200" />,
                  <Link
                    key={href}
                    href={href}
                    onClick={onClose}
                    aria-current={active ? "page" : undefined}
                    // Screen readers hear "Messages, 3 unread"; the badge itself stays silent
                    aria-label={count ? `${label}, ${count} ${href === "/messages" ? "unread" : "new"}` : label}
                    className={`relative flex flex-col items-center gap-1 py-1 text-[10px] font-medium transition active:scale-95 ${active ? "text-slate-900" : "text-slate-500 hover:text-slate-900"}`}
                  >
                    <span className="relative">
                      <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                      <CountBadge count={count ?? 0} max={9} hidden className="absolute -right-2.5 -top-1.5 h-4 min-w-4 text-[9px]" />
                    </span>
                    <span className={active ? "font-semibold" : ""}>{label}</span>
                    <span className={`h-1 w-1 rounded-full ${active ? "bg-slate-900" : "bg-transparent"}`} />
                  </Link>,
                ];
              })}
            </div>
          )}

          <div>
            <MenuGroupTitle className="pl-5 pr-2">Explore</MenuGroupTitle>
            {/* Hot deals: highlighted like the province picker's capital card */}
            <Link
              href="/deals"
              onClick={onClose}
              aria-current={isActive("/deals") ? "page" : undefined}
              className="mn-hot mb-1 block rounded-lg"
            >
              <span className="relative flex items-center gap-2.5 overflow-hidden rounded-lg py-1.5 pl-5 pr-2 transition hover:bg-slate-50">
                <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-[mnShine_2.8s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-amber-200/50 to-transparent" />
                <span className="relative flex flex-shrink-0 items-center justify-center text-rose-500">
                  <Flame size={14} className="animate-[mnFlame_1.1s_ease-in-out_infinite]" />
                </span>
                <span className="relative min-w-0 flex-1 truncate text-[13px] font-bold text-slate-900">Hot deals</span>
                <span className="relative inline-flex items-center gap-1 rounded-full bg-rose-50 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-rose-600 ring-1 ring-inset ring-rose-200">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-rose-500" />
                  </span>
                  Hot
                </span>
                <ChevronRight size={13} className="relative text-slate-300" />
              </span>
            </Link>
            <div className="space-y-0.5">{browse.map(row)}</div>
          </div>
          {user && section("Account", account)}

          {user && hasBusiness && !pathname.startsWith("/business") && (
            <Link
              href="/business"
              onClick={onClose}
              className="block rounded-xl bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-amber-400 p-[1.5px]"
            >
              <span className="flex items-center gap-2.5 rounded-[10.5px] bg-white px-2.5 py-2">
                <span className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-sm font-bold text-white">
                  {biz?.logo ? <Image src={biz.logo} alt="" fill sizes="36px" className="object-cover" /> : (biz?.name?.[0]?.toUpperCase() ?? <Briefcase size={15} />)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-bold text-slate-900">{biz?.name ?? "Your business"}</span>
                  <span className="block truncate text-[11px] text-slate-500">
                    {biz?.role ? `${BUSINESS_ROLE_NAME[biz.role] ?? biz.role} · ` : ""}Open business console
                  </span>
                </span>
                <ChevronRight size={14} className="text-indigo-400" />
              </span>
            </Link>
          )}

          {user?.role === "ADMIN" && user.adminPortal && (
            <Link
              href="/admin"
              onClick={onClose}
              className="flex items-center gap-2.5 rounded-lg bg-amber-50 px-2 py-1.5 text-[13px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-200 transition hover:bg-amber-100"
            >
              <span className="flex items-center justify-center text-amber-600"><ShieldCheck size={14} /></span>
              <span className="flex-1">Admin panel</span>
              <ChevronRight size={13} className="text-amber-400" />
            </Link>
          )}

          {plan?.id === "FREE" && (
            <Link
              href="/pricing"
              onClick={onClose}
              className="relative block overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 to-indigo-950 p-3 text-white"
            >
              <div aria-hidden className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-amber-400/30 blur-2xl" />
              <p className="relative flex items-center gap-1.5 text-[13px] font-bold"><Sparkles size={13} className="text-amber-300" /> Go Premium</p>
              <p className="relative mt-0.5 text-[11px] leading-snug text-slate-300">More listings, a bigger team and full showroom tools from PKR 500 for 30 days.</p>
              <span className="relative mt-2 inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-amber-300 to-amber-500 px-2.5 py-1 text-[11px] font-bold text-slate-950">
                See plans <ChevronRight size={13} />
              </span>
            </Link>
          )}
        </div>

        {/* Footer */}
        <div className="space-y-2 border-t border-slate-100 p-2.5">
          <InstallAppRow onDone={onClose} />
          {user && <PushCard compact />}
          <div className="flex items-center justify-between gap-2 px-1">
            <span className="text-[11px] font-semibold text-slate-500">Theme</span>
            <ThemeToggle />
          </div>
          {user && (
            <button
              onClick={() => { onClose(); onSignOut(); }}
              className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-[13px] font-semibold text-rose-600 ring-1 ring-inset ring-rose-100 transition hover:bg-rose-50"
            >
              <LogOut size={14} /> Sign out
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}
