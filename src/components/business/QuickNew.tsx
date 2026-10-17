"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight, BadgeDollarSign, CalendarPlus, Car, Plus, Tag, UserPlus, X, type LucideIcon } from "lucide-react";
import { can, type BusinessPermission, type BusinessRole } from "@/lib/businessPermissions";

export type QuickNewKind = "booking" | "sale" | "customer" | "expense" | "income";
const EVENT = "automarket:quick-new";

type Action = { kind?: QuickNewKind; label: string; icon: LucideIcon; path: string; permission?: BusinessPermission };
const ACTIONS: Action[] = [
  { kind: "booking", label: "New booking", icon: CalendarPlus, path: "/business/bookings", permission: "manageBookings" },
  { kind: "sale", label: "New sale", icon: BadgeDollarSign, path: "/business/sales", permission: "manageSales" },
  { kind: "customer", label: "Add customer", icon: UserPlus, path: "/business/customers", permission: "editCustomers" },
  { label: "Add vehicle", icon: Car, path: "/sell" },
  { label: "New deal", icon: Tag, path: "/business/deals/new", permission: "manageDeals" },
  { kind: "expense", label: "Add expense", icon: ArrowUpRight, path: "/business/money", permission: "manageMoney" },
  { kind: "income", label: "Add money in", icon: ArrowDownLeft, path: "/business/money", permission: "manageMoney" },
];

/** Pages without the button: setup and printable sheets. */
const HIDDEN = [/^\/business\/onboarding/, /\/slip$/, /\/installments$/];

/**
 * For pages that open a form from the "+ New" button: runs `open` when the page loads with ?new=<kind>,
 * or when the button is pressed while already on this page.
 */
export function useQuickNew(kind: QuickNewKind, open: () => void) {
  const ref = useRef(open);
  useEffect(() => { ref.current = open; });
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("new") === kind) queueMicrotask(() => ref.current());
    const on = (e: Event) => { if ((e as CustomEvent).detail === kind) ref.current(); };
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, [kind]);
}

/** The floating "+ New" button on every business console page, offering only what the user's role can do. */
export default function QuickNew() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<BusinessRole | null>(null);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/business/organizations").then(r => (r.ok ? r.json() : null)).then(d => d?.myRole && setRole(d.myRole)).catch(() => {});
  }, []);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", esc);
    return () => { window.removeEventListener("pointerdown", close); window.removeEventListener("keydown", esc); };
  }, [open]);

  if (!role || HIDDEN.some(r => r.test(pathname))) return null;
  const actions = ACTIONS.filter(a => !a.permission || can(role, a.permission));

  function go(a: Action) {
    setOpen(false);
    if (a.kind && pathname === a.path) window.dispatchEvent(new CustomEvent(EVENT, { detail: a.kind }));
    else router.push(a.kind ? `${a.path}?new=${a.kind}` : a.path);
  }

  return (
    <div ref={box} className="no-print fixed bottom-5 right-5 z-[900] flex flex-col items-end gap-2 print:hidden">
      {open && (
        <div role="menu" className="w-52 overflow-hidden rounded-2xl border border-[var(--gh-e1e4e8)] bg-white py-1.5 shadow-2xl">
          {actions.map(a => (
            a.kind ? (
              <button key={a.label} role="menuitem" onClick={() => go(a)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[13px] font-semibold text-[var(--gh-0d1117)] hover:bg-[var(--gh-f6f8fa)]">
                <a.icon size={16} className="text-[var(--gh-57606a)]" /> {a.label}
              </button>
            ) : (
              <Link key={a.label} role="menuitem" href={a.path} onClick={() => setOpen(false)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-[13px] font-semibold text-[var(--gh-0d1117)] hover:bg-[var(--gh-f6f8fa)]">
                <a.icon size={16} className="text-[var(--gh-57606a)]" /> {a.label}
              </Link>
            )
          ))}
        </div>
      )}
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-haspopup="menu" aria-label={open ? "Close" : "Create new"}
        className="theme-static inline-flex h-12 items-center gap-2 rounded-full bg-slate-900 px-5 text-sm font-bold text-white shadow-xl shadow-slate-900/30 ring-2 ring-white transition hover:bg-slate-800">
        {open ? <X size={18} /> : <Plus size={18} strokeWidth={2.5} />} <span>{open ? "Close" : "New"}</span>
      </button>
    </div>
  );
}
