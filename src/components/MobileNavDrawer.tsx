"use client";

import { useEffect, useRef } from "react";
import SignInLink from "@/components/auth/SignInLink";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { Session } from "next-auth";
import {
  Briefcase, Calendar, Car, ChevronRight, Crown, Flame, Heart, LayoutDashboard, LifeBuoy, LogOut, MessageSquare, MessageSquareHeart,
  Newspaper, Search, Settings, ShieldCheck, ShoppingBag, Sparkles, X, type LucideIcon,
} from "lucide-react";
import { CountBadge } from "@/components/NotificationBadge";
import UserIdBadge from "@/components/UserIdBadge";
import MenuGroupTitle from "@/components/ui/MenuGroupTitle";
import { useSubscription } from "@/components/subscription/useSubscription";
import { PLANS, planInfo } from "@/lib/plans";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { BUSINESS_ROLE_NAME, useMyBusiness } from "@/hooks/useMyBusiness";
import { InstallAppRow } from "@/components/pwa/InstallBanner";
import PushCard from "@/components/pwa/PushCard";
import { openFeedback } from "@/components/FeedbackHost";

import AdminBadge from "@/components/AdminBadge";
/** `action` makes the row a button (e.g. opening a dialog) instead of a link */
type Item = { href: string; label: string; icon: LucideIcon; count?: number; hint?: string; action?: () => void; shimmer?: boolean };


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
    // The owner asked for a light shimmer on this row (Nov 2026), to draw the eye to the Marketplace
    { href: "/listings", label: "Marketplace", icon: Search, shimmer: true },
    { href: "/blog", label: "Blog & Guides", icon: Newspaper },
    { href: "/help", label: "Help & Safety", icon: LifeBuoy },
    { href: "#feedback", label: "Send Feedback", icon: MessageSquareHeart, action: () => { onClose(); openFeedback(); } },
    { href: "/pricing", label: "Plans & Pricing", icon: Crown, hint: plan && plan.id === "FREE" ? "Upgrade" : undefined },
  ];
  const account: Item[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/profile", label: "Profile & Settings", icon: Settings },
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
          className="group relative flex min-h-10 w-full items-center gap-3 rounded-lg py-2 pl-5 pr-2 text-left text-[14px] font-medium text-slate-700 transition hover:bg-slate-50 active:bg-slate-50">
          <span className="flex flex-shrink-0 items-center justify-center text-slate-500"><Icon size={16} strokeWidth={1.8} /></span>
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          <ChevronRight size={14} className="text-slate-300" />
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
        className={`group relative flex min-h-10 items-center gap-3 rounded-lg py-2 pl-5 pr-2 text-[14px] font-medium transition ${
          active ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-50 active:bg-slate-50"
        } ${item.shimmer ? "mn-shimmer overflow-hidden" : ""}`}
      >
        {active && <span aria-hidden className="absolute left-1.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-indigo-600" />}
        <span className={`flex flex-shrink-0 items-center justify-center ${active ? "text-slate-900" : "text-slate-500"}`}>
          <Icon size={16} strokeWidth={active ? 2.1 : 1.8} />
        </span>
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {item.hint && (
          <span className="rounded-full theme-static bg-amber-400 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-slate-950">{item.hint}</span>
        )}
        <CountBadge count={item.count ?? 0} />
        <ChevronRight size={14} className={active ? "text-slate-400" : "text-slate-300"} />
      </Link>
    );
  };

  const section = (title: string, items: Item[]) => (
    <div>
      <MenuGroupTitle className="mb-1 pl-5 pr-2">{title}</MenuGroupTitle>
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
        /* Marketplace row: a glass-like glint (a bright white line with soft grey edges) sweeps across it, then rests */
        @keyframes mnShimmer { 0% { transform: translateX(-120%) skewX(-20deg) } 35%, 100% { transform: translateX(320%) skewX(-20deg) } }
        .mn-shimmer { isolation: isolate; }
        /* z-index -1 inside the isolated row: the glint passes behind the icon and the word, never over them */
        .mn-shimmer::after { content: ""; position: absolute; inset: 0; z-index: -1; width: 35%; pointer-events: none;
          background: linear-gradient(90deg, rgba(148, 163, 184, 0) 0%, rgba(148, 163, 184, 0.14) 38%, rgba(255, 255, 255, 0.95) 50%, rgba(148, 163, 184, 0.14) 62%, rgba(148, 163, 184, 0) 100%);
          animation: mnShimmer 6s ease-in-out infinite; }
        /* Dark mode: a softer glint, so the light text stays readable as it passes behind */
        .dark .mn-shimmer::after { background: linear-gradient(90deg, rgba(148, 163, 184, 0) 0%, rgba(148, 163, 184, 0.12) 38%, rgba(255, 255, 255, 0.32) 50%, rgba(148, 163, 184, 0.12) 62%, rgba(148, 163, 184, 0) 100%); }
        @media (prefers-reduced-motion: reduce) { .mn-hot, .mn-hot *, .mn-shimmer::after { animation: none !important } .mn-shimmer::after { display: none } }
      `}</style>

      <aside className="absolute inset-y-0 right-0 flex w-[min(80vw,300px)] animate-[mnSlide_0.28s_cubic-bezier(0.22,1,0.36,1)] flex-col bg-white shadow-2xl shadow-black/40 dark:shadow-none">
        {/* Header */}
        {/* White in light mode and dark in dark mode (plain neutrals, which the theme inverts) */}
        <div className="relative overflow-hidden border-b border-slate-200 bg-white px-4 pb-3.5 pt-3 text-slate-900">

          <div className="relative flex items-center justify-end">
            <button onClick={onClose} aria-label="Close menu" className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-200">
              <X size={16} />
            </button>
          </div>

          {user ? (
            <div className="relative mt-4">
              {/* Who: a larger avatar beside the name and email */}
              <div className="flex items-center gap-3">
                <span className="flex-shrink-0 rounded-full bg-slate-200 p-[2px]">
                  <span className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-slate-900 text-base font-bold text-white">
                    {user.image ? <Image src={user.image} alt="" fill sizes="44px" className="object-cover" /> : user.name?.[0]?.toUpperCase() || "?"}
                  </span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex min-w-0 items-center gap-1 text-[15px] font-semibold leading-tight"><span className="truncate">{user.name}</span><AdminBadge user={user} /></p>
                  <p className="mt-1 truncate text-xs text-slate-500">{user.email}</p>
                </div>
              </div>
              {/* Plan, business and ID on their own row with room between them (plain text, no chips) */}
              <div className="mt-3.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 border-t border-slate-100 pt-3 text-xs font-semibold">
                {plan && (
                  <span className="inline-flex items-center gap-1 text-amber-700"><Crown size={12} /> {plan.name}</span>
                )}
                {hasBusiness && (
                  <>
                    <span aria-hidden className="text-slate-300">·</span>
                    <span className="inline-flex items-center gap-1 text-indigo-600"><Briefcase size={11} /> Business</span>
                  </>
                )}
                <span aria-hidden className="text-slate-300">·</span>
                <UserIdBadge id={user.id} className="!bg-transparent !px-0 !py-0 !text-xs !text-slate-500 !ring-0 hover:!text-slate-900" />
              </div>
            </div>
          ) : (
            <div className="relative mt-3">
              <p className="text-sm font-semibold">Welcome to AutoGO</p>
              <p className="mt-0.5 text-xs text-slate-500">Buy, sell and rent cars and bikes across Pakistan.</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <SignInLink onClick={onClose} className="rounded-lg bg-white py-2 text-center text-xs font-semibold text-slate-900 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50">
                  Sign in
                </SignInLink>
                <Link href="/register" onClick={onClose} className="rounded-lg bg-slate-900 py-2 text-center text-xs font-semibold text-white transition hover:bg-slate-800">
                  Create account
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto overscroll-contain px-3 py-4">
          {user && (
            // One plain row of shortcuts: icon over label, no boxes; the current page gets a dot.
            // Items are only as wide as their label and justify-between spreads items and dividers,
            // so every gap between a label and a divider is the same.
            <div className="flex items-center justify-between border-b border-slate-100 px-1 pb-3">
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
                    className={`relative flex flex-col items-center gap-1 py-1 text-[11px] font-medium transition active:scale-95 ${active ? "text-slate-900" : "text-slate-500 hover:text-slate-900"}`}
                  >
                    <span className="relative">
                      <Icon size={19} strokeWidth={active ? 2.1 : 1.8} />
                      <CountBadge count={count ?? 0} max={9} hidden className="absolute -right-2.5 -top-1.5 h-4 min-w-4 text-[10px]" />
                    </span>
                    <span className={active ? "font-semibold" : ""}>{label}</span>
                    <span className={`h-1 w-1 rounded-full ${active ? "bg-slate-900" : "bg-transparent"}`} />
                  </Link>,
                ];
              })}
            </div>
          )}

          <div>
            <MenuGroupTitle className="mb-1 pl-5 pr-2">Explore</MenuGroupTitle>
            {/* Hot deals: highlighted like the province picker's capital card */}
            <Link
              href="/deals"
              onClick={onClose}
              aria-current={isActive("/deals") ? "page" : undefined}
              className="mn-hot mb-1 block rounded-lg"
            >
              <span className="relative flex min-h-10 items-center gap-3 overflow-hidden rounded-lg py-2 pl-5 pr-2 transition hover:bg-slate-50">
                <span className="relative flex flex-shrink-0 items-center justify-center text-rose-500">
                  <Flame size={16} />
                </span>
                <span className="relative min-w-0 flex-1 truncate text-[14px] font-semibold text-slate-900">Hot deals</span>
                <span className="relative inline-flex items-center gap-1 rounded-full bg-rose-50 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-rose-600 ring-1 ring-inset ring-rose-200">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-rose-500" />
                  </span>
                  Hot
                </span>
                <ChevronRight size={14} className="relative text-slate-300" />
              </span>
            </Link>
            <div className="space-y-0.5">{browse.map(row)}</div>
          </div>
          {user && section("Account", account)}

          {user && hasBusiness && !pathname.startsWith("/business") && (
            <Link
              href="/business"
              onClick={onClose}
              className="block rounded-xl bg-indigo-600 p-[1.5px]"
            >
              <span className="flex items-center gap-3 rounded-lg bg-white px-3 py-2.5">
                <span className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-indigo-600 text-sm font-bold text-white">
                  {biz?.logo ? <Image src={biz.logo} alt="" fill sizes="36px" className="object-cover" /> : (biz?.name?.[0]?.toUpperCase() ?? <Briefcase size={15} />)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold text-slate-900">{biz?.name ?? "Your business"}</span>
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
              className="relative block overflow-hidden rounded-xl bg-slate-900 p-3 text-white"
            >
              <p className="relative flex items-center gap-1.5 text-[13px] font-bold"><Sparkles size={13} className="text-amber-300" /> Go Premium</p>
              <p className="relative mt-0.5 text-[11px] leading-snug text-slate-300">More listings, a bigger team and full showroom tools from PKR {PLANS.STARTER.price.toLocaleString()} for 30 days.</p>
              <span className="relative mt-2 inline-flex items-center gap-1 rounded-md theme-static bg-amber-400 px-2.5 py-1 text-[11px] font-bold text-slate-950">
                See plans <ChevronRight size={13} />
              </span>
            </Link>
          )}
        </div>

        {/* Footer */}
        <div className="space-y-2.5 border-t border-slate-100 p-3">
          <InstallAppRow onDone={onClose} />
          {user && <PushCard compact />}
          <div className="flex items-center justify-between gap-2 px-1">
            <span className="text-xs font-medium text-slate-500">Theme</span>
            <ThemeToggle />
          </div>
          {user && (
            <button
              onClick={() => { onClose(); onSignOut(); }}
              className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg py-2 text-[14px] font-semibold text-rose-600 ring-1 ring-inset ring-rose-100 transition hover:bg-rose-50"
            >
              <LogOut size={14} /> Sign out
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}
