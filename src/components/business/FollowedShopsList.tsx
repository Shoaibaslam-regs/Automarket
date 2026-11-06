"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bell, BellOff, Store, X } from "lucide-react";
import VerifiedBadge from "@/components/VerifiedBadge";
import { toast } from "@/lib/toast";

export type FollowedShopView = {
  slug: string;
  name: string;
  logo: string | null;
  verified: boolean;
  type: string;
  city: string | null;
  forSale: number;
  forRent: number;
  deals: number;
  muted: boolean;
};

const TYPE_LABEL: Record<string, string> = { DEALER: "Car dealer", RENTAL: "Rental company", BOTH: "Dealer & rental" };

/** Saved → Shops you follow: each shop with its counts, a bell to mute or unmute it, and unfollow. */
export default function FollowedShopsList({ initial }: { initial: FollowedShopView[] }) {
  const [shops, setShops] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);

  async function act(shop: FollowedShopView, action: "mute" | "unmute" | "unfollow") {
    setBusy(shop.slug);
    const res = await fetch(`/api/businesses/${shop.slug}/follow`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    const d = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) { toast(d.error || "Couldn't change it right now", { tone: "removed" }); return; }
    if (action === "unfollow") {
      setShops(list => list.filter(s => s.slug !== shop.slug));
      toast(`Unfollowed ${shop.name}`, { tone: "removed" });
    } else {
      setShops(list => list.map(s => (s.slug === shop.slug ? { ...s, muted: !!d.muted } : s)));
      toast(d.muted ? `Muted ${shop.name}` : `${shop.name} can notify you again`, { tone: d.muted ? "removed" : "saved" });
    }
  }

  if (!shops.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
        <div className="mx-auto mb-3 flex items-center justify-center text-slate-400"><Store size={22} strokeWidth={1.75} /></div>
        <p className="text-sm font-semibold text-slate-900">No shops followed yet</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">Tap Follow on a shop&apos;s page to hear about its new deals and vehicles.</p>
        <Link href="/deals" className="mt-5 inline-flex rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
          See shops with deals
        </Link>
      </div>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {shops.map(s => {
        const counts = [s.forSale && `${s.forSale} for sale`, s.forRent && `${s.forRent} for rent`, s.deals && `${s.deals} deal${s.deals === 1 ? "" : "s"}`].filter(Boolean).join(" · ");
        return (
          <li key={s.slug} className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white p-3">
            <Link href={`/dealers/${s.slug}`} className="flex min-w-0 flex-1 items-center gap-3">
              <span className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-900 text-base font-bold text-white">
                {s.logo ? <Image src={s.logo} alt="" fill sizes="48px" className="object-cover" /> : s.name[0]?.toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="flex min-w-0 items-center gap-1">
                  <span className="truncate text-[15px] font-semibold text-slate-900">{s.name}</span>
                  {s.verified && <VerifiedBadge variant="icon" size={15} />}
                </span>
                <span className="block truncate text-xs text-slate-500">{TYPE_LABEL[s.type] ?? "Business"}{s.city ? ` · ${s.city}` : ""}</span>
                <span className="block truncate text-xs text-slate-700">{counts || "Nothing listed right now"}</span>
              </span>
            </Link>
            <div className="flex flex-shrink-0 gap-1">
              <button type="button" onClick={() => act(s, s.muted ? "unmute" : "mute")} disabled={busy === s.slug}
                aria-label={s.muted ? `Unmute ${s.name}` : `Mute ${s.name}`} aria-pressed={s.muted}
                title={s.muted ? "Notifications off. Tap to turn them on" : "Notifications on. Tap to mute"}
                className={`flex h-10 w-10 items-center justify-center rounded-lg border transition disabled:opacity-50 ${s.muted ? "border-slate-200 text-slate-400" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}>
                {s.muted ? <BellOff size={16} /> : <Bell size={16} />}
              </button>
              <button type="button" onClick={() => act(s, "unfollow")} disabled={busy === s.slug} aria-label={`Unfollow ${s.name}`} title="Unfollow"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50">
                <X size={16} />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
