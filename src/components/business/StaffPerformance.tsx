"use client";

import { useEffect, useState } from "react";
import { formatLakh } from "@/lib/format";

type Person = {
  userId: string; name: string; role: string;
  bookings: number; handovers: number; returns: number; sales: number; customers: number; followups: number; listings: number;
  salesValue: number; collected: number; actions: number;
};

const METRICS: { key: keyof Person; label: string; money?: boolean }[] = [
  { key: "sales", label: "Vehicles sold" },
  { key: "salesValue", label: "Sales value", money: true },
  { key: "collected", label: "Payments collected", money: true },
  { key: "bookings", label: "Bookings" },
  { key: "handovers", label: "Handovers" },
  { key: "returns", label: "Returns" },
  { key: "customers", label: "Customers added" },
  { key: "followups", label: "Follow-ups done" },
  { key: "listings", label: "Listings & deals" },
];

/** Staff → Performance: what each team member did this month or last month, from the activity log. */
export default function StaffPerformance() {
  const [month, setMonth] = useState<"this" | "last">("this");
  const [people, setPeople] = useState<Person[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/business/performance${month === "last" ? "?month=last" : ""}`)
      .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error); setPeople(d.people); })
      .catch(e => setError(e.message || "Couldn't load performance"));
  }, [month]);

  const top = (key: keyof Person) => Math.max(0, ...(people ?? []).map(p => Number(p[key]) || 0));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] text-[var(--gh-57606a)]">Counted from what each person did in the console. The top number in each row is highlighted.</p>
        <div className="inline-flex rounded-lg bg-[var(--gh-f6f8fa)] p-1 ring-1 ring-inset ring-[var(--gh-e1e4e8)]">
          {(["this", "last"] as const).map(m => (
            <button key={m} onClick={() => { setPeople(null); setMonth(m); }}
              className={`rounded-md px-3 py-1 text-xs font-semibold ${month === m ? "bg-[var(--gh-0d1117)] text-white" : "text-[var(--gh-57606a)]"}`}>
              {m === "this" ? "This month" : "Last month"}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p className="rounded-xl bg-[var(--gh-fff0f0)] p-4 text-sm text-[var(--gh-cf222e)]">{error}</p>
      ) : people === null ? (
        <div className="h-40 animate-pulse rounded-xl bg-white" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--gh-e1e4e8)] bg-white">
          <table className="w-full min-w-[560px] text-[13px]">
            <thead>
              <tr className="border-b border-[var(--gh-e1e4e8)] bg-[var(--gh-f6f8fa)] text-left">
                <th className="sticky left-0 bg-[var(--gh-f6f8fa)] px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-[var(--gh-8c959f)]">Team member</th>
                {people.map(p => (
                  <th key={p.userId} className="px-3 py-2.5 text-right">
                    <span className="ml-auto block max-w-[140px] truncate text-[13px] font-bold text-[var(--gh-0d1117)]" title={p.name}>{p.name}</span>
                    <span className="block text-[10px] font-semibold uppercase text-[var(--gh-8c959f)]">{p.role.toLowerCase()}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--gh-f6f8fa)]">
              {METRICS.map(m => {
                const best = top(m.key);
                return (
                  <tr key={m.key}>
                    <td className="sticky left-0 bg-white px-4 py-2.5 text-[var(--gh-57606a)]">{m.label}</td>
                    {people.map(p => {
                      const v = Number(p[m.key]) || 0;
                      const lead = best > 0 && v === best;
                      return (
                        <td key={p.userId} className={`px-3 py-2.5 text-right tabular-nums ${lead ? "font-extrabold text-[var(--gh-1a7f37)]" : v ? "font-semibold text-[var(--gh-0d1117)]" : "text-[var(--gh-c4c9d0)]"}`}>
                          {m.money ? (v ? `PKR ${formatLakh(v)}` : "—") : v || "—"}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
