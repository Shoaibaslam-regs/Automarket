"use client";

// Boost and Pin buttons (rules in src/lib/boosts.ts, server in src/lib/boostServer.ts). `useBoosts` reads this month's
// allowance once per page (GET /api/boosts) and every button shares it, so "9 of 12 left" stays right after a boost.
import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Lock, Pin, PinOff, Rocket } from "lucide-react";
import { isBoosted } from "@/lib/boosts";
import { toast } from "@/lib/toast";

export type BoostInfo = {
  allowed: boolean;
  plan: string;
  perMonth: number;
  days: number;
  used: number;
  left: number;
  resetsAt: string;
  canBoost: boolean;
};

let info: BoostInfo | null = null;
let loading = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());
function load() {
  if (loading) return;
  loading = true;
  fetch("/api/boosts")
    .then(r => (r.ok ? r.json() : null))
    .then(d => { info = d; emit(); })
    .catch(() => {})
    .finally(() => { loading = false; });
}

/** This month's boosts for the signed-in person's business or account, shared by every button on the page. */
export function useBoosts(): BoostInfo | null {
  const value = useSyncExternalStore(
    cb => { listeners.add(cb); return () => listeners.delete(cb); },
    () => info,
    () => null
  );
  useEffect(() => { if (!info) load(); }, []);
  return value;
}

const fmt = (d: string | Date) => new Date(d).toLocaleDateString("en-PK", { day: "numeric", month: "short", timeZone: "Asia/Karachi" });

/** "9 of 12 boosts left this month · 7 days each", or what plan brings boosts. */
export function BoostAllowanceText({ className = "" }: { className?: string }) {
  const b = useBoosts();
  if (!b) return null;
  if (!b.allowed) {
    return (
      <p className={`text-xs text-[var(--gh-57606a)] ${className}`}>
        <Rocket size={12} className="mr-1 inline" />Boost puts vehicles first on Marketplace. It comes with{" "}
        <Link href="/pricing" className="font-semibold text-indigo-600 hover:underline">{b.plan} and up</Link>.
      </p>
    );
  }
  return (
    <p className={`text-xs text-[var(--gh-57606a)] ${className}`}>
      <Rocket size={12} className="mr-1 inline text-amber-500" />
      <strong className="font-semibold text-[var(--gh-0d1117)]">{b.left} of {b.perMonth}</strong> boosts left this month · {b.days} days each
    </p>
  );
}

/**
 * Boost one live vehicle (`listingId`) or deal (`dealId`). Shows "Boosted until …" while one runs, a lock for plans
 * without boosts, and nothing for team members who can't boost.
 */
export function BoostButton({
  listingId, dealId, boostedUntil, live = true, onBoosted, compact = false,
}: {
  listingId?: string;
  dealId?: string;
  boostedUntil?: string | Date | null;
  /** Only live (available) vehicles and running deals can be boosted */
  live?: boolean;
  onBoosted?: (until: string) => void;
  compact?: boolean;
}) {
  const b = useBoosts();
  const [busy, setBusy] = useState(false);
  if (!b) return null;
  const base = `inline-flex h-8 items-center justify-center gap-1 rounded-lg text-[11px] font-semibold transition ${compact ? "px-2" : "px-2.5"}`;

  if (isBoosted(boostedUntil)) {
    return (
      <span title={`Shown first until ${fmt(boostedUntil!)}`} className={`${base} text-amber-600`}>
        <Rocket size={13} /> {compact ? fmt(boostedUntil!) : `Boosted until ${fmt(boostedUntil!)}`}
      </span>
    );
  }
  if (!b.allowed) {
    return (
      <Link href="/pricing" title={`Boosts come with ${b.plan} and up`} aria-label={`Boost: comes with ${b.plan} and up`} className={`${base} border border-[var(--gh-e1e4e8)] text-[var(--gh-8c959f)] hover:bg-[var(--gh-f6f8fa)]`}>
        <Lock size={12} /> {!compact && "Boost"}
      </Link>
    );
  }
  if (!b.canBoost || !live) return null;

  async function boost() {
    setBusy(true);
    const res = await fetch("/api/boosts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(listingId ? { listingId } : { dealId }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { toast(d.error || "Couldn't boost it right now", { tone: "removed" }); if (d.code === "BOOSTS_USED") load(); return; }
    if (info) { info = { ...info, used: info.used + 1, left: d.left }; emit(); }
    toast(`Boosted until ${fmt(d.boostedUntil)} · ${d.left} left this month`, { tone: "saved" });
    onBoosted?.(d.boostedUntil);
  }

  const out = b.left <= 0;
  return (
    <button
      type="button"
      onClick={boost}
      disabled={busy || out}
      title={out ? "No boosts left this month. They come back on the 1st." : `Show it first for ${b.days} days`}
      className={`${base} bg-gradient-to-r from-amber-300 to-amber-500 text-slate-950 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50`}
    >
      <Rocket size={13} /> {busy ? "Boosting…" : "Boost"}
    </button>
  );
}

/** Pin or unpin a business vehicle first on the shop page (Premium Plus and up, owner or manager, no limit). */
export function PinButton({ listingId, pinned, onChanged }: { listingId: string; pinned: boolean; onChanged: (pinned: boolean) => void }) {
  const b = useBoosts();
  const [busy, setBusy] = useState(false);
  // Pinning comes with the same plans as boosts, for the same roles (PLAN_FEATURES.pinnedVehicles, `promote`)
  if (!b || !b.allowed || !b.canBoost) return null;

  async function toggle() {
    setBusy(true);
    const res = await fetch(`/api/business/listings/${listingId}/pin`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !pinned }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { toast(d.error || "Couldn't change the pin", { tone: "removed" }); return; }
    toast(pinned ? "Unpinned from your shop page" : "Pinned first on your shop page", { tone: "saved" });
    onChanged(!pinned);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-label={pinned ? "Unpin from shop page" : "Pin on shop page"}
      title={pinned ? "Unpin from shop page" : "Pin first on your shop page"}
      aria-pressed={pinned}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition disabled:opacity-50 ${pinned ? "border-indigo-200 bg-indigo-50 text-indigo-600" : "border-[var(--gh-e1e4e8)] text-[var(--gh-57606a)] hover:bg-[var(--gh-f6f8fa)]"}`}
    >
      {pinned ? <PinOff size={13} /> : <Pin size={13} />}
    </button>
  );
}
