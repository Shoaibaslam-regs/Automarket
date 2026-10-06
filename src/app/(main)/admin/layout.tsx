"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarDays, Car, LayoutDashboard, ShieldCheck, Users } from "lucide-react";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/listings", label: "Listings", icon: Car },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 flex-shrink-0 flex-col border-r border-slate-800 bg-slate-950 px-3 py-5 lg:flex">
        <div className="mb-6 flex items-center gap-2.5 px-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow-lg shadow-indigo-500/30">
            <ShieldCheck size={16} strokeWidth={2.25} />
          </span>
          <div>
            <p className="text-sm font-bold text-white">Admin Console</p>
            <p className="text-[11px] text-slate-500">AutoMarket</p>
          </div>
        </div>

        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Manage</p>
        <nav className="flex flex-col gap-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
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
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-xl bg-white/5 p-3 ring-1 ring-inset ring-white/10">
          <p className="text-xs font-semibold text-slate-200">Admin access</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">Changes here affect every user on the platform.</p>
        </div>
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
              </Link>
            );
          })}
        </nav>
      </div>

      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 sm:py-8">{children}</div>
      </main>
    </div>
  );
}
