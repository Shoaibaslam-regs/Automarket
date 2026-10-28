"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BriefcaseBusiness, CalendarDays, Headset, Inbox, MessageSquare, Car, Eye, Flag, Gauge, History, LayoutDashboard, Megaphone, Rocket, ShieldCheck, Tag, Users } from "lucide-react";
import { AdminAccessProvider, useAdminAccess } from "@/components/admin/AdminAccess";
import MenuGroupTitle from "@/components/ui/MenuGroupTitle";
import { ADMIN_ACCESS_HINT } from "@/lib/adminRoles";

const NAV_GROUPS = [
  {
    title: "Manage",
    items: [
      { href: "/admin", label: "Overview", icon: LayoutDashboard },
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/listings", label: "Listings", icon: Car },
      { href: "/admin/bookings", label: "Bookings", icon: CalendarDays },
      { href: "/admin/deals", label: "Deals", icon: Tag },
    ],
  },
  {
    title: "Review",
    items: [
      { href: "/admin/reports", label: "Reports", icon: Flag },
      { href: "/admin/messages", label: "Messages", icon: MessageSquare },
      { href: "/admin/requests", label: "Requests", icon: Inbox },
      { href: "/admin/support", label: "Support inbox", icon: Headset },
      { href: "/admin/ads", label: "Ad requests", icon: Rocket },
      { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
    ],
  },
  {
    title: "Monitor",
    items: [
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/admin/activity", label: "Activity", icon: History },
      { href: "/admin/usage", label: "System usage", icon: Gauge },
    ],
  },
];
// The phone and tablet bar shows every page in one scrolling row
const NAV = NAV_GROUPS.flatMap(g => g.items);

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAccessProvider>
      <AdminShell>{children}</AdminShell>
    </AdminAccessProvider>
  );
}

function AccessCard() {
  const { access, owner } = useAdminAccess();
  if (access === "MANAGER") {
    return (
      <div className="mt-auto rounded-xl bg-white/5 p-3 ring-1 ring-inset ring-white/10">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-200"><BriefcaseBusiness size={13} className="text-sky-300" /> Manager access</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{ADMIN_ACCESS_HINT.MANAGER}</p>
      </div>
    );
  }
  return (
    <div className="mt-auto rounded-xl bg-white/5 p-3 ring-1 ring-inset ring-white/10">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-200"><ShieldCheck size={13} className="text-indigo-300" /> {owner ? "Platform owner" : "Full admin access"}</p>
      <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">Changes here affect every user on the platform.</p>
    </div>
  );
}

/** Managers can open every page, but listings, deals and users are run by full admins */
function ViewOnlyBanner() {
  const { access } = useAdminAccess();
  const pathname = usePathname();
  const viewOnly = ["/admin/listings", "/admin/deals", "/admin/users"].some(p => pathname.startsWith(p));
  if (access !== "MANAGER" || !viewOnly) return null;
  return (
    <div className="mb-5 flex items-center gap-2.5 rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-800 ring-1 ring-inset ring-sky-200">
      <Eye size={16} className="flex-shrink-0" />
      <span><strong className="font-semibold">Manager access.</strong> {pathname.startsWith("/admin/users") ? "You can give and revoke plans here; only a full admin can make admins or delete users." : "You can look here; only a full admin can change listings and deals."}</span>
    </div>
  );
}

function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
  // Unread messages, open reports, ad requests waiting for review and services near their storage limit,
  // refreshed on each admin page change
  const [unread, setUnread] = useState(0);
  const [waitingRequests, setWaitingRequests] = useState(0);
  const [openSupport, setOpenSupport] = useState(0);
  const [openReports, setOpenReports] = useState(0);
  const [waitingAds, setWaitingAds] = useState(0);
  const [usageAlerts, setUsageAlerts] = useState(0);
  useEffect(() => {
    fetch("/api/admin/support?count=1").then(r => (r.ok ? r.json() : null)).then(d => setOpenSupport(d?.open ?? 0)).catch(() => {});
    fetch("/api/admin/requests?count=1").then(r => (r.ok ? r.json() : null)).then(d => setWaitingRequests(d?.waiting ?? 0)).catch(() => {});
    fetch("/api/messages/unread").then(r => (r.ok ? r.json() : null)).then(d => setUnread(d?.count ?? 0)).catch(() => {});
    fetch("/api/admin/reports?count=1").then(r => (r.ok ? r.json() : null)).then(d => setOpenReports(d?.open ?? 0)).catch(() => {});
    fetch("/api/admin/ads?count=1").then(r => (r.ok ? r.json() : null)).then(d => setWaitingAds(d?.waiting ?? 0)).catch(() => {});
    fetch("/api/admin/usage?count=1").then(r => (r.ok ? r.json() : null)).then(d => setUsageAlerts(d?.alerts ?? 0)).catch(() => {});
  }, [pathname]);
  const badge = (href: string) => {
    const n = href === "/admin/support" ? openSupport : href === "/admin/requests" ? waitingRequests : href === "/admin/messages" ? unread : href === "/admin/reports" ? openReports : href === "/admin/ads" ? waitingAds : href === "/admin/usage" ? usageAlerts : 0;
    return n > 0 ? (
      <span className="ml-auto rounded-full bg-rose-600 px-1.5 py-px text-[10px] font-bold leading-4 text-white" aria-label={`${n} waiting`}>{n}</span>
    ) : null;
  };

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 flex-shrink-0 flex-col border-r border-slate-800 bg-slate-950 px-3 py-5 lg:flex">
        <div className="mb-6 flex items-center gap-2.5 px-3">
          <span className="flex items-center justify-center text-indigo-600">
            <ShieldCheck size={16} strokeWidth={2.25} />
          </span>
          <div>
            <p className="text-sm font-bold text-white">Admin Console</p>
            <p className="text-[11px] text-slate-500">AutoGO</p>
          </div>
        </div>

        <nav className="-mx-1 flex flex-col overflow-y-auto px-1 pb-3">
          {NAV_GROUPS.map((group, i) => (
            <div key={group.title} className={`flex flex-col gap-0.5 ${i > 0 ? "pt-4" : ""}`}>
              <MenuGroupTitle tone="dark" className="px-3">{group.title}</MenuGroupTitle>
              {group.items.map(({ href, label, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      active ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
                    }`}
                  >
                    <Icon size={17} strokeWidth={1.9} className={active ? "text-indigo-300" : "text-slate-500 group-hover:text-slate-300"} />
                    {label}
                    {badge(href)}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <AccessCard />
      </aside>

      {/* Mobile / tablet nav */}
      <div className="sticky top-14 z-30 border-b border-slate-200 bg-white/90 backdrop-blur lg:hidden">
        <nav className="flex gap-1 overflow-x-auto px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition ${
                  active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon size={15} strokeWidth={1.9} />
                {label}
                {badge(href)}
              </Link>
            );
          })}
        </nav>
      </div>

      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 sm:py-8">
          <ViewOnlyBanner />
          {children}
        </div>
      </main>
    </div>
  );
}
