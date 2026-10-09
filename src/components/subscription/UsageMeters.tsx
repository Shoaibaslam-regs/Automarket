"use client";

import { Car, UserRound, Users, type LucideIcon } from "lucide-react";
import { formatLimit, type PlanLimits } from "@/lib/plans";
import type { SubscriptionInfo } from "./useSubscription";

const METERS: { key: keyof PlanLimits; label: string; icon: LucideIcon; businessOnly?: boolean }[] = [
  { key: "listings", label: "Active listings", icon: Car },
  { key: "staff", label: "Team members", icon: Users, businessOnly: true },
  { key: "customers", label: "Customers", icon: UserRound, businessOnly: true },
];

/** Progress bars for each plan limit. Staff and customers only show for business accounts. */
export default function UsageMeters({ sub, compact = false }: { sub: SubscriptionInfo; compact?: boolean }) {
  const meters = METERS.filter(m => !m.businessOnly || sub.hasBusiness);
  return (
    <div className={`grid gap-3 ${compact ? "" : "sm:grid-cols-3"}`}>
      {meters.map(({ key, label, icon: Icon }) => {
        const used = sub.usage[key];
        const limit = sub.limits[key];
        const pct = limit === null ? 0 : Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));
        const full = limit !== null && used >= limit;
        return (
          <div key={key} className="rounded-2xl bg-white p-4 ring-1 ring-inset ring-slate-200/80">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <Icon size={14} strokeWidth={1.9} /> {label}
              </span>
              {full && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600 ring-1 ring-inset ring-rose-200">LIMIT REACHED</span>}
            </div>
            <p className="mt-2 text-lg font-bold tabular-nums text-slate-900">
              {used.toLocaleString()} <span className="text-sm font-medium text-slate-400">/ {formatLimit(limit)}</span>
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  limit === null ? "w-full bg-gradient-to-r from-amber-300 to-amber-500" : full ? "bg-rose-500" : pct >= 75 ? "bg-amber-500" : "bg-emerald-500"
                }`}
                style={limit === null ? undefined : { width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
