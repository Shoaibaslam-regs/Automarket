"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, BellOff, Search, Trash2, ArrowRight } from "lucide-react";

export type SavedSearchView = { id: string; name: string; query: string; emailAlerts: boolean; createdAt: string };

export default function SavedSearchList({ initial }: { initial: SavedSearchView[] }) {
  const [searches, setSearches] = useState(initial);
  const [error, setError] = useState("");

  async function toggleAlerts(s: SavedSearchView) {
    setError("");
    setSearches(list => list.map(x => (x.id === s.id ? { ...x, emailAlerts: !s.emailAlerts } : x)));
    const res = await fetch(`/api/saved-searches/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailAlerts: !s.emailAlerts }),
    });
    if (!res.ok) {
      setSearches(list => list.map(x => (x.id === s.id ? s : x)));
      setError("Couldn't update the alert. Please try again.");
    }
  }

  async function remove(s: SavedSearchView) {
    setError("");
    setSearches(list => list.filter(x => x.id !== s.id));
    const res = await fetch(`/api/saved-searches/${s.id}`, { method: "DELETE" });
    if (!res.ok) {
      setSearches(list => [...list, s]);
      setError("Couldn't delete the search. Please try again.");
    }
  }

  if (searches.length === 0) {
    return (
      <div className="rounded-[22px] border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          <Bell size={22} strokeWidth={1.75} />
        </div>
        <p className="text-sm font-semibold text-slate-900">No saved searches yet</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
          Set some filters on the browse page and tap <span className="font-medium text-slate-700">Save search</span> to get an
          email when matching vehicles are listed.
        </p>
        <Link href="/listings" className="mt-5 inline-flex rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
          Browse vehicles
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-200">{error}</p>}
      {searches.map(s => (
        <div key={s.id} className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 pl-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <Search size={16} className="flex-shrink-0 text-slate-400" />
          <Link href={`/listings?${s.query}`} className="group min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900 group-hover:underline">{s.name}</p>
            <p className="text-xs text-slate-500">
              {s.emailAlerts ? "Email alerts on" : "Alerts off"} · saved{" "}
              {new Date(s.createdAt).toLocaleDateString("en-PK", { day: "numeric", month: "short" })}
            </p>
          </Link>
          <button
            type="button"
            onClick={() => toggleAlerts(s)}
            aria-pressed={s.emailAlerts}
            title={s.emailAlerts ? "Turn off email alerts" : "Turn on email alerts"}
            className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
              s.emailAlerts ? "bg-indigo-50 text-indigo-600 hover:bg-indigo-100" : "bg-slate-50 text-slate-400 hover:bg-slate-100"
            }`}
          >
            {s.emailAlerts ? <Bell size={16} /> : <BellOff size={16} />}
          </button>
          <button
            type="button"
            onClick={() => remove(s)}
            title="Delete saved search"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
          >
            <Trash2 size={16} />
          </button>
          <Link href={`/listings?${s.query}`} aria-label={`Open ${s.name}`} className="hidden h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 sm:flex">
            <ArrowRight size={16} />
          </Link>
        </div>
      ))}
    </div>
  );
}
