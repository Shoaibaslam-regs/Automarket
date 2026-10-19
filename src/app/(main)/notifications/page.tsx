"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BadgeDollarSign, Bell, CalendarCheck, CalendarPlus, ChevronRight, Megaphone, MessageCircle, ShoppingBag, type LucideIcon } from "lucide-react";
import { refreshNotificationCounts } from "@/hooks/useNotificationCounts";
import type { NotificationItem, NotificationKind } from "@/lib/notifications";

const ICON: Record<NotificationKind, { icon: LucideIcon; tone: string }> = {
  message: { icon: MessageCircle, tone: "bg-indigo-50 text-indigo-600" },
  bookingRequest: { icon: CalendarPlus, tone: "bg-amber-50 text-amber-700" },
  bookingUpdate: { icon: CalendarCheck, tone: "bg-sky-50 text-sky-700" },
  purchaseUpdate: { icon: ShoppingBag, tone: "bg-emerald-50 text-emerald-700" },
  saleRequest: { icon: BadgeDollarSign, tone: "bg-amber-50 text-amber-700" },
  official: { icon: Megaphone, tone: "bg-fuchsia-50 text-fuchsia-600" },
};

function ago(iso: string) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} hour${h !== 1 ? "s" : ""} ago`;
  const d = Math.round(h / 24);
  return d < 7 ? `${d} day${d !== 1 ? "s" : ""} ago` : new Date(iso).toLocaleDateString("en-PK", { day: "numeric", month: "short" });
}

/** Everything waiting for you in one list: messages, booking and purchase updates, requests, and AutoMarket Official posts. */
export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/notifications")
      .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error); setItems(d.items); refreshNotificationCounts(); })
      .catch(e => setError(e.message || "Couldn't load notifications"));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Notifications</h1>
        <p className="mt-1 text-sm text-slate-500">Everything waiting for you. Open one to deal with it; it leaves this list once it&apos;s handled or read.</p>

        <div className="mt-6">
          {error ? (
            <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700 ring-1 ring-inset ring-rose-200">{error}</p>
          ) : items === null ? (
            <div className="space-y-2">{[1, 2, 3, 4].map(i => <div key={i} className="h-16 animate-pulse rounded-2xl bg-white" />)}</div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
              <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><Bell size={22} /></span>
              <p className="text-sm font-semibold text-slate-900">You&apos;re all caught up</p>
              <p className="mt-1 text-sm text-slate-500">New messages, bookings and updates will show up here.</p>
              <Link href="/listings" className="mt-5 inline-flex rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">Browse vehicles</Link>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
              {items.map(n => {
                const { icon: Icon, tone } = ICON[n.kind];
                return (
                  <li key={`${n.kind}-${n.id}`}>
                    <Link href={n.href} className="flex items-start gap-3 px-4 py-3.5 transition hover:bg-slate-50">
                      <span className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon size={17} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-slate-900">{n.title}</span>
                        {n.body && <span className="mt-0.5 block truncate text-xs text-slate-500">{n.body}</span>}
                        <span className="mt-1 block text-[11px] text-slate-400">{ago(n.at)}</span>
                      </span>
                      <ChevronRight size={16} className="mt-2 flex-shrink-0 text-slate-300" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
